<script lang="ts">
  import { onMount } from 'svelte';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';

  const API_URL = 'http://localhost:3000';

  type MasterItem = { id: number; name: string };

  type DepreciationDetail = {
    equipmentNumber: string;
    equipmentName: string;
    acquisitionDate: string;
    usefulAge: number;
    usefulLife: number;
    price: number;
    acquisitionSource: string;
    depreciationPerYear: number;
    accumulatedBefore: number;
    depreciationThisYear: number;
    accumulatedAfter: number;
    bookValueStart: number;
    bookValueEnd: number;
    departmentName: string;
  };

  type DepreciationSummary = {
    totalItems: number;
    periodStart: string;
    periodEnd: string;
    totalPrice: number;
    totalDepreciationPerYear: number;
    totalAccumulatedBefore: number;
    totalDepreciationThisYear: number;
    totalAccumulatedAfter: number;
    totalBookValueStart: number;
    totalBookValueEnd: number;
  };

  // Master data
  let departments: MasterItem[] = [];
  let funds: MasterItem[] = [];
  let equipmentTypes: MasterItem[] = [];
  let acquisitionMethods: MasterItem[] = [];
  let acquisitionSources: MasterItem[] = [];

  // Form
  let startDate = '';
  let endDate = '';
  let departmentId: number | null = null;
  let fundId: number | null = null;
  let equipmentTypeId: number | null = null;
  let fyStart: number | null = null;
  let fyEnd: number | null = null;
  let acquisitionMethodId: number | null = null;
  let acquisitionSourceId: number | null = null;
  let minPrice = '';

  // Results
  let details: DepreciationDetail[] = [];
  let summary: DepreciationSummary | null = null;
  let loading = false;
  let submitted = false;
  let errorMsg = '';
  let errors: Record<string, boolean> = {};

  // Snapshot of filter labels at submit time
  let snapFilters: { label: string; value: string }[] = [];
  let reportDateStr = '';

  const fyOptions = Array.from({ length: 11 }, (_, i) => {
    const be = 2560 + i;
    return { value: be, label: `${be}` };
  });

  $: if (fyStart !== null) {
    const ce = fyStart - 543;
    startDate = `${ce - 1}-10-01`;
  }
  $: if (fyEnd !== null) {
    const ce = fyEnd - 543;
    endDate = `${ce}-09-30`;
  }

  function formatDate(d: string | null) {
    if (!d) return '-';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${parseInt(y) + 543}`;
  }

  function formatDateLong(d: Date) {
    const MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  }

  function fmt(n: number | null | undefined) {
    if (n == null) return '-';
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function label(list: MasterItem[], id: number | null) {
    if (!id) return 'ทั้งหมด';
    return list.find(x => x.id === id)?.name ?? 'ทั้งหมด';
  }

  async function fetchMasterData() {
    try {
      const [deptRes, fundRes, typeRes, methodRes, srcRes] = await Promise.all([
        fetch(`${API_URL}/api/masters/departments`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/funds`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/equipment-types`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/acquisition-methods`, { credentials: 'include' }),
        fetch(`${API_URL}/api/masters/acquisition-sources`, { credentials: 'include' }),
      ]);
      if (deptRes.ok) departments = (await deptRes.json()).data || [];
      if (fundRes.ok) funds = (await fundRes.json()).data || [];
      if (typeRes.ok) equipmentTypes = (await typeRes.json()).data || [];
      if (methodRes.ok) acquisitionMethods = (await methodRes.json()).data || [];
      if (srcRes.ok) acquisitionSources = (await srcRes.json()).data || [];
    } catch (_) {}
  }

  async function handleSubmit() {
    errors = {};
    errorMsg = '';
    if (!startDate) errors.startDate = true;
    if (!endDate) errors.endDate = true;
    if (Object.keys(errors).length > 0) {
      errorMsg = 'กรุณาระบุวันเริ่มต้นและวันสิ้นสุดปีงบประมาณ';
      return;
    }

    loading = true;
    submitted = false;
    details = [];
    summary = null;

    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (departmentId)       params.set('departmentId', String(departmentId));
      if (fundId)             params.set('fundId', String(fundId));
      if (equipmentTypeId)    params.set('equipmentTypeId', String(equipmentTypeId));
      if (acquisitionMethodId) params.set('acquisitionMethodId', String(acquisitionMethodId));
      if (acquisitionSourceId) params.set('acquisitionSourceId', String(acquisitionSourceId));
      if (minPrice.trim())    params.set('minPrice', minPrice.trim());

      const res = await fetch(`${API_URL}/api/reports/depreciation?${params}`, {
        credentials: 'include',
      });

      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        errorMsg = body.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล';
        return;
      }

      const json = await res.json();
      details = json.data?.details || [];
      summary = json.data?.summary || null;

      // Snapshot filter labels
      reportDateStr = formatDateLong(new Date());
      snapFilters = [
        { label: 'วันเริ่มต้นปีงบประมาณ', value: formatDate(startDate) },
        { label: 'วันสิ้นปีงบประมาณ', value: formatDate(endDate) },
        { label: 'หน่วยงาน', value: label(departments, departmentId) },
        { label: 'กองทุน', value: label(funds, fundId) },
        { label: 'ประเภท', value: label(equipmentTypes, equipmentTypeId) },
        { label: 'แหล่งเงินทุน', value: label(acquisitionSources, acquisitionSourceId) },
        { label: 'ปีงบประมาณเริ่มต้น', value: fyStart ? String(fyStart) : 'ทั้งหมด' },
        { label: 'ปีงบประมาณสิ้นสุด', value: fyEnd ? String(fyEnd) : 'ทั้งหมด' },
        { label: 'วิธีการได้มา', value: label(acquisitionMethods, acquisitionMethodId) },
        { label: 'มูลค่าต่ำสุด', value: minPrice.trim() ? `${Number(minPrice).toLocaleString('th-TH')} บาท` : 'ทั้งหมด' },
      ];

      submitted = true;
    } catch (_) {
      errorMsg = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
    } finally {
      loading = false;
    }
  }

  function handleReset() {
    startDate = ''; endDate = '';
    departmentId = null; fundId = null;
    equipmentTypeId = null; fyStart = null; fyEnd = null;
    acquisitionMethodId = null; acquisitionSourceId = null; minPrice = '';
    details = []; summary = null;
    submitted = false; errorMsg = '';
    errors = {};
  }

  onMount(fetchMasterData);
