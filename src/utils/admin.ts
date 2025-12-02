// src/utils/admin.ts

// put all admin emails here
const ADMIN_EMAILS = ['prathamsaiya1@gmail.com'];

type AnyUser = {
  email?: string | null;
} | null;

export function isAdmin(user: AnyUser): boolean {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email);
}
