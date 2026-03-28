<script lang="ts">
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  let stats = [
    { label: 'ครุภัณฑ์ทั้งหมด', value: '-', icon: 'box',          color: '#ffa200', bg: '#fff8ec' },
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
        { label: 'ครุภัณฑ์ทั้งหมด', value: Number(data.total).toLocaleString('th-TH'), icon: 'box',          color: '#ffa200', bg: '#fff8ec' },
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

<div class="dashboard">
  <!-- สรุปสถานะครุภัณฑ์ -->
  <div class="dash-card">
    <h2 class="dash-card-title">สรุปสถานะครุภัณฑ์</h2>
    <div class="stats-grid">
      {#each stats as s}
        <StatCard {...s} />
      {/each}
    </div>
  </div>

  <!-- สถิติการใช้งาน -->
  <div class="dash-card">
    <div class="dash-card-header">
      <h2 class="dash-card-title">สถิติการใช้งานครุภัณฑ์</h2>
      <Dropdown options={periods} bind:value={selectedPeriod} />
    </div>
    <div class="chart-placeholder">
      (พื้นที่สำหรับกราฟ/แดชบอร์ด)
    </div>
  </div>
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .dash-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }

  .dash-card-title {
    font-size: 1.0625rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.25rem 0;
  }

  .dash-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .dash-card-header .dash-card-title {
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }

  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 560px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }

  .chart-placeholder {
    height: 14rem;
    display: grid;
    place-items: center;
    color: #9ca3af;
    font-size: 0.9rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }
</style>
