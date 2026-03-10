<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

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

  // Master data
  let assetTypes: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: MasterData[] = [];

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
      const [typesRes, buildingsRes, roomsRes] = await Promise.all([
        fetch('http://localhost:3000/api/masters/equipment-types', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/buildings', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/rooms', { credentials: 'include' })
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

      const response = await fetch(url.toString(), { credentials: 'include' });

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

  // Filter rows based on search and category
  $: rows = items.filter((x) => {
    const typeName = getEquipmentTypeName(x.equipmentTypeId);
    const buildingName = getBuildingName(x.buildingId);
    const roomName = getRoomName(x.roomId);

    const byQuery = q === '' ||
      [x.equipmentCode, x.equipmentName, typeName, buildingName, roomName]
        .join(' ')
        .toLowerCase()
        .includes(q.toLowerCase());

    const byFilter = filter === 'ทั้งหมด' || typeName === filter;
    const byTab = activeTab === 'ทั้งหมด' || typeName === activeTab;

    return byFilter && byQuery && byTab;
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
      <button class="btn-secondary">ค้นหา</button>
      <button class="btn-primary" on:click={handleAddEquipment}>เพิ่มครุภัณฑ์</button>
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
        placeholder="ค้นหา" 
        class="search-input"
      />
      <button class="camera-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs-container">
    <button class="filter-btn">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
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
        <thead>
          <tr>
            <th>รหัสครุภัณฑ์</th>
            <th>ชื่อครุภัณฑ์</th>
            <th>ประเภท</th>
            <th>สถานะ</th>
            <th>วันที่ซื้อ</th>
            <th>ราคา</th>
            <th>อาคาร</th>
            <th>ห้อง</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.id)}
            <tr
              class="clickable-row"
              on:click={() => handleRowClick(r.uuid)}
              on:keydown={(e) => e.key === 'Enter' && handleRowClick(r.uuid)}
              tabindex="0"
              role="button"
            >
              <td>{r.equipmentCode}</td>
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

  .btn-primary {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.625rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #e69200;
  }

  .btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.625rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }

  /* Search wrapper (unique to this page) */
  .search-container {
    margin-bottom: 1rem;
  }

  .search-input-wrapper {
    position: relative;
    max-width: 700px;
  }

  /* Table (different padding + no uppercase) */
  .table th {
    padding: 0.875rem 1rem;
    text-transform: none;
    font-size: 0.875rem;
    letter-spacing: normal;
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
</style>