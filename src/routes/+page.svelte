<script lang="ts">
  import { onMount } from 'svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  // ─── Status stats ───────────────────────────────────────────────────────────
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

  // ─── Activity stats ──────────────────────────────────────────────────────────
  type Dataset = { label: string; data: number[]; color: string };
  type ActivityData = { labels: string[]; datasets: Dataset[] };

  let activityData: ActivityData | null = null;
  let activityLoading = false;

  const periods = [
    { value: 'week',   label: 'รายวัน (สัปดาห์นี้)' },
    { value: 'month',  label: 'รายสัปดาห์ (เดือนนี้)' },
    { value: 'fiscal', label: 'รายเดือน (ปีงบประมาณ)' },
  ];
  let selectedPeriod = 'week';

  async function fetchActivityStats(period: string) {
    activityLoading = true;
    try {
      const res = await apiFetch<{ data: ActivityData }>(
        `${API_ENDPOINTS.ASSET_ACTIVITY_STATS}?period=${period}`
      );
      activityData = res.data ?? null;
    } catch (e) {
      console.error('Failed to fetch activity stats:', e);
    } finally {
      activityLoading = false;
    }
  }

  $: fetchActivityStats(selectedPeriod);

  // ─── Chart geometry ──────────────────────────────────────────────────────────
  const W = 600, H = 230;
  const padL = 36, padR = 12, padT = 14, padB = 44;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  function niceMax(val: number): number {
    if (val === 0) return 5;
    if (val <= 5)  return 5;
    if (val <= 10) return 10;
    if (val <= 20) return 20;
    if (val <= 50) return 50;
    const mag = Math.pow(10, Math.floor(Math.log10(val)));
    return Math.ceil(val / mag) * mag;
  }

  $: yMax = activityData
    ? niceMax(Math.max(...activityData.labels.map((_, i) =>
        activityData!.datasets.reduce((s, d) => s + (d.data[i] ?? 0), 0)
      )))
    : 5;

  $: barW = activityData
    ? Math.min((cw / activityData.labels.length) * 0.6, 36)
    : 0;

  // ─── On mount ────────────────────────────────────────────────────────────────
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

    {#if activityLoading}
      <div class="chart-loading">
        <div class="spinner"></div>
        <span>กำลังโหลดข้อมูล...</span>
      </div>
    {:else if activityData}
      <!-- Legend -->
      <div class="legend">
        {#each activityData.datasets as ds (ds.label)}
          <div class="legend-item">
            <span class="legend-dot" style="background:{ds.color}"></span>
            <span class="legend-label">{ds.label}</span>
          </div>
        {/each}
      </div>

      <!-- Stacked bar chart -->
      <div class="chart-wrap">
        <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" class="chart-svg">
          <!-- Y gridlines + labels -->
          {#each [0, 0.25, 0.5, 0.75, 1] as t (t)}
            {@const y = padT + ch * (1 - t)}
            {@const val = Math.round(yMax * t)}
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={t === 0 ? '#e5e7eb' : '#f3f4f6'} stroke-width="1"/>
            <text x={padL - 5} y={y + 4} text-anchor="end" font-size="10" fill="#9ca3af">{val}</text>
          {/each}

          <!-- Stacked bars -->
          {#each activityData.labels as label, i (label)}
            {@const xCenter = padL + (i + 0.5) * (cw / activityData.labels.length)}
            {@const xBar = xCenter - barW / 2}

            {#each activityData.datasets as ds, di (ds.label)}
              {@const cumBelow = activityData.datasets.slice(0, di).reduce((s, d) => s + (d.data[i] ?? 0), 0)}
              {@const val = ds.data[i] ?? 0}
              {@const bh = (val / yMax) * ch}
              {@const cumBelowH = (cumBelow / yMax) * ch}
              {@const y = padT + ch - cumBelowH - bh}
              {#if bh > 0}
                <rect x={xBar} y={y} width={barW} height={bh} fill={ds.color} rx="1.5"/>
              {/if}
            {/each}

            <!-- X label -->
            <text
              x={xCenter}
              y={H - padB + 14}
              text-anchor="middle"
              font-size="10"
              fill="#6b7280"
            >{label}</text>
          {/each}
        </svg>
      </div>
    {:else}
      <div class="chart-empty">ไม่มีข้อมูล</div>
    {/if}
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
    margin-bottom: 1rem;
  }

  .dash-card-header .dash-card-title {
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }

  @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .stats-grid { grid-template-columns: 1fr; } }

  /* Legend */
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem 1.25rem;
    margin-bottom: 0.875rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-label {
    font-size: 0.8125rem;
    color: #374151;
  }

  /* Chart */
  .chart-wrap {
    width: 100%;
  }

  .chart-svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .chart-loading {
    height: 14rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .chart-empty {
    height: 14rem;
    display: grid;
    place-items: center;
    color: #9ca3af;
    font-size: 0.9rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e5e7eb;
    border-top-color: #ffa200;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
</style>
