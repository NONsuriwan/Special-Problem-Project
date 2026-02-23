<script lang="ts">
  import { onMount } from 'svelte';

  // กำหนด Interface
  interface MhesiRecord {
    id: number;
    mhesiNumber: string;
    facultyId: number | null;
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

  interface ApiResponse {
    success: boolean;
    data: MhesiRecord[];
    message?: string;
  }

  // ตัวแปรสถานะ
  let q = '';
  let searchQuery = ''; // เก็บค่าที่จะใช้ในการค้นหาจริง
  let activeTab = 'ทั้งหมด';
  let items: MhesiRecord[] = [];
  let loading = true;
  let error = '';

  // Master data
  let faculties: MasterData[] = [];
  let supportUnits: MasterData[] = [];
  let plans: MasterData[] = [];
  let projects: Project[] = [];

  const API_URL = 'http://localhost:3000';

  const tabs = [
    'ทั้งหมด',
    'เครื่องมือวิทยาศาสตร์',
    'เครื่องใช้ไฟฟ้า',
    'อุปกรณ์เคลื่อนที่',
    'เครื่องมือและอุปกรณ์งานช่าง',
    'ครุภัณฑ์ต่างๆ'
  ];

  // ดึงข้อมูล Master Data
  async function fetchMasterData() {
    try {
      const [facultiesRes, supportUnitsRes, plansRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/masters/faculties`),
        fetch(`${API_URL}/api/masters/support-units`),
        fetch(`${API_URL}/api/masters/plans`),
        fetch(`${API_URL}/api/projects`)
      ]);

      if (facultiesRes.ok) {
        const data = await facultiesRes.json();
        faculties = data.data || [];
      }

      if (supportUnitsRes.ok) {
        const data = await supportUnitsRes.json();
        supportUnits = data.data || [];
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

      const res = await fetch(url.toString());
      const result: ApiResponse = await res.json();

      if (result.success) {
        items = result.data;
      } else {
        error = result.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      }
    } catch (e) {
      error = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
      console.error('Error fetching MHESI:', e);
    } finally {
      loading = false;
    }
  }

  // ฟังก์ชันแปลง ID เป็นชื่อ
  function getFacultyName(id: number | null): string {
    if (!id) return '-';
    return faculties.find(f => f.id === id)?.name || '-';
  }

  function getSupportUnitName(id: number | null): string {
    if (!id) return '-';
    return supportUnits.find(s => s.id === id)?.name || '-';
  }

  function getPlanName(id: number | null): string {
    if (!id) return '-';
    return plans.find(p => p.id === id)?.name || '-';
  }

  function getProjectName(id: number | null): string {
    if (!id) return '-';
    return projects.find(p => p.id === id)?.projectName || '-';
  }

  // กรองข้อมูลตาม Tab (ใช้ searchQuery แทน q)
  $: filtered = items.filter(r => {
    const matchTab = activeTab === 'ทั้งหมด' || 
      (r.activityName && r.activityName.includes(activeTab));

    return matchTab;
  });

  function formatCurrency(amount: string | number): string {
    if (!amount) return '0.00';
    return Number(amount).toLocaleString('th-TH', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function handleSearch() {
    searchQuery = q; // อัพเดทค่าค้นหาจริงเมื่อกดปุ่ม
    fetchMhesi();
  }

  function handleAddMhesi() {
    window.location.href = '/mhesi/register';
  }

  // โหลดข้อมูลเมื่อ mount
  onMount(async () => {
    await fetchMasterData();
    await fetchMhesi();
  });
</script>

<div class="page-container">
  <!-- Header -->
  <div class="header">
    <div>
      <h1 class="title text-h3">สืบค้นเลข อว.</h1>
    </div>
  </div>

  <!-- Search Bar and Actions -->
  <div class="search-section">
    <div class="search-wrapper">
      <div class="search-input-group">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          bind:value={q}
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="ค้นหา"
          class="text-b6 search-input"
        />
        <button class="camera-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      <button class="text-b5 btn-search" on:click={handleSearch}>ค้นหา</button>
      <button class="text-b5 btn-add" on:click={handleAddMhesi}>เพิ่มเลข อว</button>
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
      <p>⚠️ {error}</p>
      <button class="retry-btn" on:click={fetchMhesi}>ลองอีกครั้ง</button>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-box">
      <p>ไม่พบข้อมูลเลข อว.</p>
    </div>
  {:else}
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>เลข อว.</th>
            <th>รายการ</th>
            <th>โครงการ</th>
            <th>วันที่</th>
            <th class="text-right">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as r (r.id)}
            <tr>
              <td class="mhesi-number">{r.mhesiNumber || '-'}</td>
              <td>{r.activityName || '-'}</td>
              <td>{getProjectName(r.projectId)}</td>
              <td>{formatDate(r.date)}</td>
              <td class="text-right amount">{formatCurrency(r.amount)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .page-container {
    background: #e5e5e5;
    min-height: 100vh;
    padding: 2rem;
  }

  /* Header */
  .header {
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  /* Search Section */
  .search-section {
    margin-bottom: 1rem;
  }

  .search-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .search-input-group {
    position: relative;
    flex: 1;
    max-width: 600px;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: #9ca3af;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 3.5rem 0.75rem 3rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: white;
  }

  .search-input:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.1);
  }

  .camera-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: white;
    border: 1px solid #d1d5db;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .camera-btn svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #6b7280;
  }

  .camera-btn:hover {
    background: #f9fafb;
  }

  .btn-search {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }

  .btn-search:hover {
    background: #e69200;
  }

  .btn-add {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-add:hover {
    background: #f9fafb;
  }

  /* Tabs */
  .tabs-container {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .filter-btn {
    background: white;
    border: 1px solid #d1d5db;
    padding: 0.625rem;
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .filter-btn svg {
    width: 1.25rem;
    height: 1.25rem;
    color: #6b7280;
  }

  .filter-btn:hover {
    background: #f9fafb;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.25rem 0;
  }

  .tab {
    background: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 1.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .tab:hover {
    background: #f9fafb;
  }

  .tab.active {
    background: #ffa200;
    color: white;
  }

  /* Table */
  .table-container {
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .table thead {
    background: #f9fafb;
  }

  .table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  .table td {
    padding: 1rem;
    color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
  }

  .table tbody tr:hover {
    background: #fffbf5;
  }

  .table tbody tr:last-child td {
    border-bottom: none;
  }

  .mhesi-number {
    font-family: 'Courier New', monospace;
    font-weight: 600;
    color: #ffa200;
  }

  .amount {
    font-weight: 700;
    color: #1f2937;
  }

  .text-right {
    text-align: right;
  }

  /* Loading */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: white;
    border-radius: 0.75rem;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f4f6;
    border-top-color: #ffa200;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    margin-top: 1rem;
    color: #6b7280;
  }

  /* Error & Empty */
  .error-box, .empty-box {
    background: white;
    padding: 3rem;
    border-radius: 0.75rem;
    text-align: center;
  }

  .error-box p {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .retry-btn {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .empty-box p {
    color: #6b7280;
  }
</style>