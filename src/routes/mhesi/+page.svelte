<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import '../../styles/pagination.css';
  import '../../styles/filter.css';

   $: canAccessRestricted =
    $page.data.user?.role === 'admin' ||
    $page.data.user?.departmentId === 1;

  // กำหนด Interface
  interface MhesiRecord {
    id: number;
    uuid: string;
    mhesiNumber: string;
    departmentId: number | null;
    supportUnitId: number | null;
    planId: number | null;
    projectId: number | null;
    activityName: string | null;
    date: string | null;
    amount: string | number;
    note: string | null;
  }

  interface MasterData {
    id: number;
    name: string;
  }

  interface Project {
    id: number;
    projectName: string;
  }

  interface PaginatedApiResponse {
    success: boolean;
    data: MhesiRecord[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    message?: string;
  }

  // ตัวแปรสถานะ
  let q = '';
  let searchQuery = ''; // เก็บค่าที่จะใช้ในการค้นหาจริง
  let items: MhesiRecord[] = [];
  let loading = true;
  let error = '';

  // Filter popup state
  let showFilter = false;
  let draftProjectId = 0;
  let draftDepartmentId = 0;
  let draftPlanId = 0;
  let draftAmountMin = '';
  let draftAmountMax = '';
  let draftDateFrom = '';
  let draftDateTo = '';

  let activeProjectId = 0;
  let activeDepartmentId = 0;
  let activePlanId = 0;
  let activeAmountMin = '';
  let activeAmountMax = '';
  let activeDateFrom = '';
  let activeDateTo = '';

  $: hasActiveFilter = !!(activeProjectId || activeDepartmentId || activePlanId ||
    activeAmountMin || activeAmountMax || activeDateFrom || activeDateTo);

  function openFilter() {
    draftProjectId     = activeProjectId;
    draftDepartmentId = activeDepartmentId;
    draftPlanId        = activePlanId;
    draftAmountMin     = activeAmountMin;
    draftAmountMax     = activeAmountMax;
    draftDateFrom      = activeDateFrom;
    draftDateTo        = activeDateTo;
    showFilter = true;
  }

  function applyFilter() {
    activeProjectId     = draftProjectId;
    activeDepartmentId = draftDepartmentId;
    activePlanId        = draftPlanId;
    activeAmountMin     = draftAmountMin;
    activeAmountMax     = draftAmountMax;
    activeDateFrom      = draftDateFrom;
    activeDateTo        = draftDateTo;
    showFilter = false;
    currentPage = 1;
    fetchMhesi();
  }

  function clearDraftFilter() {
    draftProjectId     = 0;
    draftDepartmentId = 0;
    draftPlanId        = 0;
    draftAmountMin     = '';
    draftAmountMax     = '';
    draftDateFrom      = '';
    draftDateTo        = '';
  }

  // Sort state
  let sortBy = '';
  let sortDir: 'asc' | 'desc' = 'asc';


  // Pagination state
  let currentPage = 1;
  let limit = 10;
  let totalItems = 0;
  let totalPages = 1;
  const limitOptions = [10, 25, 50, 100];

  // Master data
  let departments: MasterData[] = [];
  let plans: MasterData[] = [];
  let projects: Project[] = [];

  const API_URL = 'http://localhost:3000';

  // ดึงข้อมูล Master Data
  async function fetchMasterData() {
    try {
      const [departmentsRes, plansRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/masters/departments`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/plan-sections`, { credentials: 'include' }),
        fetch(`${API_URL}/api/projects`, { credentials: 'include' })
      ]);

      if (departmentsRes.ok) {
        const data = await departmentsRes.json();
        departments = data.data || [];
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        plans = data.data || [];
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        projects = data.data || [];
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  // ดึงข้อมูล MHESI
  async function fetchMhesi() {
    loading = true;
    error = '';
    try {
      const url = new URL(`${API_URL}/api/mhesi`);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      url.searchParams.append('page',  String(currentPage));
      url.searchParams.append('limit', String(limit));
      if (sortBy)  url.searchParams.append('sortBy',  sortBy);
      if (sortDir) url.searchParams.append('sortDir', sortDir);
      if (activeProjectId)     url.searchParams.append('projectId',     String(activeProjectId));
      if (activeDepartmentId) url.searchParams.append('departmentId', String(activeDepartmentId));
      if (activePlanId)        url.searchParams.append('planId',        String(activePlanId));
      if (activeAmountMin)     url.searchParams.append('amountMin',     activeAmountMin);
      if (activeAmountMax)     url.searchParams.append('amountMax',     activeAmountMax);
      if (activeDateFrom)      url.searchParams.append('dateFrom',      activeDateFrom);
      if (activeDateTo)        url.searchParams.append('dateTo',        activeDateTo);

      const res = await fetch(url.toString(), { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const result: PaginatedApiResponse = await res.json();

      if (result.success) {
        items      = result.data;
        totalItems = result.pagination?.total     ?? result.data.length;
        totalPages = result.pagination?.totalPages ?? 1;
      } else {
        error = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      }
    } catch (e) {
      error = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
      console.error('Error fetching MHESI:', e);
    } finally {
      loading = false;
    }
  }

  function toggleSort(col: string) {
    if (sortBy === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy  = col;
      sortDir = 'asc';
    }
    currentPage = 1;
    fetchMhesi();
  }

  // ฟังก์ชันแปลง ID เป็นชื่อ
  function getDepartmentName(id: number | null): string {
    if (!id) return '-';
    return departments.find(d => d.id === id)?.name || '-';
  }

  function getPlanName(id: number | null): string {
    if (!id) return '-';
    return plans.find(p => p.id === id)?.name || '-';
  }

  function getProjectName(id: number | null): string {
    if (!id) return '-';
    return projects.find(p => p.id === id)?.projectName || '-';
  }

  $: pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  })();

  let jumpPage = '';
  function handleJump() {
    const p = parseInt(jumpPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) goToPage(p);
    jumpPage = '';
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    fetchMhesi();
  }

  function onLimitChange(e: Event) {
    limit = parseInt((e.target as HTMLSelectElement).value);
    currentPage = 1;
    fetchMhesi();
  }

  function formatCurrency(amount: string | number): string {
    if (!amount) return '0.00';
    return Number(amount).toLocaleString('th-TH', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return '-';
    const [year, month, day] = parts;
    return `${day}/${month}/${parseInt(year) + 543}`;
  }

  function handleSearch() {
    searchQuery = q; // อัพเดทค่าค้นหาจริงเมื่อกดปุ่ม
    currentPage = 1;
    fetchMhesi();
  }

  function handleAddMhesi() {
    goto('/mhesi/add-mhesi');
  }

  // โหลดข้อมูลเมื่อ mount
  onMount(async () => {
    await fetchMasterData();
    await fetchMhesi();
  });
</script>

<div class="page-container">
  <!-- Search Bar -->
  <div class="search-container">
    <div class="search-input-wrapper">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        bind:value={q}
        on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="ค้นหาเลข อว. / กิจกรรม"
        class="search-input"
      />
      {#if q}
        <button class="search-clear-btn" on:click={() => { q = ''; searchQuery = ''; fetchMhesi(); }} aria-label="ล้างการค้นหา">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      {/if}
      <button class="search-submit-btn" on:click={handleSearch}>ค้นหา</button>
    </div>
    {#if canAccessRestricted}
      <button class="btn-primary" style="margin-left:auto" on:click={handleAddMhesi}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        เพิ่มเลข อว.
      </button>
    {/if}
  </div>

  <!-- Tabs -->
  <div class="tabs-container">
    <button class="filter-btn {hasActiveFilter ? 'filter-btn-active' : ''}" on:click={openFilter}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      {#if hasActiveFilter}<span class="filter-dot"></span>{/if}
    </button>
    <div class="tabs">
      {#each [{ id: 0, name: 'ทั้งหมด' }, ...plans] as plan}
        <button
          class="tab {activePlanId === plan.id ? 'active' : ''}"
          on:click={() => { activePlanId = plan.id; currentPage = 1; fetchMhesi(); }}
        >
          {plan.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Table -->
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  {:else if error}
    <div class="error-box">
      <p>⚠️ {error}</p>
      <button class="retry-btn" on:click={fetchMhesi}>ลองอีกครั้ง</button>
    </div>
  {:else if items.length === 0}
    <div class="empty-box">
      <p>ไม่พบข้อมูลเลข อว.</p>
    </div>
  {:else}
    <div class="card-wrapper">
      <div class="table-container table-no-radius">
        <table class="table">
          <colgroup>
            <col style="width: 12%" />
            <col style="width: 25%" />
            <col style="width: 15%" />
            <col style="width: 15%" />
            <col style="width: 13%" />
            <col style="width: 10%" />
            <col style="width: 10%" />
          </colgroup>
          <thead>
            <tr>
              <th class="sortable" on:click={() => toggleSort('mhesiNumber')}>
                <span class="th-inner">
                  <span>เลข อว.</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'mhesiNumber'}>{sortBy === 'mhesiNumber' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
              <th class="sortable" on:click={() => toggleSort('activityName')}>
                <span class="th-inner">
                  <span>กิจกรรม</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'activityName'}>{sortBy === 'activityName' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
              <th class="sortable" on:click={() => toggleSort('project')}>
                <span class="th-inner">
                  <span>โครงการ</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'project'}>{sortBy === 'project' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
              <th class="sortable" on:click={() => toggleSort('supportUnit')}>
                <span class="th-inner">
                  <span>ส่วนสนับสนุน</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'supportUnit'}>{sortBy === 'supportUnit' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
              <th class="sortable" on:click={() => toggleSort('plan')}>
                <span class="th-inner">
                  <span>แผนงาน</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'plan'}>{sortBy === 'plan' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
              <th class="sortable" on:click={() => toggleSort('date')}>
                <span class="th-inner">
                  <span>วันที่</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'date'}>{sortBy === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
              <th class="sortable" on:click={() => toggleSort('amount')}>
                <span class="th-inner">
                  <span>จำนวนเงิน</span>
                  <span class="sort-icon" class:sort-active={sortBy === 'amount'}>{sortBy === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each items as r, i (r.uuid ?? r.id ?? i)}
              <tr class="clickable-row" on:click={() => window.location.href = `/mhesi/detail/${r.uuid}`}>
                <td class="mhesi-number">{r.mhesiNumber || '-'}</td>
                <td>{r.activityName || '-'}</td>
                <td>{getProjectName(r.projectId)}</td>
                <td>{getDepartmentName(r.departmentId)}</td>
                <td>{getPlanName(r.planId)}</td>
                <td>{formatDate(r.date)}</td>
                <td>{formatCurrency(r.amount)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar">
        <div class="pagination-info">
          <span class="pagination-label">แสดง</span>
          <Dropdown
            compact
            dropUp
            options={limitOptions.map(o => ({ value: o, label: String(o) }))}
            bind:value={limit}
            on:change={() => { currentPage = 1; fetchMhesi(); }}
          />
          <span class="pagination-label">รายการต่อหน้า</span>
          <span class="pagination-count">({totalItems.toLocaleString('th-TH')} รายการทั้งหมด)</span>
        </div>

        <div class="pagination-nav">
          <button
            class="page-btn nav-btn"
            disabled={currentPage === 1}
            on:click={() => goToPage(currentPage - 1)}
            aria-label="หน้าก่อนหน้า"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {#each pageNumbers as p}
            {#if p === '...'}
              <span class="page-ellipsis">…</span>
            {:else}
              <button
                class="page-btn {currentPage === p ? 'active' : ''}"
                disabled={currentPage === p}
                on:click={() => goToPage(p)}
              >{p}</button>
            {/if}
          {/each}

          <button
            class="page-btn nav-btn"
            disabled={currentPage === totalPages}
            on:click={() => goToPage(currentPage + 1)}
            aria-label="หน้าถัดไป"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div class="pagination-jump">
            <span>ไปหน้า</span>
            <input class="pagination-jump-input" type="number" min="1" max={totalPages}
              bind:value={jumpPage} on:keydown={e => e.key === 'Enter' && handleJump()} />
            <button class="pagination-jump-btn" on:click={handleJump}>ไป</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Filter Popup -->
{#if showFilter}
  <div class="filter-backdrop" on:click={() => showFilter = false} role="presentation"></div>
  <div class="filter-popup">
    <h2 class="filter-title">ตัวกรองขั้นสูง</h2>
    <div class="filter-grid">
      <!-- โครงการ -->
      <div class="filter-field">
        <label class="filter-label">โครงการ</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...projects.map(p => ({ value: p.id, label: p.projectName }))]}
          bind:value={draftProjectId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ส่วนสนับสนุน -->
      <div class="filter-field">
        <label class="filter-label">ส่วนสนับสนุน</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...departments.map(u => ({ value: u.id, label: u.name }))]}
          bind:value={draftDepartmentId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- แผนงาน -->
      <div class="filter-field">
        <label class="filter-label">แผนงาน</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...plans.map(p => ({ value: p.id, label: p.name }))]}
          bind:value={draftPlanId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ช่วงมูลค่า -->
      <div class="filter-field">
        <label class="filter-label">ช่วงมูลค่า</label>
        <div class="price-range">
          <input class="filter-input" type="number" placeholder="ขั้นต่ำ" bind:value={draftAmountMin} />
          <input class="filter-input" type="number" placeholder="สูงสุด"  bind:value={draftAmountMax} />
        </div>
      </div>

      <!-- ช่วงวันที่ -->
      <div class="filter-field filter-field-full">
        <label class="filter-label">ช่วงวันที่</label>
        <div class="date-range">
          <ThaiDatePicker
            bind:value={draftDateFrom}
            inputClass="filter-input"
            placeholder="วันที่เริ่มต้น"
            on:change={(e) => { if (draftDateTo && e.detail > draftDateTo) draftDateTo = ''; }}
          />
          <span class="range-sep">–</span>
          <ThaiDatePicker
            bind:value={draftDateTo}
            inputClass="filter-input"
            placeholder="วันที่สิ้นสุด"
            on:change={(e) => { if (draftDateFrom && e.detail < draftDateFrom) draftDateTo = draftDateFrom; }}
          />
        </div>
      </div>
    </div>
    <div class="filter-footer">
      <button class="filter-clear-btn" on:click={clearDraftFilter}>ล้างทั้งหมด</button>
      <button class="filter-apply-btn" on:click={applyFilter}>ใช้งานตัวกรอง</button>
    </div>
  </div>
{/if}

<style>
  /* Match equipment page table style */
  .table {
    table-layout: fixed;
    width: 100%;
  }

  .table th {
    padding: 0.875rem 1rem;
    text-transform: none;
    font-size: 0.875rem;
    letter-spacing: normal;
    font-weight: 600;
    color: #374151;
  }

  .table th.sortable {
    cursor: pointer;
    user-select: none;
  }

  .table th.sortable:hover {
    background: #f3f4f6;
  }

  .th-inner {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .sort-icon {
    font-size: 0.65rem;
    color: #d1d5db;
  }

  .sort-icon.sort-active {
    color: #ffa200;
  }

  .table td {
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    color: #1f2937;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table tbody tr {
    transition: all 0.2s ease;
  }

  .clickable-row {
    cursor: pointer;
  }

  .table tbody tr:hover {
    background: #fffbf5;
    transform: translateX(4px);
    box-shadow: -4px 0 0 #fffbf5;
  }

  .mhesi-number {
    font-weight: 600;
    color: #ffa200;
  }

  .amount {
    font-weight: 700;
    color: #1f2937;
  }

  .card-wrapper {
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .table-no-radius {
    border-radius: 0 !important;
    box-shadow: none !important;
  }

</style>