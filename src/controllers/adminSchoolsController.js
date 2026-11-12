import pool from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPagination, escapeLike } from '../utils/sql.js';

function httpError(message, statusCode = 400, errors = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
}

export const listAdminSchools = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.validated.query;
  const like = `%${escapeLike(search)}%`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM schools
     WHERE is_active = 1
       AND (:search = '' OR name LIKE :like ESCAPE '\\\\')`,
    { search, like }
  );

  const total = Number(countRows[0]?.total || 0);
  const pagination = buildPagination({ page, limit, total });

  // LIMIT/OFFSET must be inlined integers (already validated) — mysql2 named binds are unreliable here
  const [rows] = await pool.query(
    `SELECT id, name, created_at, updated_at
     FROM schools
     WHERE is_active = 1
       AND (:search = '' OR name LIKE :like ESCAPE '\\\\')
     ORDER BY name ASC
     LIMIT ${pagination.limit} OFFSET ${pagination.offset}`,
    {
      search,
      like,
    }
  );

  res.json({
    success: true,
    data: rows,
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

export const getAdminSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;

  const [rows] = await pool.query(
    `SELECT id, name, created_at, updated_at
     FROM schools
     WHERE id = :id AND is_active = 1
     LIMIT 1`,
    { id }
  );

  if (!rows.length) {
    throw httpError('School not found', 404);
  }

  res.json({
    success: true,
    data: rows[0],
  });
});

export const createAdminSchool = asyncHandler(async (req, res) => {
  const { name } = req.validated.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id, name, is_active
       FROM schools
       WHERE name = :name
       LIMIT 1
       FOR UPDATE`,
      { name }
    );

    if (existing.length && existing[0].is_active) {
      throw httpError('A school with this name already exists', 409, [
        { field: 'name', message: 'A school with this name already exists' },
      ]);
    }

    if (existing.length && !existing[0].is_active) {
      await connection.query(
        `UPDATE schools
         SET is_active = 1, city = NULL
         WHERE id = :id`,
        { id: existing[0].id }
      );

      const [restored] = await connection.query(
        `SELECT id, name, created_at, updated_at
         FROM schools
         WHERE id = :id
         LIMIT 1`,
        { id: existing[0].id }
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: 'School restored successfully',
        data: restored[0],
      });
    }

    const [result] = await connection.query(
      `INSERT INTO schools (name, city, is_active)
       VALUES (:name, NULL, 1)`,
      { name }
    );

    const [created] = await connection.query(
      `SELECT id, name, created_at, updated_at
       FROM schools
       WHERE id = :id
       LIMIT 1`,
      { id: result.insertId }
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: created[0],
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const updateAdminSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { name } = req.validated.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [current] = await connection.query(
      `SELECT id, name
       FROM schools
       WHERE id = :id AND is_active = 1
       LIMIT 1
       FOR UPDATE`,
      { id }
    );

    if (!current.length) {
      throw httpError('School not found', 404);
    }

    const [duplicate] = await connection.query(
      `SELECT id
       FROM schools
       WHERE name = :name AND id <> :id
       LIMIT 1`,
      { name, id }
    );

    if (duplicate.length) {
      throw httpError('A school with this name already exists', 409, [
        { field: 'name', message: 'A school with this name already exists' },
      ]);
    }

    await connection.query(
      `UPDATE schools
       SET name = :name
       WHERE id = :id AND is_active = 1`,
      { name, id }
    );

    const [updated] = await connection.query(
      `SELECT id, name, created_at, updated_at
       FROM schools
       WHERE id = :id
       LIMIT 1`,
      { id }
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'School updated successfully',
      data: updated[0],
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

export const deleteAdminSchool = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [current] = await connection.query(
      `SELECT id, name
       FROM schools
       WHERE id = :id AND is_active = 1
       LIMIT 1
       FOR UPDATE`,
      { id }
    );

    if (!current.length) {
      throw httpError('School not found', 404);
    }

    const [linked] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE school_id = :id`,
      { id }
    );

    const linkedCount = Number(linked[0]?.total || 0);

    if (linkedCount > 0) {
      await connection.query(
        `UPDATE schools
         SET is_active = 0
         WHERE id = :id`,
        { id }
      );
      await connection.commit();

      return res.json({
        success: true,
        message:
          'School deactivated because students are linked to it. It will no longer appear in signup.',
        data: { id, deactivated: true },
      });
    }

    await connection.query(`DELETE FROM schools WHERE id = :id`, { id });
    await connection.commit();

    return res.json({
      success: true,
      message: 'School deleted successfully',
      data: { id, deleted: true },
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
