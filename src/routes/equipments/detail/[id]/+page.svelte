<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import SearchableDropdown from '$lib/components/ui/SearchableDropdown.svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type Asset = {
    id: number;
    uuid: string;
    equipmentCode: string;
    equipmentName: string;
    equipmentNumber: string | null;
    equipmentTypeId: number | null;
    departmentId: number | null;
    activity: string | null;
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

  type HistoryEntry = {
    type: 'status_change' | 'edit';
    status?: string;
    remark?: string;
    detail?: {
      borrowerName?: string;
      borrowDate?: string;
      expectedReturnDate?: string;
      borrowingBuildingId?: number;
      borrowingRoomId?: number;
      reason?: string;
      repairReason?: string;
      startDate?: string;
      repairCompany?: string;
      cost?: string | number;
      endDate?: string;
      disposalDate?: string;
      disposalMethod?: string;
      approvedBy?: string;
      disposalCost?: string | number;
    };
    before?: Record<string, any>;
    after?: Record<string, any>;
    createdAt: string;
    createdBy: string;
  };

  const FIELD_LABELS: Record<string, string> = {
    equipmentName:       'ชื่อครุภัณฑ์',
    equipmentNumber:     'หมายเลขสินทรัพย์',
    equipmentTypeId:     'ประเภท',
    departmentId:        'หน่วยงาน',
    activity:            'กิจกรรม',
    fundId:              'แหล่งเงินทุน',
    buildingId:          'อาคาร',
    roomId:              'ห้อง',
    acquisitionSourceId: 'ที่มา',
    acquisitionMethodId: 'วิธีจัดหา',
    projectId:           'โครงการ',
    acquisitionDate:     'วันที่จัดซื้อ',
    price:               'ราคา',
    company:             'บริษัท/ผู้ขาย',
    sizeDetail:          'รายละเอียดขนาด',
    unit:                'หน่วย',
    note:                'หมายเหตุ',
  };

  function resolveFieldValue(field: string, val: any): string {
    if (val === null || val === undefined || val === '') return '-';
    if (field === 'equipmentTypeId')      return getMasterName(assetTypes, val);
    if (field === 'departmentId')         return getMasterName(departments, val);
    if (field === 'activity')             return String(val);
    if (field === 'fundId')               return getMasterName(funds, val);
    if (field === 'buildingId')           return getMasterName(buildings, val);
    if (field === 'roomId')               return getMasterName(rooms, val);
    if (field === 'acquisitionSourceId')  return getMasterName(acquisitionSources, val);
    if (field === 'acquisitionMethodId')  return getMasterName(acquisitionMethods, val);
    if (field === 'projectId')            return projects.find((p: any) => p.id === val)?.projectName ?? String(val);
    if (field === 'acquisitionDate')      return formatDate(val);
    if (field === 'price')                return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(val);
  }

  function getDiffFields(before: Record<string, any> | null | undefined, after: Record<string, any> | null | undefined): string[] {
    if (!before || !after) return [];
    return Object.keys(FIELD_LABELS).filter(f => String(before[f] ?? '') !== String(after[f] ?? ''));
  }

  let asset: Asset | null = null;
  let attachments: Attachment[] = [];
  let history: HistoryEntry[] = [];
  let loading = true;
  let error = '';

  // Master data
  let assetTypes: MasterData[] = [];
  let departments: MasterData[] = [];
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
      const [typesData, deptData, fundData, buildData, roomData, srcData, methodData, projData] = await Promise.all([
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ASSET_TYPES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.FUNDS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.BUILDINGS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ROOMS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_SOURCES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_METHODS),
        apiFetch<{ data: any[] }>(API_ENDPOINTS.PROJECTS),
      ]);

      assetTypes = typesData.data || [];
      departments = deptData.data || [];
      funds = fundData.data || [];
      buildings = buildData.data || [];
      rooms = roomData.data || [];
      acquisitionSources = srcData.data || [];
      acquisitionMethods = methodData.data || [];
      projects = projData.data || [];
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  // Fetch asset details
  async function fetchAssetDetail() {
    try {
      loading = true;
      error = '';

      const result = await apiFetch<{ success: boolean; data: Asset }>(API_ENDPOINTS.ASSET_DETAIL(assetId));

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
      const result = await apiFetch<{ data: Attachment[] }>(API_ENDPOINTS.ASSET_ATTACHMENTS(assetId));
      attachments = result.data || [];
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  }

  // Fetch history
  async function fetchHistory() {
    try {
      const result = await apiFetch<{ data: HistoryEntry[] }>(API_ENDPOINTS.ASSET_HISTORY(assetId));
      history = result.data || [];
    } catch (_) {}
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

  function formatDateOnly(dt: string): string {
    const d = new Date(dt);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatTimeOnly(dt: string): string {
    const d = new Date(dt);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function getStatusDotColor(status: string): string {
    const colors: Record<string, string> = {
      normal: '#22c55e', available: '#22c55e',
      borrowed: '#3b82f6',
      repair: '#f59e0b', repairing: '#f59e0b',
      unavailable: '#ef4444',
      disposed: '#9ca3af',
    };
    return colors[status] || '#9ca3af';
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

  function isoToBeDisplay(iso: string): string {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${parseInt(year) + 543}`;
  }

  function beDisplayToIso(be: string): string {
    const parts = be.trim().split('/');
    if (parts.length !== 3) return '';
    const [day, month, beYear] = parts;
    const ceYear = parseInt(beYear) - 543;
    if (isNaN(ceYear) || ceYear < 1900 || ceYear > 2100) return '';
    return `${ceYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  function handleBack() {
    goto('/equipments');
  }

  // --- Status Modal ---
  let showStatusModal = false;
  let selectedStatus = '';
  let statusSaving = false;
  let statusError = '';

  // Extra equipment for batch status change
  let allEquipment: { uuid: string; equipmentCode: string; equipmentNumber: string | null; equipmentName: string; status: string }[] = [];
  let extraEquipment: typeof allEquipment = [];
  let statusPickerValue: string | null = null;

  // Status-specific form fields
  let borrowerName = '';
  let borrowUnitId = 0;
  let borrowDate = '';
  let returnDate = '';
  let borrowingBuildingId = 0;
  let borrowingRoomId = 0;
  let borrowReason = '';
  let repairDate = '';
  let repairBy = '';
  let repairCompany = '';
  let repairCost = '';
  let repairEndDate = '';
  let repairFiles: File[] = [];
  let repairFileUploading = false;
  let unavailableReason = '';
  let disposeDate = '';
  let disposePrice = '';
  let disposeMethod = '';
  let disposeApprovedBy = '';
  let disposeReason = '';
  let disposeFiles: File[] = [];
  let disposeFileUploading = false;
  let statusRemark = '';
  let statusFieldErrors: Record<string, boolean> = {};

  const statusTabs = [
    { value: 'normal',      label: 'ปกติ',             color: '#22c55e' },
    { value: 'borrowed',    label: 'ยืม',               color: '#3b82f6' },
    { value: 'repair',      label: 'แจ้งซ่อม',          color: '#f59e0b' },
    { value: 'unavailable', label: 'ไม่พร้อมใช้งาน',    color: '#ef4444' },
    { value: 'disposed',    label: 'จำหน่ายทิ้ง',       color: '#6b7280' },
  ];

  const formTitles: Record<string, string> = {
    borrowed:    'ข้อมูลการยืม',
    repair:      'ข้อมูลการแจ้งซ่อม',
    unavailable: 'ข้อมูลการแจ้งไม่พร้อมใช้งาน',
    disposed:    'ข้อมูลการจำหน่ายทิ้ง',
  };

  $: equipmentPickerOptions = allEquipment
    .map((e, i) => ({ ...e, _i: i }))
    .filter(e =>
      !extraEquipment.find(x => x.uuid === e.uuid) &&
      e.uuid !== assetId &&
      e.status === asset?.status
    )
    .sort((a, b) => a._i - b._i || (a.equipmentNumber ?? a.equipmentCode).localeCompare(b.equipmentNumber ?? b.equipmentCode, 'th', { numeric: true }))
    .map(e => ({ value: e.uuid, label: e.equipmentName, sublabel: e.equipmentNumber ?? '' }));

  $: mainEquipAlreadyInStatus = asset?.status === selectedStatus;

  async function openStatusModal() {
    const currentStatus = asset?.status || 'normal';
    selectedStatus = statusTabs.find(t => t.value !== currentStatus)?.value ?? 'normal';
    statusError = '';
    extraEquipment = [];
    statusPickerValue = null;
    borrowerName = ''; borrowUnitId = 0; borrowDate = ''; returnDate = '';
    borrowingBuildingId = 0; borrowingRoomId = 0; borrowReason = '';
    repairDate = ''; repairBy = ''; repairCompany = ''; repairCost = ''; repairEndDate = ''; repairFiles = []; unavailableReason = '';
    disposeDate = ''; disposePrice = ''; disposeMethod = ''; disposeApprovedBy = ''; disposeReason = ''; disposeFiles = []; statusRemark = '';
    statusFieldErrors = {};
    showStatusModal = true;

    // Load all equipment for dropdown (lazy)
    if (allEquipment.length === 0) {
      try {
        const r = await apiFetch<{ data: typeof allEquipment }>(`${API_ENDPOINTS.ASSETS}?limit=1000`);
        allEquipment = (r.data || []).filter((a: typeof allEquipment[0]) => a.uuid !== assetId);
      } catch (_) {}
    }
  }

  function validateStatusFields(): boolean {
    statusFieldErrors = {};
    if (selectedStatus === 'borrowed') {
      if (!borrowerName.trim()) statusFieldErrors.borrowerName = true;
      if (!borrowUnitId) statusFieldErrors.borrowUnitId = true;
      if (!borrowDate) statusFieldErrors.borrowDate = true;
      if (!returnDate) statusFieldErrors.returnDate = true;
    } else if (selectedStatus === 'repair') {
      if (!repairDate) statusFieldErrors.repairDate = true;
      if (!repairEndDate || repairEndDate < repairDate) statusFieldErrors.repairEndDate = true;
      if (!repairBy.trim()) statusFieldErrors.repairBy = true;
      if (!repairCompany.trim()) statusFieldErrors.repairCompany = true;
      if (!repairCost || isNaN(parseFloat(repairCost)) || parseFloat(repairCost) < 0) statusFieldErrors.repairCost = true;
    } else if (selectedStatus === 'unavailable') {
      if (!unavailableReason.trim()) statusFieldErrors.unavailableReason = true;
    } else if (selectedStatus === 'disposed') {
      if (!disposeDate) statusFieldErrors.disposeDate = true;
      if (!disposeMethod.trim()) statusFieldErrors.disposeMethod = true;
      if (!disposeApprovedBy.trim()) statusFieldErrors.disposeApprovedBy = true;
      if (!disposeReason.trim()) statusFieldErrors.disposeReason = true;
      if (!disposePrice || isNaN(parseFloat(disposePrice)) || parseFloat(disposePrice) < 0) statusFieldErrors.disposePrice = true;
    }
    statusFieldErrors = statusFieldErrors;
    return Object.keys(statusFieldErrors).length === 0;
  }

  async function saveStatus() {
    if (!asset) return;
    if (!validateStatusFields()) return;
    statusSaving = true;
    statusError = '';
    try {
      let data: Record<string, any> = {};

      if (selectedStatus === 'borrowed') {
        data.borrowerName = borrowerName;
        if (borrowUnitId) data.borrowerDepartmentId = borrowUnitId;
        data.borrowDate = borrowDate;
        if (returnDate) data.expectedReturnDate = returnDate;
        if (borrowingBuildingId) data.borrowingBuildingId = borrowingBuildingId;
        if (borrowingRoomId) data.borrowingRoomId = borrowingRoomId;
        if (borrowReason.trim()) data.reason = borrowReason.trim();
      } else if (selectedStatus === 'repair') {
        data.repairReason = repairBy;
        data.startDate = repairDate;
        if (repairCompany.trim()) data.repairCompany = repairCompany.trim();
        if (repairCost) data.cost = parseFloat(repairCost);
        if (repairEndDate) data.endDate = repairEndDate;
        if (repairFiles.length > 0) {
          repairFileUploading = true;
          const uploaded = await Promise.all(repairFiles.map(async (f) => {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('folder', 'repairs');
            const res = await apiFetch<{ data: { id: number } }>(API_ENDPOINTS.ATTACHMENTS_UPLOAD, { method: 'POST', body: fd });
            return res.data;
          }));
          repairFileUploading = false;
          data.attachmentId = uploaded[0]?.id;
        }
      } else if (selectedStatus === 'unavailable') {
        data.reason = unavailableReason;
      } else if (selectedStatus === 'disposed') {
        data.disposalDate = disposeDate;
        data.disposalMethod = disposeMethod;
        data.approvedBy = disposeApprovedBy;
        data.reason = disposeReason;
        if (disposePrice) data.cost = parseFloat(disposePrice);
        if (disposeFiles.length > 0) {
          disposeFileUploading = true;
          const uploaded = await Promise.all(disposeFiles.map(async (f) => {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('folder', 'disposals');
            const res = await apiFetch<{ data: { id: number } }>(API_ENDPOINTS.ATTACHMENTS_UPLOAD, { method: 'POST', body: fd });
            return res.data;
          }));
          disposeFileUploading = false;
          data.attachmentId = uploaded[0]?.id;
        }
      }
      if (statusRemark.trim()) data.remark = statusRemark.trim();

      const targets = [assetId, ...extraEquipment.filter(e => e.status !== 'disposed').map(e => e.uuid)];
      await apiFetch(API_ENDPOINTS.EQUIPMENT_STATUS_CHANGE, {
        method: 'POST',
        body: JSON.stringify({ equipmentUuids: targets, newStatus: selectedStatus, data }),
      });

      asset = { ...asset, status: selectedStatus };
      await fetchHistory();
      showStatusModal = false;
    } catch (err: any) {
      statusError = err.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    } finally {
      statusSaving = false;
    }
  }

  // --- Edit Modal ---
  let showEditModal = false;
  let editSaving = false;
  let editError = '';
  let editForm = {
    departmentId: null as number | null,
    activityName: '',
    fundId: null as number | null,
    fiscalYear: null as number | null,
    equipmentCode: '',
    equipmentName: '',
    equipmentNumber: '',
    price: '',
    unit: '',
    company: '',
    equipmentTypeId: null as number | null,
    acquisitionSourceId: null as number | null,
    acquisitionDate: '',
    acquisitionMethodId: null as number | null,
    sizeDetail: '',
    projectId: null as number | null,
    buildingId: null as number | null,
    roomId: null as number | null,
    note: '',
  };

  function openEditModal() {
    const a = asset;
    if (!a) return;
    editForm = {
      departmentId: a.departmentId,
      activityName: a.activity || '',
      fundId: a.fundId,
      fiscalYear: a.fiscalYear,
      equipmentCode: a.equipmentCode || '',
      equipmentName: a.equipmentName || '',
      equipmentNumber: a.equipmentNumber || '',
      price: a.price || '',
      unit: a.unit || '',
      company: a.company || '',
      equipmentTypeId: a.equipmentTypeId,
      acquisitionSourceId: a.acquisitionSourceId,
      acquisitionDate: a.acquisitionDate || '',
      acquisitionMethodId: a.acquisitionMethodId,
      sizeDetail: a.sizeDetail || '',
      projectId: a.projectId,
      buildingId: a.buildingId,
      roomId: a.roomId,
      note: a.note || '',
    };
    editError = '';
    showEditModal = true;
  }

  async function saveEdit() {
    if (!asset) return;
    editSaving = true;
    editError = '';
    try {
      const payload: Record<string, unknown> = {
        equipmentCode: editForm.equipmentCode || null,
        equipmentName: editForm.equipmentName,
        equipmentNumber: editForm.equipmentNumber || null,
        price: editForm.price || null,
        unit: editForm.unit || null,
        company: editForm.company || null,
        sizeDetail: editForm.sizeDetail || null,
        note: editForm.note || null,
        acquisitionDate: editForm.acquisitionDate || null,
        fiscalYear: editForm.fiscalYear || null,
        departmentId: editForm.departmentId,
        activity: editForm.activityName || null,
        fundId: editForm.fundId,
        equipmentTypeId: editForm.equipmentTypeId,
        acquisitionSourceId: editForm.acquisitionSourceId,
        acquisitionMethodId: editForm.acquisitionMethodId,
        projectId: editForm.projectId,
        buildingId: editForm.buildingId,
        roomId: editForm.roomId,
      };

      const result = await apiFetch<{ data: Asset }>(API_ENDPOINTS.ASSET_DETAIL(assetId), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (result.data) asset = result.data;
      showEditModal = false;
    } catch (err) {
      editError = 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    } finally {
      editSaving = false;
    }
  }

  onMount(async () => {
    await fetchMasterData();
    await fetchAssetDetail();
    await fetchHistory();
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
        <p class="subtitle"><span class="meta-label">ชื่อสินทรัพย์:</span> {asset.equipmentName}</p>
        <p class="code"><span class="meta-label">หมายเลขสินทรัพย์:</span> {asset.equipmentNumber ?? asset.equipmentCode}</p>
      </div>
      <div class="header-actions">
        {#if asset.status !== 'disposed'}
        <button class="btn-secondary" on:click={openStatusModal}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          แก้ไขสถานะ
        </button>
        {/if}
        <button class="btn-primary" on:click={openEditModal}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          แก้ไขข้อมูล
        </button>
      </div>
    </div>

    <div class="content-grid">
      <!-- Left Column: Equipment Details -->
      <div class="detail-card">
        <div class="card-title-row">
          <h2 class="card-title">ข้อมูลทั่วไป</h2>
          <div class="status-badge-container">
            <span class="detail-label">สถานะ :</span>
            <span class="status-badge {getStatusColor(asset.status)}">
              {getStatusText(asset.status)}
            </span>
          </div>
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
              <div class="detail-value">{asset.activity || '-'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">💰</div>
            <div>
              <div class="detail-label">กองทุน</div>
              <div class="detail-value">{getMasterName(funds, asset.fundId)}</div>
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-icon">📅</div>
            <div>
              <div class="detail-label">ปีงบประมาณ</div>
              <div class="detail-value">{asset.fiscalYear || '-'}</div>
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
              <div class="detail-label">ชื่อสินทรัพย์</div>
              <div class="detail-value">{asset.equipmentName || '-'}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🔖</div>
            <div>
              <div class="detail-label">หมายเลขสินทรัพย์</div>
              <div class="detail-value">{asset.equipmentNumber || '-'}</div>
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
            <div class="detail-icon">📝</div>
            <div>
              <div class="detail-label">หน่วยนับ</div>
              <div class="detail-value">{asset.unit || '-'}</div>
            </div>
          </div>
          <div class="detail-item">
            <div class="detail-icon">📍</div>
            <div>
              <div class="detail-label">บริษัท</div>
              <div class="detail-value">{asset.company || '-'}</div>
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
              <div class="detail-label">ทรัพย์สินได้มาโดย</div>
              <div class="detail-value">{getMasterName(acquisitionSources, asset.acquisitionSourceId)}</div>
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
            <div class="detail-icon">📏</div>
            <div>
              <div class="detail-label">ขนาดและลักษณะ</div>
              <div class="detail-value">{asset.sizeDetail || '-'}</div>
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
            <div class="detail-icon">📝</div>
            <div>
              <div class="detail-label">หมายเหตุ</div>
              <div class="detail-value">{asset.note || '-'}</div>
            </div>
          </div>
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

      </div>
    </div>

    <!-- History — full width -->
    <div class="history-card">
      <h2 class="card-title">ประวัติการใช้งาน</h2>
      {#if history.length === 0}
        <div class="empty-history"><p>ยังไม่มีประวัติการใช้งาน</p></div>
      {:else}
        <div class="timeline">
          {#each history as h, idx}
            {@const diffFields = h.type === 'edit' ? getDiffFields(h.before, h.after) : []}
            <div class="tl-item">
              <div class="tl-line-wrap">
                <div class="tl-dot" class:tl-dot-edit={h.type === 'edit'}></div>
                {#if idx < history.length - 1}<div class="tl-line"></div>{/if}
              </div>
              <div class="tl-body">
                <div class="tl-header">
                  <div class="tl-header-left">
                    {#if h.type === 'status_change'}
                      <span class="tl-badge tl-badge-status" style="color:{getStatusDotColor(h.status ?? '')}; background:{getStatusDotColor(h.status ?? '')}18; border-color:{getStatusDotColor(h.status ?? '')}40">
                        เปลี่ยนสถานะ → {getStatusText(h.status ?? '')}
                      </span>
                    {:else}
                      <span class="tl-badge tl-badge-edit">แก้ไขข้อมูล</span>
                    {/if}
                    <span class="tl-user">{h.createdBy || 'ไม่ระบุ'}</span>
                  </div>
                  <span class="tl-time">{formatDateOnly(h.createdAt)} {formatTimeOnly(h.createdAt)}</span>
                </div>

                {#if h.type === 'status_change' && h.detail}
                  <div class="tl-detail-grid">
                    {#if h.detail.borrowerName}
                      <span class="tl-detail-label">ผู้ยืม:</span><span class="tl-detail-val">{h.detail.borrowerName}</span>
                    {/if}
                    {#if h.detail.borrowDate}
                      <span class="tl-detail-label">วันที่ยืม:</span><span class="tl-detail-val">{formatDate(h.detail.borrowDate)}</span>
                    {/if}
                    {#if h.detail.expectedReturnDate}
                      <span class="tl-detail-label">กำหนดคืน:</span><span class="tl-detail-val">{formatDate(h.detail.expectedReturnDate)}</span>
                    {/if}
                    {#if h.detail.borrowingBuildingId}
                      <span class="tl-detail-label">อาคาร:</span><span class="tl-detail-val">{getMasterName(buildings, h.detail.borrowingBuildingId)}</span>
                    {/if}
                    {#if h.detail.borrowingRoomId}
                      <span class="tl-detail-label">ห้อง:</span><span class="tl-detail-val">{getMasterName(rooms, h.detail.borrowingRoomId)}</span>
                    {/if}
                    {#if h.detail.repairReason}
                      <span class="tl-detail-label">สาเหตุ:</span><span class="tl-detail-val">{h.detail.repairReason}</span>
                    {/if}
                    {#if h.detail.startDate}
                      <span class="tl-detail-label">วันที่แจ้งซ่อม:</span><span class="tl-detail-val">{formatDate(h.detail.startDate)}</span>
                    {/if}
                    {#if h.detail.endDate}
                      <span class="tl-detail-label">วันที่คาดเสร็จ:</span><span class="tl-detail-val">{formatDate(h.detail.endDate)}</span>
                    {/if}
                    {#if h.detail.repairCompany}
                      <span class="tl-detail-label">บริษัทซ่อม:</span><span class="tl-detail-val">{h.detail.repairCompany}</span>
                    {/if}
                    {#if h.detail.cost}
                      <span class="tl-detail-label">ค่าซ่อม:</span><span class="tl-detail-val">{Number(h.detail.cost).toLocaleString('th-TH', {minimumFractionDigits:2})} บาท</span>
                    {/if}
                    {#if h.detail.disposalDate}
                      <span class="tl-detail-label">วันที่จำหน่าย:</span><span class="tl-detail-val">{formatDate(h.detail.disposalDate)}</span>
                    {/if}
                    {#if h.detail.disposalMethod}
                      <span class="tl-detail-label">วิธีการจำหน่าย:</span><span class="tl-detail-val">{h.detail.disposalMethod}</span>
                    {/if}
                    {#if h.detail.approvedBy}
                      <span class="tl-detail-label">ผู้อนุมัติ:</span><span class="tl-detail-val">{h.detail.approvedBy}</span>
                    {/if}
                    {#if h.detail.disposalCost}
                      <span class="tl-detail-label">ราคาจำหน่าย:</span><span class="tl-detail-val">{Number(h.detail.disposalCost).toLocaleString('th-TH', {minimumFractionDigits:2})} บาท</span>
                    {/if}
                    {#if h.detail.reason}
                      <span class="tl-detail-label">เหตุผล:</span><span class="tl-detail-val">{h.detail.reason}</span>
                    {/if}
                  </div>
                {/if}
                {#if h.type === 'status_change' && h.remark}
                  <div class="tl-remark">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h6"/></svg>
                    {h.remark}
                  </div>
                {:else if h.type === 'edit' && diffFields.length > 0}
                  <div class="tl-changes">
                    {#each diffFields as field}
                      <div class="tl-change-row">
                        <span class="tl-field">{FIELD_LABELS[field]}</span>
                        <div class="tl-diff">
                          <span class="tl-old">{resolveFieldValue(field, h.before?.[field])}</span>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tl-arrow"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          <span class="tl-new">{resolveFieldValue(field, h.after?.[field])}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Status Modal -->
{#if showStatusModal}
  <div class="modal-backdrop" on:click={() => (showStatusModal = false)} role="presentation">
    <div class="modal-box modal-status" on:click|stopPropagation role="dialog" aria-modal="true">
      <!-- Header -->
      <div class="modal-header">
        <span class="modal-title">แก้ไขสถานะครุภัณฑ์</span>
        <button class="modal-close" on:click={() => (showStatusModal = false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="sm-body">
        <!-- Status Tabs -->
        <div class="sm-tabs">
          {#each statusTabs as tab}
            <button
              class="sm-tab"
              class:sm-tab-active={selectedStatus === tab.value}
              style="--tc:{tab.color}"
              disabled={tab.value === asset?.status}
              on:click={() => { selectedStatus = tab.value; statusFieldErrors = {}; }}
            >{tab.label}</button>
          {/each}
        </div>

        <!-- Main Equipment -->
        <div class="sm-card">
          <div class="sm-card-meta">ครุภัณฑ์หลัก</div>
          <div class="sm-equip-title">{asset?.equipmentName} • {asset?.equipmentNumber ?? asset?.equipmentCode}</div>

          <div class="sm-extra-label">เพิ่มครุภัณฑ์อื่น ๆ</div>
          <SearchableDropdown
            options={equipmentPickerOptions}
            bind:value={statusPickerValue}
            placeholder="ครุภัณฑ์ที่ต้องการแก้ไขสถานะ"
            fullWidth={true}
            keepOpen={true}
            on:change={(e) => {
              const eq = allEquipment.find(a => a.uuid === e.detail);
              if (eq) extraEquipment = [...extraEquipment, eq];
              statusPickerValue = null;
            }}
          />

          {#if extraEquipment.length > 0}
            <div class="sm-chips">
              {#each extraEquipment as eq (eq.uuid)}
                <div class="sm-chip">
                  <span>{eq.equipmentName} • {eq.equipmentNumber ?? eq.equipmentCode}</span>
                  <button class="sm-chip-remove" type="button" on:click={() => {
                    extraEquipment = extraEquipment.filter(e => e.uuid !== eq.uuid);
                  }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              {/each}
              <button class="sm-chips-clear" type="button" on:click={() => extraEquipment = []}>
                ล้างทั้งหมด
              </button>
            </div>
          {/if}
        </div>

        <!-- Status-specific form -->
        {#if selectedStatus !== 'normal'}
          <div class="sm-card">
            <div class="sm-form-title">{formTitles[selectedStatus]}</div>

            {#if selectedStatus === 'borrowed'}
              <div class="sm-form-grid">
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.borrowerName}>
                  <label class="sm-label">ผู้ยืม <span class="sm-req">*</span></label>
                  <input class="sm-input" bind:value={borrowerName} placeholder="ชื่อผู้ยืม" />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.borrowUnitId}>
                  <label class="sm-label">หน่วยงานที่ยืม <span class="sm-req">*</span></label>
                  <Dropdown
                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                    bind:value={borrowUnitId}
                    fullWidth={true}
                  />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.borrowDate}>
                  <label class="sm-label">วันที่ยืม <span class="sm-req">*</span></label>
                  <ThaiDatePicker
                    bind:value={borrowDate}
                    error={statusFieldErrors.borrowDate}
                    inputClass="form-input"
                    on:change={(e) => { if (returnDate && e.detail > returnDate) returnDate = ''; }}
                  />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.returnDate}>
                  <label class="sm-label">วันที่คืน <span class="sm-req">*</span></label>
                  <ThaiDatePicker
                    bind:value={returnDate}
                    error={statusFieldErrors.returnDate}
                    inputClass="form-input"
                    on:change={(e) => { if (borrowDate && e.detail < borrowDate) returnDate = borrowDate; }}
                  />
                </div>
                <div class="sm-fg">
                  <label class="sm-label">อาคารที่ยืมไปใช้</label>
                  <Dropdown
                    options={buildings.map(b => ({ value: b.id, label: b.name }))}
                    bind:value={borrowingBuildingId}
                    fullWidth={true}
                    placeholder="กรุณาเลือก"
                  />
                </div>
                <div class="sm-fg">
                  <label class="sm-label">ห้องที่ยืมไปใช้</label>
                  <Dropdown
                    options={rooms.map(r => ({ value: r.id, label: r.name }))}
                    bind:value={borrowingRoomId}
                    fullWidth={true}
                    placeholder="กรุณาเลือก"
                  />
                </div>
                <div class="sm-fg sm-fg-full">
                  <label class="sm-label">เหตุผลการยืม</label>
                  <textarea class="sm-textarea" bind:value={borrowReason} rows="2" placeholder="ระบุเหตุผล..."></textarea>
                </div>
              </div>

            {:else if selectedStatus === 'repair'}
              <div class="sm-form-grid">
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.repairDate}>
                  <label class="sm-label">วันที่แจ้งซ่อม <span class="sm-req">*</span></label>
                  <ThaiDatePicker bind:value={repairDate} error={statusFieldErrors.repairDate} inputClass="form-input"
                    on:change={(e) => { if (repairEndDate && e.detail > repairEndDate) repairEndDate = ''; }} />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.repairEndDate}>
                  <label class="sm-label">วันที่คาดว่าจะเสร็จ <span class="sm-req">*</span></label>
                  <ThaiDatePicker bind:value={repairEndDate} error={statusFieldErrors.repairEndDate} inputClass="form-input"
                    on:change={(e) => { if (repairDate && e.detail < repairDate) repairEndDate = repairDate; }} />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.repairBy}>
                  <label class="sm-label">สาเหตุ <span class="sm-req">*</span></label>
                  <input class="sm-input" bind:value={repairBy} placeholder="ระบุสาเหตุ" />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.repairCompany}>
                  <label class="sm-label">บริษัทที่ซ่อม <span class="sm-req">*</span></label>
                  <input class="sm-input" bind:value={repairCompany} placeholder="ชื่อบริษัท/ช่างซ่อม" />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.repairCost}>
                  <label class="sm-label">ค่าซ่อม (บาท) <span class="sm-req">*</span></label>
                  <input class="sm-input" type="number" bind:value={repairCost} placeholder="0.00" min="0" />
                </div>
                <div class="sm-fg sm-fg-full">
                  <label class="sm-label">เอกสารการซ่อม (ถ้ามี)</label>
                  <label class="file-upload-label">
                    <input type="file" class="file-input-hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple
                      on:change={(e) => { repairFiles = Array.from(e.currentTarget.files ?? []); }} />
                    <div class="file-upload-box" class:file-selected={repairFiles.length > 0}>
                      {#if repairFiles.length > 0}
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>{repairFiles.length === 1 ? repairFiles[0].name : `${repairFiles.length} ไฟล์`}</span>
                        <button type="button" class="file-clear-btn" on:click|stopPropagation|preventDefault={() => repairFiles = []}>✕</button>
                      {:else}
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                        <span>คลิกเพื่อเลือกไฟล์</span>
                      {/if}
                    </div>
                  </label>
                  {#if repairFiles.length > 1}
                    <div class="file-list">
                      {#each repairFiles as f, i}
                        <div class="file-item">
                          <span class="file-item-name">{f.name}</span>
                          <button type="button" class="file-clear-btn" on:click={() => repairFiles = repairFiles.filter((_, j) => j !== i)}>✕</button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

            {:else if selectedStatus === 'unavailable'}
              <div class="sm-fg" class:sm-fg-err={statusFieldErrors.unavailableReason}>
                <label class="sm-label">เหตุผลที่ไม่พร้อมใช้งาน <span class="sm-req">*</span></label>
                <textarea class="sm-textarea" bind:value={unavailableReason} rows="3" placeholder="ระบุเหตุผล..."></textarea>
              </div>

            {:else if selectedStatus === 'disposed'}
              <div class="sm-form-grid">
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.disposeDate}>
                  <label class="sm-label">วันที่จำหน่าย <span class="sm-req">*</span></label>
                  <ThaiDatePicker bind:value={disposeDate} error={statusFieldErrors.disposeDate} inputClass="form-input" />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.disposePrice}>
                  <label class="sm-label">ราคาจำหน่าย (บาท) <span class="sm-req">*</span></label>
                  <input class="sm-input" type="number" bind:value={disposePrice} placeholder="0.00" min="0" />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.disposeMethod}>
                  <label class="sm-label">วิธีการจำหน่าย <span class="sm-req">*</span></label>
                  <input class="sm-input" bind:value={disposeMethod} placeholder="เช่น ขายทอดตลาด, บริจาค, ทำลาย" />
                </div>
                <div class="sm-fg" class:sm-fg-err={statusFieldErrors.disposeApprovedBy}>
                  <label class="sm-label">ผู้อนุมัติ <span class="sm-req">*</span></label>
                  <input class="sm-input" bind:value={disposeApprovedBy} placeholder="ชื่อ-นามสกุล ผู้อนุมัติ" />
                </div>
                <div class="sm-fg sm-fg-full" class:sm-fg-err={statusFieldErrors.disposeReason}>
                  <label class="sm-label">เหตุผลการจำหน่าย <span class="sm-req">*</span></label>
                  <textarea class="sm-textarea" bind:value={disposeReason} rows="2" placeholder="ระบุเหตุผล..."></textarea>
                </div>
                <div class="sm-fg sm-fg-full">
                  <label class="sm-label">เอกสารการจำหน่าย (ถ้ามี)</label>
                  <label class="file-upload-label">
                    <input type="file" class="file-input-hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple
                      on:change={(e) => { disposeFiles = Array.from(e.currentTarget.files ?? []); }} />
                    <div class="file-upload-box" class:file-selected={disposeFiles.length > 0}>
                      {#if disposeFiles.length > 0}
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>{disposeFiles.length === 1 ? disposeFiles[0].name : `${disposeFiles.length} ไฟล์`}</span>
                        <button type="button" class="file-clear-btn" on:click|stopPropagation|preventDefault={() => disposeFiles = []}>✕</button>
                      {:else}
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                        <span>คลิกเพื่อเลือกไฟล์</span>
                      {/if}
                    </div>
                  </label>
                  {#if disposeFiles.length > 1}
                    <div class="file-list">
                      {#each disposeFiles as f, i}
                        <div class="file-item">
                          <span class="file-item-name">{f.name}</span>
                          <button type="button" class="file-clear-btn" on:click={() => disposeFiles = disposeFiles.filter((_, j) => j !== i)}>✕</button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Remark -->
        <div class="sm-card">
          <label class="sm-label">หมายเหตุ</label>
          <textarea class="sm-textarea" bind:value={statusRemark} rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
        </div>
      </div>

      {#if Object.keys(statusFieldErrors).length > 0}
        <p class="modal-error" style="margin: 0 1.5rem 0.5rem">กรุณากรอกข้อมูลที่จำเป็นให้ครบ</p>
      {:else if statusError}
        <p class="modal-error" style="margin: 0 1.5rem 0.5rem">{statusError}</p>
      {/if}

      <div class="modal-footer">
        <button class="modal-btn-cancel" on:click={() => (showStatusModal = false)}>ยกเลิก</button>
        <button class="modal-btn-confirm" on:click={saveStatus} disabled={statusSaving || repairFileUploading || disposeFileUploading || (mainEquipAlreadyInStatus && extraEquipment.length === 0)}>
          {(repairFileUploading || disposeFileUploading) ? 'กำลังอัปโหลด...' : statusSaving ? 'กำลังบันทึก...' : 'ยืนยัน'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-backdrop" on:click={() => (showEditModal = false)} role="presentation">
    <div class="modal-box modal-box-lg" on:click|stopPropagation role="dialog" aria-modal="true">
      <div class="modal-header">
        <span class="modal-title">แก้ไขข้อมูลครุภัณฑ์</span>
        <button class="modal-close" on:click={() => (showEditModal = false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="edit-form">
        <div class="form-group">
          <label class="form-label">หน่วยงาน</label>
          <Dropdown
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            bind:value={editForm.departmentId}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">กิจกรรม</label>
          <input class="form-input" type="text" bind:value={editForm.activityName} placeholder="กิจกรรม"/>
        </div>
        <div class="form-group">
          <label class="form-label">กองทุน</label>
          <Dropdown
            options={funds.map(f => ({ value: f.id, label: f.name }))}
            bind:value={editForm.fundId}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">ปีงบประมาณ</label>
          <Dropdown
            options={Array.from({ length: 16 }, (_, i) => ({ value: 2560 + i, label: String(2560 + i) }))}
            bind:value={editForm.fiscalYear}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">รหัสสินทรัพย์</label>
          <input class="form-input" type="text" bind:value={editForm.equipmentCode} placeholder="รหัสสินทรัพย์"/>
        </div>
        <div class="form-group">
          <label class="form-label">ชื่อสินทรัพย์</label>
          <input class="form-input" type="text" bind:value={editForm.equipmentName} placeholder="ชื่อสินทรัพย์"/>
        </div>
        <div class="form-group">
          <label class="form-label">หมายเลขสินทรัพย์</label>
          <input class="form-input" type="text" bind:value={editForm.equipmentNumber} placeholder="หมายเลขสินทรัพย์"/>
        </div>
        <div class="form-group">
          <label class="form-label">ราคา (บาท)</label>
          <input class="form-input" type="number" bind:value={editForm.price} placeholder="0" min="0" step="any"/>
        </div>
        <div class="form-group">
          <label class="form-label">หน่วยนับ</label>
          <input class="form-input" type="text" bind:value={editForm.unit} placeholder="เช่น เครื่อง, ชุด"/>
        </div>
        <div class="form-group">
          <label class="form-label">บริษัท</label>
          <input class="form-input" type="text" bind:value={editForm.company} placeholder="ชื่อบริษัท"/>
        </div>
        <div class="form-group">
          <label class="form-label">ประเภท</label>
          <Dropdown
            options={assetTypes.map(t => ({ value: t.id, label: t.name }))}
            bind:value={editForm.equipmentTypeId}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">ทรัพย์สินได้มาโดย</label>
          <Dropdown
            options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
            bind:value={editForm.acquisitionSourceId}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">วันที่ได้มา</label>
          <ThaiDatePicker bind:value={editForm.acquisitionDate} inputClass="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">วิธีการได้มา</label>
          <Dropdown
            options={acquisitionMethods.map(m => ({ value: m.id, label: m.name }))}
            bind:value={editForm.acquisitionMethodId}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">ขนาดและลักษณะ</label>
          <input class="form-input" type="text" bind:value={editForm.sizeDetail} placeholder="ขนาด/ลักษณะ"/>
        </div>
        <div class="form-group">
          <label class="form-label">โครงการ</label>
          <SearchableDropdown
            fullWidth
            options={projects.map(p => ({ value: p.id, label: p.projectName }))}
            bind:value={editForm.projectId}
            placeholder="เลือกโครงการ"
          />
        </div>
        <div class="form-group">
          <label class="form-label">สถานที่ตั้ง</label>
          <Dropdown
            options={buildings.map(b => ({ value: b.id, label: b.name }))}
            bind:value={editForm.buildingId}
            fullWidth={true}
          />
        </div>
        <div class="form-group">
          <label class="form-label">ห้อง</label>
          <Dropdown
            options={rooms.map(r => ({ value: r.id, label: r.name }))}
            bind:value={editForm.roomId}
            fullWidth={true}
          />
        </div>
        <div class="form-group full-col">
          <label class="form-label">หมายเหตุ</label>
          <textarea class="form-input form-textarea" bind:value={editForm.note} placeholder="หมายเหตุ (ถ้ามี)"></textarea>
        </div>
      </div>
      {#if editError}
        <p class="modal-error">{editError}</p>
      {/if}
      <div class="modal-footer">
        <button class="modal-btn-cancel" on:click={() => (showEditModal = false)}>ยกเลิก</button>
        <button class="modal-btn-confirm" on:click={saveEdit} disabled={editSaving}>
          {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .date-wrapper {
    position: relative;
  }

  .date-picker-hidden {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    cursor: pointer;
  }

  .date-display {
    cursor: pointer;
    padding-right: 2.5rem;
  }

  .cal-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #9ca3af;
  }

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
    font-size: 1rem;
    color: #6b7280;
    margin: 0.25rem 0;
  }

  .code {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
    font-family: var(--font-thai);
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
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
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
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
  .card-title-row {
    display: flex;
    align-items: baseline;
    gap: 6rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .card-title-row .card-title {
    margin: 0 !important;
    line-height: 1 !important;
  }

  .status-badge-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-badge-container .detail-label {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #374151;
  }

  .status-badge-container .detail-label::after {
    content: '';
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 1.25rem;
    border-radius: 9999px;
    font-size: 0.9375rem;
    font-weight: 600;
    font-family: var(--font-thai, 'Noto Serif Thai', serif);
    letter-spacing: 0.01em;
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
    font-size: 0.8125rem;
    color: #6b7280;
    margin-bottom: 0.2rem;
    font-family: var(--font-thai, 'Noto Serif Thai', serif);
  }

  .detail-item .detail-label::after {
    content: ':';
  }

  .detail-value {
    font-size: 1rem;
    color: #1f2937;
    font-weight: 500;
    font-family: var(--font-thai, 'Noto Serif Thai', serif);
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

  /* History — full width table */
  .history-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    margin-top: 1.5rem;
  }

  .empty-history {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
  }

  /* ── Timeline ── */
  .timeline { padding: 0.25rem 0; }

  .tl-item {
    display: flex;
    gap: 1rem;
  }

  .tl-line-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 20px;
    padding-top: 0.3rem;
  }

  .tl-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ffa200;
    border: 2px solid #fff7e6;
    box-shadow: 0 0 0 2px #ffa200;
    flex-shrink: 0;
  }

  .tl-dot-edit {
    background: #3b82f6;
    border-color: #eff6ff;
    box-shadow: 0 0 0 2px #3b82f6;
  }

  .tl-line {
    flex: 1;
    width: 2px;
    background: #f3f4f6;
    margin: 4px 0;
    min-height: 24px;
  }

  .tl-body {
    flex: 1;
    padding-bottom: 1.5rem;
  }

  .tl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .tl-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tl-badge {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    border-radius: 99px;
    padding: 0.15rem 0.6rem;
    border: 1px solid;
  }

  .tl-badge-status {
    color: #92400e;
    background: #fef3c7;
    border-color: #fde68a;
  }

  .tl-badge-edit {
    color: #1d4ed8;
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .tl-user {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }

  .tl-time {
    font-size: 0.78rem;
    color: #9ca3af;
    white-space: nowrap;
  }

  .tl-detail-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.3rem 0.75rem;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 0.5rem;
    padding: 0.6rem 0.875rem;
    margin-bottom: 0.375rem;
    font-size: 0.8125rem;
    align-items: center;
  }

  .tl-detail-label {
    color: #9ca3af;
    font-weight: 500;
    white-space: nowrap;
  }

  .tl-detail-val {
    color: #111827;
    font-weight: 500;
  }

  .tl-remark {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #f0f0f0;
    border-radius: 0.375rem;
    padding: 0.35rem 0.75rem;
  }

  .tl-changes {
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .tl-change-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0.875rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .tl-change-row:last-child { border-bottom: none; }

  .tl-field {
    min-width: 100px;
    font-size: 0.78rem;
    font-weight: 500;
    color: #6b7280;
    flex-shrink: 0;
  }

  .tl-diff {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tl-old {
    font-size: 0.8125rem;
    color: #b91c1c;
    background: #fef2f2;
    border-radius: 0.25rem;
    padding: 0.1rem 0.45rem;
    text-decoration: line-through;
  }

  .tl-arrow { color: #9ca3af; flex-shrink: 0; }

  .tl-new {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #15803d;
    background: #f0fdf4;
    border-radius: 0.25rem;
    padding: 0.1rem 0.45rem;
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

  /* ── Modals ─────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-box {
    background: #fff;
    border-radius: 1rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
    width: 100%;
    max-width: 420px;
    animation: modal-in 0.2s ease;
  }

  .modal-box-lg {
    max-width: 860px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  @keyframes modal-in {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .modal-title {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }

  .modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    display: flex;
    align-items: center;
    padding: 0.25rem;
    border-radius: 0.375rem;
    transition: color 0.15s;
  }

  .modal-close:hover { color: #374151; }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding: 1.25rem 1.5rem;
    border-top: 1px solid #f0f0f0;
  }

  .modal-btn-cancel {
    background: #fff;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .modal-btn-cancel:hover { background: #f9fafb; }

  .modal-btn-confirm {
    background: #ffa200;
    color: #fff;
    border: none;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .modal-btn-confirm:hover:not(:disabled) { background: #e69200; }
  .modal-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

  .modal-error {
    color: #dc2626;
    font-size: 0.8125rem;
    padding: 0 1.5rem 0.75rem;
    margin: 0;
  }

  /* Status modal (new rich version) */
  .modal-status {
    width: min(1020px, 96vw);
    max-width: unset;
    height: min(820px, 92vh);
    display: flex;
    flex-direction: column;
    font-family: var(--font-thai, 'Noto Serif Thai', serif);
  }

  .sm-body {
    overflow-y: auto;
    padding: 1.75rem 2.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    flex: 1;
  }

  .sm-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .sm-tab {
    padding: 0.5rem 1.125rem;
    border-radius: 0.5rem;
    border: 1.5px solid color-mix(in srgb, var(--tc, #ffa200) 35%, #e5e7eb);
    background: color-mix(in srgb, var(--tc, #ffa200) 8%, white);
    color: color-mix(in srgb, var(--tc, #ffa200) 70%, #6b7280);
    font-size: 0.9375rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  .sm-tab:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sm-tab:hover:not(.sm-tab-active) {
    background: color-mix(in srgb, var(--tc, #ffa200) 16%, white);
    border-color: var(--tc, #ffa200);
    color: var(--tc, #ffa200);
  }

  .sm-tab-active {
    border-color: var(--tc, #ffa200);
    background: var(--tc, #ffa200);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--tc, #ffa200) 40%, transparent);
  }

  .sm-card {
    background: #f9fafb;
    border-radius: 0.625rem;
    padding: 0.875rem 1rem;
  }

  .sm-card-meta {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.25rem;
  }

  .sm-equip-title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.875rem;
  }

  .sm-extra-label {
    font-size: 0.8125rem;
    color: #6b7280;
    margin-bottom: 0.375rem;
  }


  .sm-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .sm-chip {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: #374151;
  }

  .sm-chip-remove {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    color: #9ca3af;
  }
  .sm-chip-remove:hover { color: #ef4444; }

  .sm-chips-clear {
    background: none;
    border: 1px solid #fca5a5;
    color: #ef4444;
    border-radius: 0.375rem;
    padding: 0.2rem 0.625rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    align-self: center;
    white-space: nowrap;
  }
  .sm-chips-clear:hover { background: #fee2e2; }

  .sm-form-title {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.75rem;
  }

  .sm-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .sm-fg {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .sm-fg-full { grid-column: 1 / -1; }

  .file-upload-label { cursor: pointer; display: block; }

  .file-input-hidden { display: none; }

  .file-upload-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1.5px dashed #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.6rem 0.875rem;
    font-size: 0.8125rem;
    color: #9ca3af;
    background: #fafafa;
    transition: border-color 0.15s, background 0.15s;
  }

  .file-upload-box:hover { border-color: #ffa200; background: #fffbf2; color: #374151; }

  .file-upload-box.file-selected {
    border-color: #22c55e;
    background: #f0fdf4;
    color: #15803d;
    border-style: solid;
  }

  .file-clear-btn {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 0.75rem;
    padding: 0 0.25rem;
    line-height: 1;
  }

  .file-clear-btn:hover { color: #ef4444; }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.375rem;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 0.375rem;
    padding: 0.3rem 0.625rem;
    font-size: 0.8rem;
  }

  .file-item-name {
    flex: 1;
    color: #15803d;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sm-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .sm-req { color: #ef4444; }

  .sm-input {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.9375rem;
    color: #374151;
    background: white;
    width: 100%;
    box-sizing: border-box;
    appearance: none;
    font-family: inherit;
  }
  .sm-input:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255,162,0,0.15);
  }

  .sm-fg-err .sm-input,
  .sm-fg-err :global(.picker-btn),
  .sm-fg-err :global(.dropdown-button) {
    border-color: #ef4444 !important;
  }

  .sm-textarea {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.9375rem;
    color: #374151;
    background: white;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    font-family: inherit;
  }
  .sm-textarea:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255,162,0,0.15);
  }

  .sm-fg-err .sm-textarea { border-color: #ef4444; }

  /* Edit form */
  .edit-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group.full-col {
    grid-column: 1 / -1;
  }

  .form-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
  }

  .form-input {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #111827;
    background: #fff;
    transition: border-color 0.15s;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.12);
  }

  .form-textarea {
    resize: vertical;
    min-height: 5rem;
    font-family: inherit;
  }
</style>