export function formatPrice(price: string | null): string {
  if (!price) return '-';
  return parseFloat(price).toLocaleString('th-TH');
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    available: 'ปกติ',
    borrowed: 'ถูกยืม',
    repairing: 'กำลังซ่อม',
    unavailable: 'ไม่พร้อมใช้งาน',
    disposed: 'จำหน่ายแล้ว',
  };
  return statusMap[status] || status;
}
