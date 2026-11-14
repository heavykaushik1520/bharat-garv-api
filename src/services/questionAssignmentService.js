import crypto from 'crypto';
import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';

export const MAX_QUESTIONS_TO_SERVE = 100;
export const MAX_QUESTION_BANK_SIZE = 100;

/** Fisher–Yates using crypto for unbiased sampling under concurrent traffic. */
export function shuffleInPlace(items) {
  const list = items;
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    const temp = list[index];
    list[index] = list[swapIndex];
    list[swapIndex] = temp;
  }
  return list;
}

export function resolveServeCount(questionsToServe, bankSize) {
  const bank = Math.max(0, Number(bankSize) || 0);
  if (bank < 1) return 0;

  if (questionsToServe == null || questionsToServe === '') {
    return bank;
  }

  const requested = Number(questionsToServe);
  if (!Number.isInteger(requested) || requested < 1) {
    throw httpError('Questions per student must be a whole number between 1 and 100', 400, [
      { field: 'questionsToServe', message: 'Enter a whole number between 1 and 100, or leave empty for all' },
    ]);
  }

  if (requested > MAX_QUESTIONS_TO_SERVE) {
    throw httpError(`Questions per student cannot exceed ${MAX_QUESTIONS_TO_SERVE}`, 400, [
      { field: 'questionsToServe', message: `Maximum is ${MAX_QUESTIONS_TO_SERVE}` },
    ]);
  }

  if (requested > bank) {
    throw httpError(
      `This section needs at least ${requested} complete questions in the bank (currently ${bank}).`,
      400,
      [
        {
          field: 'questionsToServe',
          message: `Add more questions or lower “questions per student” to ${bank} or less`,
        },
      ]
    );
  }

  return requested;
}

