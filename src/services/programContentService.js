import pool from '../config/db.js';
import { requireActiveProgramByRef } from './programLookup.js';
import { httpError } from '../utils/httpError.js';
import { buildSchedulePayload } from '../utils/programSchedule.js';
import { youtubeEmbedUrl } from '../utils/youtube.js';

export function mapOption(row, { includeCorrect = false } = {}) {
  if (!row) return null;
  const option = {
    id: row.id,
    labelEn: row.label_en,
    labelHi: row.label_hi,
    labelMr: row.label_mr,
    sortOrder: row.sort_order,
  };
  if (includeCorrect) {
    option.isCorrect = Boolean(row.is_correct);
  }
  return option;
}

export function mapQuestion(row, options = [], { includeCorrect = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    sectionId: row.section_id,
    headlineEn: row.headline_en,
    headlineHi: row.headline_hi,
    headlineMr: row.headline_mr,
    hasImage: Boolean(row.has_image),
    imageUrl: row.image_url || null,
    sortOrder: row.sort_order,
    options: options
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => mapOption(item, { includeCorrect })),
  };
}

export function mapSection(row, questions = []) {
  if (!row) return null;
  const questionBankCount = Array.isArray(questions) ? questions.length : 0;
  const questionsToServe =
    row.questions_to_serve == null || row.questions_to_serve === ''
      ? null
      : Number(row.questions_to_serve);

  return {
    id: row.id,
    programId: row.program_id,
    titleEn: row.title_en,
    titleHi: row.title_hi,
    titleMr: row.title_mr,
    subtitleEn: row.subtitle_en,
    subtitleHi: row.subtitle_hi,
    subtitleMr: row.subtitle_mr,
    youtubeUrlEn: row.youtube_url_en,
    youtubeUrlHi: row.youtube_url_hi,
    youtubeUrlMr: row.youtube_url_mr,
    youtubeEmbedUrlEn: youtubeEmbedUrl(row.youtube_url_en),
    youtubeEmbedUrlHi: youtubeEmbedUrl(row.youtube_url_hi),
    youtubeEmbedUrlMr: youtubeEmbedUrl(row.youtube_url_mr),
    sortOrder: row.sort_order,
    questionsToServe,
    questionBankCount,
    questionsServed: questionsToServe == null ? questionBankCount : questionsToServe,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions,
  };
}

export async function assertActiveProgram(programRef, connection = pool) {
  return requireActiveProgramByRef(programRef, connection);
}

export async function assertActiveSection(programRef, sectionId, connection = pool) {
  const program = await assertActiveProgram(programRef, connection);
  const programId = program.id;

  const [rows] = await connection.query(
    `SELECT id, program_id, title_en, title_hi, title_mr, subtitle_en, subtitle_hi, subtitle_mr,
            youtube_url_en, youtube_url_hi, youtube_url_mr, sort_order, questions_to_serve,
            is_active, created_at, updated_at
     FROM program_sections
     WHERE id = :sectionId AND program_id = :programId AND is_active = 1
     LIMIT 1`,
    { programId, sectionId }
  );
  if (!rows.length) {
    throw httpError('Section not found', 404);
  }
  return rows[0];
}

export async function loadQuestionsForSections(sectionIds, { includeCorrect = false } = {}, connection = pool) {
  if (!sectionIds.length) return { questionsBySection: new Map(), optionsByQuestion: new Map() };

  const placeholders = sectionIds.map((_, index) => `:sid${index}`).join(', ');
  const params = Object.fromEntries(sectionIds.map((id, index) => [`sid${index}`, id]));

  const [questionRows] = await connection.query(
    `SELECT id, section_id, headline_en, headline_hi, headline_mr, has_image, image_url,
            sort_order, is_active, created_at, updated_at
     FROM program_questions
     WHERE is_active = 1 AND section_id IN (${placeholders})
     ORDER BY sort_order ASC, id ASC`,
    params
  );

  const questionIds = questionRows.map((row) => row.id);
  let optionRows = [];

  if (questionIds.length) {
    const optionPlaceholders = questionIds.map((_, index) => `:qid${index}`).join(', ');
    const optionParams = Object.fromEntries(questionIds.map((id, index) => [`qid${index}`, id]));
    const selectCorrect = includeCorrect ? ', is_correct' : '';

    [optionRows] = await connection.query(
      `SELECT id, question_id, label_en, label_hi, label_mr, sort_order${selectCorrect}
       FROM program_question_options
       WHERE question_id IN (${optionPlaceholders})
       ORDER BY sort_order ASC, id ASC`,
      optionParams
    );
  }

  const optionsByQuestion = new Map();
  for (const option of optionRows) {
    if (!optionsByQuestion.has(option.question_id)) {
      optionsByQuestion.set(option.question_id, []);
    }
    optionsByQuestion.get(option.question_id).push(option);
  }

  const questionsBySection = new Map();
  for (const question of questionRows) {
    const options = optionsByQuestion.get(question.id) || [];
    if (options.length !== 4) {
      // Skip incomplete questions from public payloads; admin still sees them via dedicated fetch if needed.
      if (!includeCorrect) continue;
    }
    if (!questionsBySection.has(question.section_id)) {
      questionsBySection.set(question.section_id, []);
    }
    questionsBySection.get(question.section_id).push(
      mapQuestion(question, options, { includeCorrect })
    );
  }

  return { questionsBySection, optionsByQuestion, questionRows };
}

