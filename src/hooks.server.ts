import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Paths that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/auth'];

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    event.locals.isAuthenticated = false;
    return resolve(event);
  }

  const accessToken = event.cookies.get('access_token');
  const refreshToken = event.cookies.get('refresh_token');

  if (accessToken) {
    event.locals.accessToken = accessToken;
    event.locals.isAuthenticated = true;
  } else if (refreshToken) {
    // No access token but has refresh token → ask backend to issue new access token.
    // Backend reads refresh_token from the request cookie, so we forward all cookies.
    try {
      const apiUrl = (env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

      // Forward browser cookies to backend so it can read refresh_token
      const cookieHeader = event.cookies
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');



      const res = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: cookieHeader }
      });


      if (res.ok) {
        // Backend sets new cookies in Set-Cookie response header.
        // Parse and mirror them to the browser.
        const setCookie = res.headers.get('set-cookie') ?? '';

        // parse access_token
        const accessMatch = setCookie.match(/access_token=([^;]+)/);
        // parse refresh_token ด้วย ในกรณีที่ backend rotate
        const refreshMatch = setCookie.match(/refresh_token=([^;]+)/);

        if (accessMatch) {
          const newToken = accessMatch[1];
          event.cookies.set('access_token', newToken, {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 15, // 15 minutes
          });
          event.locals.accessToken = newToken;
          event.locals.isAuthenticated = true;
        } else {
          // Refresh succeeded but couldn't parse new token — still mark authenticated
          event.locals.isAuthenticated = true;
        }

        // ถ้า backend ออก refresh_token ใหม่มาด้วย ให้ set ให้ browser ด้วย
        if (refreshMatch) {
          event.cookies.set('refresh_token', refreshMatch[1], {
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 วัน
          });
        }
      } else {
        // Refresh failed — ไม่ลบ refresh_token ทันที เผื่อ backend down ชั่วคราว
        redirect(303, '/login');
      }
    } catch (err) {
      redirect(303, '/login');
    }
  } else {
    // No tokens at all → redirect to login
    redirect(303, '/login');
  }

  return resolve(event);
};