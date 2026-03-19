<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type MasterData = {
    id: number;
    name: string;
  };

  type Room = MasterData & {
    buildingId: number;
  };

  type Project = { id: number; projectName: string };

  // Master data lists
  let departments: MasterData[] = [];
  let activities: MasterData[] = [];
  let funds: MasterData[] = [];
  let assetTypes: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];
  let acquisitionMethods: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: Room[] = [];
  let projects: Project[] = [];
  let years: number[] = [];

  // Form data
  let formData = {
    assetCode: '',
    assetCodeFrom: '',
    assetCodeTo: '',
    padLength: '',
    activity: '',
    assetName: '',
    assetNumber: '',
    unit: '',
    departmentId: null as number | null,
    assetTypeId: null as number | null,
    fundId: null as number | null,
    fiscalYearId: null as number | null,
    price: '',
    acquisitionSourceId: null as number | null,
    acquisitionMethodId: null as number | null,
    acquisitionDate: '',
    company: '',
    sizeDetail: '',
    buildingId: null as number | null,
    roomId: null as number | null,
    projectId: null as number | null,
    note: '',
    status: 'available'
  };

  let loading = false;
  let showSuccessModal = false;
  let errorMessage = '';
  let errors: Record<string, boolean> = {};
  let attachmentFiles: File[] = [];

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
      const [
        deptData, actData, fundData, typeData, srcData, methodData,
        buildData, roomData, projData
      ] = await Promise.all([
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACTIVITIES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.FUNDS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ASSET_TYPES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_SOURCES),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ACQUISITION_METHODS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.BUILDINGS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ROOMS),
        apiFetch<{ data: Project[] }>(API_ENDPOINTS.PROJECTS),
      ]);

      departments = deptData.data || [];
      activities = actData.data || [];
      funds = fundData.data || [];
      assetTypes = typeData.data || [];
      acquisitionSources = srcData.data || [];
      acquisitionMethods = methodData.data || [];
      buildings = buildData.data || [];
      rooms = roomData.data || [];
      projects = projData.data || [];

      const currentYearBE = new Date().getFullYear() + 543;
      const startYearBE = 2540;

      years = Array.from(
        { length: currentYearBE - startYearBE + 1 },
        (_, i) => currentYearBE - i
      );


        } catch (err) {
          console.error('Error fetching master data:', err);
          errorMessage = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        }
      }

  // Filter rooms by selected building
  $: filteredRooms = formData.buildingId
    ? rooms.filter(r => r.buildingId === formData.buildingId)
    : rooms;

  // Handle file upload
  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const newFiles = Array.from(target.files).filter(
        nf => !attachmentFiles.some(ef => ef.name === nf.name)
      );
      attachmentFiles = [...attachmentFiles, ...newFiles];
      target.value = '';
    }
  }

  // Submit form
  async function handleSubmit() {
    errorMessage = '';
    errors = {};

    if (!formData.departmentId) errors.departmentId = true;
    if (!formData.activity.trim()) errors.activity = true;
    if (!formData.fundId) errors.fundId = true;
    if (!formData.fiscalYearId) errors.fiscalYearId = true;
    if (!formData.assetCode.trim()) errors.assetCode = true;
    if (!formData.assetName.trim()) errors.assetName = true;
    if (!formData.assetNumber.trim()) errors.assetNumber = true;
    if (!formData.assetTypeId) errors.assetTypeId = true;
    if (!formData.price.trim()) errors.price = true;
    if (!formData.unit.trim()) errors.unit = true;
    if (!formData.acquisitionDate) errors.acquisitionDate = true;
    if (!formData.acquisitionSourceId) errors.acquisitionSourceId = true;
    if (!formData.acquisitionMethodId) errors.acquisitionMethodId = true;
    if (!formData.company.trim()) errors.company = true;
    if (!formData.sizeDetail.trim()) errors.sizeDetail = true;
    if (!formData.buildingId) errors.buildingId = true;
    if (!formData.roomId) errors.roomId = true;
    if (!formData.projectId) errors.projectId = true;

    if (Object.keys(errors).length > 0) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง';
      return;
    }

    loading = true;

    try {
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

  onMount(fetchMasterData);
</script>

<div class="page-container">
  <div class="content-wrapper">
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="text-h2">การเพิ่มครุภัณฑ์</h1>
      </div>
    </div>

    <!-- Form Card -->
    <div class="form-card">
      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-grid">
          <!-- หน่วยงาน -->
          <div class="form-group" class:error-wrapper={errors.departmentId}>
            <label class="label">
              หน่วยงาน <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={departments.map(d => ({ value: d.id, label: d.name }))}
              bind:value={formData.departmentId}
            />
          </div>

          <!-- กิจกรรม -->
          <div class="form-group">
            <label class="label">
              กิจกรรม <span class="required">*</span>
            </label>
            <input
              type="text"
              bind:value={formData.activity}
              class="input"
              class:input-error={errors.activity}
            />
          </div>

          <!-- กองทุน -->
          <div class="form-group" class:error-wrapper={errors.fundId}>
            <label class="label">
              กองทุน <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={funds.map(f => ({ value: f.id, label: f.name }))}
              bind:value={formData.fundId}
            />
          </div>

          <!-- ปีงบประมาณ -->
          <div class="form-group" class:error-wrapper={errors.fiscalYearId}>
            <label class="label">
              ปีงบประมาณ <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={years.map(y => ({ value: y, label: String(y) }))}
              bind:value={formData.fiscalYearId}
            />
          </div>

          <!-- รหัสสินทรัพย์ -->
          <div class="form-group">
            <label class="label">
              รหัสสินทรัพย์ <span class="required">*</span>
            </label>
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

          <!-- ชื่อสินทรัพย์ -->
          <div class="form-group">
            <label class="label">
              ชื่อสินทรัพย์ <span class="required">*</span>
            </label>
            <input
              type="text"
              bind:value={formData.assetName}
              class="input"
              class:input-error={errors.assetName}
            />
          </div>

          <!-- หมายเลขสินทรัพย์ -->
          <div class="form-group">
            <label class="label">
              หมายเลขสินทรัพย์ <span class="required">* </span>
            </label>
            <input
              type="text"
              bind:value={formData.assetNumber}
              class="input"
              class:input-error={errors.assetNumber}
            />
            <p class="number-preview">
              ตัวอย่าง: วท65-343-33-355
            </p>
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
             <p class="number-preview">
              ตัวอย่าง: ตัวเดียว 0001 หลายตัว 0001-0005
            </p> 
        
            
          </div>

          <!-- ประเภท -->
          <div class="form-group" class:error-wrapper={errors.assetTypeId}>
            <label class="label">
              ประเภท <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={assetTypes.map(t => ({ value: t.id, label: t.name }))}
              bind:value={formData.assetTypeId}
            />
          </div>

          <!-- ราคา -->
          <div class="form-group">
            <label class="label">
              ราคา <span class="required">*</span>
            </label>
            <input
              type="text"
              inputmode="decimal"
              bind:value={formData.price}
              on:input={(e) => { formData.price = e.currentTarget.value.replace(/[^0-9.]/g, ''); }}
              class="input"
              class:input-error={errors.price}
            />
          </div>

          <!-- หน่วยนับ -->
          <div class="form-group">
            <label class="label">
              หน่วยนับ <span class="required">*</span>
            </label>
            <input
              type="text"
              bind:value={formData.unit}
              class="input"
              class:input-error={errors.unit}
            />
          </div>

          <!-- วันที่ได้มา -->
          <div class="form-group">
            <label class="label">
              วันที่ได้มา <span class="required">*</span>
            </label>
            <ThaiDatePicker
              bind:value={formData.acquisitionDate}
              error={errors.acquisitionDate}
              inputClass="input"
            />
          </div>

          <!-- ทรัพย์สินเดิมก่อน -->
          <div class="form-group" class:error-wrapper={errors.acquisitionSourceId}>
            <label class="label">
              ทรัพย์สินได้มาโดย <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={acquisitionSources.map(s => ({ value: s.id, label: s.name }))}
              bind:value={formData.acquisitionSourceId}
            />
          </div>

          <!-- วิธีการได้มา -->
          <div class="form-group" class:error-wrapper={errors.acquisitionMethodId}>
            <label class="label">
              วิธีการได้มา <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={acquisitionMethods.map(m => ({ value: m.id, label: m.name }))}
              bind:value={formData.acquisitionMethodId}
            />
          </div>

          <!-- บริษัท -->
          <div class="form-group">
            <label class="label">
              บริษัท <span class="required">*</span>
            </label>
            <input
              type="text"
              bind:value={formData.company}
              class="input"
              class:input-error={errors.company}
            />
          </div>

          <!-- ขนาดและลักษณะ -->
          <div class="form-group">
            <label class="label">
              ขนาดและลักษณะ <span class="required">*</span>
            </label>
            <input
              type="text"
              bind:value={formData.sizeDetail}
              class="input"
              class:input-error={errors.sizeDetail}
            />
          </div>

          <!-- อาคารที่ตั้ง -->
          <div class="form-group" class:error-wrapper={errors.buildingId}>
            <label class="label">
              อาคารที่ตั้ง <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={buildings.map(b => ({ value: b.id, label: b.name }))}
              bind:value={formData.buildingId}
            />
          </div>

          <!-- ห้องที่ตั้ง -->
          <div class="form-group" class:error-wrapper={errors.roomId}>
            <label class="label">
              ห้องที่ตั้ง <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={filteredRooms.map(r => ({ value: r.id, label: r.name }))}
              bind:value={formData.roomId}
            />
          </div>

          <!-- โครงการ -->
          <div class="form-group" class:error-wrapper={errors.projectId}>
            <label class="label">
              โครงการ <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={projects.map(p => ({ value: p.id, label: p.projectName }))}
              bind:value={formData.projectId}
            />
          </div>

          <!-- หมายเหตุ -->
          <div class="form-group">
            <label class="label">หมายเหตุ</label>
            <textarea
              bind:value={formData.note}
              class="input textarea"
              rows="3"
            ></textarea>
          </div>

          <!-- เอกสารแนบ -->
          <div class="form-group full-width">
            <label class="label">
              เอกสารแนบ
            </label>
            <div class="file-upload">
              <input
                type="file"
                id="file-input"
                on:change={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                hidden
              />
              <label for="file-input" class="file-upload-label">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="upload-title">คลิกเพื่อเปิดไฟล์แนบ หรือลากไฟล์มาวางที่นี่</p>
              </label>

              {#if attachmentFiles.length > 0}
                <div class="file-list">
                  {#each attachmentFiles as file, i}
                    <div class="file-item">
                      <button class="file-remove" type="button" on:click={() => removeFile(i)}>✕</button>
                      {#if getFileType(file) === 'pdf'}
                        <svg class="file-icon pdf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      {:else if getFileType(file) === 'image'}
                        <svg class="file-icon image-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      {:else}
                        <svg class="file-icon other-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      {/if}
                      <span class="file-item-name">{file.name}</span>
                    </div>
                  {/each}
                </div>
              {/if}
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

  /* File Upload */
  .file-upload {
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    transition: all 0.2s;
  }

  .file-upload:hover {
    border-color: #ffa200;
    background: #fffbf5;
  }

  .file-upload-label {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .upload-icon {
    width: 3rem;
    height: 3rem;
    color: #9ca3af;
  }

  .upload-text {
    color: #6b7280;
  }

  .upload-title {
    font-size: 0.875rem;
    margin: 0;
    color: #6b7280;
  }

  .file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1.25rem;
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
</style>
