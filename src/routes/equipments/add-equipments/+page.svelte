<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Dropdown from '$lib/components/Dropdown.svelte';

  type MasterData = {
    id: number;
    name: string;
  };

  type Room = MasterData & {
    buildingId: number;
  };

  // Master data lists
  let departments: MasterData[] = [];
  let activities: MasterData[] = [];
  let funds: MasterData[] = [];
  let assetTypes: MasterData[] = [];
  let acquisitionSources: MasterData[] = [];
  let acquisitionMethods: MasterData[] = [];
  let buildings: MasterData[] = [];
  let rooms: Room[] = [];
  let projects: MasterData[] = [];
  let years: number[] = [];

  // Form data
  let formData = {
    assetCode: '',
    assetName: '',
    assetNumber: '',
    departmentId: null as number | null,
    assetTypeId: null as number | null,
    activityId: null as number | null,
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
        deptRes, actRes, fundRes, typeRes, srcRes, methodRes,
        buildRes, roomRes, projRes
      ] = await Promise.all([
        fetch('http://localhost:3000/api/masters/departments'),
        fetch('http://localhost:3000/api/masters/activities'),
        fetch('http://localhost:3000/api/masters/funds'),
        fetch('http://localhost:3000/api/masters/asset-types'),
        fetch('http://localhost:3000/api/masters/acquisition-sources'),
        fetch('http://localhost:3000/api/masters/acquisition-methods'),
        fetch('http://localhost:3000/api/masters/buildings'),
        fetch('http://localhost:3000/api/masters/rooms'),
        fetch('http://localhost:3000/api/projects')
      ]);

      departments = (await deptRes.json()).data || [];
      activities = (await actRes.json()).data || [];
      funds = (await fundRes.json()).data || [];
      assetTypes = (await typeRes.json()).data || [];
      acquisitionSources = (await srcRes.json()).data || [];
      acquisitionMethods = (await methodRes.json()).data || [];
      buildings = (await buildRes.json()).data || [];
      rooms = (await roomRes.json()).data || [];
      projects = (await projRes.json()).data || [];

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

    // Validation
    if (!formData.assetCode || !formData.assetName) {
      errorMessage = 'กรุณากรอกข้อมูลที่จำเป็น (รหัสครุภัณฑ์และชื่อครุภัณฑ์)';
      return;
    }

    loading = true;

    try {
      // Prepare data
      const submitData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        departmentId: formData.departmentId || null,
        assetTypeId: formData.assetTypeId || null,
        activityId: formData.activityId || null,
        fundId: formData.fundId || null,
        fiscalYearId: formData.fundId || null,
        acquisitionSourceId: formData.acquisitionSourceId || null,
        acquisitionMethodId: formData.acquisitionMethodId || null,
        company: formData.company || null,
        sizeDetail: formData.sizeDetail || null,
        buildingId: formData.buildingId || null,
        roomId: formData.roomId || null,
        projectId: formData.projectId || null
      };

      const response = await fetch('http://localhost:3000/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
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
          <div class="form-group">
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
              inputmode="numeric"
              pattern="[0-9]*"
              bind:value={formData.assetCode}
              on:input={(e) => { formData.assetCode = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
              class="input"
              required
            />
          </div>

          <!-- กองทุน -->
          <div class="form-group">
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
          <div class="form-group">
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
              required
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
              required
            />
          </div>

          <!-- หมายเลขสินทรัพย์ -->
          <div class="form-group">
            <label class="label">
              หมายเลขสินทรัพย์ <span class="required">*</span>
            </label>
            <input
              type="text"
              bind:value={formData.assetNumber}
              class="input"
            />
          </div>

          <!-- ถึง -->
          <div class="form-group">
            <label class="label">ถึง</label>
            <div class="range-input">
              <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              bind:value={formData.assetCode}
              on:input={(e) => { formData.assetCode = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
              class="input"
              required
            />
              <span class="range-separator">-</span>
              <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              bind:value={formData.assetCode}
              on:input={(e) => { formData.assetCode = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
              class="input"
              required
            />
            </div>
          </div>

          <!-- ประเภท -->
          <div class="form-group">
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
              inputmode="numeric"
              pattern="[0-9]*"
              bind:value={formData.assetCode}
              on:input={(e) => { formData.assetCode = e.currentTarget.value.replace(/[^0-9]/g, ''); }}
              class="input"
              required
            />
          </div>

          <!-- หน่วยนับ -->
          <div class="form-group">
            <label class="label">
              หน่วยนับ <span class="required">*</span>
            </label>
            <input type="text" class="input" />
          </div>

          <!-- วันที่ได้มา -->
          <div class="form-group">
            <label class="label">
              วันที่ได้มา <span class="required">*</span>
            </label>
            <input
              type="date"
              bind:value={formData.acquisitionDate}
              class="input"
            />
          </div>

          <!-- ทรัพย์สินเดิมก่อน -->
          <div class="form-group">
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
          <div class="form-group">
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
            />
          </div>

          <!-- ขนาดและลักษณะ -->
          <div class="form-group">
            <label class="label">
              ขนาดและลักษณะ <span class="required">*</span>
            </label>
            <input type="text" bind:value={formData.sizeDetail} class="input" />
          </div>

          <!-- อาคารที่ตั้ง -->
          <div class="form-group">
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
          <div class="form-group">
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
          <div class="form-group">
            <label class="label">
              โครงการ <span class="required">*</span>
            </label>
            <Dropdown
              fullWidth
              options={projects.map(p => ({ value: p.id, label: p.name }))}
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
              เอกสารแนบ <span class="required">*</span>
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
  .page-container {
    background: #e5e5e5;
    min-height: 100vh;
    padding: 2rem;
  }

  .content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Header */
  .header {
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.25rem 0;
  }

  .subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  /* Form Card */
  .form-card {
    background: white;
    border-radius: 0.75rem;
    padding: 2rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  /* Form Grid */
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .required {
    color: #dc2626;
  }

  .input {
    padding: 0.625rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .input:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.1);
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

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
    color: #dc2626;
  }

  .error-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  /* Form Actions */
  .form-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  .btn-submit, .btn-cancel {
    padding: 0.75rem 2.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-submit {
    background: #ffa200;
    color: white;
  }

  .btn-submit:hover:not(:disabled) {
    background: #e69200;
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-cancel:hover:not(:disabled) {
    background: #f9fafb;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    animation: fadeIn 0.2s;
  }

  .modal-content {
    background: white;
    border-radius: 0.75rem;
    padding: 2rem;
    max-width: 400px;
    text-align: center;
    animation: scaleIn 0.2s;
  }

  .success-icon {
    width: 4rem;
    height: 4rem;
    background: #dcfce7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
  }

  .success-icon svg {
    width: 2rem;
    height: 2rem;
    color: #16a34a;
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .modal-text {
    color: #6b7280;
    margin: 0;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.9); }
    to { transform: scale(1); }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .page-container {
      padding: 1rem;
    }

    .form-card {
      padding: 1.5rem;
    }
  }
</style>
