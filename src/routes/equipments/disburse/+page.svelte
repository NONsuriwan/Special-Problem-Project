<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type Equipment = {
    uuid: string;
    equipmentCode: string;
    equipmentName: string;
    equipmentNumber: string | null;
    equipmentTypeId: number | null;
    status: string;
    projectId: number | null;
  };

  type MasterData = { id: number; name: string };
  type Project = { id: number; projectName: string; projectNumber?: string };

  // Master data
  let buildings: MasterData[] = [];
  let rooms: MasterData[] = [];
  let departments: MasterData[] = [];
  let assetTypes: MasterData[] = [];
  let projects: Project[] = [];

  // Pending equipment list
  let pendingItems: Equipment[] = [];
  let loadingList = true;
  let listError = '';

  // Filters
  let searchQ = '';
  let selectedProjectId: number | null = null;

  // Selected UUIDs
  let selectedUuids = new Set<string>();

  // Form fields
  let disbursedTo = '';
  let disbursedDate = '';
  let buildingId: number | null = null;
  let roomId: number | null = null;
  let departmentId: number | null = null;
  let remark = '';

  // Submission state
  let saving = false;
  let saveError = '';
  let showSuccessModal = false;
  let disbursedCount = 0;

  // Validation errors
  let errors: Record<string, boolean> = {};

  const statusLabel: Record<string, string> = {
    pending:     'รอเบิกจ่าย',
    normal:      'ปกติ',
    borrowed:    'ถูกยืม',
    repair:      'กำลังซ่อม',
    unavailable: 'ไม่พร้อมใช้งาน',
    disposed:    'จำหน่ายแล้ว',
  };

  $: filteredItems = pendingItems.filter(e => {
    if (selectedProjectId && e.projectId !== selectedProjectId) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      return (
        e.equipmentName.toLowerCase().includes(q) ||
        e.equipmentCode.toLowerCase().includes(q) ||
        (e.equipmentNumber ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  $: allSelected = filteredItems.length > 0 && filteredItems.every(e => selectedUuids.has(e.uuid));

  $: filteredRooms = buildingId
    ? rooms.filter(r => (r as any).buildingId === buildingId)
    : rooms;

  function onProjectChange() {
    selectedUuids = new Set();
  }

  function toggleAll() {
    if (allSelected) {
      filteredItems.forEach(e => selectedUuids.delete(e.uuid));
    } else {
      filteredItems.forEach(e => selectedUuids.add(e.uuid));
    }
    selectedUuids = new Set(selectedUuids);
  }

  function toggleOne(uuid: string) {
    if (selectedUuids.has(uuid)) selectedUuids.delete(uuid);
    else selectedUuids.add(uuid);
    selectedUuids = new Set(selectedUuids);
  }

  async function fetchData() {
    loadingList = true;
    listError = '';
    try {
      const [equipData, buildingsData, roomsData, depsData, typesData, projectsData] = await Promise.all([
        apiFetch<{ data: Equipment[] }>(`${API_ENDPOINTS.ASSETS}?status=pending&limit=1000`),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.BUILDINGS),
        apiFetch<{ data: (MasterData & { buildingId?: number })[] }>(API_ENDPOINTS.MASTERS.ROOMS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.ASSET_TYPES),
        apiFetch<{ data: Project[] }>(API_ENDPOINTS.PROJECTS),
      ]);
      pendingItems = equipData.data || [];
      buildings    = buildingsData.data || [];
      rooms        = roomsData.data || [];
      departments  = depsData.data || [];
      assetTypes   = typesData.data || [];
      projects     = projectsData.data || [];
    } catch (e) {
      listError = 'ไม่สามารถโหลดข้อมูลได้';
    } finally {
      loadingList = false;
    }
  }

  function validate(): boolean {
    errors = {};
    if (!disbursedTo.trim())     errors.disbursedTo   = true;
    if (!disbursedDate)           errors.disbursedDate = true;
    if (selectedUuids.size === 0) errors.selected      = true;
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      saveError = selectedUuids.size === 0
        ? 'กรุณาเลือกครุภัณฑ์อย่างน้อย 1 รายการ'
        : 'กรุณากรอกข้อมูลให้ครบ';
      return;
    }
    saving = true;
    saveError = '';
    try {
      await apiFetch(API_ENDPOINTS.EQUIPMENT_STATUS_CHANGE, {
        method: 'POST',
        body: JSON.stringify({
          equipmentUuids: Array.from(selectedUuids),
          newStatus: 'normal',
          data: {
            disbursedTo:  disbursedTo.trim(),
            disbursedDate,
            buildingId:   buildingId   ?? undefined,
            roomId:       roomId       ?? undefined,
            departmentId: departmentId ?? undefined,
            remark:       remark.trim() || undefined,
          },
        }),
      });
      disbursedCount = selectedUuids.size;
      showSuccessModal = true;
      setTimeout(() => goto('/equipments'), 1500);
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    } finally {
      saving = false;
    }
  }

  onMount(async () => {
    await fetchData();
    const pid = $page.url.searchParams.get('projectId');
    if (pid) {
      const n = parseInt(pid);
      if (!isNaN(n)) selectedProjectId = n;
    }
  });
</script>

<div class="page-container">
  <div class="content-wrapper">

    <!-- Disbursement Form -->
    <div class="form-card">
      <h2 class="section-title text-b6">ข้อมูลการเบิกจ่าย</h2>
      <div class="form-grid">

        <!-- โครงการ -->
        <div class="form-group full-col">
          <label class="label">โครงการ</label>
          <Dropdown
            fullWidth
            options={projects.map(p => ({ value: p.id, label: p.projectNumber ? `${p.projectNumber} - ${p.projectName}` : p.projectName }))}
            bind:value={selectedProjectId}
            placeholder="ทั้งหมด (ไม่กรอง)"
            on:change={onProjectChange}
          />
        </div>

        <!-- ผู้รับ -->
        <div class="form-group" class:error-wrapper={errors.disbursedTo}>
          <label class="label">ผู้รับครุภัณฑ์ <span class="required">*</span></label>
          <input
            type="text"
            bind:value={disbursedTo}
            class="input"
            class:input-error={errors.disbursedTo}
            placeholder="ชื่อผู้รับ"
          />
        </div>

        <!-- วันที่เบิกจ่าย -->
        <div class="form-group">
          <label class="label">วันที่เบิกจ่าย <span class="required">*</span></label>
          <ThaiDatePicker
            bind:value={disbursedDate}
            error={errors.disbursedDate}
            inputClass="input"
          />
        </div>

        <!-- อาคาร -->
        <div class="form-group">
          <label class="label">อาคาร</label>
          <Dropdown
            fullWidth
            options={buildings.map(b => ({ value: b.id, label: b.name }))}
            bind:value={buildingId}
            placeholder="กรุณาเลือก"
            on:change={() => { roomId = null; }}
          />
        </div>

        <!-- ห้อง -->
        <div class="form-group">
          <label class="label">ห้อง</label>
          <Dropdown
            fullWidth
            options={filteredRooms.map(r => ({ value: r.id, label: r.name }))}
            bind:value={roomId}
            placeholder="กรุณาเลือก"
          />
        </div>

        <!-- หน่วยงาน -->
        <div class="form-group">
          <label class="label">หน่วยงาน</label>
          <Dropdown
            fullWidth
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            bind:value={departmentId}
            placeholder="กรุณาเลือก"
          />
        </div>

        <!-- หมายเหตุ -->
        <div class="form-group">
          <label class="label">หมายเหตุ</label>
          <input
            type="text"
            bind:value={remark}
            class="input"
            placeholder="หมายเหตุ (ถ้ามี)"
          />
        </div>

      </div>
    </div>

    <!-- Equipment Selection -->
    <div class="form-card">
      <div class="list-header">
        <h2 class="section-title text-b6">
          เลือกครุภัณฑ์ที่รอเบิกจ่าย
          {#if selectedUuids.size > 0}
            <span class="badge text-b8">{selectedUuids.size} รายการ</span>
          {/if}
        </h2>
        <input
          class="search-input text-b7"
          type="text"
          bind:value={searchQ}
          placeholder="ค้นหา หมายเลขครุภัณฑ์ / ชื่อ"
        />
      </div>

      {#if errors.selected}
        <p class="field-error">กรุณาเลือกครุภัณฑ์อย่างน้อย 1 รายการ</p>
      {/if}

      {#if loadingList}
        <div class="loading-row text-b7">กำลังโหลด...</div>
      {:else if listError}
        <div class="error-row text-b7">{listError}</div>
      {:else if filteredItems.length === 0}
        <div class="empty-row text-b7">
          {searchQ || selectedProjectId ? 'ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข' : 'ไม่มีครุภัณฑ์ที่รอเบิกจ่าย'}
        </div>
      {:else}
        <div class="table-wrapper">
          <table class="table text-b7">
            <thead>
              <tr>
                <th class="col-check text-b8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    on:change={toggleAll}
                    class="checkbox"
                  />
                </th>
                <th class="text-b8">หมายเลขครุภัณฑ์</th>
                <th class="text-b8">ชื่อครุภัณฑ์</th>
                <th class="text-b8">ประเภท</th>
                <th class="text-b8">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredItems as item (item.uuid)}
                <tr
                  class="table-row"
                  class:selected={selectedUuids.has(item.uuid)}
                  on:click={() => toggleOne(item.uuid)}
                >
                  <td class="col-check" on:click|stopPropagation>
                    <input
                      type="checkbox"
                      checked={selectedUuids.has(item.uuid)}
                      on:change={() => toggleOne(item.uuid)}
                      class="checkbox"
                    />
                  </td>
                  <td class="number-cell">{item.equipmentNumber ?? '-'}</td>
                  <td>{item.equipmentName}</td>
                  <td class="type-cell">
                    {assetTypes.find(t => t.id === item.equipmentTypeId)?.name ?? '-'}
                  </td>
                  <td>
                    <span class="status-badge text-b8 status-{item.status}">
                      {statusLabel[item.status] ?? item.status}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}

      <!-- Error -->
      {#if saveError}
        <div class="error-banner">
          <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{saveError}</span>
        </div>
      {/if}

      <!-- Actions -->
      <div class="form-actions">
        <button class="btn-submit" on:click={handleSubmit} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'ยืนยันเบิกจ่าย'}
        </button>
        <button class="btn-cancel" on:click={() => goto('/equipments')} disabled={saving}>
          ยกเลิก
        </button>
      </div>
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
      <h3 class="modal-title">เบิกจ่ายสำเร็จ</h3>
      <p class="modal-text">เบิกจ่ายครุภัณฑ์ {disbursedCount} รายการเรียบร้อยแล้ว</p>
    </div>
  </div>
{/if}

<style>
  .section-title {
    font-weight: 700;
    color: #111827;
    margin: 0 0 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .full-col {
    grid-column: 1 / -1;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    background: #ffa200;
    color: white;
    font-weight: 600;
    border-radius: 9999px;
    padding: 0.125rem 0.625rem;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }

  .list-header .section-title {
    margin-bottom: 0;
  }

  .search-input {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    color: #374151;
    outline: none;
    width: 260px;
  }

  .search-input:focus {
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255,162,0,0.1);
  }

  .field-error {
    color: #ef4444;
    font-size: 0.8125rem;
    margin: 0 0 0.75rem;
  }

  .table-wrapper {
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
  }

  .table thead tr {
    background: #f9fafb;
  }

  .table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  .table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
    vertical-align: middle;
  }

  .table-row {
    cursor: pointer;
    transition: background 0.1s;
  }

  .table-row:hover {
    background: #fffbf5;
  }

  .table-row.selected {
    background: #fff8ee;
  }

  .col-check {
    width: 48px;
    text-align: center;
  }

  .checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #ffa200;
  }

  .number-cell {
    color: #6b7280;
    white-space: nowrap;
  }

  .type-cell {
    color: #6b7280;
  }

  .status-badge {
    display: inline-block;
    padding: 0.2rem 0.625rem;
    border-radius: 9999px;
    font-weight: 500;
    white-space: nowrap;
  }

  .status-pending {
    background: #ede9fe;
    color: #5b21b6;
  }

  .loading-row,
  .error-row,
  .empty-row {
    padding: 2rem;
    text-align: center;
    color: #9ca3af;
  }

  .error-row {
    color: #ef4444;
  }

  /* Layout fixes */
  .content-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #f3f4f6;
  }
</style>
