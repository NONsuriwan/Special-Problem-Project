import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE = (env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function proxyRequest(event: Parameters<RequestHandler>[0]) {
  const path = event.params.path;
  const url = `${API_BASE}/api/${path}${event.url.search}`;

  const headers = new Headers(event.request.headers);
  headers.delete('host');

  // forward cookie ทั้งหมดไปให้ backend (รวม access_token, refresh_token)
  const cookieHeader = event.cookies
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const res = await fetch(url, {
    method: event.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(event.request.method)
      ? undefined
      : await event.request.blob(),
  });

  return new Response(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

export const GET: RequestHandler = (event) => proxyRequest(event);
export const POST: RequestHandler = (event) => proxyRequest(event);
export const PUT: RequestHandler = (event) => proxyRequest(event);
export const PATCH: RequestHandler = (event) => proxyRequest(event);
export const DELETE: RequestHandler = (event) => proxyRequest(event);