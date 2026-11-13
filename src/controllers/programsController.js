import pool from '../config/db.js';
import {
  filterSectionsWithQuestions,
  loadProgramTree,
} from '../services/programContentService.js';
import { requireActiveProgramByRef } from '../services/programLookup.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { buildPagination, escapeLike } from '../utils/sql.js';
import {
  clampReportedWatchTime,
  computeWatchPercent,
  isVideoWatchComplete,
} from '../utils/videoWatch.js';

async function loadSubmissionMap(userId, sectionIds) {
  if (!userId || !sectionIds.length) {
    return { bySection: new Map(), answersBySection: new Map() };
  }

  const placeholders = sectionIds.map((_, index) => `:sid${index}`).join(', ');
  const params = {
    userId,
    ...Object.fromEntries(sectionIds.map((id, index) => [`sid${index}`, id])),
  };

  const [submissions] = await pool.query(
    `SELECT id, section_id, correct_count, total_count, submitted_at
     FROM program_section_submissions
     WHERE user_id = :userId AND section_id IN (${placeholders})`,
    params
  );

  const bySection = new Map();
  const submissionIds = [];
  for (const row of submissions) {
    bySection.set(row.section_id, row);
    submissionIds.push(row.id);
  }

  const answersBySection = new Map();
  if (submissionIds.length) {
    const answerPlaceholders = submissionIds.map((_, index) => `:sub${index}`).join(', ');
    const answerParams = Object.fromEntries(
      submissionIds.map((id, index) => [`sub${index}`, id])
    );

    const [answers] = await pool.query(
      `SELECT a.submission_id, a.question_id, a.option_id, a.is_correct, s.section_id
       FROM program_section_answers a
       INNER JOIN program_section_submissions s ON s.id = a.submission_id
       WHERE a.submission_id IN (${answerPlaceholders})`,
      answerParams
    );

    for (const answer of answers) {
      if (!answersBySection.has(answer.section_id)) {
        answersBySection.set(answer.section_id, []);
      }
      answersBySection.get(answer.section_id).push({
        questionId: answer.question_id,
        optionId: answer.option_id,
        isCorrect: Boolean(answer.is_correct),
      });
    }
  }

  return { bySection, answersBySection };
}

async function loadVideoProgressMap(userId, sectionIds) {
  const map = new Map();
  if (!userId || !sectionIds.length) return map;

  const placeholders = sectionIds.map((_, index) => `:sid${index}`).join(', ');
  const params = {
    userId,
    ...Object.fromEntries(sectionIds.map((id, index) => [`sid${index}`, id])),
  };

  const [rows] = await pool.query(
    `SELECT section_id, max_watched_seconds, duration_seconds, watch_percent, is_completed, completed_at
     FROM program_section_video_progress
     WHERE user_id = :userId AND section_id IN (${placeholders})`,
    params
  );

  for (const row of rows) {
    map.set(row.section_id, {
      maxWatchedSeconds: Number(row.max_watched_seconds || 0),
      durationSeconds: Number(row.duration_seconds || 0),
      watchPercent: Number(row.watch_percent || 0),
      isCompleted: Boolean(row.is_completed),
      completedAt: row.completed_at,
    });
  }

  return map;
}

async function assertSectionBelongsToProgram(programRef, sectionId) {
  const program = await requireActiveProgramByRef(programRef);
  const [rows] = await pool.query(
    `SELECT ps.id
     FROM program_sections ps
     WHERE ps.id = :sectionId
       AND ps.program_id = :programId
       AND ps.is_active = 1
     LIMIT 1`,
    { programId: program.id, sectionId }
  );
  if (!rows.length) {
    throw httpError('Section not found', 404);
  }
  return program;
}

export const listPublicPrograms = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 220);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const like = `%${escapeLike(search)}%`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM programs
     WHERE is_active = 1
       AND (
         :search = ''
         OR heading_en LIKE :like ESCAPE '\\\\'
         OR heading_hi LIKE :like ESCAPE '\\\\'
         OR heading_mr LIKE :like ESCAPE '\\\\'
         OR slug LIKE :like ESCAPE '\\\\'
       )`,
    { search, like }
  );

  const total = Number(countRows[0]?.total || 0);
  const pagination = buildPagination({ page, limit, total });

  const [rows] = await pool.query(
    `SELECT p.id, p.slug, p.heading_en, p.heading_hi, p.heading_mr, p.created_at, p.updated_at,
            (
              SELECT COUNT(*)
              FROM program_sections ps
              WHERE ps.program_id = p.id AND ps.is_active = 1
            ) AS section_count
     FROM programs p
     WHERE p.is_active = 1
       AND (
         :search = ''
         OR p.heading_en LIKE :like ESCAPE '\\\\'
         OR p.heading_hi LIKE :like ESCAPE '\\\\'
         OR p.heading_mr LIKE :like ESCAPE '\\\\'
         OR p.slug LIKE :like ESCAPE '\\\\'
       )
     ORDER BY p.updated_at DESC, p.id DESC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    { search, like }
  );

  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      headingEn: row.heading_en,
      headingHi: row.heading_hi,
      headingMr: row.heading_mr,
      sectionCount: Number(row.section_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
  });
});

