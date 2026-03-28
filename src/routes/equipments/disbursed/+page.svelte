<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import { apiFetch, apiFetchBlob } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';
  import '../../../styles/pagination.css';
  import '../../../styles/filter.css';



  type Asset = {
    id: number;
    uuid: string;
    equipmentCode: string;
    equipmentName: string;
    equipmentNumber: string | null;
    equipmentTypeId: number | null;
    status: string;
    acquisitionDate: string | null;
    price: string | null;
    buildingId: number | null;
    roomId: number | null;
    warrantyEnd: string | null;
    warrantyAttachmentId: number | null;
    departmentId?: number | null;
    acquisitionSourceId?: number | null;
    moneyTypeId?: number | null;
  };

  // Preview modal
  let previewUrl: string | null = null;
  let previewLoading = false;
  let previewFileName = '';
  let showPreviewModal = false;
  let previewMimeType = '';

  async function loadPreviewById(id: number, fileName: string) {
    previewLoading = true;
    previewFileName = fileName;
    try {
      const blob = await apiFetchBlob(`/api/attachments/${id}/file`);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      previewMimeType = blob.type;
      showPreviewModal = true;
    } catch (err) {
      console.error('preview failed:', err);
    } finally {
      previewLoading = false;
    }
  }

  function closePreview() {
    showPreviewModal = false;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  }

  type MasterData = { id: number; name: string; };

  type ApiResponse = {
    success: boolean;
    data: Asset[];
    pagination: { total: number; page: number; limit: number; totalPages: number; };
  };

  let q = '';
  let items: Asset[] = [];
  let loading = true;
  let error = '';

  let currentPage = 1;
  let limit = 10;
  let totalItems = 0;
  let totalPages = 0;
  const limitOptions = [10, 25, 50, 100];

  let sortBy = '';
  let sortDir: 'asc' | 'desc' = 'asc';
  const clientSortCols = ['equipmentType', 'building', 'room'];

  function toggleSort(col: string) {
    if (sortBy === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
    else { sortBy = col; sortDir = 'asc'; }
    if (!clientSortCols.includes(col)) { currentPage = 1; fetchAssets(); }
  }

  let assetTypes: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: MasterData[] = [];
  let supportUnits: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];

  let showFilter = false;

  const statusOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'normal', label: 'ปกติ' },
    { value: 'borrowed', label: 'ถูกยืม' },
    { value: 'repair', label: 'กำลังซ่อม' },
    { value: 'unavailable', label: 'ไม่พร้อมใช้งาน' },
    { value: 'disposed', label: 'จำหน่ายแล้ว' },
  ];

  let draftStatus = '';
  let draftTypeId = 0;
  let draftBuildingId = 0;
  let draftRoomId = 0;
  let draftUnitId = 0;
  let draftSourceId = 0;
  let draftBudgetYear = 0;
  let draftPriceMin = '';
  let draftPriceMax = '';

  let activeStatus = '';
  let activeTypeId = 0;
  let activeBuildingId = 0;
  let activeRoomId = 0;
  let activeUnitId = 0;
  let activeSourceId = 0;
  let activeBudgetYear = 0;
  let activePriceMin = '';
  let activePriceMax = '';

  const currentBEYear = new Date().getFullYear() + 543;
  const budgetYears = Array.from({ length: 10 }, (_, i) => currentBEYear - i);

  $: hasActiveFilter = !!(activeStatus || activeTypeId || activeBuildingId || activeRoomId ||
    activeUnitId || activeSourceId || activeBudgetYear || activePriceMin || activePriceMax);

  function openFilter() {
    draftStatus = activeStatus;
    draftTypeId = activeTypeId; draftBuildingId = activeBuildingId;
    draftRoomId = activeRoomId; draftUnitId = activeUnitId;
    draftSourceId = activeSourceId; draftBudgetYear = activeBudgetYear;
    draftPriceMin = activePriceMin; draftPriceMax = activePriceMax;
    showFilter = true;
  }

  function applyFilter() {
    activeStatus = draftStatus;
    activeTypeId = draftTypeId; activeBuildingId = draftBuildingId;
    activeRoomId = draftRoomId; activeUnitId = draftUnitId;
    activeSourceId = draftSourceId; activeBudgetYear = draftBudgetYear;
    activePriceMin = draftPriceMin; activePriceMax = draftPriceMax;
    showFilter = false; currentPage = 1; fetchAssets();
  }

  function clearDraftFilter() {
    draftStatus = '';
    draftTypeId = 0; draftBuildingId = 0; draftRoomId = 0;
    draftUnitId = 0; draftSourceId = 0; draftBudgetYear = 0;
    draftPriceMin = ''; draftPriceMax = '';
  }

  async function fetchMasterData() {
    try {
      const [typesData, buildingsData, roomsData, unitsData, sourcesData] = await Promise.all([
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ASSET_TYPES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.BUILDINGS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ROOMS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.SUPPORT_UNITS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_SOURCES),
      ]);
      assetTypes = typesData.data || []; buildings = buildingsData.data || [];
      rooms = roomsData.data || []; supportUnits = unitsData.data || [];
      acquisitionSources = sourcesData.data || [];
    } catch (err) { console.error('Error fetching master data:', err); }
  }

  async function fetchAssets() {
    try {
      loading = true; error = '';
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(limit));
      params.set('excludeStatus', 'pending');
      if (activeStatus) params.set('status', activeStatus);
      if (q.trim()) params.set('search', q.trim());
      if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir); }
      if (activeTypeId)     params.set('equipmentTypeId',     String(activeTypeId));
      if (activeBuildingId) params.set('buildingId',          String(activeBuildingId));
      if (activeRoomId)     params.set('roomId',              String(activeRoomId));
      if (activeUnitId)     params.set('supportUnitId',       String(activeUnitId));
      if (activeSourceId)   params.set('acquisitionSourceId', String(activeSourceId));
      if (activeBudgetYear) params.set('fiscalYear',          String(activeBudgetYear));
      if (activePriceMin)   params.set('priceMin',            activePriceMin);
      if (activePriceMax)   params.set('priceMax',            activePriceMax);
      const result = await apiFetch<ApiResponse>(`${API_ENDPOINTS.ASSETS}?${params.toString()}`);
      if (result.success && result.data) {
        items = result.data;
        totalItems = result.pagination?.total ?? 0;
        totalPages = result.pagination?.totalPages ?? 0;
      } else { throw new Error('Invalid response format'); }
    } catch (err) {
      error = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    } finally { loading = false; }
  }

  let jumpPage = '';
  function handleJump() {
    const p = parseInt(jumpPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) goToPage(p);
    jumpPage = '';
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    currentPage = p; fetchAssets();
  }

  $: pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  })();

  function getEquipmentTypeName(id: number | null) { if (!id) return '-'; return assetTypes.find(t => t.id === id)?.name || `ID: ${id}`; }
  function getBuildingName(id: number | null) { if (!id) return '-'; return buildings.find(b => b.id === id)?.name || `ID: ${id}`; }
  function getRoomName(id: number | null) { if (!id) return '-'; return rooms.find(r => r.id === id)?.name || `ID: ${id}`; }

  $: rows = items.sort((a, b) => {
    if (!clientSortCols.includes(sortBy)) return 0;
    const mul = sortDir === 'asc' ? 1 : -1;
    let va = '', vb = '';
    if (sortBy === 'equipmentType') { va = assetTypes.find(t => t.id === a.equipmentTypeId)?.name ?? ''; vb = assetTypes.find(t => t.id === b.equipmentTypeId)?.name ?? ''; }
    else if (sortBy === 'building') { va = buildings.find(x => x.id === a.buildingId)?.name ?? ''; vb = buildings.find(x => x.id === b.buildingId)?.name ?? ''; }
    else if (sortBy === 'room') { va = rooms.find(x => x.id === a.roomId)?.name ?? ''; vb = rooms.find(x => x.id === b.roomId)?.name ?? ''; }
    const cmp = va.localeCompare(vb, 'th') * mul;
    if (cmp !== 0) return cmp;
    return (a.equipmentNumber ?? '').localeCompare(b.equipmentNumber ?? '', 'th', { numeric: true });
  });

  function formatPrice(price: string | null) { if (!price) return '-'; return parseFloat(price).toLocaleString('th-TH'); }
  function formatDate(date: string | null) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function getStatusText(status: string) {
    const m: Record<string, string> = { normal: 'ปกติ', available: 'ปกติ', borrowed: 'ถูกยืม', repair: 'กำลังซ่อม', repairing: 'กำลังซ่อม', unavailable: 'ไม่พร้อมใช้งาน', disposed: 'จำหน่ายแล้ว', disbursed: 'เบิกจ่ายสำเร็จ' };
    return m[status] || status;
  }

  function handleRowClick(uuid: string) { goto(`/equipments/detail/${uuid}`); }

  onMount(async () => {
    await fetchMasterData();
    await fetchAssets();
  });
