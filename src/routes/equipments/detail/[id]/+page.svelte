<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  type Asset = {
    id: number;
    uuid: string;
    equipmentCode: string;
    equipmentName: string;
    equipmentNumber: string | null;
    equipmentTypeId: number | null;
    departmentId: number | null;
    activityId: number | null;
    fundId: number | null;
    fiscalYear: number | null;
    price: string | null;
    unit: string | null;
    acquisitionSourceId: number | null;
    acquisitionMethodId: number | null;
    acquisitionDate: string | null;
    company: string | null;
    sizeDetail: string | null;
    buildingId: number | null;
    roomId: number | null;
    projectId: number | null;
    status: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type MasterData = {
    id: number;
    name: string;
  };

  type Attachment = {
    id: number;
    refType: string;
    refId: number;
    fileName: string;
    filePath: string;
    uploadedAt: string;
  };

  type UsageHistory = {
    date: string;
    time: string;
    status: string;
    actor: string;
    note: string;
  };

  let asset: Asset | null = null;
  let attachments: Attachment[] = [];
  let usageHistory: UsageHistory[] = [];
  let loading = true;
  let error = '';

  // Master data
  let assetTypes: MasterData[] = [];
  let departments: MasterData[] = [];
  let activities: MasterData[] = [];
  let funds: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];
  let acquisitionMethods: MasterData[] = [];
  let projects: any[] = [];

  // Get asset ID from URL
  $: assetId = $page.params.id;

  // Fetch master data
  async function fetchMasterData() {
    try {
      const [
        typesRes,
        deptRes,
        actRes,
        fundRes,
        buildRes,
        roomRes,
        srcRes,
        methodRes,
        projRes
      ] = await Promise.all([
        fetch('http://localhost:3000/api/masters/equipment-types', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/departments', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/activities', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/funds', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/buildings', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/rooms', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/acquisition-sources', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/acquisition-methods', { credentials: 'include' }),
        fetch('http://localhost:3000/api/projects', { credentials: 'include' })
      ]);

      if (typesRes.ok) assetTypes = (await typesRes.json()).data || [];
      if (deptRes.ok) departments = (await deptRes.json()).data || [];
      if (actRes.ok) activities = (await actRes.json()).data || [];
      if (fundRes.ok) funds = (await fundRes.json()).data || [];
      if (buildRes.ok) buildings = (await buildRes.json()).data || [];
      if (roomRes.ok) rooms = (await roomRes.json()).data || [];
      if (srcRes.ok) acquisitionSources = (await srcRes.json()).data || [];
      if (methodRes.ok) acquisitionMethods = (await methodRes.json()).data || [];
      if (projRes.ok) projects = (await projRes.json()).data || [];
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  // Fetch asset details
  async function fetchAssetDetail() {
    try {
      loading = true;
      error = '';

      const response = await fetch(`http://localhost:3000/api/equipment/${assetId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        asset = result.data;
        await fetchAttachments();
      } else {
        throw new Error('ไม่พบข้อมูลครุภัณฑ์');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      console.error('Error fetching asset:', err);
    } finally {
      loading = false;
    }
  }

  // Fetch attachments
  async function fetchAttachments() {
    try {
      const response = await fetch(`http://localhost:3000/api/equipment/${assetId}/attachments`, { credentials: 'include' });
      if (response.ok) {
        const result = await response.json();
        attachments = result.data || [];
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  }

  // Get name from ID helpers
  function getMasterName(list: MasterData[], id: number | null): string {
    if (!id) return '-';
    return list.find(item => item.id === id)?.name || `ID: ${id}`;
  }

  function getProjectName(id: number | null): string {
    if (!id) return '-';
    return projects.find(p => p.id === id)?.projectName || `ID: ${id}`;
  }

  // Format helpers
  function formatPrice(price: string | null): string {
    if (!price) return '-';
    return parseFloat(price).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(date: string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

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

  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'normal': 'status-available',
      'available': 'status-available',
      'borrowed': 'status-borrowed',
      'repair': 'status-repairing',
      'repairing': 'status-repairing',
      'unavailable': 'status-unavailable',
      'disposed': 'status-disposed'
    };
    return colorMap[status] || '';
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleBack() {
    goto('/equipments');
  }

  function handleEdit() {
    goto(`/equipments/edit/${assetId}`);
  }

  onMount(async () => {
    await fetchMasterData();
    await fetchAssetDetail();
  });
</script>

<div class="page-container">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>
  {:else if error}
    <div class="error-box">
      <p>❌ {error}</p>
      <button class="btn-primary" on:click={handleBack}>กลับหน้าหลัก</button>
    </div>
  {:else if asset}
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="title">รายละเอียดครุภัณฑ์</h1>
        <p class="subtitle">{asset.equipmentName}</p>
        <p class="code">{asset.equipmentCode}</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" on:click={handleBack}>
          แก้ไขสถานะ
        </button>
        <button class="btn-primary" on:click={handleEdit}>
          ✏️ แก้ไขข้อมูล
        </button>
      </div>
    </div>

    <div class="content-grid">
      <!-- Left Column: Equipment Details -->
      <div class="detail-card">
        <h2 class="card-title">ข้อมูลทั่วไป</h2>
        <div class="status-badge-container">
          <span class="detail-label">สถานะ:</span>
          <span class="status-badge {getStatusColor(asset.status)}">
            {getStatusText(asset.status)}
          </span>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-icon">📦</div>
            <div>
              <div class="detail-label">หน่วยงาน</div>
              <div class="detail-value">{getMasterName(departments, asset.departmentId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🏢</div>
            <div>
              <div class="detail-label">กิจกรรม</div>
              <div class="detail-value">{getMasterName(activities, asset.activityId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">💰</div>
            <div>
              <div class="detail-label">ทุน/กองทุน</div>
              <div class="detail-value">{getMasterName(funds, asset.fundId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📋</div>
            <div>
              <div class="detail-label">รหัสสินทรัพย์</div>
              <div class="detail-value">{asset.equipmentCode || '-'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🏷️</div>
            <div>
              <div class="detail-label">หมายเลขสินทรัพย์</div>
              <div class="detail-value">{asset.equipmentNumber || '-'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📝</div>
            <div>
              <div class="detail-label">หน่วยนับ</div>
              <div class="detail-value">{asset.unit || '-'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📊</div>
            <div>
              <div class="detail-label">ประเภท</div>
              <div class="detail-value">{getMasterName(assetTypes, asset.equipmentTypeId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">👤</div>
            <div>
              <div class="detail-label">ทรัพย์สินเดิมกไม่ใช่กไม่</div>
              <div class="detail-value">ถ้ามีจิงถ้า</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📅</div>
            <div>
              <div class="detail-label">วันที่ได้มา</div>
              <div class="detail-value">{formatDate(asset.acquisitionDate)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📌</div>
            <div>
              <div class="detail-label">วิธีการได้มา</div>
              <div class="detail-value">{getMasterName(acquisitionMethods, asset.acquisitionMethodId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🎯</div>
            <div>
              <div class="detail-label">สถานะที่ตั้ง</div>
              <div class="detail-value">{asset.sizeDetail || 'Sc-02'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">💵</div>
            <div>
              <div class="detail-label">ราคา</div>
              <div class="detail-value">{formatPrice(asset.price)} บาท</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📍</div>
            <div>
              <div class="detail-label">บริษัท</div>
              <div class="detail-value">{asset.company || 'Workspace'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🏗️</div>
            <div>
              <div class="detail-label">โครงการ</div>
              <div class="detail-value">{getProjectName(asset.projectId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🏢</div>
            <div>
              <div class="detail-label">อาคาร</div>
              <div class="detail-value">{getMasterName(buildings, asset.buildingId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🚪</div>
            <div>
              <div class="detail-label">ห้อง</div>
              <div class="detail-value">{getMasterName(rooms, asset.roomId)}</div>
            </div>
          </div>

          <div class="detail-item full-width">
            <div class="detail-icon">📖</div>
            <div>
              <div class="detail-label">โครงการ</div>
              <div class="detail-value">{getMasterName(acquisitionSources, asset.acquisitionSourceId)}</div>
            </div>
          </div>

          <div class="detail-item full-width">
            <div class="detail-icon">📏</div>
            <div>
              <div class="detail-label">ขนาดและลักษณะ</div>
              <div class="detail-value">{asset.sizeDetail || 'กว้าง 59 ลึก 58 สูง 89.5-99.5 ซม.'}</div>
            </div>
          </div>

          {#if asset.note}
            <div class="detail-item full-width">
              <div class="detail-icon">📝</div>
              <div>
                <div class="detail-label">หมายเหตุ</div>
                <div class="detail-value">{asset.note}</div>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <!-- Attachments -->
        <div class="attachment-card">
          <h2 class="card-title">เอกสารแนบ</h2>
          
          {#if attachments.length === 0}
            <div class="empty-state">
              <div class="upload-placeholder">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p>คลิกเพื่อเพิ่มไฟล์แนบ</p>
                <p class="hint">หรือลากไฟล์มาวางที่นี่</p>
              </div>
            </div>
          {:else}
            <div class="attachment-list">
              {#each attachments as attachment}
                <div class="attachment-item">
                  <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="file-info">
                    <div class="file-name">{attachment.fileName}</div>
                    <div class="file-size">1.2 MB</div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Usage History -->
        <div class="history-card">
          <h2 class="card-title">ประวัติการใช้งาน</h2>
          
          {#if usageHistory.length === 0}
            <div class="empty-history">
              <p>ยังไม่มีประวัติการใช้งาน</p>
            </div>
          {:else}
            <div class="timeline">
              {#each usageHistory as history}
                <div class="timeline-item">
                  <div class="timeline-dot {history.status}"></div>
                  <div class="timeline-content">
                    <div class="timeline-date">{history.date}</div>
                    <div class="timeline-time">{history.time}</div>
                    <div class="timeline-status">{history.status}</div>
                    <div class="timeline-actor">{history.actor}</div>
                    <div class="timeline-note">{history.note}</div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
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
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
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
    margin: 0.25rem 0;
  }

  .code {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    font-family: monospace;
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

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Cards */
  .detail-card,
  .attachment-card,
  .history-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.5rem 0;
  }

  /* Status Badge in Card */
  .status-badge-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .status-badge {
    display: inline-block;
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status-available {
    background: #dcfce7;
    color: #166534;
  }

  .status-borrowed {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-repairing {
    background: #fef3c7;
    color: #92400e;
  }

  .status-unavailable {
    background: #fee2e2;
    color: #991b1b;
  }

  .status-disposed {
    background: #f3f4f6;
    color: #4b5563;
  }

  /* Detail Grid */
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }

  .detail-item {
    display: flex;
    gap: 0.75rem;
  }

  .detail-item.full-width {
    grid-column: 1 / -1;
  }

  .detail-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .detail-label {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 500;
  }

  /* Attachments */
  .empty-state {
    padding: 2rem;
  }

  .upload-placeholder {
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 3rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .upload-placeholder:hover {
    border-color: #ffa200;
    background: #fffbf5;
  }

  .upload-icon {
    width: 3rem;
    height: 3rem;
    color: #9ca3af;
    margin: 0 auto 1rem;
  }

  .upload-placeholder p {
    margin: 0.5rem 0;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .hint {
    font-size: 0.75rem !important;
    color: #9ca3af !important;
  }

  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .attachment-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    transition: all 0.2s;
    cursor: pointer;
  }

  .attachment-item:hover {
    background: #f9fafb;
    border-color: #ffa200;
  }

  .file-icon {
    width: 2rem;
    height: 2rem;
    color: #ffa200;
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 500;
  }

  .file-size {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.125rem;
  }

  /* Right Column */
  .right-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* History */
  .empty-history {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .timeline-item {
    display: flex;
    gap: 1rem;
    position: relative;
  }

  .timeline-item:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 0.5rem;
    top: 1.5rem;
    width: 2px;
    height: calc(100% + 1rem);
    background: #e5e7eb;
  }

  .timeline-dot {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 0.25rem;
    position: relative;
    z-index: 1;
  }

  .timeline-dot.ปกติ {
    background: #22c55e;
  }

  .timeline-dot.ถูกยืม {
    background: #3b82f6;
  }

  .timeline-dot.ลงทะเบียน {
    background: #ffa200;
  }

  .timeline-content {
    flex: 1;
    padding-bottom: 0.5rem;
  }

  .timeline-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f2937;
  }

  .timeline-time {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.125rem;
  }

  .timeline-status {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-top: 0.5rem;
    background: #dcfce7;
    color: #166534;
  }

  .timeline-actor {
    font-size: 0.875rem;
    color: #1f2937;
    margin-top: 0.5rem;
  }

  .timeline-note {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  /* Loading & Error */
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

  .error-box {
    background: white;
    padding: 3rem;
    border-radius: 0.75rem;
    text-align: center;
  }

  .error-box p {
    color: #dc2626;
    margin-bottom: 1rem;
  }
</style>