export const getPublicProgram = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const tree = await loadProgramTree(id, { includeCorrect: false });
  tree.sections = filterSectionsWithQuestions(tree.sections);
  const userId = req.user.id;
  const sectionIds = tree.sections.map((section) => section.id);
  const { bySection, answersBySection } = await loadSubmissionMap(userId, sectionIds);
  const videoBySection = await loadVideoProgressMap(userId, sectionIds);

  const sections = tree.sections.map((section) => {
    const submission = bySection.get(section.id);
    const answers = answersBySection.get(section.id) || [];
    const videoProgress = videoBySection.get(section.id) || {
      maxWatchedSeconds: 0,
      durationSeconds: 0,
      watchPercent: 0,
      isCompleted: false,
      completedAt: null,
    };
    return {
      ...section,
      videoProgress,
      videoCompleted: Boolean(videoProgress.isCompleted),
      submitted: Boolean(submission),
      submission: submission
        ? {
            correctCount: Number(submission.correct_count),
            totalCount: Number(submission.total_count),
            submittedAt: submission.submitted_at,
            results: answers.map((item) => ({
              questionId: item.questionId,
              optionId: item.optionId,
              isCorrect: item.isCorrect,
            })),
          }
        : null,
    };
  });

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    data: {
      ...tree,
      sections,
    },
  });
});

export const reportSectionVideoProgress = asyncHandler(async (req, res) => {
  const { programId, sectionId } = req.validated.params;
  const { currentTime, duration, ended } = req.validated.body;
  const userId = req.user.id;

  await assertSectionBelongsToProgram(programId, sectionId);

  const [existingRows] = await pool.query(
    `SELECT id, max_watched_seconds, duration_seconds, is_completed, completed_at
     FROM program_section_video_progress
     WHERE user_id = :userId AND section_id = :sectionId
     LIMIT 1`,
    { userId, sectionId }
  );

  const existing = existingRows[0] || null;
  if (existing?.is_completed) {
    return res.json({
      success: true,
      message: 'Video already completed',
      data: {
        maxWatchedSeconds: Number(existing.max_watched_seconds || 0),
        durationSeconds: Number(existing.duration_seconds || duration),
        watchPercent: 100,
        isCompleted: true,
        completedAt: existing.completed_at,
      },
    });
  }

  const previousMax = Number(existing?.max_watched_seconds || 0);
  const nextMax = clampReportedWatchTime({
    previousMaxWatched: previousMax,
    reportedCurrentTime: currentTime,
    duration,
  });
  const watchPercent = computeWatchPercent(nextMax, duration);
  const completed = isVideoWatchComplete({
    maxWatchedSeconds: nextMax,
    durationSeconds: duration,
    ended,
  });

  if (existing) {
    await pool.query(
      `UPDATE program_section_video_progress
       SET max_watched_seconds = :maxWatched,
           duration_seconds = :duration,
           watch_percent = :watchPercent,
           is_completed = :isCompleted,
           completed_at = CASE
             WHEN :isCompleted = 1 AND completed_at IS NULL THEN CURRENT_TIMESTAMP
             ELSE completed_at
           END
       WHERE id = :id`,
      {
        id: existing.id,
        maxWatched: nextMax,
        duration,
        watchPercent,
        isCompleted: completed ? 1 : 0,
      }
    );
  } else {
    await pool.query(
      `INSERT INTO program_section_video_progress
        (user_id, section_id, max_watched_seconds, duration_seconds, watch_percent, is_completed, completed_at)
       VALUES
        (:userId, :sectionId, :maxWatched, :duration, :watchPercent, :isCompleted,
         CASE WHEN :isCompleted = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)`,
      {
        userId,
        sectionId,
        maxWatched: nextMax,
        duration,
        watchPercent,
        isCompleted: completed ? 1 : 0,
      }
    );
  }

  const [fresh] = await pool.query(
    `SELECT max_watched_seconds, duration_seconds, watch_percent, is_completed, completed_at
     FROM program_section_video_progress
     WHERE user_id = :userId AND section_id = :sectionId
     LIMIT 1`,
    { userId, sectionId }
  );

  res.json({
    success: true,
    message: completed ? 'Video completed. Quiz unlocked.' : 'Watch progress saved',
    data: {
      maxWatchedSeconds: Number(fresh[0].max_watched_seconds || 0),
      durationSeconds: Number(fresh[0].duration_seconds || 0),
      watchPercent: Number(fresh[0].watch_percent || 0),
      isCompleted: Boolean(fresh[0].is_completed),
      completedAt: fresh[0].completed_at,
    },
  });
});

