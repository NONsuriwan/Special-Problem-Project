export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;

  const res = await fetch(path, {
    credentials: 'include',
    headers: isFormData
      ? { ...(options?.headers as Record<string, string>) }
      : { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Error! status: ${res.status}`);
  }

  return res.json();

}

export async function apiFetchBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(path, { credentials: 'include' });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(`Error! status: ${res.status}`);

  const blob = await res.blob();

  // ดึงชื่อไฟล์จาก Content-Disposition header
  // ตัวอย่าง header: attachment; filename="report.pdf"
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : 'download.pdf';

  return { blob, filename };
}