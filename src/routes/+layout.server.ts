import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth();

  // Protect all routes except /login
  if (!session && event.url.pathname !== '/login') {
    redirect(303, '/login');
  }

  return { session };
};