export const submitPublicSection = asyncHandler(async (req, res) => {
  const { programId, sectionId } = req.validated.params;
  const { answers } = req.validated.body;
  const userId = req.user.id;

  const tree = await loadProgramTree(programId, { includeCorrect: true });
  const section = tree.sections.find((item) => item.id === sectionId);
  if (!section) {
    throw httpError('Section not found', 404);
  }

  if (!section.questions.length) {
    throw httpError('This section has no questions yet', 400);
  }

  const [videoRows] = await pool.query(
    `SELECT is_completed
     FROM program_section_video_progress
     WHERE user_id = :userId AND section_id = :sectionId
     LIMIT 1`,
    { userId, sectionId }
  );

  if (!videoRows.length || !videoRows[0].is_completed) {
    throw httpError(
      'Please watch the complete section video before answering the quiz.',
      403,
      [{ field: 'video', message: 'Watch the full video to unlock the quiz' }]
    );
  }

  const questionMap = new Map(section.questions.map((question) => [question.id, question]));
  if (answers.length !== section.questions.length) {
    throw httpError('All questions are mandatory. Please answer every question.', 400, [
      { field: 'answers', message: 'Answer every question before submitting' },
    ]);
  }

  for (const question of section.questions) {
    if (!answers.some((answer) => answer.questionId === question.id)) {
      throw httpError('All questions are mandatory. Please answer every question.', 400, [
        { field: 'answers', message: `Missing answer for question ${question.id}` },
      ]);
    }
  }

  const scored = [];
  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw httpError('One or more answers are invalid for this section', 400);
    }

    const option = question.options.find((item) => item.id === answer.optionId);
    if (!option) {
      throw httpError('Selected option is invalid for a question', 400, [
        { field: 'answers', message: `Invalid option for question ${answer.questionId}` },
      ]);
    }

    scored.push({
      questionId: question.id,
      optionId: option.id,
      isCorrect: Boolean(option.isCorrect),
    });
  }

  const correctCount = scored.filter((item) => item.isCorrect).length;
  const totalCount = scored.length;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id
       FROM program_section_submissions
       WHERE user_id = :userId AND section_id = :sectionId
       LIMIT 1
       FOR UPDATE`,
      { userId, sectionId }
    );

    let submissionId;
    if (existing.length) {
      submissionId = existing[0].id;
      await connection.query(
        `UPDATE program_section_submissions
         SET correct_count = :correctCount,
             total_count = :totalCount,
             submitted_at = CURRENT_TIMESTAMP
         WHERE id = :submissionId`,
        { submissionId, correctCount, totalCount }
      );
      await connection.query(`DELETE FROM program_section_answers WHERE submission_id = :submissionId`, {
        submissionId,
      });
    } else {
      const [insertResult] = await connection.query(
        `INSERT INTO program_section_submissions
          (user_id, section_id, correct_count, total_count)
         VALUES
          (:userId, :sectionId, :correctCount, :totalCount)`,
        { userId, sectionId, correctCount, totalCount }
      );
      submissionId = insertResult.insertId;
    }

    for (const item of scored) {
      await connection.query(
        `INSERT INTO program_section_answers
          (submission_id, question_id, option_id, is_correct)
         VALUES
          (:submissionId, :questionId, :optionId, :isCorrect)`,
        {
          submissionId,
          questionId: item.questionId,
          optionId: item.optionId,
          isCorrect: item.isCorrect ? 1 : 0,
        }
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.json({
    success: true,
    message: 'Section submitted successfully',
    data: {
      sectionId,
      correctCount,
      totalCount,
      results: scored.map((item) => ({
        questionId: item.questionId,
        optionId: item.optionId,
        isCorrect: item.isCorrect,
      })),
    },
  });
});