export async function loadProgramTree(programRef, { includeCorrect = false } = {}, connection = pool) {
  const program = await assertActiveProgram(programRef, connection);
  const programId = program.id;
  const schedule = buildSchedulePayload(program.starts_at, program.ends_at);

  const [sectionRows] = await connection.query(
    `SELECT id, program_id, title_en, title_hi, title_mr, subtitle_en, subtitle_hi, subtitle_mr,
            youtube_url_en, youtube_url_hi, youtube_url_mr, sort_order, questions_to_serve,
            is_active, created_at, updated_at
     FROM program_sections
     WHERE program_id = :programId AND is_active = 1
     ORDER BY sort_order ASC, id ASC`,
    { programId }
  );

  const sectionIds = sectionRows.map((row) => row.id);
  const { questionsBySection } = await loadQuestionsForSections(
    sectionIds,
    { includeCorrect },
    connection
  );

  return {
    id: program.id,
    slug: program.slug,
    headingEn: program.heading_en,
    headingHi: program.heading_hi,
    headingMr: program.heading_mr,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    startsOn: schedule.startsOn,
    endsOn: schedule.endsOn,
    scheduleStatus: schedule.scheduleStatus,
    isOpen: schedule.isOpen,
    isActive: Boolean(program.is_active),
    createdAt: program.created_at,
    updatedAt: program.updated_at,
    sections: sectionRows.map((section) =>
      mapSection(section, questionsBySection.get(section.id) || [])
    ),
  };
}

export async function replaceQuestionOptions(connection, questionId, options) {
  const [existing] = await connection.query(
    `SELECT id, sort_order
     FROM program_question_options
     WHERE question_id = :questionId
     ORDER BY sort_order ASC`,
    { questionId }
  );

  if (existing.length === 4) {
    for (let index = 0; index < options.length; index += 1) {
      const option = options[index];
      const current = existing[index];
      await connection.query(
        `UPDATE program_question_options
         SET label_en = :labelEn,
             label_hi = :labelHi,
             label_mr = :labelMr,
             is_correct = :isCorrect,
             sort_order = :sortOrder
         WHERE id = :id AND question_id = :questionId`,
        {
          id: current.id,
          questionId,
          labelEn: option.labelEn,
          labelHi: option.labelHi,
          labelMr: option.labelMr,
          isCorrect: option.isCorrect ? 1 : 0,
          sortOrder: index + 1,
        }
      );
    }
    return;
  }

  if (existing.length) {
    await connection.query(`DELETE FROM program_question_options WHERE question_id = :questionId`, {
      questionId,
    });
  }

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    await connection.query(
      `INSERT INTO program_question_options
        (question_id, label_en, label_hi, label_mr, is_correct, sort_order)
       VALUES
        (:questionId, :labelEn, :labelHi, :labelMr, :isCorrect, :sortOrder)`,
      {
        questionId,
        labelEn: option.labelEn,
        labelHi: option.labelHi,
        labelMr: option.labelMr,
        isCorrect: option.isCorrect ? 1 : 0,
        sortOrder: index + 1,
      }
    );
  }
}

export async function nextSortOrder(table, parentColumn, parentId, connection = pool) {
  const allowed = {
    program_sections: 'program_id',
    program_questions: 'section_id',
  };
  if (allowed[table] !== parentColumn) {
    throw httpError('Invalid sort order lookup', 500);
  }

  const [rows] = await connection.query(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
     FROM ${table}
     WHERE ${parentColumn} = :parentId AND is_active = 1`,
    { parentId }
  );
  return Number(rows[0]?.next_order || 1);
}

/** Active question count for an active section (invariant: must stay >= 1). */
export async function countActiveQuestions(sectionId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM program_questions
     WHERE section_id = :sectionId AND is_active = 1`,
    { sectionId }
  );
  return Number(rows[0]?.total || 0);
}

/**
 * Inserts one question + 4 options inside an open transaction.
 * Caller owns commit/rollback and uploaded file cleanup.
 */
export async function insertQuestionWithOptions(
  connection,
  { sectionId, question, imageUrl = null, sortOrder }
) {
  const [result] = await connection.query(
    `INSERT INTO program_questions
      (section_id, headline_en, headline_hi, headline_mr, has_image, image_url, sort_order, is_active)
     VALUES
      (:sectionId, :headlineEn, :headlineHi, :headlineMr, :hasImage, :imageUrl, :sortOrder, 1)`,
    {
      sectionId,
      headlineEn: question.headlineEn,
      headlineHi: question.headlineHi,
      headlineMr: question.headlineMr,
      hasImage: question.hasImage ? 1 : 0,
      imageUrl: question.hasImage ? imageUrl : null,
      sortOrder,
    }
  );

  await replaceQuestionOptions(connection, result.insertId, question.options);
  return result.insertId;
}

/** Public/player payloads should never expose empty question cavities. */
export function filterSectionsWithQuestions(sections = []) {
  return sections.filter((section) => Array.isArray(section.questions) && section.questions.length > 0);
}
