<script lang="ts">
  import { onMount } from 'svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import { apiFetch, apiFetchBlob } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type MasterData = { id: number; name: string };

  let departments: MasterData[] = [];
  let departmentId: number | null = null;
  let budgetYear: number | null = null;

  const currentBEYear = new Date().getFullYear() + 543;
  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: currentBEYear - i,
    label: String(currentBEYear - i),
  }));

  let generating = false;
  let generateError = '';
  let pdfUrl: string | null = null;
  let pdfFileName = '';

  async function fetchDepartments() {
    try {
      const res = await apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS);
      departments = res.data || [];
    } catch (e) {
      console.error(e);
    }
  }

  async function generateReport() {
    if (!budgetYear) {
      generateError = 'กรุณาเลือกปีงบประมาณ';
      return;
    }
    generating = true;
    generateError = '';
    try {
      let query = `budgetYear=${budgetYear}`;
      if (departmentId) query += `&departmentId=${departmentId}`;
      const blob = await apiFetchBlob(`${API_ENDPOINTS.REPORTS_SURVEY}?${query}`);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      pdfUrl = URL.createObjectURL(blob);
      pdfFileName = `survey_report_${budgetYear}.pdf`;
    } catch (e) {
      generateError = e instanceof Error ? e.message : 'สร้างรายงานไม่สำเร็จ';
    } finally {
      generating = false;
    }
  }

  onMount(fetchDepartments);
</script>

<div class="page-container">

  <!-- Form card (centered) -->
  <div class="report-card">
    <h2 class="card-title">สร้างรายงานสำรวจครุภัณฑ์</h2>

    <div class="form-grid">
      <div class="form-group">
        <label class="label">หน่วยงาน</label>
        <Dropdown
          fullWidth
          options={[{ value: null, label: 'ทั้งหมด' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
          bind:value={departmentId}
          placeholder="ทั้งหมด"
        />
      </div>

      <div class="form-group">
        <label class="label">ปีงบประมาณ <span class="required">*</span></label>
        <Dropdown
          fullWidth
          options={yearOptions}
          bind:value={budgetYear}
          placeholder="เลือกปีงบประมาณ"
        />
      </div>
    </div>

    {#if generateError}
      <p class="error-text">{generateError}</p>
    {/if}

    <div class="card-footer">
      <button class="btn-generate" on:click={generateReport} disabled={generating}>
        {#if generating}
          <svg class="spin-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          กำลังสร้างรายงาน...
        {:else}
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          สร้างรายงาน
        {/if}
      </button>
    </div>
  </div>

  <!-- PDF viewer -->
  {#if pdfUrl}
    <div class="pdf-card">
      <div class="pdf-header">
        <span class="pdf-title">{pdfFileName}</span>
        <a href={pdfUrl} download={pdfFileName} class="btn-download">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          ดาวน์โหลด
        </a>
      </div>
      <iframe src={pdfUrl} title={pdfFileName} class="pdf-frame"></iframe>
    </div>
  {/if}

</div>

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
  }

  .report-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.75rem 2rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 560px;
  }

  .card-title {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1.25rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .required {
    color: #ef4444;
  }

  .error-text {
    margin: 0.75rem 0 0;
    font-size: 0.8125rem;
    color: #ef4444;
  }

  .card-footer {
    margin-top: 1.25rem;
    display: flex;
    justify-content: center;
  }

  .btn-generate {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.5rem;
    background: #ffa200;
    color: white;
    font-weight: 600;
    font-size: 0.9375rem;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-generate:hover:not(:disabled) {
    background: #e69100;
  }

  .btn-generate:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .spin-icon {
    width: 16px;
    height: 16px;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* PDF viewer */
  .pdf-card {
    background: white;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 900px;
  }

  .pdf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .pdf-title {
    font-weight: 600;
    font-size: 0.9375rem;
    color: #111827;
  }

  .btn-download {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.875rem;
    background: #f3f4f6;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.375rem;
    text-decoration: none;
    transition: background 0.15s;
  }

  .btn-download:hover {
    background: #e5e7eb;
  }

  .pdf-frame {
    width: 100%;
    height: 75vh;
    border: none;
    display: block;
  }
</style>
