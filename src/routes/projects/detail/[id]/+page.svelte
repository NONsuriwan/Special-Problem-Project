<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  $: canAccessRestricted =
    $page.data.user?.role === 'admin' ||
    $page.data.user?.departmentId === 1;
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import '../../../../styles/timeline.css';
  import { apiFetchBlob } from '$lib/api/client';

  type Project = {
    id: number;
    uuid: string;
    projectNumber: string | null;
    projectName: string;
    projectTypeId: number | null;
    projectType?: string | null;
    projectDate: string | null;
    fiscalYear: number | null;
    qtyOrdered: number | null;
    budget: string | number | null;
    status: string | null;
    acquisitionSourceId: number | null;
    acquisitionMethodId: number | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
  };

  type MhesiRecord = {
    uuid: string;
    mhesiNumber: string;
    role: string | null;
    activityName: string | null;
    date: string | null;
    amount: string | number | null;
    attachmentId: number | null;
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

  type HistoryEntry = {
    action: string;
    before: any;
    after: any;
    createdAt: string;
    changedBy: string;
  };

  const API_URL = 'http://localhost:3000';

  let project: Project | null = null;
  let mhesiList: MhesiRecord[] = [];
  let equipmentList: EquipmentRecord[] = [];
  let loading = true;
  let error = '';
  let history: HistoryEntry[] = [];
  let historyLoading = false;

  const TABLE_LIMIT = 10;
  let showAllMhesi = false;
  let showAllEquipment = false;

  $: mhesiDisplay    = showAllMhesi    ? mhesiList     : mhesiList.slice(0, TABLE_LIMIT);
  $: equipmentDisplay = showAllEquipment ? equipmentList : equipmentList.slice(0, TABLE_LIMIT);

  let acquisitionSources: MasterData[] = [];
  let acquisitionMethods: MasterData[] = [];

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
    fiscalYear: null as number | null,
    qtyOrdered: '',
    budget: '',
    status: null as string | null,
    acquisitionSourceId: null as number | null,
    acquisitionMethodId: null as number | null,
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

  ];

  const STATUS_LABELS: Record<string, string> = {
    active: 'กำลังดำเนินโครงการ',
    completed: 'เสร็จสิ้น',
  };

  const STATUS_COLORS: Record<string, string> = {
    active: '#16a34a',
    completed: '#2563eb',
    pending: '#d97706',
    cancelled: '#dc2626',
  };

  const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    normal: 'ปกติ',
    pending: 'รอเบิกจ่าย',
    borrowed: 'ถูกยืม',
    repair: 'ซ่อมบำรุง',
    unavailable: 'ไม่พร้อมใช้งาน',
    disposed: 'จำหน่ายแล้ว',
  };

  const EQUIPMENT_STATUS_COLORS: Record<string, string> = {
    normal: '#16a34a',
    pending: '#d97706',
    borrowed: '#2563eb',
    repair: '#f59e0b',
    unavailable: '#dc2626',
    disposed: '#6b7280',
  };

  const MHESI_ROLE_ORDER = ['receiving', 'contract', 'procurement', 'planning', 'other'];
  const MHESI_ROLE_LABEL: Record<string, string> = {
    planning:    'แผนการจัดซื้อ',
    procurement: 'ประกาศจัดซื้อ',
    contract:    'สัญญา',
    receiving:   'ใบตรวจรับ',
    other:       'อื่นๆ',
  };
  const MHESI_ROLE_BADGE_CLASS: Record<string, string> = {
    planning:    'role-planning',
    procurement: 'role-procurement',
    contract:    'role-contract',
    receiving:   'role-receiving',
    other:       'role-other',
  };

  $: mhesiGrouped = (() => {
    const map: Record<string, MhesiRecord[]> = {};
    for (const m of mhesiList) {
      const r = m.role || 'other';
      if (!map[r]) map[r] = [];
      map[r].push(m);
    }
    return MHESI_ROLE_ORDER
      .filter(r => map[r]?.length)
      .map(r => ({
        role: r,
        label: MHESI_ROLE_LABEL[r] ?? r,
        badgeClass: MHESI_ROLE_BADGE_CLASS[r] ?? 'role-other',
        items: map[r].slice().sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        }),
      }));
  })();

  $: pendingEquipment   = equipmentList.filter(e => e.status === 'pending');
  $: disbursedEquipment = equipmentList.filter(e => e.status !== 'pending');

  $: uuid = $page.params.id ?? '';

  async function fetchAll() {
    loading = true;
    error = '';
    try {
      const [projectRes, masterRes1, masterRes2, masterRes3, masterRes4, masterRes5] = await Promise.all([
        fetch(`${API_URL}/api/projects/${uuid}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/acquisition-sources`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/equipment-types`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/buildings`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/rooms`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/acquisition-methods`, { credentials: 'include' }),
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
      if (masterRes2.ok) equipmentTypes = (await masterRes2.json()).data || [];
      if (masterRes3.ok) buildings = (await masterRes3.json()).data || [];
      if (masterRes4.ok) rooms = (await masterRes4.json()).data || [];
      if (masterRes5.ok) acquisitionMethods = (await masterRes5.json()).data || [];

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
    await fetchHistory();
  }

  async function fetchHistory() {
    historyLoading = true;
    try {
      const res = await fetch(`${API_URL}/api/projects/${uuid}/history`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        history = data.data || [];
      }
    } catch (_) {}
    historyLoading = false;
  }

  function getAcquisitionSourceName(id: number | null) {
    if (!id) return '-';
    return acquisitionSources.find(s => s.id === id)?.name || '-';
  }

  function getAcquisitionMethodName(id: number | null) {
    if (!id) return '-';
    return acquisitionMethods.find(m => m.id === id)?.name || '-';
  }

  function getProjectTypeName(p: Project | null) {
    if (!p) return '-';
    if (p.projectType) return p.projectType;
    if (p.projectTypeId) return equipmentTypes.find(t => t.id === p.projectTypeId)?.name || '-';
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

  const PROJECT_FIELD_LABELS: Record<string, string> = {
    projectName:          'ชื่อโครงการ',
    projectTypeId:        'ประเภท',
    projectDate:          'วันที่',
    fiscalYear:           'ปีงบประมาณ',
    qtyOrdered:           'จำนวนที่จัดซื้อ',
    budget:               'งบประมาณ',
    status:               'สถานะ',
    acquisitionSourceId:  'แหล่งเงินทุน',
    acquisitionMethodId:  'วิธีการได้มา',
    note:                 'หมายเหตุ',
  };

  function resolveProjectValue(field: string, val: any): string {
    if (val === null || val === undefined || val === '') return '-';
    if (field === 'projectTypeId')       return equipmentTypes.find(t => t.id === val)?.name ?? String(val);
    if (field === 'acquisitionSourceId') return acquisitionSources.find(s => s.id === val)?.name ?? String(val);
    if (field === 'acquisitionMethodId') return acquisitionMethods.find(m => m.id === val)?.name ?? String(val);
    if (field === 'status')              return STATUS_LABELS[val] ?? String(val);
    if (field === 'projectDate')         return formatDate(val);
    if (field === 'budget')              return formatCurrency(val) + ' บาท';
    return String(val);
  }

  function getDiffFields(before: Record<string, any> | null | undefined, after: Record<string, any> | null | undefined): string[] {
    if (!before || !after) return [];
    return Object.keys(PROJECT_FIELD_LABELS).filter(f => String(before[f] ?? '') !== String(after[f] ?? ''));
  }

  function formatDateOnly(dt: string): string {
    const parts = dt.split('T')[0].split('-');
    if (parts.length !== 3) return dt;
    const [year, month, day] = parts;
    return `${day}/${month}/${parseInt(year) + 543}`;
  }

  function formatTimeOnly(dt: string): string {
    const timePart = dt.includes('T') ? dt.split('T')[1] : '';
    if (!timePart) return '-';
    return timePart.slice(0, 5);
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
      fiscalYear: project.fiscalYear,
      qtyOrdered: project.qtyOrdered != null ? String(project.qtyOrdered) : '',
      budget: project.budget ? String(project.budget) : '',
      status: project.status,
      acquisitionSourceId: project.acquisitionSourceId,
      acquisitionMethodId: project.acquisitionMethodId,
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
          projectTypeId: editForm.projectTypeId || null,
          projectDate: editForm.projectDate || null,
          fiscalYear: editForm.fiscalYear || null,
          qtyOrdered: editForm.qtyOrdered ? parseInt(editForm.qtyOrdered) : null,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          status: editForm.status,
          acquisitionSourceId: editForm.acquisitionSourceId,
          acquisitionMethodId: editForm.acquisitionMethodId || null,
          note: editForm.note || null,
        }),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      await fetchAll();
      await fetchHistory();
      showEditModal = false;
    } catch (e) {
      editError = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    } finally {
      editSaving = false;
    }
  }

  // File preview
  let showPreviewModal = false;
  let previewUrl: string | null = null;
  let previewLoading = false;
  let previewFileName = '';
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
    } catch (_) {
      alert('ไม่สามารถโหลดไฟล์ได้');
    } finally {
      previewLoading = false;
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
        <p class="subtitle">หมายเลขโครงการ: {project.projectNumber ?? '-'}</p>
      </div>
      {#if canAccessRestricted}
        <div class="header-actions">
          <button class="btn-primary" on:click={openEditModal}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="flex-shrink:0">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            แก้ไขข้อมูล
          </button>
        </div>
      {/if}
    </div>

    <!-- Project Info Card -->
    <div class="info-card">
      <h2 class="section-title" style="margin-bottom:1.25rem;">ข้อมูลทั่วไป</h2>
      <div class="info-grid">
        {#if project.projectNumber}
          <div class="info-item">
            <span class="info-icon"><Icon name="hashtag" size={24} /></span>
            <div>
              <div class="info-label">หมายเลขโครงการ</div>
              <div class="info-value">: {project.projectNumber}</div>
            </div>
          </div>
        {/if}
        <div class="info-item">
          <span class="info-icon"><Icon name="document-text" size={24} /></span>
          <div>
            <div class="info-label">ชื่อโครงการ</div>
            <div class="info-value">: {project.projectName}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon"><Icon name="collection" size={24} /></span>
          <div>
            <div class="info-label">ประเภท</div>
            <div class="info-value">: {getProjectTypeName(project)}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon"><Icon name="calendar" size={24} /></span>
          <div>
            <div class="info-label">วันที่</div>
            <div class="info-value">: {formatDate(project.projectDate)}</div>
          </div>
        </div>
        {#if project.fiscalYear}
          <div class="info-item">
            <span class="info-icon"><Icon name="calendar" size={24} /></span>
            <div>
              <div class="info-label">ปีงบประมาณ</div>
              <div class="info-value">: {project.fiscalYear}</div>
            </div>
          </div>
        {/if}
        <div class="info-item">
          <span class="info-icon"><Icon name="currency" size={24} /></span>
          <div>
            <div class="info-label">งบประมาณ</div>
            <div class="info-value">: {formatCurrency(project.budget)} บาท</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon"><Icon name="library" size={24} /></span>
          <div>
            <div class="info-label">แหล่งเงินทุน</div>
            <div class="info-value">: {getAcquisitionSourceName(project.acquisitionSourceId)}</div>
          </div>
        </div>
        {#if project.acquisitionMethodId}
          <div class="info-item">
            <span class="info-icon"><Icon name="library" size={24} /></span>
            <div>
              <div class="info-label">วิธีการได้มา</div>
              <div class="info-value">: {getAcquisitionMethodName(project.acquisitionMethodId)}</div>
            </div>
          </div>
        {/if}
        {#if project.qtyOrdered != null}
          <div class="info-item">
            <span class="info-icon"><Icon name="collection" size={24} /></span>
            <div>
              <div class="info-label">จำนวนที่จัดซื้อ</div>
              <div class="info-value">: {project.qtyOrdered} รายการ</div>
            </div>
          </div>
        {/if}
        <div class="info-item">
          <span class="info-icon"><Icon name="check-circle" size={24} /></span>
          <div>
            <div class="info-label">สถานะ</div>
            <div class="info-value">: {STATUS_LABELS[project.status ?? ''] || project.status || '-'}</div>
          </div>
        </div>
        <div class="info-item">
          <span class="info-icon"><Icon name="pencil" size={24} /></span>
          <div>
            <div class="info-label">หมายเหตุ</div>
            <div class="info-value">: {project.note || '-'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- MHESI Table -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">เลข อว. ในโครงการ</h2>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          {#if mhesiList.length > 0}
            <span class="section-count">{mhesiList.length} รายการ</span>
          {/if}
          <button class="btn-add-mhesi" on:click={() => goto(`/mhesi/add-mhesi?projectId=${project?.id}`)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            เพิ่มเลข อว.
          </button>
        </div>
      </div>
      {#if mhesiList.length === 0}
        <p class="empty-text">ยังไม่มีเลข อว. ในโครงการนี้</p>
      {:else}
        <div class="mhesi-groups">
          {#each mhesiGrouped as group}
            <div class="mhesi-group">
              <div class="mhesi-group-header">
                <span class="mhesi-role-badge {group.badgeClass}">{group.label}</span>
                <span class="mhesi-group-count">{group.items.length} รายการ</span>
              </div>
              <div class="mhesi-list">
                {#each group.items as m (m.uuid ?? m.mhesiNumber)}
                  <a href="/mhesi/detail/{m.uuid}" class="mhesi-item">
                    <div class="mhesi-info">
                      <div class="mhesi-number-row">
                        <span class="mhesi-number">{m.mhesiNumber}</span>
                        {#if m.activityName}
                          <span class="mhesi-dot-sep">·</span>
                          <span class="mhesi-activity">{m.activityName}</span>
                        {/if}
                      </div>
                      <div class="mhesi-meta">
                        {#if m.date}
                          <span class="mhesi-date">{formatDate(m.date)}</span>
                        {/if}
                        {#if m.amount}
                          {#if m.date}<span class="mhesi-dot-sep">·</span>{/if}
                          <span class="mhesi-amount">{formatCurrency(m.amount)} บาท</span>
                        {/if}
                      </div>
                    </div>
                    <div class="mhesi-actions">
                      {#if m.attachmentId}
                        <button
                          type="button"
                          class="mhesi-file-btn"
                          disabled={previewLoading}
                          on:click|preventDefault|stopPropagation={() => loadPreviewById(m.attachmentId!, m.mhesiNumber)}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                          </svg>
                          ดูไฟล์
                        </button>
                      {/if}
                      <svg class="mhesi-arrow" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Equipment Table -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">ครุภัณฑ์ ในโครงการ</h2>
        {#if equipmentList.length > 0}
          <span class="section-count">{equipmentList.length} รายการ</span>
        {:else}
          <button class="btn-add-equip" on:click={() => goto(`/equipments/add-equipments?projectId=${project?.id}`)}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            ลงทะเบียนครุภัณฑ์
          </button>
        {/if}
      </div>
      {#if equipmentList.length === 0}
        <p class="empty-text">ยังไม่มีครุภัณฑ์ในโครงการนี้</p>
      {:else}
        <!-- รอเบิกจ่าย -->
        {#if pendingEquipment.length > 0}
          <div class="equip-sub-header">
            <span class="equip-sub-badge pending">รอเบิกจ่าย</span>
            <span class="equip-sub-count">{pendingEquipment.length} รายการ</span>
            <button class="btn-disburse" on:click={() => goto(`/equipments/disburse?projectId=${project?.id}`)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              เบิกจ่าย
            </button>
          </div>
          <div class="table-scroll">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>หมายเลขครุภัณฑ์</th>
                  <th>ชื่อครุภัณฑ์</th>
                  <th>ประเภท</th>
                  <th>วันที่ซื้อ</th>
                  <th class="text-right">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {#each pendingEquipment as e (e.uuid ?? e.equipmentNumber)}
                  <tr on:click={() => goto(`/equipments/detail/${e.uuid}`)} class="clickable-row">
                    <td class="font-medium">{e.equipmentNumber || e.equipmentCode}</td>
                    <td>{e.equipmentName}</td>
                    <td>{getEquipmentTypeName(e.equipmentTypeId)}</td>
                    <td>{formatDate(e.acquisitionDate)}</td>
                    <td class="text-right">{formatCurrency(e.price)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- เบิกจ่ายแล้ว -->
        {#if disbursedEquipment.length > 0}
          <div class="equip-sub-header" class:equip-sub-mt={pendingEquipment.length > 0}>
            <span class="equip-sub-badge disbursed">เบิกจ่ายแล้ว</span>
            <span class="equip-sub-count">{disbursedEquipment.length} รายการ</span>
            <button class="btn-add-equip" on:click={() => goto(`/equipments/add-equipments?projectId=${project?.id}`)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              ลงทะเบียนครุภัณฑ์
            </button>
          </div>
          <div class="table-scroll">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>หมายเลขครุภัณฑ์</th>
                  <th>ชื่อครุภัณฑ์</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th>วันที่ซื้อ</th>
                  <th class="text-right">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {#each disbursedEquipment as e (e.uuid ?? e.equipmentNumber)}
                  <tr on:click={() => goto(`/equipments/detail/${e.uuid}`)} class="clickable-row">
                    <td class="font-medium">{e.equipmentNumber || e.equipmentCode}</td>
                    <td>{e.equipmentName}</td>
                    <td>{getEquipmentTypeName(e.equipmentTypeId)}</td>
                    <td>
                      <span class="status-dot" style="background:{EQUIPMENT_STATUS_COLORS[e.status ?? ''] ?? '#9ca3af'}"></span>
                      {EQUIPMENT_STATUS_LABELS[e.status ?? ''] || e.status || '-'}
                    </td>
                    <td>{formatDate(e.acquisitionDate)}</td>
                    <td class="text-right">{formatCurrency(e.price)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>

    <!-- History -->
    <div class="history-card">
      <h2 class="section-title">ประวัติการแก้ไข</h2>
      {#if historyLoading}
        <div class="empty-history"><p>กำลังโหลด...</p></div>
      {:else if history.length === 0}
        <div class="empty-history"><p>ยังไม่มีประวัติการแก้ไข</p></div>
      {:else}
        <div class="timeline">
          {#each history as h, idx}
            {@const diffFields = getDiffFields(h.before, h.after)}
            <div class="tl-item">
              <div class="tl-line-wrap">
                <div class="tl-dot"></div>
                {#if idx < history.length - 1}<div class="tl-line"></div>{/if}
              </div>
              <div class="tl-body">
                <div class="tl-header">
                  <div class="tl-header-left">
                    <span class="tl-badge">แก้ไขข้อมูล</span>
                    <span class="tl-user">{h.changedBy || 'ไม่ระบุ'}</span>
                  </div>
                  <span class="tl-time">{new Date(h.createdAt).toLocaleString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                {#if diffFields.length > 0}
                  <div class="tl-changes">
                    {#each diffFields as field}
                      <div class="tl-change-row">
                        <span class="tl-field">{PROJECT_FIELD_LABELS[field]}</span>
                        <div class="tl-diff">
                          <span class="tl-old">{resolveProjectValue(field, h.before?.[field])}</span>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tl-arrow"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          <span class="tl-new">{resolveProjectValue(field, h.after?.[field])}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="tl-nochange">ไม่มีการเปลี่ยนแปลง</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Preview Modal -->
{#if showPreviewModal && previewUrl}
  <div class="modal-backdrop" on:click|self={() => { showPreviewModal = false; }} role="presentation">
    <div class="modal-box modal-preview" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="modal-header">
        <span class="modal-title">{previewFileName}</span>
        <button class="modal-close" on:click={() => { showPreviewModal = false; }}>✕</button>
      </div>
      <div class="preview-body">
        {#if previewMimeType.startsWith('image/')}
          <img src={previewUrl} alt={previewFileName} class="preview-image" />
        {:else if previewMimeType === 'application/pdf'}
          <iframe src={previewUrl} title={previewFileName} class="preview-iframe"></iframe>
        {:else}
          <div class="preview-unsupported">
            <p>ไม่สามารถแสดง preview ได้</p>
            <a href={previewUrl} download={previewFileName} class="btn-primary">ดาวน์โหลดไฟล์</a>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-backdrop" on:click|self={() => showEditModal = false} role="presentation">
    <div class="modal-box" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="modal-header">
        <h2 class="modal-title-text">แก้ไขข้อมูลโครงการ</h2>
        <button class="modal-close" aria-label="ปิด" on:click={() => showEditModal = false}>
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
          <label class="modal-label" for="edit-projectName">ชื่อโครงการ</label>
          <input id="edit-projectName" type="text" bind:value={editForm.projectName} class="modal-input" />
        </div>

        <!-- ประเภท -->
        <div class="modal-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="modal-label">ประเภทโครงการ</label>
          <Dropdown
            fullWidth
            options={equipmentTypes.map(t => ({ value: t.id, label: t.name }))}
            bind:value={editForm.projectTypeId}
            placeholder="เลือกประเภท"
          />
        </div>

        <!-- วันที่ -->
        <div class="modal-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="modal-label">วันที่</label>
          <ThaiDatePicker bind:value={editForm.projectDate} inputClass="modal-input" />
        </div>

        <!-- ปีงบประมาณ -->
        <div class="modal-field">
          <label class="modal-label" for="edit-fiscalYear">ปีงบประมาณ</label>
          <input
            id="edit-fiscalYear"
            type="number"
            bind:value={editForm.fiscalYear}
            class="modal-input"
            placeholder="เช่น 2567"
          />
        </div>

        <!-- จำนวนที่จัดซื้อ -->
        <div class="modal-field">
          <label class="modal-label" for="edit-qtyOrdered">จำนวนที่จัดซื้อ</label>
          <input
            id="edit-qtyOrdered"
            type="text"
            inputmode="numeric"
            bind:value={editForm.qtyOrdered}
            on:input={(e) => { editForm.qtyOrdered = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
            class="modal-input"
            placeholder="0"
          />
        </div>

        <!-- งบประมาณ -->
        <div class="modal-field">
          <label class="modal-label" for="edit-budget">งบประมาณ (บาท)</label>
          <input
            id="edit-budget"
            type="text"
            inputmode="decimal"
            bind:value={editForm.budget}
            on:input={(e) => { editForm.budget = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
            class="modal-input"
          />
        </div>

        <!-- แหล่งเงินทุน -->
        <div class="modal-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="modal-label">แหล่งเงินทุน</label>
          <Dropdown
            fullWidth
            options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
            bind:value={editForm.acquisitionSourceId}
            placeholder="เลือกแหล่งเงินทุน"
          />
        </div>

        <!-- วิธีการได้มา -->
        <div class="modal-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="modal-label">วิธีการได้มา</label>
          <Dropdown
            fullWidth
            options={[{ value: null, label: '-' }, ...acquisitionMethods.map(m => ({ value: m.id, label: m.name }))]}
            bind:value={editForm.acquisitionMethodId}
            placeholder="เลือกวิธีการได้มา"
          />
        </div>

        <!-- สถานะ -->
        <div class="modal-field">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="modal-label">สถานะ</label>
          <Dropdown
            fullWidth
            options={statusOptions}
            bind:value={editForm.status}
            placeholder="เลือกสถานะ"
          />
        </div>

        <!-- หมายเหตุ -->
        <div class="modal-field full-col">
          <label class="modal-label" for="edit-note">หมายเหตุ</label>
          <textarea id="edit-note" bind:value={editForm.note} class="modal-input modal-textarea" rows="3"></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-submit" on:click={saveEdit} disabled={editSaving}>
          {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        <button class="btn-cancel" on:click={() => showEditModal = false} disabled={editSaving}>ยกเลิก</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-container {
    background: #e5e5e5;
    min-height: 100vh;
    padding: 2rem;
    font-family: var(--font-thai);
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.25rem;
  }

  .subtitle {
    font-size: 1rem;
    color: #6b7280;
    margin: 0.25rem 0;
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
    font-size: 0.8125rem;
    color: #9ca3af;
    margin-bottom: 0.125rem;
  }

  .info-value {
    font-size: 1rem;
    color: #1f2937;
    font-weight: 500;
  }

  /* Mhesi grouped */
  .mhesi-groups {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mhesi-group {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .mhesi-group-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .mhesi-group-count {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-left: auto;
  }

  .mhesi-role-badge {
    display: inline-block;
    padding: 0.2rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .role-planning    { background: #eff6ff; color: #1d4ed8; }
  .role-procurement { background: #f0fdf4; color: #15803d; }
  .role-contract    { background: #fefce8; color: #a16207; }
  .role-receiving   { background: #fdf4ff; color: #7e22ce; }
  .role-other       { background: #f3f4f6; color: #6b7280; }

  .mhesi-list { display: flex; flex-direction: column; }

  .mhesi-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid #f3f4f6;
    text-decoration: none;
    color: inherit;
    transition: background 0.12s;
    cursor: pointer;
  }

  .mhesi-item:last-child { border-bottom: none; }
  .mhesi-item:hover { background: #fafafa; }

  .mhesi-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }

  .mhesi-number-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .mhesi-number {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }

  .mhesi-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    font-size: 0.78rem;
    color: #6b7280;
  }

  .mhesi-dot-sep { margin: 0 0.375rem; color: #d1d5db; }
  .mhesi-activity { color: #374151; font-weight: 500; }

  .mhesi-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .mhesi-file-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.75rem;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    white-space: nowrap;
  }

  .mhesi-file-btn:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; }
  .mhesi-file-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .mhesi-arrow {
    width: 16px;
    height: 16px;
    color: #d1d5db;
    flex-shrink: 0;
    transition: color 0.12s;
  }

  .mhesi-item:hover .mhesi-arrow { color: #9ca3af; }

  /* Preview modal */
  .modal-preview {
    width: 90vw;
    max-width: 960px;
    height: 85vh;
    display: flex;
    flex-direction: column;
  }

  .preview-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
  }

  .preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .preview-iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .preview-unsupported {
    text-align: center;
    color: #6b7280;
  }

  /* Equipment sub-sections */
  .equip-sub-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 0.625rem;
  }

  .equip-sub-mt {
    margin-top: 1.25rem;
  }

  .equip-sub-count {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .equip-sub-badge {
    display: inline-block;
    padding: 0.2rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .equip-sub-badge.pending   { background: #fef9ee; color: #b45309; }
  .equip-sub-badge.disbursed { background: #f0fdf4; color: #15803d; }

  .btn-disburse {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.125rem;
    background: #ffa200;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-disburse:hover { background: #e69100; }

  .btn-add-equip {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.125rem;
    background: #ffa200;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-add-equip:hover { background: #e69100; }

  /* Section Cards */
  .section-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.625rem;
    margin-bottom: 1.25rem;
  }

  .btn-add-mhesi {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: #ffa200;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.125rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .btn-add-mhesi:hover { background: #e69200; }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .section-count {
    font-size: 0.75rem;
    font-weight: 500;
    color: #ffa200;
    background: #fff8ec;
    border: 1px solid #ffd580;
    border-radius: 99px;
    padding: 0.1rem 0.55rem;
  }

  .show-more {
    display: flex;
    justify-content: center;
    padding: 0.75rem 0 0.25rem;
    border-top: 1px solid #f3f4f6;
    margin-top: 0.25rem;
  }

  .show-more-btn {
    background: none;
    border: none;
    color: #ffa200;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    transition: background 0.15s;
  }

  .show-more-btn:hover { background: #fff8ec; }

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

  .history-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-top: 1.5rem;
  }

  .history-card .section-title { margin-bottom: 1.25rem; }

  .empty-history {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
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
    font-family: var(--font-thai);
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
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .modal-footer .btn-submit,
  .modal-footer .btn-cancel {
    flex: 1;
    max-width: 9rem;
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
