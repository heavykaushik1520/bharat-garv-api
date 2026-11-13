import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';
import { buildPagination, escapeLike } from '../utils/sql.js';

/**
 * Participation = at least one quiz section submission.
 * Optional programId scopes all metrics to that programme's sections.
 */

function programFilterSql(programId, alias = 'sec') {
  return programId ? `AND ${alias}.program_id = :programId` : '';
}

function participantJoinSql(programId) {
  return `
    FROM program_section_submissions sub
    INNER JOIN program_sections sec
      ON sec.id = sub.section_id
     AND sec.is_active = 1
      ${programFilterSql(programId, 'sec')}
    INNER JOIN users u
      ON u.id = sub.user_id
     AND u.is_active = 1
  `;
}

export async function listActiveProgramsForAnalytics() {
  const [rows] = await pool.query(
    `SELECT id, slug, heading_en AS headingEn, is_active AS isActive
     FROM programs
     WHERE is_active = 1
     ORDER BY created_at DESC, id DESC`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    headingEn: row.headingEn,
    isActive: Boolean(row.isActive),
  }));
}

export async function assertProgramExists(programId) {
  if (!programId) return null;
  const [rows] = await pool.query(
    `SELECT id, slug, heading_en AS headingEn
     FROM programs
     WHERE id = :programId AND is_active = 1
     LIMIT 1`,
    { programId }
  );
  if (!rows.length) {
    throw httpError('Program not found', 404, [
      { field: 'programId', message: 'Program not found or inactive' },
    ]);
  }
  return {
    id: Number(rows[0].id),
    slug: rows[0].slug,
    headingEn: rows[0].headingEn,
  };
}

export async function getAnalyticsSummary(programId = null) {
  const params = { programId: programId || 0 };

  const [[summaryRows], [registeredRows]] = await Promise.all([
    pool.query(
      `
      SELECT
        COUNT(DISTINCT sub.user_id) AS totalStudentParticipants,
        COUNT(DISTINCT u.school_id) AS totalSchoolParticipants,
        COUNT(*) AS totalSubmissions,
        COALESCE(SUM(sub.correct_count), 0) AS correctAnswers,
        COALESCE(SUM(sub.total_count), 0) AS totalAnswers
      ${participantJoinSql(programId)}
      `,
      params
    ),
    pool.query(
      `SELECT COUNT(*) AS registeredStudents
       FROM users
       WHERE is_active = 1`
    ),
  ]);

  const row = summaryRows[0] || {};
  const correctAnswers = Number(row.correctAnswers || 0);
  const totalAnswers = Number(row.totalAnswers || 0);
  const correctAnswerPercentage =
    totalAnswers > 0 ? Number(((correctAnswers * 100) / totalAnswers).toFixed(2)) : 0;

  return {
    totalStudentParticipants: Number(row.totalStudentParticipants || 0),
    totalSchoolParticipants: Number(row.totalSchoolParticipants || 0),
    registeredStudents: Number(registeredRows[0]?.registeredStudents || 0),
    totalSubmissions: Number(row.totalSubmissions || 0),
    correctAnswers,
    totalAnswers,
    correctAnswerPercentage,
  };
}

export async function getClassWiseParticipation(programId = null) {
  const params = { programId: programId || 0 };
  const [rows] = await pool.query(
    `
    SELECT
      u.standard AS standard,
      COUNT(DISTINCT sub.user_id) AS studentParticipants,
      COALESCE(SUM(sub.correct_count), 0) AS correctAnswers,
      COALESCE(SUM(sub.total_count), 0) AS totalAnswers
    ${participantJoinSql(programId)}
    GROUP BY u.standard
    ORDER BY u.standard ASC
    `,
    params
  );

  const byStandard = new Map(
    rows.map((row) => {
      const correctAnswers = Number(row.correctAnswers || 0);
      const totalAnswers = Number(row.totalAnswers || 0);
      return [
        Number(row.standard),
        {
          standard: Number(row.standard),
          studentParticipants: Number(row.studentParticipants || 0),
          correctAnswers,
          totalAnswers,
          correctAnswerPercentage:
            totalAnswers > 0 ? Number(((correctAnswers * 100) / totalAnswers).toFixed(2)) : 0,
        },
      ];
    })
  );

  // Always return standards 5–9 so the admin UI stays stable.
  return [5, 6, 7, 8, 9].map((standard) => {
    return (
      byStandard.get(standard) || {
        standard,
        studentParticipants: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        correctAnswerPercentage: 0,
      }
    );
  });
}

