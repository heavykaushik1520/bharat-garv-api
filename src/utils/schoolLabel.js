/** Normalize school/ward text for storage and comparison. */
export function normalizeSchoolText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function formatSchoolLabel({ name, ward } = {}) {
  const safeName = normalizeSchoolText(name);
  const safeWard = normalizeSchoolText(ward);
  if (!safeName) return '';
  return safeWard ? `${safeName} · ${safeWard}` : safeName;
}