async function loadAssignmentQuestionIds(assignmentId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT question_id
     FROM program_section_assignment_questions
     WHERE assignment_id = :assignmentId
     ORDER BY sort_order ASC, id ASC`,
    { assignmentId }
  );
  return rows.map((row) => Number(row.question_id));
}

async function loadExistingAssignments(userId, sectionIds, connection = pool) {
  const map = new Map();
  if (!userId || !sectionIds.length) return map;

  const placeholders = sectionIds.map((_, index) => `:sid${index}`).join(', ');
  const params = {
    userId,
    ...Object.fromEntries(sectionIds.map((id, index) => [`sid${index}`, id])),
  };

  const [rows] = await connection.query(
    `SELECT a.id, a.section_id, a.question_count, aq.question_id, aq.sort_order
     FROM program_section_question_assignments a
     INNER JOIN program_section_assignment_questions aq ON aq.assignment_id = a.id
     WHERE a.user_id = :userId AND a.section_id IN (${placeholders})
     ORDER BY a.section_id ASC, aq.sort_order ASC, aq.id ASC`,
    params
  );

  for (const row of rows) {
    if (!map.has(row.section_id)) {
      map.set(row.section_id, {
        id: row.id,
        sectionId: row.section_id,
        questionCount: Number(row.question_count),
        questionIds: [],
      });
    }
    map.get(row.section_id).questionIds.push(Number(row.question_id));
  }

  return map;
}

async function insertAssignment(userId, sectionId, questionIds, connection) {
  const [result] = await connection.query(
    `INSERT INTO program_section_question_assignments
      (user_id, section_id, question_count)
     VALUES
      (:userId, :sectionId, :questionCount)`,
    {
      userId,
      sectionId,
      questionCount: questionIds.length,
    }
  );

  const assignmentId = result.insertId;
  for (let index = 0; index < questionIds.length; index += 1) {
    await connection.query(
      `INSERT INTO program_section_assignment_questions
        (assignment_id, question_id, sort_order)
       VALUES
        (:assignmentId, :questionId, :sortOrder)`,
      {
        assignmentId,
        questionId: questionIds[index],
        sortOrder: index + 1,
      }
    );
  }

  return {
    id: assignmentId,
    sectionId,
    questionCount: questionIds.length,
    questionIds,
  };
}

/**
 * Pick N question ids from the eligible bank.
 * When serving the full bank, keep admin sort order (stable, non-random).
 */
export function pickQuestionIds(eligibleIds, serveCount) {
  const bank = eligibleIds.slice();
  if (serveCount >= bank.length) {
    return bank;
  }

  shuffleInPlace(bank);
  return bank.slice(0, serveCount);
}

/**
 * Ensure each section has a durable question set for this student.
 * Existing assignments are reused (refresh-safe). Missing ones are created once.
 */
export async function ensureQuestionAssignmentsForSections({
  userId,
  sections,
  connection = pool,
}) {
  if (!userId || !sections.length) {
    return new Map();
  }

  const sectionIds = sections.map((section) => section.id);
  const existing = await loadExistingAssignments(userId, sectionIds, connection);
  const result = new Map(existing);

  const missing = sections.filter((section) => !result.has(section.id));
  if (!missing.length) {
    return result;
  }

  const ownedConnection = connection === pool;
  const db = ownedConnection ? await pool.getConnection() : connection;

  try {
    if (ownedConnection) {
      await db.beginTransaction();
    }

    for (const section of missing) {
      const eligibleIds = (section.questions || [])
        .filter((question) => Array.isArray(question.options) && question.options.length === 4)
        .map((question) => question.id);

      if (!eligibleIds.length) {
        continue;
      }

      const serveCount = resolveServeCount(section.questionsToServe, eligibleIds.length);
      if (serveCount < 1) continue;

      const selectedIds = pickQuestionIds(eligibleIds, serveCount);

      try {
        const assignment = await insertAssignment(userId, section.id, selectedIds, db);
        result.set(section.id, assignment);
      } catch (error) {
        // Parallel first-load race: unique key means another request won — reload that row.
        if (error?.code === 'ER_DUP_ENTRY') {
          const [rows] = await db.query(
            `SELECT id
             FROM program_section_question_assignments
             WHERE user_id = :userId AND section_id = :sectionId
             LIMIT 1`,
            { userId, sectionId: section.id }
          );
          if (rows.length) {
            const questionIds = await loadAssignmentQuestionIds(rows[0].id, db);
            result.set(section.id, {
              id: rows[0].id,
              sectionId: section.id,
              questionCount: questionIds.length,
              questionIds,
            });
            continue;
          }
        }
        throw error;
      }
    }

    if (ownedConnection) {
      await db.commit();
    }
  } catch (error) {
    if (ownedConnection) {
      await db.rollback();
    }
    throw error;
  } finally {
    if (ownedConnection) {
      db.release();
    }
  }

  return result;
}

/**
 * Apply durable assignments onto section payloads for the student player.
 * Admin payloads should not call this — they need the full bank.
 */
export function applyAssignmentsToSections(sections, assignmentBySection) {
  return sections.map((section) => {
    const bankQuestions = Array.isArray(section.questions) ? section.questions : [];
    const bankCount = bankQuestions.length;
    const questionsToServe =
      section.questionsToServe == null ? null : Number(section.questionsToServe);

    const assignment = assignmentBySection.get(section.id);
    if (!assignment?.questionIds?.length) {
      return {
        ...section,
        questionBankCount: bankCount,
        questionsToServe,
        questionsServed: bankCount,
        questions: bankQuestions,
      };
    }

    const byId = new Map(bankQuestions.map((question) => [question.id, question]));
    const assignedQuestions = assignment.questionIds
      .map((questionId) => byId.get(questionId))
      .filter(Boolean);

    // If assigned rows vanished (hard-delete), fall back to remaining assigned matches.
    return {
      ...section,
      questionBankCount: bankCount,
      questionsToServe,
      questionsServed: assignedQuestions.length,
      questions: assignedQuestions,
    };
  });
}

export async function getAssignedQuestionIdsForSection(userId, sectionId, connection = pool) {
  const map = await loadExistingAssignments(userId, [sectionId], connection);
  return map.get(sectionId)?.questionIds || null;
}
