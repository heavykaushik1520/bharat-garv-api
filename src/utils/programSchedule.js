import { httpError } from './httpError.js';

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse admin/API date input to YYYY-MM-DD (calendar date, no time).
 * Accepts YYYY-MM-DD, ISO datetimes, or Date.
 */
export function toDateOnlyString(value, field = 'date') {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw httpError(`Invalid ${field}`, 400, [
        { field, message: `Enter a valid ${field}` },
      ]);
    }
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value || '').trim();
  if (!raw) {
    throw httpError(`${field} is required`, 400, [
      { field, message: `${field} is required` },
    ]);
  }

  const datePart = raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10).replace(' ', '');
  const match = DATE_ONLY_RE.exec(datePart);
  if (!match) {
    throw httpError(`Invalid ${field}`, 400, [
      { field, message: `Enter a valid ${field}` },
    ]);
  }

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw httpError(`Invalid ${field}`, 400, [
      { field, message: `Enter a valid ${field}` },
    ]);
  }

  return `${y}-${m}-${d}`;
}

/** Start of calendar day → MySQL DATETIME (UTC). */
export function toMysqlStartOfDayUtc(value, field = 'startsAt') {
  const dateOnly = toDateOnlyString(value, field);
  return `${dateOnly} 00:00:00`;
}

/** End of calendar day → MySQL DATETIME (UTC). */
export function toMysqlEndOfDayUtc(value, field = 'endsAt') {
  const dateOnly = toDateOnlyString(value, field);
  return `${dateOnly} 23:59:59`;
}

/** @deprecated Prefer toMysqlStartOfDayUtc / toMysqlEndOfDayUtc for schedules. */
export function toMysqlDateTimeUtc(value, field = 'date') {
  return toMysqlStartOfDayUtc(value, field);
}

export function mysqlDateTimeToIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  const raw = String(value).trim();
  // MySQL DATETIME without timezone → treat as UTC
  const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /Z$|[+-]\d{2}:\d{2}$/.test(isoLike) ? isoLike : `${isoLike}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Calendar YYYY-MM-DD from MySQL DATETIME / ISO (UTC date parts). */
export function mysqlDateTimeToDateOnly(value) {
  const iso = mysqlDateTimeToIso(value);
  return iso ? iso.slice(0, 10) : null;
}

export function getProgramScheduleStatus(startsAt, endsAt, now = new Date()) {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const nowMs = now.getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 'unknown';
  if (nowMs < startMs) return 'upcoming';
  if (nowMs > endMs) return 'ended';
  return 'open';
}

export function buildSchedulePayload(startsAt, endsAt, now = new Date()) {
  const startsAtIso = mysqlDateTimeToIso(startsAt);
  const endsAtIso = mysqlDateTimeToIso(endsAt);
  const status = getProgramScheduleStatus(startsAtIso || startsAt, endsAtIso || endsAt, now);

  return {
    startsAt: startsAtIso,
    endsAt: endsAtIso,
    startsOn: mysqlDateTimeToDateOnly(startsAt),
    endsOn: mysqlDateTimeToDateOnly(endsAt),
    scheduleStatus: status,
    isOpen: status === 'open',
  };
}

export function assertValidScheduleWindow(startsAtMysql, endsAtMysql) {
  const start = new Date(`${String(startsAtMysql).replace(' ', 'T')}Z`);
  const end = new Date(`${String(endsAtMysql).replace(' ', 'T')}Z`);

  if (!(end.getTime() > start.getTime())) {
    throw httpError('End date must be on or after start date', 400, [
      { field: 'endsAt', message: 'End date must be on or after start date' },
    ]);
  }
}

/** Block student participation outside the admin-defined window. */
export function assertProgramOpen(program, now = new Date()) {
  const schedule = buildSchedulePayload(program.starts_at, program.ends_at, now);

  if (schedule.scheduleStatus === 'upcoming') {
    throw httpError('This programme has not started yet', 403, [
      {
        field: 'startsAt',
        message: 'This programme has not started yet',
        code: 'PROGRAM_NOT_STARTED',
      },
    ]);
  }

  if (schedule.scheduleStatus === 'ended') {
    throw httpError('This programme has ended', 403, [
      {
        field: 'endsAt',
        message: 'This programme has ended',
        code: 'PROGRAM_ENDED',
      },
    ]);
  }

  if (!schedule.isOpen) {
    throw httpError('This programme is not open for participation', 403, [
      { field: 'schedule', message: 'This programme is not open for participation' },
    ]);
  }

  return schedule;
}
