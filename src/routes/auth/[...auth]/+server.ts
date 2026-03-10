import { json } from '@sveltejs/kit';

// Auth.js catch-all route is no longer used.
// Authentication is handled by the backend (Google OAuth).
export function GET() {
  return json({ error: 'Not found' }, { status: 404 });
}

export function POST() {
  return json({ error: 'Not found' }, { status: 404 });
}
