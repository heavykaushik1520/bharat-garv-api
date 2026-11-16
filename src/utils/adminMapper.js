export const PUBLIC_ADMIN_SELECT = `
  a.id,
  a.email,
  a.name,
  a.is_active,
  a.last_login_at,
  a.created_at,
  a.updated_at
`;

export function mapPublicAdmin(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: 'admin',
  };
}
