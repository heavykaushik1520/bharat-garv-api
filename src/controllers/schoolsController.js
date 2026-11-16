import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeLike } from '../utils/sql.js';

function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Public school lookup for signup/profile.
 * Never returns the full catalog — search + capped limit only.
 * Callers should require the user to type before searching at scale.
 */
export const listSchools = asyncHandler(async (req, res) => {
  const { search, limit } = req.validated.query;
  const trimmed = String(search || '').trim();

  // Avoid dumping thousands of rows when search is empty
  if (trimmed.length < 2) {
    res.set('Cache-Control', 'public, max-age=15');
    return res.json({
      success: true,
      data: [],
      meta: {
        search: trimmed,
        limit,
        minSearchLength: 2,
        message: 'Type at least 2 characters to search schools',
      },
    });
  }

  const like = `%${escapeLike(trimmed)}%`;
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

  const [rows] = await pool.query(
    `SELECT id, name, ward
     FROM schools
     WHERE is_active = 1
       AND (
         name LIKE :like ESCAPE '\\\\'
         OR ward LIKE :like ESCAPE '\\\\'
       )
     ORDER BY
       CASE WHEN name LIKE :prefix ESCAPE '\\\\' THEN 0 ELSE 1 END,
       name ASC,
       ward ASC
     LIMIT ${safeLimit}`,
    {
      like,
      prefix: `${escapeLike(trimmed)}%`,
    }
  );

  res.set('Cache-Control', 'public, max-age=20');
  res.json({
    success: true,
    data: rows,
    meta: {
      search: trimmed,
      limit: safeLimit,
      count: rows.length,
      truncated: rows.length >= safeLimit,
    },
  });
});

export const getSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const [rows] = await pool.query(
    `SELECT id, name, ward
     FROM schools
     WHERE id = :id AND is_active = 1
     LIMIT 1`,
    { id }
  );

  if (!rows.length) {
    throw httpError('School not found', 404);
  }

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    success: true,
    data: rows[0],
  });
});
