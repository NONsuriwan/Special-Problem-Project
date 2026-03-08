import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();

  // Already logged in → go to dashboard
  if (session) {
    redirect(303, '/');
  }

  return {};
};
