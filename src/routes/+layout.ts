import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  return {
    title: 'แดชบอร์ด',
    ...data   // forward session from +layout.server.ts
  };
};
