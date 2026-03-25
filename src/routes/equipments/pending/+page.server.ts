import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;
  const allowed = user?.role === 'admin' || user?.departmentId === 1;
  if (!allowed) throw redirect(303, '/');
  return {};
};
