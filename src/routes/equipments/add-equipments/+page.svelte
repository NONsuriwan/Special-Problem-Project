<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

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
  let attachmentFile: File | null = null;

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
      attachmentFile = target.files[0];
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
        <h1 class="title">เพิ่มครุภัณฑ์</h1>
        <p class="subtitle">เพิ่มครุภัณฑ์</p>
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
            <select bind:value={formData.departmentId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each departments as dept}
                <option value={dept.id}>{dept.name}</option>
              {/each}
            </select>
          </div>

          <!-- กิจกรรม -->
          <div class="form-group">
            <label class="label">
              กิจกรรม <span class="required">*</span>
            </label>
            <select bind:value={formData.activityId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each activities as act}
                <option value={act.id}>{act.name}</option>
              {/each}
            </select>
          </div>

          <!-- กองทุน -->
          <div class="form-group">
            <label class="label">
              กองทุน <span class="required">*</span>
            </label>
            <select bind:value={formData.fundId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each funds as fund}
                <option value={fund.id}>{fund.name}</option>
              {/each}
            </select>
          </div>

          <!-- ปีงบประมาณ -->
          <div class="form-group">
            <label class="label">
              ปีงบประมาณ <span class="required">*</span>
            </label>
            <select bind:value={formData.fiscalYearId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each years as year}
                <option value={year}>{year}</option>
              {/each}
            </select>
          </div>

          <!-- รหัสสินทรัพย์ -->
          <div class="form-group">
            <label class="label">
              รหัสสินทรัพย์ <span class="required">*</span>
            </label>
            <input 
              type="text" 
              bind:value={formData.assetCode}
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
            <input type="text" class="input" />
          </div>

          <!-- ประเภท -->
          <div class="form-group">
            <label class="label">
              ประเภท <span class="required">*</span>
            </label>
            <select bind:value={formData.assetTypeId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each assetTypes as type}
                <option value={type.id}>{type.name}</option>
              {/each}
            </select>
          </div>

          <!-- ราคา -->
          <div class="form-group">
            <label class="label">
              ราคา <span class="required">*</span>
            </label>
            <input 
              type="number" 
              bind:value={formData.price}
              class="input"
              step="0.01"
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
            <select bind:value={formData.acquisitionSourceId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each acquisitionSources as source}
                <option value={source.id}>{source.name}</option>
              {/each}
            </select>
          </div>

          <!-- วิธีการได้มา -->
          <div class="form-group">
            <label class="label">
              วิธีการได้มา <span class="required">*</span>
            </label>
            <select bind:value={formData.acquisitionMethodId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each acquisitionMethods as method}
                <option value={method.id}>{method.name}</option>
              {/each}
            </select>
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
            <select bind:value={formData.buildingId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each buildings as building}
                <option value={building.id}>{building.name}</option>
              {/each}
            </select>
          </div>

          <!-- ห้องที่ตั้ง -->
          <div class="form-group">
            <label class="label">
              ห้องที่ตั้ง <span class="required">*</span>
            </label>
            <select bind:value={formData.roomId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each filteredRooms as room}
                <option value={room.id}>{room.name}</option>
              {/each}
            </select>
          </div>

          <!-- โครงการ -->
          <div class="form-group">
            <label class="label">
              โครงการ <span class="required">*</span>
            </label>
            <select bind:value={formData.projectId} class="input">
              <option value={null}>กรุณาเลือก</option>
              {#each projects as project}
                <option value={project.id}>{project.name}</option>
              {/each}
            </select>
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
                hidden
              />
              <label for="file-input" class="file-upload-label">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div class="upload-text">
                  <p class="upload-title">คลิกเพื่อเปิดไฟล์แนบ หรือลากไฟล์มาวางที่นี่</p>
                  {#if attachmentFile}
                    <p class="file-name">{attachmentFile.name}</p>
                  {/if}
                </div>
              </label>
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
  }

  .file-name {
    font-size: 0.875rem;
    color: #ffa200;
    font-weight: 500;
    margin-top: 0.5rem;
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