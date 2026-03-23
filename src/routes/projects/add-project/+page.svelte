<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type MasterData = { id: number; name: string };

  let assetTypes: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];
  let acquisitionMethods: MasterData[] = [];
  let years: number[] = [];

  let formData = {
    projectName: '',
    projectTypeId: null as number | null,
    projectDate: '',
    fiscalYear: null as number | null,
    budget: '',
    qtyOrdered: '',
    acquisitionSourceId: null as number | null,
    acquisitionMethodId: null as number | null,
    note: '',
  };

  // Auto-fill fiscal year from date: ≤ 30 Sep → same BE year, > 30 Sep → next BE year
  $: if (formData.projectDate) {
    const [y, m, d] = formData.projectDate.split('-').map(Number);
    const beYear = y + 543;
    formData.fiscalYear = (m < 10 || (m === 10 && d === 1)) ? beYear : beYear + 1;
  }

  let loading = false;
  let showSuccessModal = false;
  let createdProjectNumber = '';
  let errorMessage = '';
  let errors: Record<string, boolean> = {};

  async function fetchMasterData() {
    try {
      const [typesData, sourcesData, methodsData] = await Promise.all([
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ASSET_TYPES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_SOURCES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_METHODS),
      ]);
      assetTypes = typesData.data || [];
      acquisitionSources = sourcesData.data || [];
      acquisitionMethods = methodsData.data || [];

      const currentYearBE = new Date().getFullYear() + 543;
      years = Array.from({ length: currentYearBE - 2540 + 1 }, (_, i) => currentYearBE - i);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  async function handleSubmit() {
    errorMessage = '';
    errors = {};

    if (!formData.projectName.trim()) errors.projectName = true;
    if (!formData.projectTypeId) errors.projectTypeId = true;
    if (!formData.projectDate) errors.projectDate = true;
    if (!formData.fiscalYear) errors.fiscalYear = true;
    if (!formData.budget.trim()) errors.budget = true;
    if (!formData.acquisitionSourceId) errors.acquisitionSourceId = true;
    if (!formData.acquisitionMethodId) errors.acquisitionMethodId = true;

    if (Object.keys(errors).length > 0) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      return;
    }

    loading = true;
    try {
      const submitData = {
        projectName: formData.projectName,
        projectTypeId: formData.projectTypeId,
        projectDate: formData.projectDate || null,
        fiscalYear: formData.fiscalYear,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        qtyOrdered: formData.qtyOrdered ? parseInt(formData.qtyOrdered) : null,
        acquisitionSourceId: formData.acquisitionSourceId || null,
        acquisitionMethodId: formData.acquisitionMethodId || null,
        note: formData.note || null,
      };

      const result = await apiFetch<{ data?: { projectNumber?: string }; projectNumber?: string }>(API_ENDPOINTS.PROJECTS, {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      createdProjectNumber = result?.data?.projectNumber ?? result?.projectNumber ?? '';
      showSuccessModal = true;
      setTimeout(() => goto('/projects'), 1500);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    goto('/projects');
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

  onMount(fetchMasterData);
</script>

<div class="page-container">
  <div class="content-wrapper">
    <!-- Form Card -->
    <div class="form-card">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-grid">

          <!-- ชื่อโครงการ -->
          <div class="form-group">
            <label class="label">ชื่อโครงการ <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.projectName}
              class="input"
              class:input-error={errors.projectName}
            />
          </div>

          <!-- ประเภทโครงการ -->
          <div class="form-group" class:error-wrapper={errors.projectTypeId}>
            <label class="label">ประเภทโครงการ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={assetTypes.map(t => ({ value: t.id, label: t.name }))}
              bind:value={formData.projectTypeId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- วันที่ -->
          <div class="form-group">
            <label class="label">วันที่ <span class="required">*</span></label>
            <ThaiDatePicker
              bind:value={formData.projectDate}
              error={errors.projectDate}
              inputClass="input"
            />
          </div>

          <!-- ปีงบประมาณ -->
          <div class="form-group" class:error-wrapper={errors.fiscalYear}>
            <label class="label">ปีงบประมาณ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={years.map(y => ({ value: y, label: String(y) }))}
              bind:value={formData.fiscalYear}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- จำนวนเงิน -->
          <div class="form-group">
            <label class="label">จำนวนเงิน <span class="required">*</span></label>
            <input
              type="text"
              inputmode="decimal"
              bind:value={formData.budget}
              on:input={(e) => { formData.budget = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
              class="input"
              class:input-error={errors.budget}
            />
          </div>

          <!-- จำนวนครุภัณฑ์ -->
          <div class="form-group">
            <label class="label">จำนวนครุภัณฑ์</label>
            <input
              type="text"
              inputmode="numeric"
              bind:value={formData.qtyOrdered}
              on:input={(e) => { formData.qtyOrdered = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
              class="input"
            />
          </div>

          <!-- ทรัพย์สินได้มาโดย -->
          <div class="form-group" class:error-wrapper={errors.acquisitionSourceId}>
            <label class="label">ทรัพย์สินได้มาโดย <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
              bind:value={formData.acquisitionSourceId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- วิธีการได้มา -->
          <div class="form-group" class:error-wrapper={errors.acquisitionMethodId}>
            <label class="label">วิธีการได้มา <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={acquisitionMethods.map(m => ({ value: m.id, label: m.name }))}
              bind:value={formData.acquisitionMethodId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- หมายเหตุ -->
          <div class="form-group full-width">
            <label class="label">หมายเหตุ</label>
            <textarea
              bind:value={formData.note}
              class="input textarea"
              rows="4"
            ></textarea>
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
      <p class="modal-text">เพิ่มโครงการเรียบร้อยแล้ว</p>
      {#if createdProjectNumber}
        <p class="modal-project-number">หมายเลขโครงการ: <strong>{createdProjectNumber}</strong></p>
      {/if}
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

  .textarea {
    resize: vertical;
    min-height: 100px;
  }

  .modal-project-number {
    font-size: 0.875rem;
    color: #374151;
    margin-top: 0.5rem;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.04em;
  }

  .modal-project-number strong {
    color: #ffa200;
    font-size: 1rem;
  }
</style>