export async function getSchoolWiseParticipation({
  programId = null,
  search = '',
  page = 1,
  limit = 20,
  sort = 'participants_desc',
} = {}) {
  const like = `%${escapeLike(search)}%`;
  const params = { programId: programId || 0, search, like };

  const orderBy = {
    participants_desc: 'studentParticipants DESC, schoolName ASC',
    participants_asc: 'studentParticipants ASC, schoolName ASC',
    name_asc: 'schoolName ASC',
    name_desc: 'schoolName DESC',
    accuracy_desc: 'correctAnswerPercentage DESC, studentParticipants DESC, schoolName ASC',
  }[sort] || 'studentParticipants DESC, schoolName ASC';

  const [countRows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM (
      SELECT s.id
      FROM schools s
      INNER JOIN users u
        ON u.school_id = s.id
       AND u.is_active = 1
      INNER JOIN program_section_submissions sub
        ON sub.user_id = u.id
      INNER JOIN program_sections sec
        ON sec.id = sub.section_id
       AND sec.is_active = 1
        ${programFilterSql(programId, 'sec')}
      WHERE s.is_active = 1
        AND (:search = '' OR s.name LIKE :like ESCAPE '\\\\')
      GROUP BY s.id
    ) counted
    `,
    params
  );

  const total = Number(countRows[0]?.total || 0);
  const pagination = buildPagination({ page, limit, total });

  const [rows] = await pool.query(
    `
    SELECT
      s.id AS schoolId,
      s.name AS schoolName,
      COUNT(DISTINCT sub.user_id) AS studentParticipants,
      (
        SELECT COUNT(*)
        FROM users ru
        WHERE ru.school_id = s.id
          AND ru.is_active = 1
      ) AS registeredStudents,
      COALESCE(SUM(sub.correct_count), 0) AS correctAnswers,
      COALESCE(SUM(sub.total_count), 0) AS totalAnswers,
      ROUND(
        CASE
          WHEN COALESCE(SUM(sub.total_count), 0) = 0 THEN 0
          ELSE (SUM(sub.correct_count) * 100) / SUM(sub.total_count)
        END,
        2
      ) AS correctAnswerPercentage
    FROM schools s
    INNER JOIN users u
      ON u.school_id = s.id
     AND u.is_active = 1
    INNER JOIN program_section_submissions sub
      ON sub.user_id = u.id
    INNER JOIN program_sections sec
      ON sec.id = sub.section_id
     AND sec.is_active = 1
      ${programFilterSql(programId, 'sec')}
    WHERE s.is_active = 1
      AND (:search = '' OR s.name LIKE :like ESCAPE '\\\\')
    GROUP BY s.id, s.name
    ORDER BY ${orderBy}
    LIMIT ${pagination.limit} OFFSET ${pagination.offset}
    `,
    params
  );

  return {
    items: rows.map((row) => ({
      schoolId: Number(row.schoolId),
      schoolName: row.schoolName,
      studentParticipants: Number(row.studentParticipants || 0),
      registeredStudents: Number(row.registeredStudents || 0),
      correctAnswers: Number(row.correctAnswers || 0),
      totalAnswers: Number(row.totalAnswers || 0),
      correctAnswerPercentage: Number(row.correctAnswerPercentage || 0),
    })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev,
    },
  };
}

function mapTopperRow(row) {
  const correctSum = Number(row.correctSum || 0);
  const totalSum = Number(row.totalSum || 0);
  return {
    rank: Number(row.rankNo || 0),
    userId: Number(row.userId),
    fullName: row.fullName,
    schoolId: Number(row.schoolId),
    schoolName: row.schoolName,
    standard: Number(row.standard),
    division: row.division,
    sectionsSubmitted: Number(row.sectionsSubmitted || 0),
    correctSum,
    totalSum,
    scorePercentage:
      totalSum > 0 ? Number(((correctSum * 100) / totalSum).toFixed(2)) : 0,
  };
}

async function getGroupedToppers({ programId = null, groupBy = 'school', limit = 5 } = {}) {
  const partitionColumn = groupBy === 'standard' ? 'standard' : 'school_id';
  const orderColumn = groupBy === 'standard' ? 'ranked.standard ASC' : 'ranked.school_name ASC';
  const params = { programId: programId || 0, limit };

  const [rows] = await pool.query(
    `
    SELECT
      ranked.rank_no AS rankNo,
      ranked.user_id AS userId,
      ranked.full_name AS fullName,
      ranked.school_id AS schoolId,
      ranked.school_name AS schoolName,
      ranked.standard AS standard,
      ranked.division AS division,
      ranked.sections_submitted AS sectionsSubmitted,
      ranked.correct_sum AS correctSum,
      ranked.total_sum AS totalSum
    FROM (
      SELECT
        scores.user_id,
        scores.full_name,
        scores.school_id,
        scores.school_name,
        scores.standard,
        scores.division,
        scores.sections_submitted,
        scores.correct_sum,
        scores.total_sum,
        ROW_NUMBER() OVER (
          PARTITION BY scores.${partitionColumn}
          ORDER BY
            scores.correct_sum DESC,
            scores.score_pct DESC,
            scores.sections_submitted DESC,
            scores.user_id ASC
        ) AS rank_no
      FROM (
        SELECT
          u.id AS user_id,
          CONCAT(u.first_name, ' ', u.last_name) AS full_name,
          u.school_id AS school_id,
          s.name AS school_name,
          u.standard AS standard,
          u.division AS division,
          COUNT(*) AS sections_submitted,
          SUM(sub.correct_count) AS correct_sum,
          SUM(sub.total_count) AS total_sum,
          ROUND(
            CASE
              WHEN SUM(sub.total_count) = 0 THEN 0
              ELSE (SUM(sub.correct_count) * 100) / SUM(sub.total_count)
            END,
            2
          ) AS score_pct
        ${participantJoinSql(programId)}
        INNER JOIN schools s
          ON s.id = u.school_id
         AND s.is_active = 1
        GROUP BY
          u.id,
          u.first_name,
          u.last_name,
          u.school_id,
          s.name,
          u.standard,
          u.division
      ) scores
    ) ranked
    WHERE ranked.rank_no <= :limit
    ORDER BY
      ${orderColumn},
      ranked.rank_no ASC
    `,
    params
  );

  return rows.map(mapTopperRow);
}

export async function getToppers({ programId = null, limit = 5 } = {}) {
  const [schoolWise, classWise] = await Promise.all([
    getGroupedToppers({ programId, groupBy: 'school', limit }),
    getGroupedToppers({ programId, groupBy: 'standard', limit }),
  ]);

  return { schoolWise, classWise };
}

export async function getDashboardAnalytics({
  programId = null,
  topLimit = 5,
  schoolPage = 1,
  schoolLimit = 20,
  schoolSearch = '',
  schoolSort = 'participants_desc',
} = {}) {
  const program = await assertProgramExists(programId);

  const [programs, summary, classWise, schoolWise, toppers] = await Promise.all([
    listActiveProgramsForAnalytics(),
    getAnalyticsSummary(programId),
    getClassWiseParticipation(programId),
    getSchoolWiseParticipation({
      programId,
      search: schoolSearch,
      page: schoolPage,
      limit: schoolLimit,
      sort: schoolSort,
    }),
    getToppers({ programId, limit: topLimit }),
  ]);

  return {
    filters: {
      programId: programId || null,
      program,
      topLimit,
    },
    programs,
    summary,
    classWise,
    schoolWise,
    toppers,
  };
}
