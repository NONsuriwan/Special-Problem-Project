import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Backend redirects here after Google OAuth success:
 *   GET /auth/callback?success=true
 *
 * Backend already set httpOnly cookies (access_token, refresh_token)
 * on localhost which are shared across all localhost ports.
 * SvelteKit reads them directly via event.cookies.
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

  // Cookies set by backend are readable here (localhost is port-agnostic in browsers)
  const accessToken = cookies.get('access_token');
  const refreshToken = cookies.get('refresh_token');

  if (!accessToken && !refreshToken) {
    redirect(303, '/login?error=no_tokens');
  }

  redirect(303, '/');
};
