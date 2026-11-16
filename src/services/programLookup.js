import pool from '../config/db.js';
import { httpError } from '../utils/httpError.js';
import { isNumericId, slugify } from '../utils/slug.js';

const PROGRAM_SELECT = `id, slug, heading_en, heading_hi, heading_mr, starts_at, ends_at, is_active, created_at, updated_at`;

export async function findActiveProgramByRef(ref, connection = pool) {
  const value = String(ref || '').trim();
  if (!value) return null;

  if (isNumericId(value)) {
    const [rows] = await connection.query(
      `SELECT ${PROGRAM_SELECT}
       FROM programs
       WHERE id = :id AND is_active = 1
       LIMIT 1`,
      { id: Number(value) }
    );
    return rows[0] || null;
  }

  const [rows] = await connection.query(
    `SELECT ${PROGRAM_SELECT}
     FROM programs
     WHERE slug = :slug AND is_active = 1
     LIMIT 1`,
    { slug: value.toLowerCase() }
  );
  return rows[0] || null;
}

export async function requireActiveProgramByRef(ref, connection = pool) {
  const program = await findActiveProgramByRef(ref, connection);
  if (!program) {
    throw httpError('Program not found', 404);
  }
  return program;
}

export async function ensureUniqueProgramSlug(baseInput, { excludeId = null, connection = pool } = {}) {
  const base = slugify(baseInput);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [rows] = await connection.query(
      `SELECT id
       FROM programs
       WHERE slug = :slug
         AND (:excludeId IS NULL OR id <> :excludeId)
       LIMIT 1`,
      { slug: candidate, excludeId }
    );

    if (!rows.length) return candidate;

    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 180 - suffixText.length))}${suffixText}`;
    suffix += 1;

    if (suffix > 1000) {
      candidate = `${base.slice(0, 160)}-${Date.now()}`;
      return candidate;
    }
  }
}

async function findSlugHolder(slug, { excludeId = null, connection = pool } = {}) {
  const [rows] = await connection.query(
    `SELECT id, is_active
     FROM programs
     WHERE slug = :slug
       AND (:excludeId IS NULL OR id <> :excludeId)
     LIMIT 1`,
    { slug, excludeId }
  );
  return rows[0] || null;
}

/** Soft-deleted rows keep a unique index row — rename so the slug can be reused. */
export async function releaseProgramSlug(programId, { connection = pool } = {}) {
  const [rows] = await connection.query(
    `SELECT id, slug
     FROM programs
     WHERE id = :id
     LIMIT 1`,
    { id: programId }
  );
  const row = rows[0];
  if (!row?.slug) return null;

  const freed = await ensureUniqueProgramSlug(`${row.slug}-deleted-${row.id}`, {
    excludeId: row.id,
    connection,
  });

  await connection.query(
    `UPDATE programs
     SET slug = :slug
     WHERE id = :id`,
    { id: row.id, slug: freed }
  );

  return freed;
}

async function reclaimInactiveSlug(slug, { excludeId = null, connection = pool } = {}) {
  const holder = await findSlugHolder(slug, { excludeId, connection });
  if (!holder) return;

  if (Number(holder.is_active) === 1) {
    throw httpError('This slug is already in use', 409, [
      { field: 'slug', message: 'This slug is already in use. Choose another.' },
    ]);
  }

  await releaseProgramSlug(holder.id, { connection });
}

/**
 * Admin-provided slug wins when present.
 * Empty slug falls back to a unique slug from the English heading.
 * Soft-deleted programs holding the same slug are renamed so it can be reused.
 */
export async function resolveAdminProgramSlug({
  slugInput,
  headingEn,
  excludeId = null,
  connection = pool,
} = {}) {
  const raw = String(slugInput || '').trim();

  if (raw) {
    const normalized = slugify(raw);
    if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      throw httpError('Enter a valid URL slug (letters, numbers, hyphens)', 400, [
        { field: 'slug', message: 'Enter a valid URL slug (letters, numbers, hyphens)' },
      ]);
    }

    await reclaimInactiveSlug(normalized, { excludeId, connection });
    return normalized;
  }

  const preferred = slugify(headingEn || 'program');
  const inactiveHolder = await findSlugHolder(preferred, { excludeId, connection });
  if (inactiveHolder && Number(inactiveHolder.is_active) !== 1) {
    await releaseProgramSlug(inactiveHolder.id, { connection });
  }

  return ensureUniqueProgramSlug(headingEn || 'program', { excludeId, connection });
}
