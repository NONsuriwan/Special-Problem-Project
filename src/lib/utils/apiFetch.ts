export const SESSION_EXPIRED_MSG = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { credentials: 'include', ...init });
  if (res.status === 401) {
    window.location.href = '/login';
    // Return a never-resolving promise so caller code doesn't continue
    return new Promise(() => {});
  }
  return res;
}

export function getErrorMessage(err: unknown, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่'): string {
  if (err instanceof Error) {
    if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
      return SESSION_EXPIRED_MSG;
    }
    if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed')) {
      return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
    }
  }
  return fallback;
}
