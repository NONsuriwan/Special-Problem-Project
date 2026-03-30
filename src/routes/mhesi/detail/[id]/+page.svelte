<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  $: canAccessRestricted =
    $page.data.user?.role === 'admin' ||
    $page.data.user?.departmentId === 1;
  import { goto } from '$app/navigation';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { apiFetch, apiFetchBlob } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';
  import '../../../../styles/detail.css';
  import '../../../../styles/timeline.css';

  type MhesiRecord = {
    uuid: string;
    mhesiNumber: string;
    role: string | null;
    departmentId: number | null;
    faculty: string | null;
    planId: number | null;
    projectId: number | null;
    activityName: string | null;
    date: string | null;
    amount: string | number | null;
    note: string | null;
    attachmentId: number | null;
    attachment?: { id: number; fileName: string; filePath: string } | null;
    mainAttachment?: { id: number; fileName: string; fileType: string; fileUrl: string } | null;
    additionalAttachments?: { id: number; fileName: string; fileUrl: string }[];
    createdAt: string;
    updatedAt: string;
  };

  type MasterData = { id: number; name: string };
  type Project = { id: number; projectName: string; budget?: number | string | null };
  type AttachmentInfo = { id: number; fileName: string; filePath: string; refType: string };

  let record: MhesiRecord | null = null;
  let loading = true;
  let error = '';
  let attachmentInfo: AttachmentInfo | null = null;
  let showPreviewModal = false;
  let previewUrl: string | null = null;
  let previewLoading = false;
  let previewMimeType = '';
  let previewTitle = '';

  let directUploadFile: File | null = null;
  let directUploading = false;
  let directUploadError = '';
  let directDragOver = false;

  // Additional attachments
  let additionalFiles: File[] = [];
  let additionalUploading = false;
  let additionalUploadError = '';
  let additionalDragOver = false;

  function handleDirectDrop(e: DragEvent) {
    e.preventDefault();
    directDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && /\.(pdf|jpe?g|png)$/i.test(file.name)) {
      directUploadFile = file;
      directUploadError = '';
    }
  }

  async function uploadDirectFile() {
    console.log('uploading to:', `${API_ENDPOINTS.ATTACHMENTS_UPLOAD}?folder=mhesi`);
    if (!directUploadFile || !record) return;
    directUploading = true;
    directUploadError = '';
    try {
      const fd = new FormData();
      fd.append('file', directUploadFile);
      const uploaded = await apiFetch<{ data: { id: number } }>(
        `${API_ENDPOINTS.ATTACHMENTS_UPLOAD}?folder=mhesi`,
        { method: 'POST', body: fd }
      );
      const newAttachmentId = uploaded.data?.id ?? null;
      if (!newAttachmentId) throw new Error('อัปโหลดไฟล์ไม่สำเร็จ');

      await apiFetch(API_ENDPOINTS.MHESI_DETAIL(uuid), {
        method: 'PUT',
        body: JSON.stringify({
          mhesiNumber: record.mhesiNumber,
          role: record.role || null,
          planId: record.planId,
          projectId: record.projectId,
          activityName: record.activityName || null,
          date: record.date || null,
          amount: record.amount ? parseFloat(String(record.amount)) : null,
          note: record.note || null,
          attachmentId: newAttachmentId,
        }),
      });

      directUploadFile = null;
      if (record) record = { ...record, attachmentId: newAttachmentId };
      try {
        const attData = await apiFetch<{ data: AttachmentInfo }>(API_ENDPOINTS.ATTACHMENT_DETAIL(newAttachmentId));
        attachmentInfo = attData.data ?? null;
      } catch (_) {}
      await fetchHistory();
    } catch (e) {
      directUploadError = e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ';
    } finally {
      directUploading = false;
    }
  }

  function handleAdditionalDrop(e: DragEvent) {
    e.preventDefault();
    additionalDragOver = false;
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f =>
      /\.(pdf|jpe?g|png)$/i.test(f.name)
    );
    additionalFiles = [...additionalFiles, ...files];
    additionalUploadError = '';
  }

  function removeAdditionalFile(idx: number) {
    additionalFiles = additionalFiles.filter((_, i) => i !== idx);
  }

  async function uploadAdditionalFiles() {
    if (!additionalFiles.length || !record) return;
    additionalUploading = true;
    additionalUploadError = '';
    try {
      const fd = new FormData();
      for (const f of additionalFiles) {
        fd.append('files', f);
      }
      await apiFetch(`/api/mhesi/${uuid}/attachments`, {
        method: 'POST',
        body: fd,
      });
      additionalFiles = [];
      await fetchAll();
    } catch (e) {
      additionalUploadError = e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ';
    } finally {
      additionalUploading = false;
    }
  }

  async function loadPreview() {
    if (!attachmentInfo) return;
    previewLoading = true;
    previewTitle = attachmentInfo.fileName;
    try {
      const blob = await apiFetchBlob(`/api/attachments/${attachmentInfo.id}/file`);
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

  async function loadPreviewById(id: number, fileName: string) {
    previewLoading = true;
    previewTitle = fileName;
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

  const ROLE_LABEL: Record<string, string> = {
    planning:    'แผนการจัดซื้อ',
    procurement: 'ประกาศจัดซื้อ',
    contract:    'สัญญา',
    receiving:   'ใบตรวจรับ',
    other:       'อื่นๆ',
  };
  const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));

  let departments: MasterData[] = [];
  let plans: MasterData[] = [];
  let projects: Project[] = [];

  // History
  type HistoryEntry = {
    action: string;
    before: Record<string, any> | null;
    after: Record<string, any> | null;
    createdAt: string;
    changedBy: string;
  };
  let history: HistoryEntry[] = [];
  let historyLoading = false;

  const FIELD_LABELS: Record<string, string> = {
    mhesiNumber:  'เลข อว.',
    role:         'ประเภทเอกสาร',
    activityName: 'ชื่อกิจกรรม',
    projectId:    'โครงการ',
    planId:       'แผนงาน',
    date:         'วันที่',
    amount:       'จำนวนเงิน',
    note:         'หมายเหตุ',
    attachmentId: 'ไฟล์แนบ',
  };

  function resolveValue(field: string, val: any): string {
    if (val === null || val === undefined || val === '') return '-';
    if (field === 'projectId')    return projects.find(p => p.id === val)?.projectName ?? String(val);
    if (field === 'planId')       return plans.find(p => p.id === val)?.name ?? String(val);
    if (field === 'role')         return ROLE_LABEL[val] ?? String(val);
    if (field === 'date')         return formatDate(val);
    if (field === 'amount')       return formatCurrency(val);
    if (field === 'attachmentId') return 'มีไฟล์แนบ';
    return String(val);
  }

  function getDiffRows(before: Record<string, any> | null, after: Record<string, any> | null) {
    if (!before || !after) return [];
    return Object.keys(FIELD_LABELS).filter(f => {
      const b = before[f] ?? null;
      const a = after[f] ?? null;
      return String(b) !== String(a);
    });
  }

  async function fetchHistory() {
    historyLoading = true;
    try {
      const data = await apiFetch<{ data: HistoryEntry[] }>(API_ENDPOINTS.MHESI_HISTORY(uuid));
      history = data.data ?? [];
    } catch (_) {}
    historyLoading = false;
  }

  // Edit modal
  let showEditModal = false;
  let editSaving = false;
  let editError = '';
  let prevEditProjectId: number | null = null;
  let editForm = {
    mhesiNumber: '',
    role: null as string | null,
    planId: null as number | null,
    projectId: null as number | null,
    activityName: '',
    date: '',
    amount: '',
    note: '',
  };

  $: uuid = $page.params.id ?? '';

  async function fetchAll() {
    loading = true;
    error = '';
    try {
      const [recData, deptData, planData, projectData] = await Promise.all([
        apiFetch<{ data: MhesiRecord }>(API_ENDPOINTS.MHESI_DETAIL(uuid)),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.PLAN_SECTIONS),
        apiFetch<{ data: Project[] }>(API_ENDPOINTS.PROJECTS),
      ]);

      record = recData.data ?? null;
      if (!record) error = 'ไม่พบข้อมูลเลข อว.';

      // fetch attachment info ถ้ามี (fallback ถ้า API ไม่ return mainAttachment)
      if (record?.mainAttachment) {
        attachmentInfo = {
          id: record.mainAttachment.id,
          fileName: record.mainAttachment.fileName,
          filePath: record.mainAttachment.fileUrl,
          refType: '',
        };
      } else if (record?.attachmentId) {
        try {
          const attData = await apiFetch<{ data: AttachmentInfo }>(
            API_ENDPOINTS.ATTACHMENT_DETAIL(record.attachmentId)
          );
          attachmentInfo = attData.data ?? null;
        } catch (_) {}
      } else {
        attachmentInfo = null;
      }
      departments = deptData.data || [];
      plans = planData.data || [];
      projects = projectData.data || [];
    } catch (e) {
      error = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
    } finally {
      loading = false;
    }
    await fetchHistory();
  }

  function getDepartmentName(id: number | null) {
    if (!id) return '-';
    return departments.find(d => d.id === id)?.name || '-';
  }

  function getPlanName(id: number | null) {
    if (!id) return '-';
    return plans.find(p => p.id === id)?.name || '-';
  }

  function getProjectName(id: number | null) {
    if (!id) return '-';
    return projects.find(p => p.id === id)?.projectName || '-';
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  function formatCurrency(amount: string | number | null) {
    if (!amount) return '0.00';
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  $: {
    if (editForm.projectId !== prevEditProjectId) {
      if (showEditModal) {
        const proj = projects.find(p => p.id === editForm.projectId);
        if (proj?.budget != null) editForm.amount = String(proj.budget);
      }
      prevEditProjectId = editForm.projectId;
    }
  }

  function openEditModal() {
    if (!record) return;
    editForm = {
      mhesiNumber: record.mhesiNumber,
      role: record.role || null,
      planId: record.planId,
      projectId: record.projectId,
      activityName: record.activityName || '',
      date: record.date ? record.date.slice(0, 10) : '',
      amount: record.amount ? String(record.amount) : '',
      note: record.note || '',
    };
    prevEditProjectId = record.projectId;
    editError = '';
    showEditModal = true;
  }

  async function saveEdit() {
    if (!record) return;
    editSaving = true;
    editError = '';
    try {
      await apiFetch(API_ENDPOINTS.MHESI_DETAIL(uuid), {
        method: 'PUT',
        body: JSON.stringify({
          mhesiNumber: editForm.mhesiNumber.trim(),
          role: editForm.role || null,
          planId: editForm.planId,
          projectId: editForm.projectId,
          activityName: editForm.activityName || null,
          date: editForm.date || null,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
          note: editForm.note || null,
        }),
      });
      await fetchAll();
      await fetchHistory();
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
      <button class="btn-primary" on:click={() => goto('/mhesi')}>กลับหน้าหลัก</button>
    </div>
  {:else if record}
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="title">รายละเอียดเลข อว.</h1>
        <p class="subtitle" style="color:#6b7280;font-weight:400"><span class="meta-label" style="color:#9ca3af">กิจกรรม:</span> {record.activityName || '-'}</p>
        <p class="code" style="color:#6b7280;font-weight:400"><span class="meta-label" style="color:#9ca3af">เลข อว.:</span> {record.mhesiNumber}</p>
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

    <div class="content-grid">
      <!-- Left Column: Details -->
      <div class="detail-card">
        <h2 class="card-title">ข้อมูลทั่วไป</h2>

        <div class="detail-grid">
          <!-- โครงการ | เลข อว. -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="folder" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">โครงการ</div>
              <div class="detail-value">{getProjectName(record.projectId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="clipboard-list" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">เลข อว.</div>
              <div class="detail-value">{record.mhesiNumber}</div>
            </div>
          </div>

          <!-- ประเภทเอกสาร | ชื่อกิจกรรม -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="tag" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">ประเภทเอกสาร</div>
              <div class="detail-value">
                {#if record.role}
                  <span class="role-badge role-{record.role}">{ROLE_LABEL[record.role] ?? record.role}</span>
                {:else}
                  -
                {/if}
              </div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="flag" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">ชื่อกิจกรรม</div>
              <div class="detail-value detail-value--wrap">{record.activityName || '-'}</div>
            </div>
          </div>

          <!-- วันที่ | จำนวนเงิน -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="calendar" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">วันที่</div>
              <div class="detail-value">{formatDate(record.date)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="currency" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">จำนวนเงิน</div>
              <div class="detail-value">{formatCurrency(record.amount)} บาท</div>
            </div>
          </div>

          <!-- คณะ/ส่วนงาน | แผนงาน -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="academic-cap" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">คณะ/ส่วนงาน</div>
              <div class="detail-value">{record.faculty || getDepartmentName(record.departmentId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="chart-bar" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">แผนงาน</div>
              <div class="detail-value">{getPlanName(record.planId)}</div>
            </div>
          </div>

          <!-- หมายเหตุ full width -->
          <div class="detail-item full-width">
            <div class="detail-icon"><Icon name="pencil" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">หมายเหตุ</div>
              <div class="detail-value detail-value--wrap">{record.note || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Attachments -->
      <div class="right-column">
        <div class="attachment-card">
          <!-- ──────── เอกสารแนบหลัก ──────── -->
          <h2 class="card-title">เอกสารแนบ</h2>

          <div class="attach-section-header">
            <span class="attach-section-title">เอกสารแนบหลัก</span>
          </div>

          {#if canAccessRestricted}
            <input
              type="file"
              id="direct-file-input"
              accept=".jpg,.jpeg,.png,.pdf"
              hidden
              on:change={(e) => { directUploadFile = e.currentTarget.files?.[0] ?? null; directUploadError = ''; e.currentTarget.value = ''; }}
            />
          {/if}

          {#if attachmentInfo}
            <div class="attachment-list">
              <div class="attachment-item">
                <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="file-info">
                  <div class="file-name">{attachmentInfo.fileName}</div>
                </div>
                <button class="btn-preview" on:click={loadPreview} disabled={previewLoading}>
                  {previewLoading ? 'กำลังโหลด...' : 'ดูไฟล์'}
                </button>
              </div>
            </div>
            {#if canAccessRestricted}
              <div class="attach-section-label">เปลี่ยนไฟล์</div>
            {/if}
          {:else}
            <p class="no-attachment-text">ยังไม่มีเอกสารแนบหลัก</p>
          {/if}

          {#if canAccessRestricted}
            {#if directUploadFile}
              <div class="attach-ready">
                <div class="attach-ready-files">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0;color:#6b7280">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span>{directUploadFile.name}</span>
                </div>
                <div class="attach-ready-actions">
                  <button type="button" class="attach-cancel-btn" on:click={() => directUploadFile = null}>ยกเลิก</button>
                  <button type="button" class="attach-upload-btn" disabled={directUploading} on:click={uploadDirectFile}>
                    {directUploading ? 'กำลังอัปโหลด...' : (attachmentInfo ? 'เปลี่ยนไฟล์' : 'อัปโหลด')}
                  </button>
                </div>
              </div>
            {:else}
              <label
                for="direct-file-input"
                class="upload-placeholder"
                class:drag-over={directDragOver}
                on:dragover|preventDefault={() => directDragOver = true}
                on:dragleave={() => directDragOver = false}
                on:drop={handleDirectDrop}
              >
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p>{directDragOver ? 'วางไฟล์ที่นี่' : (attachmentInfo ? 'คลิกหรือลากไฟล์เพื่อเปลี่ยนไฟล์' : 'คลิกหรือลากเพื่อเพิ่มไฟล์แนบ')}</p>
                <p class="hint">PDF, JPG, PNG</p>
              </label>
            {/if}
            {#if directUploadError}
              <p class="upload-error">{directUploadError}</p>
            {/if}
          {/if}

          <!-- ──────── เอกสารแนบเพิ่มเติม ──────── -->
          <div class="attach-divider"></div>

          <div class="attach-section-header">
            <span class="attach-section-title">เอกสารเพิ่มเติม</span>
          </div>

          {#if record.additionalAttachments && record.additionalAttachments.length > 0}
            <div class="attachment-list" style="margin-bottom:0.75rem">
              {#each record.additionalAttachments as att}
                <div class="attachment-item">
                  <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="file-info">
                    <div class="file-name">{att.fileName}</div>
                  </div>
                  <button class="btn-preview" on:click={() => loadPreviewById(att.id, att.fileName)} disabled={previewLoading}>
                    {previewLoading ? 'กำลังโหลด...' : 'ดูไฟล์'}
                  </button>
                </div>
              {/each}
            </div>
          {:else if additionalFiles.length === 0}
            <p class="no-attachment-text">ยังไม่มีเอกสารแนบเพิ่มเติม</p>
          {/if}

          {#if canAccessRestricted}
            <input
              type="file"
              id="additional-file-input"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple
              hidden
              on:change={(e) => {
                const picked = Array.from(e.currentTarget.files ?? []).filter(f => /\.(pdf|jpe?g|png)$/i.test(f.name));
                additionalFiles = [...additionalFiles, ...picked];
                additionalUploadError = '';
                e.currentTarget.value = '';
              }}
            />

            {#if additionalFiles.length > 0}
              <div class="attach-ready">
                <div class="attach-ready-files">
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0;color:#6b7280">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span>{additionalFiles.length} ไฟล์พร้อมอัปโหลด</span>
                </div>
                <div class="attach-ready-actions">
                  <button type="button" class="attach-cancel-btn" on:click={() => additionalFiles = []}>ยกเลิก</button>
                  <button type="button" class="attach-upload-btn" disabled={additionalUploading} on:click={uploadAdditionalFiles}>
                    {additionalUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
                  </button>
                </div>
              </div>
            {:else}
              <label
                for="additional-file-input"
                class="upload-placeholder"
                class:drag-over={additionalDragOver}
                on:dragover|preventDefault={() => additionalDragOver = true}
                on:dragleave={() => additionalDragOver = false}
                on:drop={handleAdditionalDrop}
              >
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p>{additionalDragOver ? 'วางไฟล์ที่นี่' : 'คลิกหรือลากเพื่อเพิ่มไฟล์แนบ'}</p>
                <p class="hint">PDF, JPG, PNG · เลือกได้หลายไฟล์</p>
              </label>
            {/if}
            {#if additionalUploadError}
              <p class="attach-upload-error">{additionalUploadError}</p>
            {/if}
          {/if}
        </div>
      </div>
    </div>

    <!-- History — full width -->
    <div class="history-card">
      <h2 class="card-title">ประวัติการแก้ไข</h2>
      {#if historyLoading}
        <div class="empty-history"><p>กำลังโหลด...</p></div>
      {:else if history.length === 0}
        <div class="empty-history"><p>ยังไม่มีประวัติการแก้ไข</p></div>
      {:else}
        <div class="timeline">
          {#each history as h, idx}
            {@const diffFields = getDiffRows(h.before, h.after)}
            {@const isFileOnly = diffFields.length > 0 && diffFields.every(f => f === 'attachmentId')}
            {@const regularFields = diffFields.filter(f => f !== 'attachmentId')}
            {@const attachmentChanged = diffFields.includes('attachmentId')}
            <div class="tl-item">
              <div class="tl-line-wrap">
                <div class="tl-dot {isFileOnly ? 'tl-dot-file' : 'tl-dot-edit'}"></div>
                {#if idx < history.length - 1}<div class="tl-line"></div>{/if}
              </div>
              <div class="tl-body">
                <div class="tl-header">
                  <div class="tl-header-left">
                    <span class="tl-badge {isFileOnly ? 'tl-badge-file' : 'tl-badge-edit'}">{isFileOnly ? 'แก้ไขเอกสาร' : 'แก้ไขข้อมูล'}</span>
                    <span class="tl-user">{h.changedBy || 'ไม่ระบุ'}</span>
                  </div>
                  <span class="tl-time">{new Date(h.createdAt).toLocaleString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                {#if regularFields.length > 0}
                  <div class="tl-changes">
                    {#each regularFields as field}
                      <div class="tl-change-row">
                        <span class="tl-field">{FIELD_LABELS[field]}</span>
                        <div class="tl-diff">
                          <span class="tl-old">{resolveValue(field, h.before?.[field])}</span>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tl-arrow"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          <span class="tl-new">{resolveValue(field, h.after?.[field])}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else if !attachmentChanged}
                  <p class="tl-nochange">ไม่มีการเปลี่ยนแปลง</p>
                {/if}
                {#if attachmentChanged}
                  <div class="tl-attachment">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    <div class="tl-attachment-diff">
                      {#if h.before?.attachmentId}
                        <span class="tl-old">{h.before.attachmentFileName ?? 'ไฟล์เดิม'}</span>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tl-arrow"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                      {/if}
                      <span class="tl-new">{h.after?.attachmentFileName ?? 'ไฟล์ใหม่'}</span>
                    </div>
                    {#if h.after?.attachmentId}
                      <button class="tl-attachment-btn" on:click={() => loadPreviewById(h.after?.attachmentId ?? 0, h.after?.attachmentFileName ?? 'ไฟล์แนบ')} disabled={previewLoading}>
                        ดูไฟล์
                      </button>
                    {/if}
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

<!-- Preview Modal -->
{#if showPreviewModal && previewUrl}
  <div class="modal-backdrop" on:click={() => showPreviewModal = false} role="presentation">
    <div class="modal-box modal-preview" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="modal-header">
        <span class="modal-title">{previewTitle}</span>
        <button class="modal-close" aria-label="ปิด" on:click={() => showPreviewModal = false}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="preview-body">
        {#if previewMimeType.startsWith('image/')}
          <img src={previewUrl} alt={previewTitle} class="preview-image" />
        {:else if previewMimeType === 'application/pdf'}
          <embed src={previewUrl} type="application/pdf" class="preview-iframe" />
        {:else}
          <div class="preview-unsupported">
            <p>ไม่สามารถแสดง preview ได้</p>
            <a href={previewUrl} download={previewTitle} class="btn-primary">
              ดาวน์โหลดไฟล์
            </a>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-backdrop" on:click={() => (showEditModal = false)} role="presentation">
    <div class="modal-box modal-box-lg" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="modal-header">
        <span class="modal-title">แก้ไขข้อมูลเลข อว.</span>
        <button class="modal-close" aria-label="ปิด" on:click={() => (showEditModal = false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="edit-form">
        <div class="form-group">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="form-label">โครงการ</label>
          <Dropdown
            fullWidth
            options={projects.map(p => ({ value: p.id, label: p.projectName }))}
            bind:value={editForm.projectId}
            placeholder="เลือกโครงการ"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-mhesiNumber">เลข อว.</label>
          <input id="edit-mhesiNumber" class="form-input" type="text" bind:value={editForm.mhesiNumber} />
        </div>
        <div class="form-group">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="form-label">ประเภทเอกสาร</label>
          <Dropdown
            fullWidth
            options={ROLE_OPTIONS}
            bind:value={editForm.role}
            placeholder="เลือกประเภท"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-activityName">ชื่อกิจกรรม</label>
          <input id="edit-activityName" class="form-input" type="text" bind:value={editForm.activityName} />
        </div>
        <div class="form-group">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="form-label">วันที่</label>
          <ThaiDatePicker bind:value={editForm.date} inputClass="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-amount">จำนวนเงิน</label>
          <input id="edit-amount" class="form-input" type="text" inputmode="decimal" bind:value={editForm.amount}
            on:input={(e) => { editForm.amount = e.currentTarget.value.replace(/[^0-9.]/g, ''); }} />
        </div>
        <div class="form-group full-col">
          <label class="form-label" for="edit-note">หมายเหตุ</label>
          <textarea id="edit-note" class="form-input form-textarea" bind:value={editForm.note} placeholder="หมายเหตุ (ถ้ามี)"></textarea>
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
    font-weight: 400;
    margin: 0.25rem 0;
    font-family: var(--font-thai);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta-label {
    color: #9ca3af;
    font-weight: 400;
  }

  .code {
    font-size: 1rem;
    color: #6b7280;
    font-weight: 400;
    margin: 0;
    font-family: var(--font-thai);
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

  .btn-primary:hover { background: #e69200; }

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    .content-grid { grid-template-columns: 1fr; }
  }

  /* Cards */
  .detail-card,
  .attachment-card {
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

  /* Right Column */
  .right-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Attachments */
  .upload-placeholder {
    display: block;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 2rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 0.75rem;
  }

  .upload-placeholder:hover,
  .upload-placeholder.drag-over {
    border-color: #ffa200;
    background: #fffbf5;
    border-style: solid;
  }

  .upload-icon {
    width: 2.5rem;
    height: 2.5rem;
    color: #9ca3af;
    margin: 0 auto 0.75rem;
  }

  .upload-placeholder p {
    margin: 0.25rem 0;
    color: var(--color-brand-500);
    font-weight: 500;
    font-size: 0.875rem;
  }

  .hint {
    font-size: 0.75rem !important;
    color: #9ca3af !important;
  }

  .attach-section-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0.875rem 0 0.5rem;
  }

  .attach-ready {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border: 1px solid #d1fae5;
    background: #f0fdf4;
    border-radius: 0.5rem;
    padding: 0.625rem 0.875rem;
    margin-bottom: 0.75rem;
  }

  .attach-ready-files {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #374151;
    overflow: hidden;
  }

  .attach-ready-files span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attach-ready-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .attach-upload-btn {
    background: #ffa200;
    color: white;
    border: none;
    border-radius: 0.5rem;
    padding: 0.4rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .attach-upload-btn:hover:not(:disabled) { background: #e69200; }
  .attach-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .attach-cancel-btn {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    padding: 0.4rem 0.875rem;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .attach-cancel-btn:hover { background: #f9fafb; }

  /* History */
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

  @keyframes spin { to { transform: rotate(360deg); } }

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

  /* Modals */
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

  /* Edit form */
  .edit-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
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

  /* Attachment list */
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
    transition: background 0.15s, border-color 0.15s;
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
    min-width: 0;
  }

  .file-name {
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-preview {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #e5e7eb;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .btn-preview:hover { background: #e5e7eb; }

  .upload-error,
  .attach-upload-error {
    color: #dc2626;
    font-size: 0.8125rem;
    margin-top: 0.5rem;
  }

  .attach-section-header {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .attach-section-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #374151;
    background: #f3f4f6;
    border-radius: 0.375rem;
    padding: 0.2rem 0.625rem;
  }

  .attach-divider {
    border: none;
    border-top: 1px solid #f0f0f0;
    margin: 1.25rem 0 1rem;
  }

  .no-attachment-text {
    font-size: 0.8125rem;
    color: #9ca3af;
    margin: 0 0 0.75rem 0;
  }

  /* Preview modal */
  .modal-preview {
    max-width: min(1200px, 96vw) !important;
    width: 96vw !important;
    max-height: 95vh;
    display: flex;
    flex-direction: column;
  }

  .preview-body {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
  }

  .preview-image {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 0.5rem;
  }

  .preview-iframe {
    width: 100%;
    height: 80vh;
    border: none;
    border-radius: 0.5rem;
  }

  .preview-unsupported {
    text-align: center;
    color: #6b7280;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

.form-textarea {
    min-height: 80px;
    resize: vertical;
  }
</style>