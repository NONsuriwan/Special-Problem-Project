<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';

  type Asset = {
    id: number;
    uuid: string;
    equipmentCode: string;
    equipmentName: string;
    equipmentTypeId: number | null;
    status: string;
    acquisitionDate: string | null;
    price: string | null;
    buildingId: number | null;
    roomId: number | null;
    departmentId?: number | null;
    acquisitionSourceId?: number | null;
    moneyTypeId?: number | null;
  };

  type MasterData = {
    id: number;
    name: string;
  };

  type ApiResponse = {
    success: boolean;
    data: Asset[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };

  let q = '';
  let filter = 'ทั้งหมด';
  let items: Asset[] = [];
  let loading = true;
  let error = '';

  // Pagination state
  let currentPage = 1;
  let limit = 10;
  let totalItems = 0;
  let totalPages = 0;

  const limitOptions = [10, 25, 50, 100];

  // Sort state
  let sortBy = '';
  let sortDir: 'asc' | 'desc' = 'asc';

  // Columns sorted client-side (no backend support needed)
  const clientSortCols = ['equipmentType', 'building', 'room'];

  function toggleSort(col: string) {
    if (sortBy === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = col;
      sortDir = 'asc';
    }
    if (!clientSortCols.includes(col)) {
      currentPage = 1;
      fetchAssets();
    }
  }


  // Master data
  let assetTypes: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: MasterData[] = [];
  let supportUnits: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];

  // Filter popup state
  let showFilter = false;

  // Draft filters (pending until apply)
  let draftStatus = '';
  let draftTypeId = 0;
  let draftBuildingId = 0;
  let draftRoomId = 0;
  let draftUnitId = 0;
  let draftSourceId = 0;
  let draftBudgetYear = 0;
  let draftPriceMin = '';
  let draftPriceMax = '';

  // Active filters
  let activeStatus = '';
  let activeTypeId = 0;
  let activeBuildingId = 0;
  let activeRoomId = 0;
  let activeUnitId = 0;
  let activeSourceId = 0;
  let activeBudgetYear = 0;
  let activePriceMin = '';
  let activePriceMax = '';

  const statusOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'normal', label: 'ปกติ' },
    { value: 'borrowed', label: 'ถูกยืม' },
    { value: 'repair', label: 'กำลังซ่อม' },
    { value: 'unavailable', label: 'ไม่พร้อมใช้งาน' },
    { value: 'disposed', label: 'จำหน่ายแล้ว' },
  ];

  const currentBEYear = new Date().getFullYear() + 543;
  const budgetYears = Array.from({ length: 10 }, (_, i) => currentBEYear - i);

  $: hasActiveFilter = !!(activeStatus || activeTypeId || activeBuildingId || activeRoomId ||
    activeUnitId || activeSourceId || activeBudgetYear || activePriceMin || activePriceMax);

  function openFilter() {
    draftStatus = activeStatus;
    draftTypeId = activeTypeId;
    draftBuildingId = activeBuildingId;
    draftRoomId = activeRoomId;
    draftUnitId = activeUnitId;
    draftSourceId = activeSourceId;
    draftBudgetYear = activeBudgetYear;
    draftPriceMin = activePriceMin;
    draftPriceMax = activePriceMax;
    showFilter = true;
  }

  function applyFilter() {
    activeStatus = draftStatus;
    activeTypeId = draftTypeId;
    activeBuildingId = draftBuildingId;
    activeRoomId = draftRoomId;
    activeUnitId = draftUnitId;
    activeSourceId = draftSourceId;
    activeBudgetYear = draftBudgetYear;
    activePriceMin = draftPriceMin;
    activePriceMax = draftPriceMax;
    showFilter = false;
    currentPage = 1;
    fetchAssets();
  }

  function clearDraftFilter() {
    draftStatus = '';
    draftTypeId = 0;
    draftBuildingId = 0;
    draftRoomId = 0;
    draftUnitId = 0;
    draftSourceId = 0;
    draftBudgetYear = 0;
    draftPriceMin = '';
    draftPriceMax = '';
  }

  let categories = ['ทั้งหมด'];

  // Active tab
  let activeTab = 'ทั้งหมด';

  const tabs = [
    'ทั้งหมด',
    'เครื่องมือวิทยาศาสตร์',
    'เครื่องใช้ไฟฟ้า',
    'อุปกรณ์เคลื่อนที่',
    'เครื่องมือและอุปกรณ์งานช่าง',
    'ครุภัณฑ์ต่างๆ'
  ];

  // Fetch master data
  async function fetchMasterData() {
    try {
      const [typesRes, buildingsRes, roomsRes, unitsRes, sourcesRes] = await Promise.all([
        fetch('http://localhost:3000/api/masters/equipment-types', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/buildings', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/rooms', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/support-units', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/acquisition-sources', { credentials: 'include' }),
      ]);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        assetTypes = typesData.data || [];
        categories = ['ทั้งหมด', ...assetTypes.map(t => t.name)];
      }
      if (buildingsRes.ok) {
        const buildingsData = await buildingsRes.json();
        buildings = buildingsData.data || [];
      }
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        rooms = roomsData.data || [];
      }
      if (unitsRes.ok) {
        const d = await unitsRes.json();
        supportUnits = d.data || [];
      }
      if (sourcesRes.ok) {
        const d = await sourcesRes.json();
        acquisitionSources = d.data || [];
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  // Fetch assets data
  async function fetchAssets() {
    try {
      loading = true;
      error = '';

      const url = new URL('http://localhost:3000/api/equipment');
      url.searchParams.set('page', String(currentPage));
      url.searchParams.set('limit', String(limit));
      if (q.trim()) url.searchParams.set('search', q.trim());
      if (sortBy) {
        url.searchParams.set('sortBy', sortBy);
        url.searchParams.set('sortDir', sortDir);
      }
      if (activeStatus)     url.searchParams.set('status',            activeStatus);
      if (activeTypeId)     url.searchParams.set('equipmentTypeId',   String(activeTypeId));
      if (activeBuildingId) url.searchParams.set('buildingId',        String(activeBuildingId));
      if (activeRoomId)     url.searchParams.set('roomId',            String(activeRoomId));
      if (activeUnitId)     url.searchParams.set('supportUnitId',     String(activeUnitId));
      if (activeSourceId)   url.searchParams.set('acquisitionSourceId', String(activeSourceId));
      if (activeBudgetYear) url.searchParams.set('budgetYear',        String(activeBudgetYear));
      if (activePriceMin)   url.searchParams.set('priceMin',          activePriceMin);
      if (activePriceMax)   url.searchParams.set('priceMax',          activePriceMax);

      const response = await fetch(url.toString(), { credentials: 'include' });
      if (response.status === 401) { window.location.href = '/login'; return; }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        items = result.data;
        totalItems = result.pagination?.total ?? 0;
        totalPages = result.pagination?.totalPages ?? 0;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      console.error('Error fetching assets:', err);
    } finally {
      loading = false;
    }
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    fetchAssets();
  }

  function onLimitChange(e: Event) {
    limit = parseInt((e.target as HTMLSelectElement).value);
    currentPage = 1;
    fetchAssets();
  }

  // Page numbers to show (max 5 around current page)
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

  // Get name from ID
  function getEquipmentTypeName(id: number | null): string {
    if (!id) return '-';
    return assetTypes.find(t => t.id === id)?.name || `ID: ${id}`;
  }

  function getBuildingName(id: number | null): string {
    if (!id) return '-';
    return buildings.find(b => b.id === id)?.name || `ID: ${id}`;
  }

  function getRoomName(id: number | null): string {
    if (!id) return '-';
    return rooms.find(r => r.id === id)?.name || `ID: ${id}`;
  }

  // Filter rows based on category (search is server-side)
  $: rows = items.filter((x) => {
    const typeName = getEquipmentTypeName(x.equipmentTypeId);
    const buildingName = getBuildingName(x.buildingId);
    const roomName = getRoomName(x.roomId);

    const byFilter = filter === 'ทั้งหมด' || typeName === filter;
    const byTab = activeTab === 'ทั้งหมด' || typeName === activeTab;

    const byStatus = !activeStatus ||
      x.status === activeStatus ||
      (activeStatus === 'normal' && (x.status === 'normal' || x.status === 'available'));
    const byType = !activeTypeId || x.equipmentTypeId === activeTypeId;
    const byBuilding = !activeBuildingId || x.buildingId === activeBuildingId;
    const byRoom = !activeRoomId || x.roomId === activeRoomId;
    const byUnit = !activeUnitId || x.departmentId === activeUnitId;
    const bySource = !activeSourceId || x.acquisitionSourceId === activeSourceId;
    const byYear = !activeBudgetYear ||
      (x.acquisitionDate && new Date(x.acquisitionDate).getFullYear() + 543 === activeBudgetYear);
    const byPriceMin = !activePriceMin ||
      (x.price !== null && parseFloat(x.price) >= parseFloat(activePriceMin));
    const byPriceMax = !activePriceMax ||
      (x.price !== null && parseFloat(x.price) <= parseFloat(activePriceMax));

    return byFilter && byTab &&
      byStatus && byType && byBuilding && byRoom &&
      byUnit && bySource && byYear && byPriceMin && byPriceMax;
  }).sort((a, b) => {
    if (!clientSortCols.includes(sortBy)) return 0;
    const mul = sortDir === 'asc' ? 1 : -1;
    let va = '', vb = '';
    if (sortBy === 'equipmentType') {
      va = assetTypes.find(t => t.id === a.equipmentTypeId)?.name ?? '';
      vb = assetTypes.find(t => t.id === b.equipmentTypeId)?.name ?? '';
    } else if (sortBy === 'building') {
      va = buildings.find(x => x.id === a.buildingId)?.name ?? '';
      vb = buildings.find(x => x.id === b.buildingId)?.name ?? '';
    } else if (sortBy === 'room') {
      va = rooms.find(x => x.id === a.roomId)?.name ?? '';
      vb = rooms.find(x => x.id === b.roomId)?.name ?? '';
    }
    const cmp = va.localeCompare(vb, 'th') * mul;
    if (cmp !== 0) return cmp;
    return (a.equipmentNumber ?? '').localeCompare(b.equipmentNumber ?? '', 'th', { numeric: true });
  });

  // Format price to Thai number format
  function formatPrice(price: string | null): string {
    if (!price) return '-';
    return parseFloat(price).toLocaleString('th-TH');
  }

  // Format date to Thai format
  function formatDate(date: string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Map status to Thai
  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'normal': 'ปกติ',
      'available': 'ปกติ',
      'borrowed': 'ถูกยืม',
      'repair': 'กำลังซ่อม',
      'repairing': 'กำลังซ่อม',
      'unavailable': 'ไม่พร้อมใช้งาน',
      'disposed': 'จำหน่ายแล้ว'
    };
    return statusMap[status] || status;
  }

  // Navigate to add equipment page
  function handleAddEquipment() {
    goto('/equipments/add-equipments');
  }

  // Navigate to equipment detail page
  function handleRowClick(uuid: string) {
    goto(`/equipments/detail/${uuid}`);
  }

  // Load data on mount
  onMount(async () => {
    await fetchMasterData();
    await fetchAssets();
  });
