import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Fallback handler — ใช้เมื่อ backend ยังมี FRONTEND_URL=http://localhost:5173/login
 * และ redirect มาที่ /login/auth/callback แทน /auth/callback
 * เมื่อ backend restart แล้ว route นี้จะไม่ถูกใช้งาน
 */
export const load: PageServerLoad = async ({ url, cookies }) => {
  const success = url.searchParams.get('success');
  const error = url.searchParams.get('error');

  if (error) {
    redirect(303, `/login?error=${encodeURIComponent(error)}`);
  }

  if (success !== 'true') {
    redirect(303, '/login');
  }

  const accessToken = cookies.get('access_token');
  const refreshToken = cookies.get('refresh_token');

  if (!accessToken && !refreshToken) {
    redirect(303, '/login?error=no_tokens');
  }

  redirect(303, '/');
};
