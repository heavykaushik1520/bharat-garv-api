/** Normalize school/ward/medium text for storage and comparison. */
export function normalizeSchoolText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Secondary line: `ward : X | medium : Y` */
export function formatSchoolMeta({ ward, medium } = {}) {
  const safeWard = normalizeSchoolText(ward);
  const safeMedium = normalizeSchoolText(medium);
  const parts = [];
  if (safeWard) parts.push(`ward : ${safeWard}`);
  if (safeMedium) parts.push(`medium : ${safeMedium}`);
  return parts.join(' | ');
}

/**
 * Single-line label for emails, exports, and compact UI.
 * Example: `School Name · ward : Ward 1 | medium : English`
 */
export function formatSchoolLabel({ name, ward, medium } = {}) {
  const safeName = normalizeSchoolText(name);
  if (!safeName) return '';
  const meta = formatSchoolMeta({ ward, medium });
  return meta ? `${safeName} · ${meta}` : safeName;
}
