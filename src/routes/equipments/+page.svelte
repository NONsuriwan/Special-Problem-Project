<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  type Asset = {
    id: number;
    assetCode: string;
    assetName: string;
    assetTypeId: number | null;
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
        fetch('http://localhost:3000/api/masters/asset-types'),
        fetch('http://localhost:3000/api/masters/buildings'),
        fetch('http://localhost:3000/api/masters/rooms')
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
      
      const response = await fetch('http://localhost:3000/api/assets?limit=100');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse = await response.json();
      
      if (result.success && result.data) {
        items = result.data;
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

  // Get name from ID
  function getAssetTypeName(id: number | null): string {
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
    const typeName = getAssetTypeName(x.assetTypeId);
    const buildingName = getBuildingName(x.buildingId);
    const roomName = getRoomName(x.roomId);
    
    const byQuery = q === '' || 
      [x.assetCode, x.assetName, typeName, buildingName, roomName]
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
      'available': 'ปกติ',
      'borrowed': 'ถูกยืม',
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
  function handleRowClick(assetId: number) {
    goto(`/equipments/detail/${assetId}`);
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
    <div class="table-container">
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
              on:click={() => handleRowClick(r.id)}
              on:keydown={(e) => e.key === 'Enter' && handleRowClick(r.id)}
              tabindex="0"
              role="button"
            >
              <td>{r.assetCode}</td>
              <td>{r.assetName}</td>
              <td>{getAssetTypeName(r.assetTypeId)}</td>
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

  .status-available {
    background: #dcfce7;
    color: #166534;
  }

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
</style>