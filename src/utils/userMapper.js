/** Public student shape — never includes password fields */
export function mapPublicUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    phoneDisplay: `+91${row.phone}`,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    schoolId: row.school_id,
    schoolName: row.school_name || null,
    standard: row.standard,
    division: row.division,
    rollNumber: row.roll_number,
    preferredLanguage: row.preferred_language,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export const PUBLIC_USER_SELECT = `
  u.id,
  u.email,
  u.phone,
  u.first_name,
  u.last_name,
  u.school_id,
  s.name AS school_name,
  u.standard,
  u.division,
  u.roll_number,
  u.preferred_language,
  u.is_active,
  u.created_at
`;