</script>

<div class="page-container">
  <!-- Header -->
  <div class="header">
    <div>
      <h1 class="title text-h3">สืบค้นครุภัณฑ์</h1>
    </div>
    <div class="header-actions">
      <button class="btn-primary" on:click={handleAddEquipment}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        เพิ่มครุภัณฑ์
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
        placeholder="ค้นหาชื่อ รหัส หรือหมายเลขสินทรัพย์..."
        class="search-input"
        on:keydown={e => { if (e.key === 'Enter') { currentPage = 1; fetchAssets(); } }}
      />
      {#if q}
        <button class="search-clear-btn" on:click={() => { q = ''; currentPage = 1; fetchAssets(); }} aria-label="ล้างการค้นหา">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      {/if}
      <button class="search-submit-btn" on:click={() => { currentPage = 1; fetchAssets(); }}>
        ค้นหา
      </button>
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
      {#each tabs as tab}
        <button 
          class="tab {activeTab === tab ? 'active' : ''}"
          on:click={() => activeTab = tab}
        >
          {tab}
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
      <p>❌ {error}</p>
      <button class="retry-btn" on:click={fetchAssets}>ลองอีกครั้ง</button>
    </div>
  {:else if rows.length === 0}
    <div class="empty-box">
      <p>ไม่พบข้อมูลครุภัณฑ์</p>
    </div>
  {:else}
    <div class="card-wrapper">
    <div class="table-container table-no-radius">
      <table class="table">
        <colgroup>
          <col class="col-num">
          <col class="col-name">
          <col class="col-type">
          <col class="col-status">
          <col class="col-date">
          <col class="col-price">
          <col class="col-bldg">
          <col class="col-room">
        </colgroup>
        <thead>
          <tr>
            {#each [
              { col: 'equipmentNumber', label: 'หมายเลขสินทรัพย์' },
              { col: 'equipmentName',   label: 'ชื่อครุภัณฑ์' },
              { col: 'equipmentType',   label: 'ประเภท' },
              { col: 'status',          label: 'สถานะ' },
              { col: 'acquisitionDate', label: 'วันที่ซื้อ' },
              { col: 'price',           label: 'ราคา' },
              { col: 'building',        label: 'อาคาร' },
              { col: 'room',            label: 'ห้อง' },
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
            <tr
              class="clickable-row"
              on:click={() => handleRowClick(r.uuid)}
              on:keydown={(e) => e.key === 'Enter' && handleRowClick(r.uuid)}
              tabindex="0"
              role="button"
            >
              <td>{r.equipmentNumber ?? '-'}</td>
              <td>{r.equipmentName}</td>
              <td>{getEquipmentTypeName(r.equipmentTypeId)}</td>
              <td>
                <span class="status-badge status-{r.status}">
                  {getStatusText(r.status)}
                </span>
              </td>
              <td>{formatDate(r.acquisitionDate)}</td>
              <td class="text-right">{formatPrice(r.price)}</td>
              <td>{getBuildingName(r.buildingId)}</td>
              <td>{getRoomName(r.roomId)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->

    <div class="pagination-bar">
      <div class="pagination-info">
        <span class="pagination-label">แสดง</span>
        <select class="limit-select" value={limit} on:change={onLimitChange}>
          {#each limitOptions as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
        <span class="pagination-label">รายการต่อหน้า</span>
        <span class="pagination-count">
          ({totalItems.toLocaleString('th-TH')} รายการทั้งหมด)
        </span>
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
      <!-- สถานะ -->
      <div class="filter-field">
        <label class="filter-label">สถานะ</label>
        <Dropdown
          options={statusOptions}
          bind:value={draftStatus}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- หน่วยงาน -->
      <div class="filter-field">
        <label class="filter-label">หน่วยงาน</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...supportUnits.map(u => ({ value: u.id, label: u.name }))]}
          bind:value={draftUnitId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ประเภทสินทรัพย์ -->
      <div class="filter-field">
        <label class="filter-label">ประเภทสินทรัพย์</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...assetTypes.map(t => ({ value: t.id, label: t.name }))]}
          bind:value={draftTypeId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ทรัพย์สินได้มาโดย -->
      <div class="filter-field">
        <label class="filter-label">ทรัพย์สินได้มาโดย</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...acquisitionSources.map(s => ({ value: s.id, label: s.name }))]}
          bind:value={draftSourceId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ปีงบประมาณ -->
      <div class="filter-field">
        <label class="filter-label">ปีงบประมาณ</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...budgetYears.map(y => ({ value: y, label: String(y) }))]}
          bind:value={draftBudgetYear}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ช่วงมูลค่า -->
      <div class="filter-field">
        <label class="filter-label">ช่วงมูลค่า</label>
        <div class="price-range">
          <input
            class="filter-input"
            type="number"
            placeholder="มูลค่าขั้นต่ำ"
            bind:value={draftPriceMin}
          />
          <input
            class="filter-input"
            type="number"
            placeholder="มูลค่าสูงสุด"
            bind:value={draftPriceMax}
          />
        </div>
      </div>

      <!-- อาคาร -->
      <div class="filter-field">
        <label class="filter-label">อาคาร</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...buildings.map(b => ({ value: b.id, label: b.name }))]}
          bind:value={draftBuildingId}
          placeholder="ทั้งหมด"
        />
      </div>

      <!-- ห้อง -->
      <div class="filter-field">
        <label class="filter-label">ห้อง</label>
        <Dropdown
          options={[{ value: 0, label: 'ทั้งหมด' }, ...rooms.map(r => ({ value: r.id, label: r.name }))]}
          bind:value={draftRoomId}
          placeholder="ทั้งหมด"
        />
      </div>
    </div>

    <div class="filter-footer">
      <button class="filter-clear-btn" on:click={clearDraftFilter}>ล้างทั้งหมด</button>
      <button class="filter-apply-btn" on:click={applyFilter}>ใช้งานตัวกรอง</button>
    </div>
  </div>
{/if}

