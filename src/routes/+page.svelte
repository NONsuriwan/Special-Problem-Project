<script lang="ts">
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  let stats = [
    { label: 'ครุภัณฑ์ทั้งหมด', value: '-', icon: 'box',          color: '#f39c12', bg: '#fff8ec' },
    { label: 'พร้อมใช้งาน',      value: '-', icon: 'check-circle', color: '#16a34a', bg: '#f0fdf4' },
    { label: 'ถูกยืม',           value: '-', icon: 'inbox',        color: '#2563eb', bg: '#eff6ff' },
    { label: 'กำลังซ่อม',        value: '-', icon: 'wrench',       color: '#d97706', bg: '#fffbeb' },
    { label: 'ไม่พร้อมใช้งาน',  value: '-', icon: 'x-circle',     color: '#dc2626', bg: '#fef2f2' },
    { label: 'จำหน่ายแล้ว',      value: '-', icon: 'trash',        color: '#6b7280', bg: '#f3f4f6' },
  ];

  function getCount(byStatus: { status: string; count: number }[], status: string): string {
    return String(byStatus.find(s => s.status === status)?.count ?? 0);
  }

  onMount(async () => {
    try {
      const { data } = await apiFetch<{ data: { total: string; byStatus: { status: string; count: number }[] } }>(API_ENDPOINTS.ASSET_STATS);
      const by = data.byStatus ?? [];
      stats = [
        { label: 'ครุภัณฑ์ทั้งหมด', value: Number(data.total).toLocaleString('th-TH'), icon: 'box',          color: '#f39c12', bg: '#fff8ec' },
        { label: 'พร้อมใช้งาน',      value: getCount(by, 'normal'),      icon: 'check-circle', color: '#16a34a', bg: '#f0fdf4' },
        { label: 'ถูกยืม',           value: getCount(by, 'borrowed'),     icon: 'inbox',        color: '#2563eb', bg: '#eff6ff' },
        { label: 'กำลังซ่อม',        value: getCount(by, 'repair'),       icon: 'wrench',       color: '#d97706', bg: '#fffbeb' },
        { label: 'ไม่พร้อมใช้งาน',  value: getCount(by, 'unavailable'),  icon: 'x-circle',     color: '#dc2626', bg: '#fef2f2' },
        { label: 'จำหน่ายแล้ว',      value: getCount(by, 'disposed'),     icon: 'trash',        color: '#6b7280', bg: '#f3f4f6' },
      ];
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  });

  const periods = [
    { value: '7d', label: 'ย้อนหลัง 7 วัน' },
    { value: '30d', label: 'ย้อนหลัง 30 วัน' },
    { value: 'fiscal', label: 'ปีงบประมาณ' }
  ];
  let selectedPeriod = periods[0].value;
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {#each stats as s}
    <StatCard {...s} />
  {/each}
</div>

<div class="mt-8 rounded-xl border bg-white p-6">
  <div class="flex items-center justify-between">
    <h2 class="font-bold text-lg">สถิติการใช้งานครุภัณฑ์</h2>
    <Dropdown options={periods} bind:value={selectedPeriod} />
  </div>
  <div class="mt-6 h-56 grid place-items-center text-gray-500">
    (พื้นที่สำหรับกราฟ/แดชบอร์ด)
  </div>
</div>