</script>

<div class="page-container">
  <div class="search-container">
    <div class="search-input-wrapper">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input bind:value={q} placeholder="ค้นหา ชื่อครุภัณฑ์ / หมายเลขครุภัณฑ์" class="search-input"
        on:keydown={e => { if (e.key === 'Enter') { currentPage = 1; fetchAssets(); } }} />
      {#if q}
        <button class="search-clear-btn" on:click={() => { q = ''; currentPage = 1; fetchAssets(); }} aria-label="ล้างการค้นหา">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      {/if}
      <button class="search-submit-btn" on:click={() => { currentPage = 1; fetchAssets(); }}>ค้นหา</button>
    </div>
  </div>

  <div class="tabs-container">
    <button class="filter-btn {hasActiveFilter ? 'filter-btn-active' : ''}" on:click={openFilter}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      {#if hasActiveFilter}<span class="filter-dot"></span>{/if}
    </button>
    <div class="tabs">
      {#each [{ id: 0, name: 'ทั้งหมด' }, ...assetTypes] as type}
        <button class="tab {activeTypeId === type.id ? 'active' : ''}"
          on:click={() => { activeTypeId = type.id; currentPage = 1; fetchAssets(); }}>
          {type.name}
        </button>
      {/each}
    </div>
  </div>

  {#if loading}
    <div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>
  {:else if error}
    <div class="error-box"><p>❌ {error}</p><button class="retry-btn" on:click={fetchAssets}>ลองอีกครั้ง</button></div>
  {:else if rows.length === 0}
    <div class="empty-box"><p>ไม่พบข้อมูลครุภัณฑ์เบิกจ่ายสำเร็จ</p></div>
  {:else}
    <div class="card-wrapper">
      <div class="table-container table-no-radius">
        <table class="table">
          <colgroup>
            <col class="col-num"><col class="col-name"><col class="col-type"><col class="col-status">
            <col class="col-date"><col class="col-price"><col class="col-bldg"><col class="col-room">
            <col class="col-warranty">
          </colgroup>
          <thead>
            <tr>
              {#each [
                { col: 'equipmentNumber', label: 'หมายเลขครุภัณฑ์' },
                { col: 'equipmentName',   label: 'ชื่อครุภัณฑ์' },
                { col: 'equipmentType',   label: 'ประเภท' },
                { col: 'status',          label: 'สถานะ' },
                { col: 'acquisitionDate', label: 'วันที่ซื้อ' },
                { col: 'price',           label: 'ราคา' },
                { col: 'building',        label: 'อาคาร' },
                { col: 'room',            label: 'ห้อง' },
                { col: 'warrantyEnd',     label: 'วันที่หมดประกัน' },
              ] as h}
                <th class="sortable" on:click={() => toggleSort(h.col)}>
                  <span class="th-inner">
                    <span>{h.label}</span>
                    <span class="sort-icon" class:sort-active={sortBy === h.col}>
                      {sortBy === h.col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </span>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each rows as r, i (r.uuid ?? r.id ?? r.equipmentCode ?? i)}
              <tr class="clickable-row" on:click={() => handleRowClick(r.uuid)}
                on:keydown={(e) => e.key === 'Enter' && handleRowClick(r.uuid)} tabindex="0" role="button">
                <td>{r.equipmentNumber ?? '-'}</td>
                <td>{r.equipmentName}</td>
                <td>{getEquipmentTypeName(r.equipmentTypeId)}</td>
                <td><span class="status-badge status-{r.status}">{getStatusText(r.status)}</span></td>
                <td>{formatDate(r.acquisitionDate)}</td>
                <td>{formatPrice(r.price)}</td>
                <td>{getBuildingName(r.buildingId)}</td>
                <td>{getRoomName(r.roomId)}</td>
                <td class="warranty-cell" on:click|stopPropagation>
                  <span>{r.warrantyEnd ? formatDate(r.warrantyEnd) : '-'}</span>
                  {#if r.warrantyAttachmentId}
                    <button
                      class="warranty-pdf-btn"
                      disabled={previewLoading && previewFileName === r.warrantyEnd}
                      on:click={() => loadPreviewById(r.warrantyAttachmentId!, 'เอกสารประกัน')}
                      title="ดูเอกสารประกัน"
                    >
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="pagination-bar">
        <div class="pagination-info">
          <span class="pagination-label">แสดง</span>
          <Dropdown compact dropUp options={limitOptions.map(o => ({ value: o, label: String(o) }))}
            bind:value={limit} on:change={() => { currentPage = 1; fetchAssets(); }} />
          <span class="pagination-label">รายการต่อหน้า</span>
          <span class="pagination-count">({totalItems.toLocaleString('th-TH')} รายการทั้งหมด)</span>
        </div>
        <div class="pagination-nav">
          <button class="page-btn nav-btn" disabled={currentPage === 1} on:click={() => goToPage(currentPage - 1)} aria-label="หน้าก่อนหน้า">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {#each pageNumbers as p}
            {#if p === '...'}<span class="page-ellipsis">…</span>
            {:else}<button class="page-btn {currentPage === p ? 'active' : ''}" disabled={currentPage === p} on:click={() => goToPage(p)}>{p}</button>
            {/if}
          {/each}
          <button class="page-btn nav-btn" disabled={currentPage === totalPages} on:click={() => goToPage(currentPage + 1)} aria-label="หน้าถัดไป">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
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

{#if showPreviewModal && previewUrl}
  <div class="preview-overlay" on:click={closePreview} role="presentation">
    <div class="preview-modal" on:click|stopPropagation>
      <div class="preview-header">
        <span class="preview-title">{previewFileName}</span>
        <button class="preview-close" on:click={closePreview}>✕</button>
      </div>
      <div class="preview-body">
        {#if previewMimeType.startsWith('image/')}
          <img src={previewUrl} alt={previewFileName} class="preview-image" />
        {:else}
          <iframe src={previewUrl} title={previewFileName} class="preview-iframe"></iframe>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showFilter}
  <div class="filter-backdrop" on:click={() => showFilter = false} role="presentation">
  <div class="filter-popup" on:click|stopPropagation>
    <h2 class="filter-title">ตัวกรองขั้นสูง</h2>
    <div class="filter-grid">
      <div class="filter-field">
        <label class="filter-label">สถานะ</label>
        <Dropdown options={statusOptions} bind:value={draftStatus} placeholder="ทั้งหมด" />
      </div>
      <div class="filter-field">
        <label class="filter-label">หน่วยงาน</label>
        <Dropdown options={[{ value: 0, label: 'ทั้งหมด' }, ...supportUnits.map(u => ({ value: u.id, label: u.name }))]} bind:value={draftUnitId} placeholder="ทั้งหมด" />
      </div>
      <div class="filter-field">
        <label class="filter-label">ประเภทครุภัณฑ์</label>
        <Dropdown options={[{ value: 0, label: 'ทั้งหมด' }, ...assetTypes.map(t => ({ value: t.id, label: t.name }))]} bind:value={draftTypeId} placeholder="ทั้งหมด" />
      </div>
      <div class="filter-field">
        <label class="filter-label">ทรัพย์สินได้มาโดย</label>
        <Dropdown options={[{ value: 0, label: 'ทั้งหมด' }, ...acquisitionSources.map(s => ({ value: s.id, label: s.name }))]} bind:value={draftSourceId} placeholder="ทั้งหมด" />
      </div>
      <div class="filter-field">
        <label class="filter-label">ปีงบประมาณ</label>
        <Dropdown options={[{ value: 0, label: 'ทั้งหมด' }, ...budgetYears.map(y => ({ value: y, label: String(y) }))]} bind:value={draftBudgetYear} placeholder="ทั้งหมด" />
      </div>
      <div class="filter-field">
        <label class="filter-label">ช่วงมูลค่า</label>
        <div class="price-range">
          <input class="filter-input" type="number" placeholder="มูลค่าขั้นต่ำ" bind:value={draftPriceMin} />
          <input class="filter-input" type="number" placeholder="มูลค่าสูงสุด" bind:value={draftPriceMax} />
        </div>
      </div>
      <div class="filter-field">
        <label class="filter-label">อาคาร</label>
        <Dropdown options={[{ value: 0, label: 'ทั้งหมด' }, ...buildings.map(b => ({ value: b.id, label: b.name }))]} bind:value={draftBuildingId} placeholder="ทั้งหมด" />
      </div>
      <div class="filter-field">
        <label class="filter-label">ห้อง</label>
        <Dropdown options={[{ value: 0, label: 'ทั้งหมด' }, ...rooms.map(r => ({ value: r.id, label: r.name }))]} bind:value={draftRoomId} placeholder="ทั้งหมด" />
      </div>
    </div>
    <div class="filter-footer">
      <button class="filter-clear-btn" on:click={clearDraftFilter}>ล้างทั้งหมด</button>
      <button class="filter-apply-btn" on:click={applyFilter}>ใช้งานตัวกรอง</button>
    </div>
  </div>
  </div>
{/if}

<style>
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
  .table { table-layout: fixed; width: 100%; }
  .table th { padding: 0.875rem 1rem; text-transform: none; font-size: 0.875rem; letter-spacing: normal; overflow: hidden; text-overflow: ellipsis; }
  .col-num { width: 12%; } .col-name { width: 15%; } .col-type { width: 10%; } .col-status { width: 8%; }
  .col-date { width: 9%; } .col-price { width: 8%; } .col-bldg { width: 12%; } .col-room { width: 10%; }
  .col-warranty { width: 16%; }
  .table th.sortable { cursor: pointer; user-select: none; }
  .table th.sortable:hover { background: #f3f4f6; }
  .th-inner { display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
  .sort-icon { font-size: 0.65rem; color: #d1d5db; flex-shrink: 0; line-height: 1; }
  .sort-icon.sort-active { color: #ffa200; }
  .table td { padding: 0.875rem 1rem; }
  .clickable-row { cursor: pointer; transition: all 0.2s ease; }
  .clickable-row:hover { background: #fffbf5; transform: translateX(4px); box-shadow: -4px 0 0 #fffbf5; }
  .clickable-row:active { background: #fff4e6; }
  .clickable-row:focus { outline: 2px solid #ffa200; outline-offset: -2px; }
  .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .status-normal, .status-available { background: #dcfce7; color: #166534; }
  .status-repair, .status-repairing { background: #fef3c7; color: #92400e; }
  .status-borrowed { background: #dbeafe; color: #1e40af; }
  .status-unavailable { background: #fee2e2; color: #991b1b; }
  .status-disposed { background: #f3f4f6; color: #4b5563; }
  .status-disbursed { background: #d1fae5; color: #065f46; }
  .card-wrapper { background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1); }
  .table-no-radius { border-radius: 0 !important; box-shadow: none !important; }

  .warranty-cell { display: flex; align-items: center; gap: 0.375rem; }
  .warranty-pdf-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.2rem 0.35rem; border: 1px solid #e5e7eb; border-radius: 0.25rem;
    background: #f9fafb; color: #ef4444; cursor: pointer; flex-shrink: 0;
    transition: background 0.15s, border-color 0.15s;
  }
  .warranty-pdf-btn:hover { background: #fee2e2; border-color: #fca5a5; }
  .warranty-pdf-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .preview-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center; z-index: 1000;
  }
  .preview-modal {
    background: white; border-radius: 0.75rem; width: 90vw; max-width: 900px;
    height: 85vh; display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .preview-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.875rem 1.25rem; border-bottom: 1px solid #e5e7eb;
  }
  .preview-title { font-weight: 600; color: #111827; font-size: 0.9375rem; }
  .preview-close {
    background: none; border: none; cursor: pointer; font-size: 1rem;
    color: #6b7280; padding: 0.25rem 0.5rem; border-radius: 0.25rem;
  }
  .preview-close:hover { background: #f3f4f6; color: #111827; }
  .preview-body { flex: 1; overflow: hidden; }
  .preview-image { width: 100%; height: 100%; object-fit: contain; padding: 1rem; }
  .preview-iframe { width: 100%; height: 100%; border: none; }
</style>
