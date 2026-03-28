<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type MasterData = {
    id: number;
    name: string;
  };

  type Project = {
    id: number;
    projectName: string;
    projectNumber?: string;
    projectTypeId?: number | null;
    budget?: number | string | null;
    qtyOrdered?: number | null;
    acquisitionSourceId?: number | null;
    acquisitionMethodId?: number | null;
    fiscalYear?: number | null;
  };

  type MhesiRecord = { uuid: string; mhesiNumber: string; activityName?: string | null; date?: string | null };

  // Master data lists
  let funds: MasterData[] = [];
  let assetTypes: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];
  let acquisitionMethods: MasterData[] = [];
  let projects: Project[] = [];
  let years: number[] = [];

  // ใบตรวจรับ options (loaded per project)
  let mhesiOptions: MhesiRecord[] = [];
  let mhesiLoading = false;

  // Form data
  let formData = {
    projectId: null as number | null,
    mhesiId: null as string | null,
    assetName: '',
    assetCode: '',
    assetNumber: '',
    assetCodeFrom: '',
    assetCodeTo: '',
    padLength: '',
    assetTypeId: null as number | null,
    price: '',
    acquisitionDate: '',
    fiscalYearId: null as number | null,
    activity: '',
    fundId: null as number | null,
    acquisitionSourceId: null as number | null,
    acquisitionMethodId: null as number | null,
    warrantyYears: null as number | null,
    warrantyMonths: null as number | null,
    warrantyAttachmentId: null as number | null,
    unit: '',
    company: '',
    sizeDetail: '',
    buildingId: null as number | null,
    roomId: null as number | null,
    departmentId: null as number | null,
    note: '',
    status: 'available'
  };

  function onProjectChange(pid: number | null) {
    mhesiOptions = [];
    formData.mhesiId = null;
    if (!pid) return;
    const proj = projects.find(p => p.id === pid);
    if (proj) {
      if (proj.projectTypeId != null) formData.assetTypeId = proj.projectTypeId;
      if (proj.fiscalYear != null) formData.fiscalYearId = proj.fiscalYear;
      if (proj.acquisitionSourceId != null) formData.acquisitionSourceId = proj.acquisitionSourceId;
      if (proj.acquisitionMethodId != null) formData.acquisitionMethodId = proj.acquisitionMethodId;
      const budget = proj.budget != null ? parseFloat(String(proj.budget)) : null;
      const qty = proj.qtyOrdered ?? null;
      if (budget !== null && qty && qty > 0) {
        formData.price = String(Math.round((budget / qty) * 100) / 100);
      }
    }
    fetchMhesiOptions(pid);
  }

  async function fetchMhesiOptions(projectId: number) {
    mhesiLoading = true;
    try {
      const res = await apiFetch<{ data: MhesiRecord[] }>(`${API_ENDPOINTS.MHESI}?role=receiving&projectId=${projectId}`);
      mhesiOptions = res.data || [];
    } catch (e) { console.error(e); }
    mhesiLoading = false;
  }

  // Auto-fill acquisitionDate when ใบตรวจรับ changes
  let prevAutoFillMhesiId: string | null = null;
  $: {
    if (formData.mhesiId !== prevAutoFillMhesiId) {
      prevAutoFillMhesiId = formData.mhesiId;
      const mhesi = mhesiOptions.find(m => m.uuid === formData.mhesiId);
      if (mhesi?.date) formData.acquisitionDate = mhesi.date.slice(0, 10);
    }
  }

  let loading = false;
  let showSuccessModal = false;
  let errorMessage = '';
  let errors: Record<string, boolean> = {};
  let attachmentFiles: File[] = [];
  let attachDragOver = false;

  // Warranty attachment
  let warrantyFile: File | null = null;
  let warrantyDragOver = false;

  function handleWarrantyDrop(e: DragEvent) {
    e.preventDefault();
    warrantyDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && /\.(pdf|jpe?g|png)$/i.test(file.name)) warrantyFile = file;
  }

  function addFiles(incoming: File[]) {
    const valid = incoming.filter(f => /\.(pdf|jpe?g|png)$/i.test(f.name));
    if (valid.length > 0) attachmentFiles = [...attachmentFiles, ...valid];
  }

  function handleAttachDrop(e: DragEvent) {
    e.preventDefault();
    attachDragOver = false;
    addFiles(Array.from(e.dataTransfer?.files ?? []));
  }

  const warrantyYearOpts = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1} ปี` }));
  const warrantyMonthOpts = Array.from({ length: 11 }, (_, i) => ({ value: i + 1, label: `${i + 1} เดือน` }));

  // warrantyEnd: acquisitionDate + warrantyYears + warrantyMonths (pure arithmetic, no Date constructor)
  function computeWarrantyEnd(date: string, years: number, months: number): string {
    if (!date || (!years && !months)) return '';
    const parts = date.split('-');
    if (parts.length !== 3) return '';
    let y = parseInt(parts[0]);
    let m = parseInt(parts[1]) - 1; // 0-indexed
    const d = parseInt(parts[2]);
    m += months;
    y += years + Math.floor(m / 12);
    m = ((m % 12) + 12) % 12;
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  $: warrantyEnd = computeWarrantyEnd(
    formData.acquisitionDate,
    formData.warrantyYears ?? 0,
    formData.warrantyMonths ?? 0
  );

  function getFileType(file: File): 'pdf' | 'image' | 'other' {
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'other';
  }

  function removeFile(index: number) {
    attachmentFiles = attachmentFiles.filter((_, i) => i !== index);
  }

  // Fetch all master data
  async function fetchMasterData() {
    try {
      const [fundData, typeData, srcData, methodData, projData] = await Promise.all([
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.FUNDS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ASSET_TYPES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_SOURCES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_METHODS),
        apiFetch<{ data: Project[] }>(API_ENDPOINTS.PROJECTS),
      ]);

      funds = fundData.data || [];
      assetTypes = typeData.data || [];
      acquisitionSources = srcData.data || [];
      acquisitionMethods = methodData.data || [];
      projects = projData.data || [];

      const currentYearBE = new Date().getFullYear() + 543;
      years = Array.from({ length: currentYearBE - 2540 + 1 }, (_, i) => currentYearBE - i);
    } catch (err) {
      console.error('Error fetching master data:', err);
      errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    }
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      addFiles(Array.from(target.files));
      target.value = '';
    }
  }

  // Submit form
  async function handleSubmit() {
    errorMessage = '';
    errors = {};

    if (!formData.projectId) errors.projectId = true;
    if (!formData.assetName.trim()) errors.assetName = true;
    if (!formData.assetCode.trim()) errors.assetCode = true;
    if (!formData.assetNumber.trim()) errors.assetNumber = true;
    if (!formData.assetTypeId) errors.assetTypeId = true;
    if (!formData.price.trim()) errors.price = true;
    if (!formData.acquisitionDate) errors.acquisitionDate = true;
    if (!formData.fiscalYearId) errors.fiscalYearId = true;
    if (!formData.activity.trim()) errors.activity = true;
    if (!formData.fundId) errors.fundId = true;
    if (!formData.acquisitionSourceId) errors.acquisitionSourceId = true;
    if (!formData.acquisitionMethodId) errors.acquisitionMethodId = true;
    if (!formData.unit.trim()) errors.unit = true;
    if (!formData.company.trim()) errors.company = true;
    if (!formData.sizeDetail.trim()) errors.sizeDetail = true;

    if (Object.keys(errors).length > 0) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      return;
    }

    loading = true;

    try {
      // Upload warranty file if selected
      if (warrantyFile) {
        const fd = new FormData();
        fd.append('file', warrantyFile);
        const res = await apiFetch<{ data: { id: number } }>(
          `${API_ENDPOINTS.ATTACHMENTS_UPLOAD}?folder=equipments`,
          { method: 'POST', body: fd }
        );
        formData.warrantyAttachmentId = res.data?.id ?? null;
      }

      // Map frontend field names to backend schema names
      const submitData = {
        equipmentCode: formData.assetCode,
        numberPrefix: formData.assetNumber || '',
        start: formData.assetCodeFrom ? parseInt(formData.assetCodeFrom) : 1,
        end: formData.assetCodeTo ? parseInt(formData.assetCodeTo) : undefined,
        padLength: formData.padLength ? parseInt(formData.padLength) : undefined,
        equipmentName: formData.assetName,
        equipmentTypeId: formData.assetTypeId || null,
        departmentId: formData.departmentId || null,
        activity: formData.activity || null,
        fundId: formData.fundId || null,
        fiscalYear: formData.fiscalYearId || null,
        price: formData.price ? parseFloat(formData.price) : null,
        unit: formData.unit || null,
        acquisitionSourceId: formData.acquisitionSourceId || null,
        acquisitionMethodId: formData.acquisitionMethodId || null,
        acquisitionDate: formData.acquisitionDate || null,
        company: formData.company || null,
        sizeDetail: formData.sizeDetail || null,
        buildingId: formData.buildingId || null,
        roomId: formData.roomId || null,
        projectId: formData.projectId || null,
        receivingMhesiId: formData.mhesiId || null,
        warrantyYears: formData.warrantyYears ?? undefined,
        warrantyMonths: formData.warrantyMonths ?? undefined,
        warrantyEnd: warrantyEnd || undefined,
        warrantyAttachmentId: formData.warrantyAttachmentId || undefined,
        note: formData.note || null,
        status: 'normal',
      };

      const result = await apiFetch<{ data: { uuid: string }[] }>(API_ENDPOINTS.ASSETS, {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      // เปลี่ยนจาก result?.data?.uuids เป็น map uuid ออกมาจาก array
      const uuids = result?.data?.map((item: { uuid: string }) => item.uuid) ?? [];
      console.log('uuids:', uuids);

      if (attachmentFiles.length > 0 && uuids.length > 0) {
        const fd = new FormData();
        fd.append('uuids', JSON.stringify(uuids));
        for (const file of attachmentFiles) {
          fd.append('files', file);
        }
        await apiFetch(API_ENDPOINTS.ASSET_ATTACHMENTS_BULK, { method: 'POST', body: fd });
      }
      // Success
      showSuccessModal = true;

      // Redirect after 1.5 seconds
      setTimeout(() => {
        goto('/equipments');
      }, 1500);

    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      console.error('Error submitting form:', err);
    } finally {
      loading = false;
    }
  }

  // Cancel and go back
  function handleCancel() {
    goto('/equipments');
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
      if (!isNaN(parsed)) {
        formData.projectId = parsed;
        onProjectChange(parsed);
      }
    }
  });
</script>

<div class="page-container">
  <div class="content-wrapper">
    <!-- Header -->


    <!-- Form Card -->
    <div class="form-card">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-grid">
          <!-- โครงการ -->
          <div class="form-group" class:error-wrapper={errors.projectId}>
            <label class="label">โครงการ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={projects.map(p => ({ value: p.id, label: p.projectNumber ? `${p.projectNumber} - ${p.projectName}` : p.projectName }))}
              bind:value={formData.projectId}
              on:change={(e) => onProjectChange(e.detail)}
            />
          </div>

          <!-- ใบตรวจรับ -->
          <div class="form-group">
            <label class="label">ใบตรวจรับ</label>
            <Dropdown
              fullWidth
              options={mhesiOptions.map(m => ({ value: m.uuid, label: m.mhesiNumber + (m.activityName ? ` — ${m.activityName}` : '') }))}
              bind:value={formData.mhesiId}
              placeholder={mhesiLoading ? 'กำลังโหลด...' : 'กรุณาเลือก'}
            />
          </div>

          <!-- ชื่อครุภัณฑ์ -->
          <div class="form-group">
            <label class="label">ชื่อครุภัณฑ์ <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.assetName}
              class="input"
              class:input-error={errors.assetName}
            />
          </div>

          <!-- รหัสครุภัณฑ์ -->
          <div class="form-group">
            <label class="label">รหัสครุภัณฑ์ <span class="required">*</span></label>
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              bind:value={formData.assetCode}
              on:input={(e) => { formData.assetCode = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
              class="input"
              class:input-error={errors.assetCode}
            />
          </div>

          <!-- หมายเลขครุภัณฑ์ -->
          <div class="form-group">
            <label class="label">หมายเลขครุภัณฑ์ <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.assetNumber}
              class="input"
              class:input-error={errors.assetNumber}
            />
            <p class="number-preview">ตัวอย่าง: วท65-343-33-355</p>
          </div>

          <!-- ถึง -->
          <div class="form-group">
            <label class="label">ถึง</label>
            <div class="range-input">
              <input
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                bind:value={formData.assetCodeFrom}
                on:input={(e) => { formData.assetCodeFrom = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
                class="input"
              />
              <span class="range-separator">-</span>
              <input
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                bind:value={formData.assetCodeTo}
                on:input={(e) => { formData.assetCodeTo = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
                class="input"
              />
            </div>
            <p class="number-preview">ตัวอย่าง: ตัวเดียว 0001 หลายตัว 0001-0005</p>
          </div>

          <!-- ประเภท -->
          <div class="form-group" class:error-wrapper={errors.assetTypeId}>
            <label class="label">ประเภท <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={assetTypes.map(t => ({ value: t.id, label: t.name }))}
              bind:value={formData.assetTypeId}
            />
          </div>

          <!-- ราคา -->
          <div class="form-group">
            <label class="label">ราคา <span class="required">*</span></label>
            <input
              type="text"
              inputmode="decimal"
              bind:value={formData.price}
              on:input={(e) => { formData.price = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
              class="input"
              class:input-error={errors.price}
            />
          </div>

          <!-- วันที่ได้มา -->
          <div class="form-group">
            <label class="label">วันที่ได้มา <span class="required">*</span></label>
            <ThaiDatePicker
              bind:value={formData.acquisitionDate}
              error={errors.acquisitionDate}
              inputClass="input"
            />
          </div>

          <!-- ปีงบประมาณ -->
          <div class="form-group" class:error-wrapper={errors.fiscalYearId}>
            <label class="label">ปีงบประมาณ <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={years.map(y => ({ value: y, label: String(y) }))}
              bind:value={formData.fiscalYearId}
            />
          </div>

          <!-- กิจกรรม -->
          <div class="form-group">
            <label class="label">กิจกรรม <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.activity}
              class="input"
              class:input-error={errors.activity}
            />
          </div>

          <!-- กองทุน -->
          <div class="form-group" class:error-wrapper={errors.fundId}>
            <label class="label">กองทุน <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={funds.map(f => ({ value: f.id, label: f.name }))}
              bind:value={formData.fundId}
            />
          </div>

          <!-- ทรัพย์สินได้มาโดย -->
          <div class="form-group" class:error-wrapper={errors.acquisitionSourceId}>
            <label class="label">ทรัพย์สินได้มาโดย <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
              bind:value={formData.acquisitionSourceId}
            />
          </div>

          <!-- วิธีการได้มา -->
          <div class="form-group" class:error-wrapper={errors.acquisitionMethodId}>
            <label class="label">วิธีการได้มา <span class="required">*</span></label>
            <Dropdown
              fullWidth
              options={acquisitionMethods.map(m => ({ value: m.id, label: m.name }))}
              bind:value={formData.acquisitionMethodId}
            />
          </div>

          <!-- ระยะเวลาประกัน -->
          <div class="form-group full-width">
            <label class="label">ระยะเวลาประกัน</label>
            <div class="warranty-period-row">
              <Dropdown
                fullWidth
                options={warrantyYearOpts}
                bind:value={formData.warrantyYears}
                placeholder="ปี"
              />
              <Dropdown
                fullWidth
                options={warrantyMonthOpts}
                bind:value={formData.warrantyMonths}
                placeholder="เดือน"
              />
              {#if warrantyEnd}
                <span class="warranty-end-text">วันสิ้นสุด: {isoToBeDisplay(warrantyEnd)}</span>
              {/if}
            </div>
          </div>

          <!-- หน่วยนับ -->
          <div class="form-group">
            <label class="label">หน่วยนับ <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.unit}
              class="input"
              class:input-error={errors.unit}
            />
          </div>

          <!-- บริษัท -->
          <div class="form-group">
            <label class="label">บริษัท <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.company}
              class="input"
              class:input-error={errors.company}
            />
          </div>

          <!-- ขนาดและลักษณะ -->
          <div class="form-group">
            <label class="label">ขนาดและลักษณะ <span class="required">*</span></label>
            <input
              type="text"
              bind:value={formData.sizeDetail}
              class="input"
              class:input-error={errors.sizeDetail}
            />
          </div>

          <!-- หมายเหตุ -->
          <div class="form-group">
            <label class="label">หมายเหตุ (ถ้ามี)</label>
            <textarea
              bind:value={formData.note}
              class="input textarea"
              rows="3"
            ></textarea>
          </div>

          <!-- เอกสารประกัน + เอกสารแนบเพิ่มเติม -->
          <div class="form-group full-width">
            <div class="doc-row">
              <!-- ซ้าย: เอกสารประกัน -->
              <div class="doc-col">
                <label class="label">เอกสารประกัน</label>
                <div class="file-upload"
                  class:file-upload-dragover={warrantyDragOver}
                  on:dragover|preventDefault={() => warrantyDragOver = true}
                  on:dragleave={() => warrantyDragOver = false}
                  on:drop={handleWarrantyDrop}
                >
                  <label class="file-upload-label">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden
                      on:change={(e) => { warrantyFile = e.currentTarget.files?.[0] ?? null; e.currentTarget.value = ''; }} />
                    <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p class="upload-title">คลิกหรือลากไฟล์มาวาง</p>
                  </label>
                  {#if warrantyFile}
                    <div class="file-list">
                      <div class="file-item">
                        <button class="file-remove" type="button" on:click|preventDefault={() => warrantyFile = null}>✕</button>
                        {#if getFileType(warrantyFile) === 'pdf'}
                          <svg class="file-icon pdf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        {:else if getFileType(warrantyFile) === 'image'}
                          <svg class="file-icon image-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        {:else}
                          <svg class="file-icon other-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        {/if}
                        <span class="file-item-name">{warrantyFile.name}</span>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- ขวา: เอกสารแนบเพิ่มเติม -->
              <div class="doc-col">
                <div class="label-row">
                  <label class="label">เอกสารแนบเพิ่มเติม</label>
                  {#if attachmentFiles.length > 0}
                    <button type="button" class="btn-clear-files" on:click={() => attachmentFiles = []}>ล้างทั้งหมด</button>
                  {/if}
                </div>
                <div class="file-upload"
                  class:file-upload-dragover={attachDragOver}
                  on:dragover|preventDefault={() => attachDragOver = true}
                  on:dragleave={() => attachDragOver = false}
                  on:drop={handleAttachDrop}
                >
                  <label class="file-upload-label">
                    <input type="file" id="file-input" on:change={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" multiple hidden />
                    <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p class="upload-title">คลิกหรือลากไฟล์มาวาง</p>
                  </label>
                  {#if attachmentFiles.length > 0}
                    <div class="file-list">
                      {#each attachmentFiles as file, i}
                        <div class="file-item">
                          <button class="file-remove" type="button" on:click={() => removeFile(i)}>✕</button>
                          {#if getFileType(file) === 'pdf'}
                            <svg class="file-icon pdf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          {:else if getFileType(file) === 'image'}
                            <svg class="file-icon image-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          {:else}
                            <svg class="file-icon other-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          {/if}
                          <span class="file-item-name">{file.name}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
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
          <button
            type="submit"
            class="btn-submit"
            disabled={loading}
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            class="btn-cancel"
            on:click={handleCancel}
            disabled={loading}
          >
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
      <p class="modal-text">เพิ่มครุภัณฑ์เรียบร้อยแล้ว</p>
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

  .file-upload-error {
    border-color: #dc2626 !important;
  }

  .textarea {
    resize: vertical;
    min-height: 80px;
  }

  .range-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .range-input .input {
    flex: 1;
  }

  .range-separator {
    color: #374151;
    font-weight: 500;
    flex-shrink: 0;
  }

  /* Doc row — 2 columns */
  .doc-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: start;
  }

  .doc-col {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .btn-clear-files {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.78rem;
    color: #ef4444;
    padding: 0;
    text-decoration: underline;
  }

  .btn-clear-files:hover {
    color: #b91c1c;
  }

/* File Upload */
  .file-upload {
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    background: #fafafa;
    transition: border-color 0.15s, background 0.15s;
    overflow: hidden;
  }

  .file-upload:hover, .file-upload-dragover {
    border-color: #ffa200;
    background: #fffbf5;
  }

  .file-upload-label {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem 1rem 1.25rem;
  }

  .upload-icon {
    width: 2.25rem;
    height: 2.25rem;
    color: #9ca3af;
  }

  .upload-title {
    font-size: 0.8rem;
    margin: 0;
    color: #6b7280;
  }

  .file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1.25rem 1.25rem;
    justify-content: center;
  }

  .file-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    position: relative;
    width: 72px;
  }

  .file-icon {
    width: 2.5rem;
    height: 2.5rem;
  }

  .pdf-icon { color: #ef4444; }
  .image-icon { color: #3b82f6; }
  .other-icon { color: #6b7280; }

  .file-item-name {
    font-size: 0.65rem;
    color: #374151;
    text-align: center;
    word-break: break-all;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .file-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ef4444;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }
  
  .number-preview {
    font-size: 0.875rem;
    color: #9a9b9c;
    margin-top: 0.25rem;
  }

  .warranty-period-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .warranty-period-row :global(.dropdown-wrapper) {
    flex: 1;
  }

  .warranty-end-text {
    font-size: 0.875rem;
    color: #6b7280;
    white-space: nowrap;
  }


</style>
