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

<div class="reports-wrap">

  <!-- Filter card -->
  <div class="report-card">
    <div class="report-card-top">
      <div class="report-icon-wrap">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <div>
        <h2 class="report-title text-b5">รายงานสำรวจครุภัณฑ์</h2>
        <p class="report-subtitle text-b7">เลือกเงื่อนไขแล้วกดสร้างรายงาน</p>
      </div>
    </div>

    <div class="divider"></div>

    <div class="form-grid">
      <div class="form-group">
        <label class="label text-b7">หน่วยงาน</label>
        <Dropdown
          fullWidth
          options={[{ value: null, label: 'ทั้งหมด' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
          bind:value={departmentId}
          placeholder="ทั้งหมด"
        />
      </div>
      <div class="form-group">
        <label class="label text-b7">ปีงบประมาณ <span class="required">*</span></label>
        <Dropdown
          fullWidth
          options={yearOptions}
          bind:value={budgetYear}
          placeholder="เลือกปีงบประมาณ"
        />
      </div>
    </div>

    {#if generateError}
      <div class="error-banner">
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 20 20" style="flex-shrink:0">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span class="text-b7">{generateError}</span>
      </div>
    {/if}

    <div class="card-footer">
      <button class="btn-generate" on:click={generateReport} disabled={generating}>
        {#if generating}
          <svg class="spin-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          กำลังสร้าง...
        {:else}
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div class="pdf-header-left">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color:#ef4444;flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span class="pdf-title text-b7">{pdfFileName}</span>
        </div>
        <a href={pdfUrl} download={pdfFileName} class="btn-download text-b8">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  .reports-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    font-family: var(--font-thai);
    width: 100%;
  }

  /* ── Filter card ── */
  .report-card {
    background: white;
    border-radius: 1rem;
    padding: 1.75rem 2rem 1.5rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    border: 1px solid #f0f0f0;
    width: 100%;
    max-width: 540px;
  }

  .report-card-top {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-bottom: 1.25rem;
  }

  .report-icon-wrap {
    width: 3rem;
    height: 3rem;
    border-radius: 0.875rem;
    background: #fff8ec;
    color: var(--color-brand-500);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border: 1px solid #ffe0a0;
  }

  .report-title {
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.2rem;
    letter-spacing: -0.01em;
  }

  .report-subtitle {
    color: #9ca3af;
    margin: 0;
    letter-spacing: 0.01em;
  }

  .divider {
    height: 1px;
    background: #f3f4f6;
    margin-bottom: 1.25rem;
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
    font-weight: 500;
    color: #374151;
  }

  .required { color: #ef4444; }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 0.625rem 0.875rem;
    margin-top: 0.875rem;
    color: #dc2626;
  }

  .card-footer {
    margin-top: 1.375rem;
    display: flex;
    justify-content: flex-end;
  }

  .btn-generate {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.575rem 1.375rem;
    background: var(--color-brand-500);
    color: white;
    font-weight: 600;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--color-brand-500) 30%, transparent);
  }

  .btn-generate:hover:not(:disabled) {
    background: #e69100;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-brand-500) 40%, transparent);
  }

  .btn-generate:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .spin-icon {
    width: 15px;
    height: 15px;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── PDF card ── */
  .pdf-card {
    background: white;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    border: 1px solid #f0f0f0;
    width: 100%;
    max-width: 1500px;
  }

  .pdf-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid #f3f4f6;
    background: #fafafa;
  }

  .pdf-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .pdf-title {
    font-weight: 600;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-download {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.875rem;
    background: white;
    color: #374151;
    font-weight: 500;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn-download:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .pdf-frame {
    width: 100%;
    height: 95vh;
    border: none;
    display: block;
  }
</style>
