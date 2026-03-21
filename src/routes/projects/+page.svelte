<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import '../../styles/pagination.css';
  import '../../styles/filter.css';

  // กำหนด Interface
  interface Project {
    id: number;
    uuid: string;
    projectName: string;
    projectTypeId: number | null;
    projectDate: string | null;
    budget: string | number | null;
    status: string | null;
    acquisitionSourceId: number | null;
    note: string | null;
  }

  interface MasterData {
    id: number;
    name: string;
  }

  interface PaginatedApiResponse {
    success: boolean;
    data: Project[];
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
  let items: Project[] = [];
  let loading = true;
  let error = '';

  // Filter popup state
  let showFilter = false;

  let draftStatus             = '';
  let draftProjectTypeId      = null as number | null;
  let draftAcquisitionSourceId = null as number | null;
  let draftDateFrom           = '';
  let draftDateTo             = '';
  let draftBudgetMin          = '';
  let draftBudgetMax          = '';

  let activeStatus             = '';
  let activeProjectTypeId      = null as number | null;
  let activeAcquisitionSourceId = null as number | null;
  let activeDateFrom           = '';
  let activeDateTo             = '';
  let activeBudgetMin          = '';
  let activeBudgetMax          = '';

  const statusOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'active', label: 'ดำเนินการอยู่' },
    { value: 'completed', label: 'เสร็จสิ้น' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  $: hasActiveFilter = !!(activeStatus || activeProjectTypeId || activeAcquisitionSourceId || activeDateFrom || activeDateTo || activeBudgetMin || activeBudgetMax);

  function openFilter() {
    draftStatus              = activeStatus;
    draftProjectTypeId       = activeProjectTypeId;
    draftAcquisitionSourceId = activeAcquisitionSourceId;
    draftDateFrom            = activeDateFrom;
    draftDateTo              = activeDateTo;
    draftBudgetMin           = activeBudgetMin;
    draftBudgetMax           = activeBudgetMax;
    showFilter = true;
  }

  function applyFilter() {
    activeStatus              = draftStatus;
    activeProjectTypeId       = draftProjectTypeId;
    activeAcquisitionSourceId = draftAcquisitionSourceId;
    activeDateFrom            = draftDateFrom;
    activeDateTo              = draftDateTo;
    activeBudgetMin           = draftBudgetMin;
    activeBudgetMax           = draftBudgetMax;
    showFilter = false;
    currentPage = 1;
    fetchProjects();
  }

  function clearDraftFilter() {
    draftStatus              = '';
    draftProjectTypeId       = null;
    draftAcquisitionSourceId = null;
    draftDateFrom            = '';
    draftDateTo              = '';
    draftBudgetMin           = '';
    draftBudgetMax           = '';
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
  let acquisitionSources: MasterData[] = [];
  let projectTypes: MasterData[] = [];

  const API_URL = 'http://localhost:3000';

  // ดึงข้อมูล Master Data
  async function fetchMasterData() {
    try {
      const [sourcesRes, typesRes] = await Promise.all([
        fetch(`${API_URL}/api/masters/acquisition-sources`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/project-types`, { credentials: 'include' }),
      ]);
      if (sourcesRes.ok) acquisitionSources = (await sourcesRes.json()).data || [];
      if (typesRes.ok) projectTypes = (await typesRes.json()).data || [];
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  // ดึงข้อมูล Projects
  async function fetchProjects() {
    loading = true;
    error = '';
    try {
      const url = new URL(`${API_URL}/api/projects`);
      if (searchQuery) url.searchParams.append('search', searchQuery);
      url.searchParams.append('page',  String(currentPage));
      url.searchParams.append('limit', String(limit));
      if (sortBy)                   url.searchParams.append('sortBy',              sortBy);
      if (sortDir)                  url.searchParams.append('sortDir',             sortDir);
      if (activeStatus)             url.searchParams.append('status',              activeStatus);
      if (activeProjectTypeId)      url.searchParams.append('projectTypeId',       String(activeProjectTypeId));
      if (activeAcquisitionSourceId) url.searchParams.append('acquisitionSourceId', String(activeAcquisitionSourceId));
      if (activeDateFrom)           url.searchParams.append('dateFrom',            activeDateFrom);
      if (activeDateTo)             url.searchParams.append('dateTo',              activeDateTo);
      if (activeBudgetMin)          url.searchParams.append('budgetMin',           activeBudgetMin);
      if (activeBudgetMax)          url.searchParams.append('budgetMax',           activeBudgetMax);

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
      console.error('Error fetching projects:', e);
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
    fetchProjects();
  }

  // ฟังก์ชันแปลง ID เป็นชื่อ
  function getAcquisitionSourceName(id: number | null): string {
    if (!id) return '-';
    return acquisitionSources.find(s => s.id === id)?.name || '-';
  }

  function getProjectTypeName(id: number | null): string {
    if (!id) return '-';
    return projectTypes.find(t => t.id === id)?.name || '-';
  }

  const STATUS_LABELS: Record<string, string> = {
    active:    'ดำเนินการ',
    completed: 'เสร็จสิ้น',
    pending:   'รอดำเนินการ',
    cancelled: 'ยกเลิก',
  };

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return '-';
    const [year, month, day] = parts;
    return `${day}/${month}/${parseInt(year) + 543}`;
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

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    fetchProjects();
  }

  function onLimitChange(e: Event) {
    limit = parseInt((e.target as HTMLSelectElement).value);
    currentPage = 1;
    fetchProjects();
  }

  function formatCurrency(amount: string | number | null): string {
    if (!amount) return '0';
    return Number(amount).toLocaleString('th-TH', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  }


  // Generate Project ID format (ใช้ id จริงหรือ format ตามต้องการ)
  function formatProjectId(id: number, date: string | null): string {
    if (date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}${String(id).padStart(4, '0')}`;
    }
    return String(id).padStart(10, '0');
  }

  function handleSearch() {
    searchQuery = q; // อัพเดทค่าค้นหาจริงเมื่อกดปุ่ม
    currentPage = 1;
    fetchProjects();
  }

  function handleAddProject() {
    goto('/projects/add-project');
  }

  // โหลดข้อมูลเมื่อ mount
  onMount(async () => {
    await fetchMasterData();
    await fetchProjects();
  });
</script>

<div class="page-container">
  <!-- Header -->
  <div class="header">
    <div>
      <h1 class="title text-h3">สืบค้นโครงการ</h1>
    </div>
    <div class="header-actions">
      <button class="btn-primary" on:click={handleAddProject}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        เพิ่มโครงการ
      </button>
    </div>
  </div>

  <!-- Search Bar -->
  <div class="search-container">
    <div class="search-input-wrapper">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        bind:value={q}
        on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="ค้นหาชื่อโครงการ..."
        class="search-input"
      />
      {#if q}
        <button class="search-clear-btn" on:click={() => { q = ''; searchQuery = ''; fetchProjects(); }} aria-label="ล้างการค้นหา">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      {/if}
      <button class="search-submit-btn" on:click={handleSearch}>ค้นหา</button>
    </div>
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
      {#each [{ id: null, name: 'ทั้งหมด' }, ...projectTypes] as type}
        <button
          class="tab {activeProjectTypeId === type.id ? 'active' : ''}"
          on:click={() => { activeProjectTypeId = type.id; currentPage = 1; fetchProjects(); }}
        >
          {type.name}
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
      <button class="retry-btn" on:click={fetchProjects}>ลองอีกครั้ง</button>
    </div>
  {:else if items.length === 0}
    <div class="empty-box">
      <p>ไม่พบข้อมูลโครงการ</p>
    </div>
  {:else}
    <div class="card-wrapper">
      <div class="table-container table-no-radius">
        <table class="table">
          <colgroup>
            <col style="width: 15%" />
            <col style="width: 22%" />
            <col style="width: 13%" />
            <col style="width: 15%" />
            <col style="width: 10%" />
            <col style="width: 10%" />
            <col style="width: 15%" />
          </colgroup>
          <thead>
            <tr>
              <th class="sortable" on:click={() => toggleSort('id')}>
                <span class="th-inner"><span>หมายเลขโครงการ</span><span class="sort-icon" class:sort-active={sortBy === 'id'}>{sortBy === 'id' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
              <th class="sortable" on:click={() => toggleSort('projectName')}>
                <span class="th-inner"><span>ชื่อโครงการ</span><span class="sort-icon" class:sort-active={sortBy === 'projectName'}>{sortBy === 'projectName' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
              <th class="sortable" on:click={() => toggleSort('projectType')}>
                <span class="th-inner"><span>ประเภท</span><span class="sort-icon" class:sort-active={sortBy === 'projectType'}>{sortBy === 'projectType' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
              <th class="sortable" on:click={() => toggleSort('acquisitionSourceId')}>
                <span class="th-inner"><span>แหล่งเงินทุน</span><span class="sort-icon" class:sort-active={sortBy === 'acquisitionSourceId'}>{sortBy === 'acquisitionSourceId' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
              <th class="sortable" on:click={() => toggleSort('status')}>
                <span class="th-inner"><span>สถานะ</span><span class="sort-icon" class:sort-active={sortBy === 'status'}>{sortBy === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
              <th class="sortable" on:click={() => toggleSort('projectDate')}>
                <span class="th-inner"><span>วันที่</span><span class="sort-icon" class:sort-active={sortBy === 'projectDate'}>{sortBy === 'projectDate' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
              <th class="sortable" on:click={() => toggleSort('budget')}>
                <span class="th-inner"><span>งบประมาณ</span><span class="sort-icon" class:sort-active={sortBy === 'budget'}>{sortBy === 'budget' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each items as r (r.uuid ?? r.id)}
              <tr class="clickable-row" on:click={() => goto(`/projects/detail/${r.uuid}`)}>
                <td>{formatProjectId(r.id, r.projectDate)}</td>
                <td>{r.projectName}</td>
                <td>{getProjectTypeName(r.projectTypeId)}</td>
                <td>{getAcquisitionSourceName(r.acquisitionSourceId)}</td>
                <td>{STATUS_LABELS[r.status ?? ''] ?? r.status ?? '-'}</td>
                <td>{formatDate(r.projectDate)}</td>
                <td>{formatCurrency(r.budget)}</td>
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
            on:change={() => { currentPage = 1; fetchProjects(); }}
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
      <!-- ประเภท -->
      <div class="filter-field">
        <label class="filter-label">ประเภท</label>
        <Dropdown
          fullWidth
          options={[{ value: null, label: 'ทั้งหมด' }, ...projectTypes.map(t => ({ value: t.id, label: t.name }))]}
          bind:value={draftProjectTypeId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- แหล่งเงินทุน -->
      <div class="filter-field">
        <label class="filter-label">แหล่งเงินทุน</label>
        <Dropdown
          fullWidth
          options={[{ value: null, label: 'ทั้งหมด' }, ...acquisitionSources.map(s => ({ value: s.id, label: s.name }))]}
          bind:value={draftAcquisitionSourceId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- สถานะ -->
      <div class="filter-field">
        <label class="filter-label">สถานะ</label>
        <Dropdown
          fullWidth
          options={statusOptions}
          bind:value={draftStatus}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- งบประมาณ (ช่วง) -->
      <div class="filter-field">
        <label class="filter-label">ช่วงงบประมาณ</label>
        <div class="range-row">
          <input type="number" min="0" class="filter-input" bind:value={draftBudgetMin} placeholder="ขั้นต่ำ" />
          <input type="number" min="0" class="filter-input" bind:value={draftBudgetMax} placeholder="สูงสุด" />
        </div>
      </div>

      <!-- วันที่ (ช่วง) full width -->
      <div class="filter-field full-col">
        <label class="filter-label">ช่วงวันที่</label>
        <div class="date-range-row">
          <ThaiDatePicker bind:value={draftDateFrom} inputClass="filter-input" placeholder="วันที่เริ่มต้น" />
          <span class="range-sep">—</span>
          <ThaiDatePicker bind:value={draftDateTo} inputClass="filter-input" placeholder="วันที่สิ้นสุด" />
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
  }

  .table tbody tr {
    transition: all 0.2s ease;
  }

  .table tbody tr.clickable-row {
    cursor: pointer;
  }

  .table tbody tr:hover {
    background: #fffbf5;
    transform: translateX(4px);
  }

  .project-id {
    font-weight: 600;
    color: #1f2937;
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