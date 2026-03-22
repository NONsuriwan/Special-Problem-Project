<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
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
    departmentId: number | null;
    supportUnitId: number | null;
    planId: number | null;
    projectId: number | null;
    activityName: string | null;
    date: string | null;
    amount: string | number | null;
    note: string | null;
    attachmentId: number | null;
    attachment?: { id: number; fileName: string; filePath: string } | null;
    createdAt: string;
    updatedAt: string;
  };

  type MasterData = { id: number; name: string };
  type Project = { id: number; projectName: string };
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
          supportUnitId: record.supportUnitId,
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
      await fetchAll();
    } catch (e) {
      directUploadError = e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ';
    } finally {
      directUploading = false;
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

  let departments: MasterData[] = [];
  let supportUnits: MasterData[] = [];
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
    activityName: 'กิจกรรม',
    projectId:    'โครงการ',
    supportUnitId:'ส่วนสนับสนุน',
    planId:       'แผนงาน',
    date:         'วันที่',
    amount:       'จำนวนเงิน',
    note:         'หมายเหตุ',
  };

  function resolveValue(field: string, val: any): string {
    if (val === null || val === undefined || val === '') return '-';
    if (field === 'projectId')    return projects.find(p => p.id === val)?.projectName ?? String(val);
    if (field === 'supportUnitId')return supportUnits.find(s => s.id === val)?.name ?? String(val);
    if (field === 'planId')       return plans.find(p => p.id === val)?.name ?? String(val);
    if (field === 'date')         return formatDate(val);
    if (field === 'amount')       return formatCurrency(val);
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
  let editAttachmentFile: File | null = null;
  let editForm = {
    mhesiNumber: '',
    supportUnitId: null as number | null,
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
      const [recData, deptData, supportData, planData, projectData] = await Promise.all([
        apiFetch<{ data: MhesiRecord }>(API_ENDPOINTS.MHESI_DETAIL(uuid)),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.SUPPORT_UNITS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.PLAN_SECTIONS),
        apiFetch<{ data: Project[] }>(API_ENDPOINTS.PROJECTS),
      ]);

      record = recData.data ?? null;
      if (!record) error = 'ไม่พบข้อมูลเลข อว.';

      // fetch attachment info ถ้ามี
      if (record?.attachmentId) {
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
      supportUnits = supportData.data || [];
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

  function getSupportUnitName(id: number | null) {
    if (!id) return '-';
    return supportUnits.find(s => s.id === id)?.name || '-';
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

  function openEditModal() {
    if (!record) return;
    editForm = {
      mhesiNumber: record.mhesiNumber,
      supportUnitId: record.supportUnitId,
      planId: record.planId,
      projectId: record.projectId,
      activityName: record.activityName || '',
      date: record.date ? record.date.slice(0, 10) : '',
      amount: record.amount ? String(record.amount) : '',
      note: record.note || '',
    };
    editError = '';
    showEditModal = true;
  }

  async function saveEdit() {
    if (!record) return;
    editSaving = true;
    editError = '';
    try {
      let attachmentId: number | null = null;
      if (editAttachmentFile) {
        const fd = new FormData();
        fd.append('file', editAttachmentFile);
        const uploaded = await apiFetch<{ data: { id: number } }>(`${API_ENDPOINTS.ATTACHMENTS_UPLOAD}?folder=mhesi`, { method: 'POST', body: fd });
        attachmentId = uploaded.data?.id ?? null;
      }

      const payload: Record<string, unknown> = {
        mhesiNumber: editForm.mhesiNumber.trim(),
        supportUnitId: editForm.supportUnitId,
        planId: editForm.planId,
        projectId: editForm.projectId,
        activityName: editForm.activityName || null,
        date: editForm.date || null,
        amount: editForm.amount ? parseFloat(editForm.amount) : null,
        note: editForm.note || null,
      };
      if (attachmentId !== null) payload.attachmentId = attachmentId;

      await apiFetch(API_ENDPOINTS.MHESI_DETAIL(uuid), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      editAttachmentFile = null;
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
      <div class="header-actions">
        <button class="btn-primary" on:click={openEditModal}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          แก้ไขข้อมูล
        </button>
      </div>
    </div>

    <div class="content-grid">
      <!-- Left Column: Details -->
      <div class="detail-card">
        <h2 class="card-title">ข้อมูลทั่วไป</h2>

        <div class="detail-grid">
          <!-- Row 1: เลข อว. | คณะ -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="clipboard-list" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">เลข อว.</div>
              <div class="detail-value">{record.mhesiNumber}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="academic-cap" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">คณะ</div>
              <div class="detail-value">{getDepartmentName(record.departmentId)}</div>
            </div>
          </div>

          <!-- Row 2: ส่วนสนับสนุน | แผนงาน -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="building" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">ส่วนสนับสนุน</div>
              <div class="detail-value">{getSupportUnitName(record.supportUnitId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="chart-bar" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">แผนงาน</div>
              <div class="detail-value">{getPlanName(record.planId)}</div>
            </div>
          </div>

          <!-- Row 3: โครงการ | กิจกรรม -->
          <div class="detail-item">
            <div class="detail-icon"><Icon name="folder" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">โครงการ</div>
              <div class="detail-value">{getProjectName(record.projectId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon"><Icon name="flag" size={24} /></div>
            <div class="detail-content">
              <div class="detail-label">กิจกรรม</div>
              <div class="detail-value detail-value--wrap">{record.activityName || '-'}</div>
            </div>
          </div>

          <!-- Row 4: วันที่ | จำนวนเงิน -->
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

          <!-- Row 5: หมายเหตุ full width -->
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
          <h2 class="card-title">เอกสารแนบ</h2>
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

            <!-- เปลี่ยนไฟล์ -->
            <div class="direct-upload-row">
              <label class="direct-upload-label">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  hidden
                  on:change={(e) => { directUploadFile = e.currentTarget.files?.[0] ?? null; directUploadError = ''; }}
                />
                {directUploadFile ? directUploadFile.name : 'เลือกไฟล์ใหม่เพื่อเปลี่ยน'}
              </label>
              {#if directUploadFile}
                <button class="btn-upload" on:click={uploadDirectFile} disabled={directUploading}>
                  {directUploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนไฟล์'}
                </button>
              {/if}
            </div>
            {#if directUploadError}
              <p class="upload-error">{directUploadError}</p>
            {/if}

          {:else}
            <!-- ยังไม่มีไฟล์ — อัปโหลดได้เลย -->
            <div class="direct-upload-empty">
              <label class="upload-placeholder" style="cursor:pointer; display:block;">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  hidden
                  on:change={(e) => { directUploadFile = e.currentTarget.files?.[0] ?? null; directUploadError = ''; }}
                />
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p>{directUploadFile ? directUploadFile.name : 'คลิกเพื่ออัปโหลดไฟล์'}</p>
                <p class="hint">jpg, png, webp, pdf · สูงสุด 10 MB</p>
              </label>
              {#if directUploadFile}
                <button class="btn-upload-full" on:click={uploadDirectFile} disabled={directUploading}>
                  {directUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
                </button>
              {/if}
              {#if directUploadError}
                <p class="upload-error">{directUploadError}</p>
              {/if}
            </div>
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
                        <span class="tl-field">{FIELD_LABELS[field]}</span>
                        <div class="tl-diff">
                          <span class="tl-old">{resolveValue(field, h.before?.[field])}</span>
                          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tl-arrow"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          <span class="tl-new">{resolveValue(field, h.after?.[field])}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="tl-nochange">ไม่มีการเปลี่ยนแปลง</p>
                {/if}
                {#if h.before?.attachmentId}
                  <div class="tl-attachment">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    <span class="tl-attachment-name">ไฟล์แนบ</span>
                    <button
                      class="tl-attachment-btn"
                      on:click={() => loadPreviewById(h.before?.attachmentId ?? 0, 'ไฟล์แนบ')}
                      disabled={previewLoading}
                    >
                      ดูไฟล์
                    </button>
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
    <div class="modal-box modal-preview" on:click|stopPropagation role="dialog" aria-modal="true">
      <div class="modal-header">
        <span class="modal-title">{previewTitle}</span>
        <button class="modal-close" on:click={() => showPreviewModal = false}>
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
    <div class="modal-box modal-box-lg" on:click|stopPropagation role="dialog" aria-modal="true">
      <div class="modal-header">
        <span class="modal-title">แก้ไขข้อมูลเลข อว.</span>
        <button class="modal-close" on:click={() => (showEditModal = false)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="edit-form">
        <div class="form-group">
          <label class="form-label">เลข อว.</label>
          <input class="form-input" type="text" bind:value={editForm.mhesiNumber} />
        </div>
        <div class="form-group">
          <label class="form-label">กิจกรรม</label>
          <input class="form-input" type="text" bind:value={editForm.activityName} />
        </div>
        <div class="form-group">
          <label class="form-label">โครงการ</label>
          <Dropdown
            fullWidth
            options={projects.map(p => ({ value: p.id, label: p.projectName }))}
            bind:value={editForm.projectId}
            placeholder="เลือกโครงการ"
          />
        </div>
        <div class="form-group">
          <label class="form-label">ส่วนสนับสนุน</label>
          <Dropdown
            fullWidth
            options={supportUnits.map(s => ({ value: s.id, label: s.name }))}
            bind:value={editForm.supportUnitId}
            placeholder="เลือกส่วนสนับสนุน"
          />
        </div>
        <div class="form-group">
          <label class="form-label">แผนงาน</label>
          <Dropdown
            fullWidth
            options={plans.map(p => ({ value: p.id, label: p.name }))}
            bind:value={editForm.planId}
            placeholder="เลือกแผนงาน"
          />
        </div>
        <div class="form-group">
          <label class="form-label">วันที่</label>
          <ThaiDatePicker bind:value={editForm.date} inputClass="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">จำนวนเงิน</label>
          <input class="form-input" type="text" inputmode="decimal" bind:value={editForm.amount}
            on:input={(e) => { editForm.amount = e.currentTarget.value.replace(/[^0-9.]/g, ''); }} />
        </div>
        <div class="form-group full-col">
          <label class="form-label">หมายเหตุ</label>
          <textarea class="form-input form-textarea" bind:value={editForm.note} placeholder="หมายเหตุ (ถ้ามี)"></textarea>
        </div>
        <div class="form-group full-col">
          <label class="form-label">เอกสารแนบ</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            class="form-input"
            on:change={(e) => { editAttachmentFile = e.currentTarget.files?.[0] ?? null; }}
          />
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
    font-weight: 400;
    margin: 0.25rem 0;
    font-family: var(--font-thai);
    display: -webkit-box;
    -webkit-line-clamp: 2;
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
  .empty-state { padding: 2rem; }

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

  .direct-upload-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f3f4f6;
  }

  .direct-upload-label {
    flex: 1;
    font-size: 0.8125rem;
    color: #6b7280;
    border: 1px dashed #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: border-color 0.15s;
  }

  .direct-upload-label:hover { border-color: #ffa200; color: #374151; }

  .btn-upload {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.5rem 0.875rem;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .btn-upload:hover:not(:disabled) { background: #e69200; }
  .btn-upload:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-upload-full {
    width: 100%;
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.75rem;
    transition: background 0.15s;
  }

  .btn-upload-full:hover:not(:disabled) { background: #e69200; }
  .btn-upload-full:disabled { opacity: 0.6; cursor: not-allowed; }

  .direct-upload-empty { display: flex; flex-direction: column; }

  .upload-error {
    color: #dc2626;
    font-size: 0.8125rem;
    margin-top: 0.5rem;
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