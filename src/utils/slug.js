const MAX_SLUG_LENGTH = 180;

export function slugify(input = '', { maxLength = MAX_SLUG_LENGTH } = {}) {
  const base = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  const trimmed = base.slice(0, maxLength).replace(/-+$/g, '');
  return trimmed || 'program';
}

export function isNumericId(value) {
  return /^\d+$/.test(String(value || '').trim());
}
