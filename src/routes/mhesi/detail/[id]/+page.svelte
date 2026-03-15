<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import SearchableDropdown from '$lib/components/ui/SearchableDropdown.svelte';

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
    createdAt: string;
    updatedAt: string;
  };

  type MasterData = { id: number; name: string };
  type Project = { id: number; projectName: string };

  const API_URL = 'http://localhost:3000';

  let record: MhesiRecord | null = null;
  let loading = true;
  let error = '';

  let departments: MasterData[] = [];
  let supportUnits: MasterData[] = [];
  let plans: MasterData[] = [];
  let projects: Project[] = [];

  // Edit modal
  let showEditModal = false;
  let editSaving = false;
  let editError = '';
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

  $: uuid = $page.params.id;

  async function fetchAll() {
    loading = true;
    error = '';
    try {
      const [recRes, deptRes, supportRes, planRes, projectRes] = await Promise.all([
        fetch(`${API_URL}/api/mhesi/${uuid}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/departments`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/support-units`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/plan-sections`, { credentials: 'include' }),
        fetch(`${API_URL}/api/projects`, { credentials: 'include' }),
      ]);

      if (recRes.status === 401) { window.location.href = '/login'; return; }
      if (recRes.ok) {
        const data = await recRes.json();
        record = data.data ?? data;
      } else {
        error = 'ไม่พบข้อมูลเลข อว.';
      }

      if (deptRes.ok) departments = (await deptRes.json()).data || [];
      if (supportRes.ok) supportUnits = (await supportRes.json()).data || [];
      if (planRes.ok) plans = (await planRes.json()).data || [];
      if (projectRes.ok) projects = (await projectRes.json()).data || [];
    } catch (e) {
      error = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
    } finally {
      loading = false;
    }
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
      const res = await fetch(`${API_URL}/api/mhesi/${uuid}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mhesiNumber: editForm.mhesiNumber.trim(),
          supportUnitId: editForm.supportUnitId,
          planId: editForm.planId,
          projectId: editForm.projectId,
          activityName: editForm.activityName || null,
          date: editForm.date || null,
          amount: editForm.amount ? parseFloat(editForm.amount) : null,
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
            <div class="detail-icon">📋</div>
            <div>
              <div class="detail-label">เลข อว.</div>
              <div class="detail-value">{record.mhesiNumber}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🎓</div>
            <div>
              <div class="detail-label">คณะ</div>
              <div class="detail-value">{getDepartmentName(record.departmentId)}</div>
            </div>
          </div>

          <!-- Row 2: ส่วนสนับสนุน | แผนงาน -->
          <div class="detail-item">
            <div class="detail-icon">🏢</div>
            <div>
              <div class="detail-label">ส่วนสนับสนุน</div>
              <div class="detail-value">{getSupportUnitName(record.supportUnitId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">📊</div>
            <div>
              <div class="detail-label">แผนงาน</div>
              <div class="detail-value">{getPlanName(record.planId)}</div>
            </div>
          </div>

          <!-- Row 3: โครงการ | กิจกรรม -->
          <div class="detail-item">
            <div class="detail-icon">🗂️</div>
            <div>
              <div class="detail-label">โครงการ</div>
              <div class="detail-value">{getProjectName(record.projectId)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">🎯</div>
            <div>
              <div class="detail-label">กิจกรรม</div>
              <div class="detail-value">{record.activityName || '-'}</div>
            </div>
          </div>

          <!-- Row 4: วันที่ | จำนวนเงิน -->
          <div class="detail-item">
            <div class="detail-icon">📅</div>
            <div>
              <div class="detail-label">วันที่</div>
              <div class="detail-value">{formatDate(record.date)}</div>
            </div>
          </div>

          <div class="detail-item">
            <div class="detail-icon">💰</div>
            <div>
              <div class="detail-label">จำนวนเงิน</div>
              <div class="detail-value">{formatCurrency(record.amount)} บาท</div>
            </div>
          </div>

          <!-- Row 5: หมายเหตุ full width -->
          <div class="detail-item full-width">
            <div class="detail-icon">📝</div>
            <div>
              <div class="detail-label">หมายเหตุ</div>
              <div class="detail-value">{record.note || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Attachments -->
      <div class="right-column">
        <div class="attachment-card">
          <h2 class="card-title">เอกสารแนบ</h2>
          <div class="empty-state">
            <div class="upload-placeholder">
              <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p>คลิกเพื่อเพิ่มไฟล์แนบ</p>
              <p class="hint">หรือลากไฟล์มาวางที่นี่</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- History — full width -->
    <div class="history-card">
      <h2 class="card-title">ประวัติการแก้ไข</h2>
      <div class="empty-history"><p>ยังไม่มีประวัติการแก้ไข</p></div>
    </div>
  {/if}
</div>

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
          <SearchableDropdown
            fullWidth
            options={projects.map(p => ({ value: p.id, label: p.projectName }))}
            bind:value={editForm.projectId}
            placeholder="เลือกโครงการ"
          />
        </div>
        <div class="form-group">
          <label class="form-label">ส่วนสนับสนุน</label>
          <SearchableDropdown
            fullWidth
            options={supportUnits.map(s => ({ value: s.id, label: s.name }))}
            bind:value={editForm.supportUnitId}
            placeholder="เลือกส่วนสนับสนุน"
          />
        </div>
        <div class="form-group">
          <label class="form-label">แผนงาน</label>
          <SearchableDropdown
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
    margin-bottom: 0.25rem;
    font-family: var(--font-thai);
  }

  .detail-value {
    font-size: 1rem;
    color: #1f2937;
    font-weight: 500;
    font-family: var(--font-thai);
  }

  .detail-value.highlight {
    color: #ffa200;
    font-weight: 700;
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

  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .history-table th {
    text-align: left;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    padding: 0 1rem 0.75rem;
    white-space: nowrap;
  }

  .history-table td {
    padding: 0.75rem 1rem;
    border-top: 1px solid #f3f4f6;
    color: #1f2937;
    vertical-align: middle;
  }

  .history-table tr:hover td {
    background: #fafafa;
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
    min-height: 80px;
    resize: vertical;
  }
</style>