<style>
  /* Header with actions layout (overrides shared .header) */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  /* Table (different padding + no uppercase) */
  .table {
    table-layout: fixed;
    width: 100%;
  }

  .table th {
    padding: 0.875rem 1rem;
    text-transform: none;
    font-size: 0.875rem;
    letter-spacing: normal;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-num    { width: 14%; }
  .col-name   { width: 18%; }
  .col-type   { width: 12%; }
  .col-status { width: 9%; }
  .col-date   { width: 10%; }
  .col-price  { width: 9%; }
  .col-bldg   { width: 14%; }
  .col-room   { width: 14%; }

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
    flex-shrink: 0;
    line-height: 1;
  }

  .sort-icon.sort-active {
    color: #ffa200;
  }

  .table td {
    padding: 0.875rem 1rem;
  }

  /* Clickable Row */
  .clickable-row {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clickable-row:hover {
    background: #fffbf5;
    transform: translateX(4px);
  }

  .clickable-row:active {
    background: #fff4e6;
  }

  .clickable-row:focus {
    outline: 2px solid #ffa200;
    outline-offset: -2px;
  }

  /* Status Badge */
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-normal,
  .status-available {
    background: #dcfce7;
    color: #166534;
  }

  .status-repair,
  .status-repairing {
    background: #fef3c7;
    color: #92400e;
  }

  .status-borrowed {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-unavailable {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-disposed {
    background: #f3f4f6;
    color: #4b5563;
  }

  /* Card wrapper — holds table + pagination as one card */
  .card-wrapper {
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  /* Remove default card styles from table-container when inside wrapper */
  .table-no-radius {
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  /* Pagination */
  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    background: white;
    border-top: 1px solid #f3f4f6;
  }

  .pagination-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .pagination-label {
    color: #6b7280;
  }

  .pagination-count {
    color: #9ca3af;
    font-size: 0.8125rem;
    margin-left: 0.25rem;
  }

  .limit-select {
    appearance: none;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.25rem 1.75rem 0.25rem 0.625rem;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    transition: border-color 0.15s;
  }

  .limit-select:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255, 162, 0, 0.15);
  }

  .pagination-nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .page-btn {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .page-btn:hover:not(:disabled):not(.active) {
    border-color: #ffa200;
    color: #ffa200;
    background: #fffbf5;
  }

  .page-btn.active {
    background: #ffa200;
    border-color: #ffa200;
    color: white;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(255, 162, 0, 0.35);
  }

  .page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .page-btn.active:disabled {
    opacity: 1;
    cursor: default;
  }

  .nav-btn {
    color: #6b7280;
  }

  .page-ellipsis {
    min-width: 2rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
    user-select: none;
  }

  /* Filter button active state */
  .filter-btn-active {
    background: #fff4e6;
    border-color: #ffa200;
    color: #ffa200;
  }

  .filter-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffa200;
  }

  /* Filter popup overlay */
  .filter-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 200;
  }

  .filter-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 1rem;
    padding: 1.75rem;
    width: min(600px, 90vw);
    z-index: 201;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  }

  .filter-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1.25rem;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 1.25rem;
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .filter-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
  }

  .filter-select {
    appearance: none;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.625rem 2rem 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.625rem center;
    width: 100%;
  }

  .filter-select:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255, 162, 0, 0.15);
  }

  .price-range {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .filter-input {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    width: 100%;
    box-sizing: border-box;
  }

  .filter-input:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255, 162, 0, 0.15);
  }

  .filter-input::placeholder {
    color: #9ca3af;
  }

  .filter-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #f3f4f6;
  }

  .filter-clear-btn {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-clear-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .filter-apply-btn {
    background: #ffa200;
    border: none;
    color: white;
    padding: 0.625rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .filter-apply-btn:hover {
    background: #e69200;
  }
</style>