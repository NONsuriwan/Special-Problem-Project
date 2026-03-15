<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import SearchableDropdown from '$lib/components/ui/SearchableDropdown.svelte';

  type Project = {
    id: number;
    uuid: string;
    projectName: string;
    projectTypeId: number | null;
    projectType?: string | null;
    projectDate: string | null;
    budget: string | number | null;
    status: string | null;
    acquisitionSourceId: number | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type MhesiRecord = {
    uuid: string;
    mhesiNumber: string;
    activityName: string | null;
    date: string | null;
    amount: string | number | null;
    note: string | null;
    projectId: number | null;
  };

  type EquipmentRecord = {
    uuid: string;
    equipmentNumber: string;
    equipmentCode: string;
    equipmentName: string;
    equipmentTypeId: number | null;
    status: string | null;
    acquisitionDate: string | null;
    price: string | number | null;
    buildingId: number | null;
    roomId: number | null;
  };

  type MasterData = { id: number; name: string };

  const API_URL = 'http://localhost:3000';

  let project: Project | null = null;
  let mhesiList: MhesiRecord[] = [];
  let equipmentList: EquipmentRecord[] = [];
  let loading = true;
  let error = '';

  let acquisitionSources: MasterData[] = [];
  let projectTypes: MasterData[] = [];
  let equipmentTypes: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: MasterData[] = [];

  // Edit modal
  let showEditModal = false;
  let editSaving = false;
  let editError = '';
  let editForm = {
    projectName: '',
    projectType: null as string | null,
    projectTypeId: null as number | null,
    projectDate: '',
    budget: '',
    status: null as string | null,
    acquisitionSourceId: null as number | null,
    note: '',
  };

  const projectTypeOptions = [
    { value: 'โครงการวิจัย', label: 'โครงการวิจัย' },
    { value: 'โครงการบริการวิชาการ', label: 'โครงการบริการวิชาการ' },
    { value: 'โครงการพัฒนานักศึกษา', label: 'โครงการพัฒนานักศึกษา' },
    { value: 'โครงการทำนุบำรุงศิลปวัฒนธรรม', label: 'โครงการทำนุบำรุงศิลปวัฒนธรรม' },
    { value: 'โครงการจัดซื้อ/จัดจ้าง', label: 'โครงการจัดซื้อ/จัดจ้าง' },
    { value: 'อื่นๆ', label: 'อื่นๆ' },
  ];

  const statusOptions = [
    { value: 'active', label: 'กำลังดำเนินโครงการ' },
    { value: 'completed', label: 'เสร็จสิ้น' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  const STATUS_LABELS: Record<string, string> = {
    active: 'กำลังดำเนินโครงการ',
    completed: 'เสร็จสิ้น',
    pending: 'รอดำเนินการ',
    cancelled: 'ยกเลิก',
  };

  const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    normal: 'ปกติ',
    borrowed: 'ถูกยืม',
    repair: 'ซ่อมบำรุง',
    unavailable: 'ไม่พร้อมใช้งาน',
    disposed: 'จำหน่ายแล้ว',
  };

  const EQUIPMENT_STATUS_COLORS: Record<string, string> = {
    normal: '#16a34a',
    borrowed: '#2563eb',
    repair: '#d97706',
    unavailable: '#dc2626',
    disposed: '#6b7280',
  };

  $: uuid = $page.params.id;

  async function fetchAll() {
    loading = true;
    error = '';
    try {
      const [projectRes, masterRes1, masterRes2, masterRes3, masterRes4, masterRes5] = await Promise.all([
        fetch(`${API_URL}/api/projects/${uuid}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/acquisition-sources`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/project-types`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/equipment-types`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/buildings`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/rooms`, { credentials: 'include' }),
      ]);

      if (projectRes.status === 401) { window.location.href = '/login'; return; }
      if (projectRes.ok) {
        const data = await projectRes.json();
        project = data.data ?? data;
      } else {
        error = 'ไม่พบข้อมูลโครงการ';
        return;
      }

      if (masterRes1.ok) acquisitionSources = (await masterRes1.json()).data || [];
      if (masterRes2.ok) projectTypes = (await masterRes2.json()).data || [];
      if (masterRes3.ok) equipmentTypes = (await masterRes3.json()).data || [];
      if (masterRes4.ok) buildings = (await masterRes4.json()).data || [];
      if (masterRes5.ok) rooms = (await masterRes5.json()).data || [];

      // Fetch MHESI and Equipment for this project (use integer id if available)
      const pid = project?.id;
      const [mhesiRes, equipRes] = await Promise.all([
        fetch(`${API_URL}/api/mhesi?projectId=${pid}&limit=200`, { credentials: 'include' }),
        fetch(`${API_URL}/api/equipment?projectId=${pid}&limit=200`, { credentials: 'include' }),
      ]);

      if (mhesiRes.ok) {
        const data = await mhesiRes.json();
        mhesiList = data.data || [];
      }
      if (equipRes.ok) {
        const data = await equipRes.json();
        equipmentList = data.data || [];
      }
    } catch (e) {
      error = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
    } finally {
      loading = false;
    }
  }

  function getAcquisitionSourceName(id: number | null) {
    if (!id) return '-';
    return acquisitionSources.find(s => s.id === id)?.name || '-';
  }

  function getProjectTypeName(p: Project | null) {
    if (!p) return '-';
    if (p.projectType) return p.projectType;
    if (p.projectTypeId) return projectTypes.find(t => t.id === p.projectTypeId)?.name || '-';
    return '-';
  }

  function getEquipmentTypeName(id: number | null) {
    if (!id) return '-';
    return equipmentTypes.find(t => t.id === id)?.name || '-';
  }

  function getBuildingName(id: number | null) {
    if (!id) return '-';
    return buildings.find(b => b.id === id)?.name || String(id);
  }

  function getRoomName(id: number | null) {
    if (!id) return '-';
    return rooms.find(r => r.id === id)?.name || String(id);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatCurrency(amount: string | number | null) {
    if (!amount) return '0';
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function openEditModal() {
    if (!project) return;
    editForm = {
      projectName: project.projectName,
      projectType: project.projectType || null,
      projectTypeId: project.projectTypeId,
      projectDate: project.projectDate ? project.projectDate.slice(0, 10) : '',
      budget: project.budget ? String(project.budget) : '',
      status: project.status,
      acquisitionSourceId: project.acquisitionSourceId,
      note: project.note || '',
    };
    editError = '';
    showEditModal = true;
  }

  async function saveEdit() {
    if (!project) return;
    editSaving = true;
    editError = '';
    try {
      const res = await fetch(`${API_URL}/api/projects/${uuid}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: editForm.projectName.trim(),
          projectType: editForm.projectType || null,
          projectDate: editForm.projectDate || null,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          status: editForm.status,
          acquisitionSourceId: editForm.acquisitionSourceId,
          note: editForm.note || null,
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      await fetchAll();
      showEditModal = false;
    } catch (e) {
      editError = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    } finally {
      editSaving = false;
    }
  }

  onMount(fetchAll);
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
      <button class="btn-primary" on:click={() => goto('/projects')}>กลับหน้าหลัก</button>
    </div>
  {:else if project}
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="title">รายละเอียดโครงการ</h1>
        <p class="subtitle">ชื่อโครงการ: {project.projectName}</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" on:click={openEditModal}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          แก้ไขข้อมูล
        </button>
      </div>
    </div>

    <!-- Project Info Card -->
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-icon">📁</span>
          <div>
            <div class="info-label">ชื่อโครงการ</div>
            <div class="info-value">: {project.projectName}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🗂️</span>
          <div>
            <div class="info-label">ประเภท</div>
            <div class="info-value">: {getProjectTypeName(project)}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">📅</span>
          <div>
            <div class="info-label">วันที่</div>
            <div class="info-value">: {formatDate(project.projectDate)}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">💰</span>
          <div>
            <div class="info-label">งบประมาณ</div>
            <div class="info-value">: {formatCurrency(project.budget)} บาท</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">🏦</span>
          <div>
            <div class="info-label">แหล่งเงินทุน</div>
            <div class="info-value">: {getAcquisitionSourceName(project.acquisitionSourceId)}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon">📌</span>
          <div>
            <div class="info-label">สถานะ</div>
            <div class="info-value">: {STATUS_LABELS[project.status ?? ''] || project.status || '-'}</div>
          </div>
        </div>
        {#if project.note}
          <div class="info-item info-item-full">
            <span class="info-icon">📝</span>
            <div>
              <div class="info-label">หมายเหตุ</div>
              <div class="info-value">: {project.note}</div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- MHESI Table -->
    <div class="section-card">
      <h2 class="section-title">เลข อว. ในโครงการ</h2>
      {#if mhesiList.length === 0}
        <p class="empty-text">ยังไม่มีเลข อว. ในโครงการนี้</p>
      {:else}
        <div class="table-scroll">
          <table class="detail-table">
            <thead>
              <tr>
                <th>เลข อว.</th>
                <th>รายการ</th>
                <th>โครงการ</th>
                <th>วันที่</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {#each mhesiList as m (m.uuid)}
                <tr on:click={() => goto(`/mhesi/detail/${m.uuid}`)} class="clickable-row">
                  <td class="font-medium">{m.mhesiNumber}</td>
                  <td>{m.activityName || '-'}</td>
                  <td>{project.projectName}</td>
                  <td>{formatDate(m.date)}</td>
                  <td>{m.note || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Equipment Table -->
    <div class="section-card">
      <h2 class="section-title">ครุภัณฑ์ ในโครงการ</h2>
      {#if equipmentList.length === 0}
        <p class="empty-text">ยังไม่มีครุภัณฑ์ในโครงการนี้</p>
      {:else}
        <div class="table-scroll">
          <table class="detail-table">
            <thead>
              <tr>
                <th>รหัสครุภัณฑ์</th>
                <th>ชื่อครุภัณฑ์</th>
                <th>ประเภท</th>
                <th>สถานะ</th>
                <th>วันที่ซื้อ</th>
                <th class="text-right">ราคา</th>
                <th>อาคาร</th>
                <th>ห้อง</th>
              </tr>
            </thead>
            <tbody>
              {#each equipmentList as e (e.uuid)}
                <tr on:click={() => goto(`/equipments/detail/${e.uuid}`)} class="clickable-row">
                  <td class="font-medium font-mono">{e.equipmentNumber}</td>
                  <td>{e.equipmentName}</td>
                  <td>{getEquipmentTypeName(e.equipmentTypeId)}</td>
                  <td>
                    <span class="status-dot" style="background:{EQUIPMENT_STATUS_COLORS[e.status ?? ''] ?? '#9ca3af'}"></span>
                    {EQUIPMENT_STATUS_LABELS[e.status ?? ''] || e.status || '-'}
                  </td>
                  <td>{formatDate(e.acquisitionDate)}</td>
                  <td class="text-right">{formatCurrency(e.price)}</td>
                  <td>{getBuildingName(e.buildingId)}</td>
                  <td>{getRoomName(e.roomId)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-backdrop" on:click|self={() => showEditModal = false} role="presentation">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title-text">แก้ไขข้อมูลโครงการ</h2>
        <button class="modal-close" on:click={() => showEditModal = false}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {#if editError}
        <div class="edit-error">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          {editError}
        </div>
      {/if}

      <div class="modal-form-grid">
        <!-- ชื่อโครงการ -->
        <div class="modal-field">
          <label class="modal-label">ชื่อโครงการ</label>
          <input type="text" bind:value={editForm.projectName} class="modal-input" />
        </div>

        <!-- ประเภท -->
        <div class="modal-field">
          <label class="modal-label">ประเภทโครงการ</label>
          <SearchableDropdown
            options={projectTypeOptions}
            bind:value={editForm.projectType}
            placeholder="เลือกประเภท"
          />
        </div>

        <!-- วันที่ -->
        <div class="modal-field">
          <label class="modal-label">วันที่</label>
          <ThaiDatePicker bind:value={editForm.projectDate} inputClass="modal-input" />
        </div>

        <!-- งบประมาณ -->
        <div class="modal-field">
          <label class="modal-label">งบประมาณ (บาท)</label>
          <input
            type="text"
            inputmode="decimal"
            bind:value={editForm.budget}
            on:input={(e) => { editForm.budget = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
            class="modal-input"
          />
        </div>

        <!-- แหล่งเงินทุน -->
        <div class="modal-field">
          <label class="modal-label">แหล่งเงินทุน</label>
          <SearchableDropdown
            options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
            bind:value={editForm.acquisitionSourceId}
            placeholder="เลือกแหล่งเงินทุน"
          />
        </div>

        <!-- สถานะ -->
        <div class="modal-field">
          <label class="modal-label">สถานะ</label>
          <SearchableDropdown
            options={statusOptions}
            bind:value={editForm.status}
            placeholder="เลือกสถานะ"
          />
        </div>

        <!-- หมายเหตุ -->
        <div class="modal-field full-col">
          <label class="modal-label">หมายเหตุ</label>
          <textarea bind:value={editForm.note} class="modal-input modal-textarea" rows="3"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={() => showEditModal = false} disabled={editSaving}>ยกเลิก</button>
        <button class="btn-submit" on:click={saveEdit} disabled={editSaving}>
          {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.25rem;
  }

  .subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-primary {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.7rem 1.5rem 0.7rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.2s;
  }

  .btn-primary:hover { background: #e69100; }

  /* Info Card */
  .info-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem 2rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem 2rem;
  }

  .info-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .info-item-full {
    grid-column: 1 / -1;
  }

  .info-icon {
    font-size: 1.125rem;
    margin-top: 0.125rem;
    flex-shrink: 0;
  }

  .info-label {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.125rem;
  }

  .info-value {
    font-size: 0.9375rem;
    color: #1f2937;
    font-weight: 500;
  }

  /* Section Cards */
  .section-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1.25rem;
  }

  .empty-text {
    color: #9ca3af;
    font-size: 0.875rem;
    text-align: center;
    padding: 2rem 0;
  }

  .table-scroll {
    overflow-x: auto;
  }

  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .detail-table th {
    text-align: left;
    color: #6b7280;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0 1rem 0.75rem;
    border-bottom: 1px solid #f3f4f6;
    white-space: nowrap;
  }

  .detail-table td {
    padding: 0.875rem 1rem;
    color: #1f2937;
    border-top: 1px solid #f3f4f6;
    white-space: nowrap;
  }

  .detail-table .text-right {
    text-align: right;
  }

  .clickable-row {
    cursor: pointer;
    transition: background 0.15s;
  }

  .clickable-row:hover td {
    background: #fffbf5;
  }

  .font-medium { font-weight: 500; }
  .font-mono { font-family: 'Courier New', monospace; font-size: 0.8125rem; }

  .status-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-right: 0.375rem;
    vertical-align: middle;
  }

  /* Loading / Error */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
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

  @keyframes spin { to { transform: rotate(360deg); } }

  .loading p { margin-top: 1rem; color: #6b7280; }

  .error-box {
    background: white;
    padding: 3rem;
    border-radius: 0.75rem;
    text-align: center;
  }

  .error-box p { color: #dc2626; margin-bottom: 1rem; }

  /* Edit Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .modal-box {
    background: white;
    border-radius: 1rem;
    width: min(640px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .modal-title-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    padding: 0.25rem;
    border-radius: 0.375rem;
    display: flex;
  }

  .modal-close:hover { color: #374151; background: #f3f4f6; }

  .edit-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    margin: 1rem 1.5rem 0;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .modal-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    padding: 1.5rem;
  }

  .modal-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .full-col { grid-column: 1 / -1; }

  .modal-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
  }

  .req { color: #dc2626; }

  .modal-input {
    padding: 0.625rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: #111827;
    background: white;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }

  .modal-input:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255,162,0,0.1);
  }

  .modal-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .btn-submit {
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

  .btn-submit:hover:not(:disabled) { background: #e69100; }
  .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.625rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-cancel:hover:not(:disabled) { background: #f9fafb; }
  .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
