<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';

  type MasterData = { id: number; name: string };
  type Project = { id: number; projectName: string };
  type MhesiOption = { id: number; mhesiNumber: string };

  // Master data lists
  let mhesiOptions: MhesiOption[] = [];
  let supportUnits: MasterData[] = [];
  let plans: MasterData[] = [];
  let projects: Project[] = [];

  // Form data
  let formData = {
    mhesiNumber: '',
    facultyName: 'วิทยาศาสตร์',
    supportUnitId: null as number | null,
    planId: null as number | null,
    projectId: null as number | null,
    activityName: '',
    date: '',
    amount: '',
    note: '',
  };

  let loading = false;
  let showSuccessModal = false;
  let errorMessage = '';
  let errors: Record<string, boolean> = {};

  // Combobox state
  let mhesiOpen = false;
  let mhesiInputEl: HTMLInputElement;

  $: mhesiFiltered = formData.mhesiNumber
    ? mhesiOptions.filter(o => o.mhesiNumber.toLowerCase().includes(formData.mhesiNumber.toLowerCase()))
    : mhesiOptions;

  function selectMhesi(value: string) {
    formData.mhesiNumber = value;
    mhesiOpen = false;
  }

  function onMhesiBlur() {
    setTimeout(() => { mhesiOpen = false; }, 150);
  }

  async function fetchMasterData() {
    try {
      const [mhesiRes, supportUnitsRes, plansRes, projectsRes] = await Promise.all([
        fetch('http://localhost:3000/api/mhesi', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/support-units', { credentials: 'include' }),
        fetch('http://localhost:3000/api/masters/plan-sections', { credentials: 'include' }),
        fetch('http://localhost:3000/api/projects', { credentials: 'include' }),
      ]);

      if (mhesiRes.ok) {
        const data = await mhesiRes.json();
        mhesiOptions = data.data || [];
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
      errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    }
  }

  async function handleSubmit() {
    errorMessage = '';
    errors = {};

    if (!formData.mhesiNumber.trim()) errors.mhesiNumber = true;
    if (!formData.supportUnitId) errors.supportUnitId = true;
    if (!formData.planId) errors.planId = true;
    if (!formData.projectId) errors.projectId = true;
    if (!formData.activityName.trim()) errors.activityName = true;
    if (!formData.date) errors.date = true;

    if (Object.keys(errors).length > 0) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      return;
    }

    loading = true;
    try {
      const submitData = {
        mhesiNumber: formData.mhesiNumber.trim(),
        supportUnitId: formData.supportUnitId,
        planId: formData.planId,
        projectId: formData.projectId,
        activityName: formData.activityName || null,
        date: formData.date || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        note: formData.note || null,
      };

      const response = await fetch('http://localhost:3000/api/mhesi', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      if (response.status === 401) { window.location.href = '/login'; return; }

      const result = await response.json();

      if (!response.ok) {
        throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

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

  onMount(fetchMasterData);
</script>

<div class="page-container">
  <div class="content-wrapper">
    <!-- Header -->
    <div class="header">
      <h1 class="text-h2">การเพิ่มเลข อว.</h1>
    </div>

    <!-- Form Card -->
    <div class="form-card">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-grid">

          <!-- เลข อว. -->
          <div class="form-group full-width">
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
                  {#each mhesiFiltered as opt, i (opt.id ?? i)}
                    <li>
                      <button
                        type="button"
                        class="combobox-option"
                        class:selected={formData.mhesiNumber === opt.mhesiNumber}
                        on:mousedown|preventDefault={() => selectMhesi(opt.mhesiNumber)}
                      >
                        {opt.mhesiNumber}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>

          <!-- คณะ -->
          <div class="form-group">
            <label class="label">คณะ</label>
            <input
              type="text"
              class="input input-readonly"
              value={formData.facultyName}
              readonly
            />
          </div>

          <!-- ส่วนสนับสนุน -->
          <div class="form-group" class:error-wrapper={errors.supportUnitId}>
            <label class="label">ส่วนสนับสนุน <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={supportUnits.map(s => ({ value: s.id, label: s.name }))}
              bind:value={formData.supportUnitId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- แผนงาน -->
          <div class="form-group" class:error-wrapper={errors.planId}>
            <label class="label">แผนงาน <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={plans.map(p => ({ value: p.id, label: p.name }))}
              bind:value={formData.planId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- โครงการ -->
          <div class="form-group" class:error-wrapper={errors.projectId}>
            <label class="label">โครงการ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={projects.map(p => ({ value: p.id, label: p.projectName }))}
              bind:value={formData.projectId}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- กิจกรรม -->
          <div class="form-group">
            <label class="label">กิจกรรม <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.activityName}
              class="input"
              class:input-error={errors.activityName}
            />
          </div>

          <!-- วันที่ -->
          <div class="form-group">
            <label class="label">วันที่ <span class="required">*</span></label>
            <ThaiDatePicker
              bind:value={formData.date}
              error={errors.date}
              inputClass="input"
            />
          </div>

          <!-- จำนวนเงิน -->
          <div class="form-group">
            <label class="label">จำนวนเงิน</label>
            <input
              type="text"
              inputmode="decimal"
              bind:value={formData.amount}
              on:input={(e) => { formData.amount = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
              class="input"
            />
          </div>

          <!-- หมายเหตุ -->
          <div class="form-group">
            <label class="label">หมายเหตุ</label>
            <input
              type="text"
              bind:value={formData.note}
              class="input"
            />
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

  .input-readonly {
    background: #f9fafb;
    color: #6b7280;
    cursor: default;
  }

  .input-readonly:focus {
    border-color: #d1d5db;
    box-shadow: none;
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
  }

  .combobox-option:hover {
    background: #f3f4f6;
  }

  .combobox-option.selected {
    background: #fef3f2;
    color: #ffa200;
    font-weight: 500;
  }
</style>