</script>

<div class="page-container">
  <div class="header">
    <h1 class="text-h2">ข้อมูลรายการสินทรัพย์</h1>
  </div>

  <!-- Filter Form -->
  <div class="card">
    <div class="form-grid">
      <div class="field" class:field-error={errors.startDate}>
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">วันเริ่มปีงบประมาณ <span class="req">*</span></label>
        <ThaiDatePicker
          bind:value={startDate}
          error={errors.startDate}
          inputClass="finput"
          on:change={(e) => { if (endDate && e.detail > endDate) endDate = ''; }}
        />
      </div>

      <div class="field" class:field-error={errors.endDate}>
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">วันสิ้นปีงบประมาณ <span class="req">*</span></label>
        <ThaiDatePicker
          bind:value={endDate}
          error={errors.endDate}
          inputClass="finput"
          on:change={(e) => { if (startDate && e.detail < startDate) endDate = startDate; }}
        />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">หน่วยงาน</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...departments.map(d => ({ value: d.id, label: d.name }))]} bind:value={departmentId} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">แหล่งเงินทุน</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...acquisitionSources.map(s => ({ value: s.id, label: s.name }))]} bind:value={acquisitionSourceId} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">กองทุน</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...funds.map(f => ({ value: f.id, label: f.name }))]} bind:value={fundId} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">ประเภท</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...equipmentTypes.map(t => ({ value: t.id, label: t.name }))]} bind:value={equipmentTypeId} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">ปีงบประมาณเริ่มต้น</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...fyOptions]} bind:value={fyStart} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">ปีงบประมาณสิ้นสุด</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...fyOptions]} bind:value={fyEnd} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">วิธีการได้มา</label>
        <Dropdown fullWidth options={[{ value: null, label: 'ทั้งหมด' }, ...acquisitionMethods.map(m => ({ value: m.id, label: m.name }))]} bind:value={acquisitionMethodId} placeholder="ทั้งหมด" />
      </div>

      <div class="field">
        <label class="label" for="minPrice">มูลค่าต่ำสุด</label>
        <input id="minPrice" type="text" inputmode="decimal" class="finput" bind:value={minPrice}
          on:input={(e) => { minPrice = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
          placeholder="0.00" />
      </div>
    </div>

    {#if errorMsg}
      <div class="error-banner">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="flex-shrink:0">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        {errorMsg}
      </div>
    {/if}

    <div class="form-actions">
      <button class="btn-submit" on:click={handleSubmit} disabled={loading}>
        {loading ? 'กำลังโหลด...' : 'ยืนยัน'}
      </button>
      <button class="btn-cancel" on:click={handleReset} disabled={loading}>ยกเลิก</button>
    </div>
  </div>

  <!-- Loading -->
  {#if loading}
    <div class="loading-box">
      <div class="spinner"></div>
      <span>กำลังคำนวณค่าเสื่อม...</span>
    </div>

  <!-- Results -->
  {:else if submitted}
    <div class="report-card">

      <!-- Report Date -->
      <div class="report-date-row">
        <div class="report-date-line"></div>
        <h2 class="report-date-text">รายงานประจำวันที่&nbsp;&nbsp;{reportDateStr}</h2>
        <div class="report-date-line"></div>
      </div>

      <!-- Filter Summary -->
      <div class="filter-summary">
        {#each snapFilters as f}
          <div class="filter-item">
            <span class="filter-label">{f.label} :</span>
            <span class="filter-value">{f.value}</span>
          </div>
        {/each}
      </div>

      <!-- Table -->
      {#if details.length === 0}
        <div class="empty">ไม่พบข้อมูลตามเงื่อนไขที่กำหนด</div>
      {:else}
        <div class="table-scroll">
          <table class="rtable">
            <thead>
              <tr class="thead-top">
                <th rowspan="2">รหัสครุภัณฑ์</th>
                <th rowspan="2">ชื่อครุภัณฑ์</th>
                <th rowspan="2">ว.ด.ป.<br/>ที่ได้มา</th>
                <th rowspan="2" class="num">อายุ<br/>สุทธิ</th>
                <th rowspan="2" class="num">อายุ<br/>ใช้งาน</th>
                <th rowspan="2" class="num">ราคาทุน</th>
                <th rowspan="2">หมวดเงิน</th>
                <th rowspan="2" class="num">ค่าเสื่อม<br/>ราคา/ปี</th>
                <th colspan="3" class="num group-header">ค่าเสื่อมราคาสะสม</th>
                <th rowspan="2" class="num">ราคาตามบัญชี<br/>{formatDate(summary?.periodStart ?? null)}</th>
                <th rowspan="2" class="num">ราคาตามบัญชี<br/>{formatDate(summary?.periodEnd ?? null)}</th>
                <th rowspan="2">หน่วยงาน<br/>รับผิดชอบ</th>
              </tr>
              <tr class="thead-sub">
                <th class="num sub">ยกมา</th>
                <th class="num sub">เดือนนี้</th>
                <th class="num sub">ยกไป</th>
              </tr>
            </thead>
            <tbody>
              {#each details as row, i (row.equipmentNumber + i)}
                <tr class:row-alt={i % 2 === 1}>
                  <td class="mono">{row.equipmentNumber}</td>
                  <td>{row.equipmentName}</td>
                  <td>{formatDate(row.acquisitionDate)}</td>
                  <td class="num">{row.usefulAge?.toFixed(2) ?? '-'}</td>
                  <td class="num">{row.usefulLife ?? '-'}</td>
                  <td class="num">{fmt(row.price)}</td>
                  <td>{row.acquisitionSource || '-'}</td>
                  <td class="num">{fmt(row.depreciationPerYear)}</td>
                  <td class="num">{fmt(row.accumulatedBefore)}</td>
                  <td class="num">{fmt(row.depreciationThisYear)}</td>
                  <td class="num">{fmt(row.accumulatedAfter)}</td>
                  <td class="num">{fmt(row.bookValueStart)}</td>
                  <td class="num highlight-col">{fmt(row.bookValueEnd)}</td>
                  <td>{row.departmentName || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Summary -->
      {#if summary}
        <div class="report-summary">
          <div class="sum-row">
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ราคาทุนรวม</span>
              <span class="sum-val">{fmt(summary.totalPrice)} บาท</span>
            </div>
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ค่าเสื่อมราคาต่อปี</span>
              <span class="sum-val">{fmt(summary.totalDepreciationPerYear)} บาท</span>
            </div>
          </div>
          <div class="sum-row">
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ค่าเสื่อมสะสม (ยกมา)</span>
              <span class="sum-val">{fmt(summary.totalAccumulatedBefore)} บาท</span>
            </div>
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ค่าเสื่อมสะสม (เดือนนี้)</span>
              <span class="sum-val">{fmt(summary.totalDepreciationThisYear)} บาท</span>
            </div>
          </div>
          <div class="sum-row">
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ค่าเสื่อมสะสม (ยกไป)</span>
              <span class="sum-val">{fmt(summary.totalAccumulatedAfter)} บาท</span>
            </div>
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ค่าเสื่อมราคาตามบัญชี [{formatDate(summary.periodStart)}]</span>
              <span class="sum-val">{fmt(summary.totalBookValueStart)} บาท</span>
            </div>
          </div>
          <div class="sum-row">
            <div class="sum-entry">
              <span class="sum-label">ยอดรวม ค่าเสื่อมราคาตามบัญชี [{formatDate(summary.periodEnd)}]</span>
              <span class="sum-val highlight-text">{fmt(summary.totalBookValueEnd)} บาท</span>
            </div>
          </div>
        </div>
      {/if}

    </div>
  {/if}
</div>

<style>
  .card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    margin-bottom: 1.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }

  .field { display: flex; flex-direction: column; gap: 0.375rem; }
  .label { font-size: 0.8125rem; font-weight: 500; color: #374151; }
  .req { color: #dc2626; }

  :global(.finput) {
    padding: 0.625rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: #111827;
    background: white;
    width: 100%;
    box-sizing: border-box;
    font-family: var(--font-thai);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  :global(.finput:focus) {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255,162,0,0.1);
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    margin-top: 1rem;
    color: #dc2626;
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    justify-content: center;
  }

  .btn-submit {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.625rem 2.5rem;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-thai);
    transition: background 0.2s;
  }
  .btn-submit:hover:not(:disabled) { background: #e69100; }
  .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.625rem 2rem;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    font-family: var(--font-thai);
    transition: background 0.2s;
  }
  .btn-cancel:hover:not(:disabled) { background: #f9fafb; }
  .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Loading */
  .loading-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: white;
    border-radius: 0.75rem;
    padding: 3rem;
    color: #6b7280;
    font-size: 0.875rem;
  }
  .spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 3px solid #f3f4f6;
    border-top-color: #ffa200;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ─── Report Card ─────────────────────────────── */
  .report-card {
    background: white;
    border-radius: 0.875rem;
    padding: 2rem 2.5rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
  }

  /* Report date header */
  .report-date-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.75rem;
  }
  .report-date-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, #e5e7eb);
  }
  .report-date-row .report-date-line:last-child {
    background: linear-gradient(to left, transparent, #e5e7eb);
  }
  .report-date-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  /* Filter summary */
  .filter-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.375rem 2rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.625rem;
    padding: 1rem 1.5rem;
    margin-bottom: 1.75rem;
    font-size: 0.8125rem;
  }
  .filter-item { display: flex; gap: 0.375rem; align-items: baseline; }
  .filter-label { color: #6b7280; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
  .filter-value { color: #111827; font-weight: 600; }

  /* Table */
  .table-scroll { overflow-x: auto; margin-bottom: 1.75rem; }

  .rtable {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    min-width: 1300px;
  }

  .rtable th {
    background: #1f2937;
    color: #f9fafb;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.625rem 0.75rem;
    text-align: left;
    white-space: nowrap;
    border: 1px solid #374151;
    line-height: 1.4;
  }

  .rtable th.num { text-align: right; }
  .rtable th.group-header { text-align: center; background: #374151; }
  .rtable th.sub { background: #4b5563; font-size: 0.68rem; }

  .rtable td {
    padding: 0.5rem 0.75rem;
    color: #1f2937;
    border: 1px solid #e5e7eb;
    white-space: nowrap;
    font-size: 0.8rem;
  }

  .rtable td.num { text-align: right; }
  .row-alt td { background: #f8fafc; }
  .rtable tbody tr:hover td { background: #fffbf0; }

  .mono { font-size: 0.75rem; color: #374151; }
  .highlight-col { font-weight: 700; color: #b45309; }

  /* Summary */
  .report-summary {
    border-top: 2px solid #f3f4f6;
    padding-top: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .sum-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.625rem;
  }

  .sum-entry {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    background: #f9fafb;
    border-radius: 0.375rem;
    padding: 0.5rem 0.875rem;
  }

  .sum-label {
    font-size: 0.8125rem;
    color: #6b7280;
    font-weight: 500;
    flex: 1;
  }

  .sum-val {
    font-size: 0.875rem;
    font-weight: 700;
    color: #1f2937;
    white-space: nowrap;
  }

  .highlight-text { color: #b45309; }

  .empty {
    text-align: center;
    padding: 3rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }
</style>
