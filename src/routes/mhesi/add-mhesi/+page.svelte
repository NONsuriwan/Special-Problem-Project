<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type Project = { id: number; projectName: string; projectNumber?: string; budget?: number | string | null };
  type MhesiOption = { mhesiNumber: string; activityName?: string; taken: boolean };

  const roleOptions = [
    { value: 'planning',     label: 'การวางแผน (Planning)' },
    { value: 'procurement',  label: 'การจัดซื้อจัดจ้าง (Procurement)' },
    { value: 'contract',     label: 'การทำสัญญา (Contract)' },
    { value: 'receiving',    label: 'การรับสินค้า (Receiving)' },
    { value: 'other',        label: 'อื่นๆ (Other)' },
  ];

  // Master data lists
  let allVirtualOptions: MhesiOption[] = [];
  let projects: Project[] = [];

  // Form data
  let formData = {
    mhesiNumber: '',
    projectId: null as number | null,
    role: null as string | null,
    activityName: '',
    date: '',
    amount: '',
    note: '',
  };

  let loading = false;
  let showSuccessModal = false;
  let errorMessage = '';
  let errors: Record<string, boolean> = {};

  let mhesiFile: File | null = null;
  let mhesiDragOver = false;

  function handleMhesiDrop(e: DragEvent) {
    e.preventDefault();
    mhesiDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && /\.(pdf|jpe?g|png)$/i.test(file.name)) mhesiFile = file;
  }

  // Combobox state
  let mhesiOpen = false;
  let mhesiInputEl: HTMLInputElement;

  // Auto-fill amount from selected project's budget (only when projectId changes)
  let prevAutoFillProjectId: number | null = null;
  $: {
    if (formData.projectId !== prevAutoFillProjectId) {
      prevAutoFillProjectId = formData.projectId;
      const proj = projects.find(p => p.id === formData.projectId);
      if (proj?.budget != null) formData.amount = String(proj.budget);
    }
  }

  $: selectedProjectBudget = (() => {
    if (!formData.projectId) return null;
    const proj = projects.find(p => p.id === formData.projectId);
    return proj?.budget != null ? parseFloat(String(proj.budget)) : null;
  })();

  $: budgetExceeded =
    selectedProjectBudget != null &&
    !!formData.amount &&
    parseFloat(formData.amount) > selectedProjectBudget;

  function formatBudget(n: number | null) {
    if (n == null) return '';
    return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  $: mhesiFiltered = (() => {
    const query = formData.mhesiNumber.toLowerCase();
    const filtered = allVirtualOptions.filter(o =>
      o.mhesiNumber.toLowerCase().includes(query)
    );
    return filtered.slice(0, 100);
  })();

  function selectMhesi(opt: MhesiOption) {
    if (opt.taken) return;
    formData.mhesiNumber = opt.mhesiNumber;
    mhesiOpen = false;
  }

  function onMhesiBlur() {
    setTimeout(() => { mhesiOpen = false; }, 150);
  }

  async function fetchMasterData() {
    try {
      const [mhesiData, projectsData] = await Promise.all([
        apiFetch<{ data: { mhesiNumber: string; activityName?: string }[] }>(API_ENDPOINTS.MHESI),
        apiFetch<{ data: Project[] }>(API_ENDPOINTS.PROJECTS),
      ]);

      if (mhesiData) {
        const apiItems = mhesiData.data || [];

        // เก็บเฉพาะ อว 7008.01/XXXX ที่มีในฐานข้อมูล
        const takenMap = new Map<string, string>();
        for (const item of apiItems) {
          if (/^อว 7008\.01\/\d{4}$/.test(item.mhesiNumber)) {
            takenMap.set(item.mhesiNumber, item.activityName ?? '');
          }
        }

        // สร้าง virtual list 0001-9999
        allVirtualOptions = Array.from({ length: 9999 }, (_, i) => {
          const num = `อว 7008.01/${String(i + 1).padStart(4, '0')}`;
          return {
            mhesiNumber: num,
            activityName: takenMap.get(num),
            taken: takenMap.has(num),
          };
        });
      }

      projects = projectsData.data || [];
    } catch (err) {
      console.error('Error fetching master data:', err);
      errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    }
  }

  async function handleSubmit() {
    errorMessage = '';
    errors = {};

    if (!formData.projectId) errors.projectId = true;
    if (!formData.mhesiNumber.trim()) errors.mhesiNumber = true;
    if (!formData.role) errors.role = true;
    if (!formData.activityName.trim()) errors.activityName = true;
    if (!formData.date) errors.date = true;
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) < 0) errors.amount = true;

    if (Object.keys(errors).length > 0) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      return;
    }

    loading = true;
    try {
      let attachmentId: number | null = null;
      if (mhesiFile) {
        const fd = new FormData();
        fd.append('file', mhesiFile);
        const uploaded = await apiFetch<{ data: { id: number } }>(`${API_ENDPOINTS.ATTACHMENTS_UPLOAD}?folder=mhesi`, { method: 'POST', body: fd });
        attachmentId = uploaded.data?.id ?? null;
      }

      const submitData: Record<string, unknown> = {
        mhesiNumber: formData.mhesiNumber.trim(),
        faculty: 'วิทยาศาสตร์',
        departmentId: 1,
        planId: 3,
        projectId: formData.projectId,
        role: formData.role || null,
        activityName: formData.activityName || null,
        date: formData.date || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        note: formData.note || null,
      };
      if (attachmentId !== null) submitData.attachmentId = attachmentId;

      await apiFetch(API_ENDPOINTS.MHESI, {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      showSuccessModal = true;
      setTimeout(() => goto('/mhesi'), 1500);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    goto('/mhesi');
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

  onMount(async () => {
    await fetchMasterData();
    const qProjectId = $page.url.searchParams.get('projectId');
    if (qProjectId) {
      const parsed = parseInt(qProjectId);
      if (!isNaN(parsed)) formData.projectId = parsed;
    }
  });
</script>

<div class="page-container">
  <div class="content-wrapper">
    <!-- Form Card -->
    <div class="form-card">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-grid">

          <!-- โครงการ -->
          <div class="form-group" class:error-wrapper={errors.projectId}>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">โครงการ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={projects.map(p => ({ value: p.id, label: p.projectNumber ? `${p.projectNumber} - ${p.projectName}` : p.projectName }))}
              bind:value={formData.projectId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- เลข อว. -->
          <div class="form-group" class:error-wrapper={errors.mhesiNumber}>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">เลข อว. <span class="required">*</span></label>
            <div class="combobox-wrapper">
              <input
                bind:this={mhesiInputEl}
                type="text"
                bind:value={formData.mhesiNumber}
                class="input combobox-input"
                class:input-error={errors.mhesiNumber}
                placeholder="กรอกหรือเลือกเลข อว."
                autocomplete="off"
                on:focus={() => (mhesiOpen = true)}
                on:input={() => (mhesiOpen = true)}
                on:blur={onMhesiBlur}
              />
              <button
                type="button"
                class="combobox-chevron"
                aria-label="เปิด/ปิดตัวเลือก"
                tabindex="-1"
                on:mousedown|preventDefault={() => {
                  mhesiOpen = !mhesiOpen;
                  mhesiInputEl.focus();
                }}
              >
                <span class="chevron-icon" class:open={mhesiOpen}></span>
              </button>
              {#if mhesiOpen && mhesiFiltered.length > 0}
                <ul class="combobox-list">
                  {#each mhesiFiltered as opt (opt.mhesiNumber)}
                    <li>
                      <button
                        type="button"
                        class="combobox-option"
                        class:selected={formData.mhesiNumber === opt.mhesiNumber}
                        class:taken={opt.taken}
                        on:mousedown|preventDefault={() => selectMhesi(opt)}
                      >
                        <span class="option-number">{opt.mhesiNumber}</span>
                        {#if opt.activityName}
                          <span class="option-activity">{opt.activityName}</span>
                        {/if}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>

          <!-- ประเภทเอกสาร -->
          <div class="form-group" class:error-wrapper={errors.role}>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">ประเภทเอกสาร <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={roleOptions}
              bind:value={formData.role}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- ชื่อกิจกรรม -->
          <div class="form-group">
            <label class="label" for="add-mhesi-activityName">ชื่อกิจกรรม <span class="required">*</span></label>
            <input
              id="add-mhesi-activityName"
              type="text"
              bind:value={formData.activityName}
              class="input"
              class:input-error={errors.activityName}
            />
          </div>

          <!-- วันที่ -->
          <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">วันที่ <span class="required">*</span></label>
            <ThaiDatePicker
              bind:value={formData.date}
              error={errors.date}
              inputClass="input"
            />
          </div>

          <!-- จำนวนเงิน -->
          <div class="form-group">
            <label class="label" for="add-mhesi-amount">จำนวนเงิน <span class="required">*</span></label>
            <input
              id="add-mhesi-amount"
              type="text"
              inputmode="decimal"
              bind:value={formData.amount}
              on:input={(e) => { formData.amount = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
              class="input"
              class:input-error={errors.amount}
            />
            {#if budgetExceeded}
              <p class="budget-warning">⚠ ค่าใช้จ่ายเกินงบประมาณโครงการ ({formatBudget(selectedProjectBudget)} บาท)</p>
            {/if}
          </div>

          <!-- หมายเหตุ -->
          <div class="form-group form-group-stretch">
            <label class="label" for="add-mhesi-note">หมายเหตุ (ถ้ามี)</label>
            <textarea
              id="add-mhesi-note"
              bind:value={formData.note}
              class="input textarea textarea-stretch"
            ></textarea>
          </div>

          <!-- เอกสารแนบ -->
          <div class="form-group form-group-stretch">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">เอกสารแนบ</label>
            {#if mhesiFile}
              <div class="file-selected-row">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:#ffa200;flex-shrink:0">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                <span class="file-selected-name">{mhesiFile.name}</span>
                <button type="button" class="file-remove-btn" aria-label="ลบไฟล์" on:click={() => mhesiFile = null}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            {:else}
              <label
                class="file-dropzone"
                class:file-dropzone-over={mhesiDragOver}
                on:dragover|preventDefault={() => mhesiDragOver = true}
                on:dragleave={() => mhesiDragOver = false}
                on:drop={handleMhesiDrop}
              >
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" style="display:none"
                  on:change={(e) => { mhesiFile = e.currentTarget.files?.[0] ?? null; }} />
                <svg class="dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p class="dropzone-text">คลิกหรือลากไฟล์เพื่อเพิ่มไฟล์แนบ</p>
                <p class="dropzone-hint">PDF, JPG, PNG</p>
              </label>
            {/if}
          </div>

        </div>

        <!-- Error Message -->
        {#if errorMessage}
          <div class="error-banner">
            <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        {/if}

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="submit" class="btn-submit" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
          </button>
          <button type="button" class="btn-cancel" on:click={handleCancel} disabled={loading}>
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Success Modal -->
{#if showSuccessModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="success-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 class="modal-title">บันทึกสำเร็จ</h3>
      <p class="modal-text">เพิ่มเลข อว. เรียบร้อยแล้ว</p>
    </div>
  </div>
{/if}

<style>
  .budget-warning {
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    color: #d97706;
    font-weight: 500;
  }

  .textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-group-stretch {
    display: flex;
    flex-direction: column;
  }

  .textarea-stretch {
    flex: 1;
    resize: none;
    min-height: 120px;
  }

  .form-group-stretch .file-dropzone {
    flex: 1;
  }


  /* Combobox */
  .combobox-wrapper {
    position: relative;
  }

  .combobox-input {
    width: 100%;
    padding-right: 2.5rem;
  }

  .combobox-input:focus {
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.1);
    outline: none;
  }

  .combobox-chevron {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: #374151;
    display: flex;
    align-items: center;
    pointer-events: auto;
  }

  .chevron-icon {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid currentColor;
    transition: transform 0.3s ease;
  }

  .chevron-icon.open {
    transform: rotate(180deg);
  }

  .combobox-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 50;
    max-height: 200px;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .combobox-option {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 8px 12px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .combobox-option:hover {
    background: #f3f4f6;
  }

  .combobox-option.selected {
    background: #fef3f2;
    color: #ffa200;
    font-weight: 500;
  }

  /* taken = ใช้ไปแล้ว */
  .combobox-option.taken {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .combobox-option.taken:hover {
    background: none;
  }

  .option-number {
    flex-shrink: 0;
    font-weight: 500;
  }

  .option-activity {
    color: #9ca3af;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;  
  }
  .file-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    border: 2px dashed #d1d5db;
    border-radius: 0.625rem;
    padding: 1.75rem 1rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    background: #fafafa;
  }

  .file-dropzone:hover,
  .file-dropzone-over {
    border-color: #ffa200;
    background: #fffbf2;
  }

  .dropzone-icon {
    width: 36px;
    height: 36px;
    color: #9ca3af;
  }

  .dropzone-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: #ffa200;
    margin: 0;
  }

  .dropzone-hint {
    font-size: 0.78rem;
    color: #9ca3af;
    margin: 0;
  }

  .file-selected-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.6rem 0.875rem;
  }

  .file-selected-name {
    flex: 1;
    font-size: 0.875rem;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-remove-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    padding: 0.125rem;
    display: flex;
    align-items: center;
    border-radius: 0.25rem;
    transition: color 0.15s;
  }

  .file-remove-btn:hover { color: #ef4444; }
</style>