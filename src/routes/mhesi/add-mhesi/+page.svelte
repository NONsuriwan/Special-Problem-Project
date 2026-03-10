<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';

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
    mhesiId: null as number | null,
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

    if (!formData.mhesiId) errors.mhesiId = true;
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
      const selectedMhesi = mhesiOptions.find(m => m.id === formData.mhesiId);
      const submitData = {
        mhesiNumber: selectedMhesi?.mhesiNumber || '',
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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
          <div class="form-group full-width" class:error-wrapper={errors.mhesiId}>
            <label class="label">เลข อว. <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={mhesiOptions.map(m => ({ value: m.id, label: m.mhesiNumber }))}
              bind:value={formData.mhesiId}
              placeholder="กรุณาเลือก"
            />
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
            <input
              type="date"
              bind:value={formData.date}
              class="input"
              class:input-error={errors.date}
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
  .input-readonly {
    background: #f9fafb;
    color: #6b7280;
    cursor: default;
  }

  .input-readonly:focus {
    border-color: #d1d5db;
    box-shadow: none;
  }
</style>
