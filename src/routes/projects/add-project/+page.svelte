<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';

  type MasterData = { id: number; name: string };

  const projectTypeOptions = [
    { value: 'โครงการวิจัย', label: 'โครงการวิจัย' },
    { value: 'โครงการบริการวิชาการ', label: 'โครงการบริการวิชาการ' },
    { value: 'โครงการพัฒนานักศึกษา', label: 'โครงการพัฒนานักศึกษา' },
    { value: 'โครงการทำนุบำรุงศิลปวัฒนธรรม', label: 'โครงการทำนุบำรุงศิลปวัฒนธรรม' },
    { value: 'อื่นๆ', label: 'อื่นๆ' },
  ];

  const statusOptions = [
    { value: 'active', label: 'ดำเนินการ' },
    { value: 'completed', label: 'เสร็จสิ้น' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  let acquisitionSources: MasterData[] = [];

  let formData = {
    projectName: '',
    projectType: null as string | null,
    projectDate: '',
    budget: '',
    status: null as string | null,
    acquisitionSourceId: null as number | null,
    note: '',
  };

  let loading = false;
  let showSuccessModal = false;
  let errorMessage = '';
  let errors: Record<string, boolean> = {};

  async function fetchMasterData() {
    try {
      const res = await fetch('http://localhost:3000/api/masters/acquisition-sources');
      if (res.ok) {
        const data = await res.json();
        acquisitionSources = data.data || [];
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  }

  async function handleSubmit() {
    errorMessage = '';
    errors = {};

    if (!formData.projectName.trim()) errors.projectName = true;
    if (!formData.projectType) errors.projectType = true;
    if (!formData.projectDate) errors.projectDate = true;
    if (!formData.budget.trim()) errors.budget = true;
    if (!formData.status) errors.status = true;
    if (!formData.acquisitionSourceId) errors.acquisitionSourceId = true;

    if (Object.keys(errors).length > 0) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      return;
    }

    loading = true;
    try {
      const submitData = {
        projectName: formData.projectName,
        projectType: formData.projectType,
        projectDate: formData.projectDate || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        status: formData.status,
        acquisitionSourceId: formData.acquisitionSourceId || null,
        note: formData.note || null,
      };

      const response = await fetch('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

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

  onMount(fetchMasterData);
</script>

<div class="page-container">
  <div class="content-wrapper">
    <!-- Header -->
    <div class="header">
      <h1 class="text-h2">การเพิ่มโครงการ</h1>
    </div>

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

          <!-- ประเภท -->
          <div class="form-group" class:error-wrapper={errors.projectType}>
            <label class="label">ประเภท <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={projectTypeOptions}
              bind:value={formData.projectType}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- วันที่ -->
          <div class="form-group">
            <label class="label">วันที่ <span class="required">*</span></label>
            <input
              type="date"
              bind:value={formData.projectDate}
              class="input"
              class:input-error={errors.projectDate}
            />
          </div>

          <!-- งบประมาณ -->
          <div class="form-group">
            <label class="label">งบประมาณ <span class="required">*</span></label>
            <input
              type="text"
              inputmode="decimal"
              bind:value={formData.budget}
              on:input={(e) => { formData.budget = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
              class="input"
              class:input-error={errors.budget}
            />
          </div>

          <!-- สถานะ -->
          <div class="form-group" class:error-wrapper={errors.status}>
            <label class="label">สถานะ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={statusOptions}
              bind:value={formData.status}
              placeholder="กรุณาเลือก"
            />
          </div>

          <!-- แหล่งเงินทุน -->
          <div class="form-group" class:error-wrapper={errors.acquisitionSourceId}>
            <label class="label">แหล่งเงินทุน <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
              bind:value={formData.acquisitionSourceId}
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
    </div>
  </div>
{/if}

<style>
  .textarea {
    resize: vertical;
    min-height: 100px;
  }
</style>
