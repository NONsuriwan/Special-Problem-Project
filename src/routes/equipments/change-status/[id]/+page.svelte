<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ThaiDatePicker from '$lib/components/ui/ThaiDatePicker.svelte';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';

  type Asset = {
    id: number;
    uuid: string;
    equipmentCode: string;
    equipmentName: string;
    status: string;
  };

  type MasterData = { id: number; name: string };

  $: assetId = $page.params.id ?? '';

  let asset: Asset | null = null;
  let allEquipment: Asset[] = [];
  let supportUnits: MasterData[] = [];
  let loading = true;
  let saving = false;
  let error = '';
  let saveError = '';

  // Selected status tab
  let selectedStatus = 'normal';

  // Extra equipment selected
  let extraEquipment: Asset[] = [];
  let searchQ = '';
  let showDropdown = false;
  let dropdownEl: HTMLDivElement;

  // Form data per status
  let borrowerName = '';
  let borrowUnitId = 0;
  let borrowDate = '';
  let returnDate = '';
  let repairDate = '';
  let repairBy = '';
  let repairFile: File | null = null;
  let unavailableReason = '';
  let disposeDate = '';
  let disposePrice = '';
  let disposeFile: File | null = null;
  let remark = '';

  // Validation errors
  let errors: Record<string, boolean> = {};

  const statusTabs = [
    { value: 'normal',      label: 'ปกติ',            color: '#ffa200' },
    { value: 'borrowed',    label: 'ยืม',              color: '#3b82f6' },
    { value: 'repair',      label: 'แจ้งซ่อม',         color: '#f59e0b' },
    { value: 'unavailable', label: 'ไม่พร้อมใช้งาน',   color: '#ef4444' },
    { value: 'disposed',    label: 'จำหน่ายทิ้ง',      color: '#6b7280' },
  ];

  const formTitles: Record<string, string> = {
    borrowed:    'ข้อมูลการยืม',
    repair:      'ข้อมูลการแจ้งซ่อม',
    unavailable: 'ข้อมูลการแจ้งไม่พร้อมใช้งาน',
    disposed:    'ข้อมูลการจำหน่ายทิ้ง',
  };

  async function fetchData() {
    loading = true;
    try {
      const [assetData, allData, unitsData] = await Promise.all([
        apiFetch<{ data: Asset }>(API_ENDPOINTS.ASSET_DETAIL(assetId)),
        apiFetch<{ data: Asset[] }>(`${API_ENDPOINTS.ASSETS}?limit=1000`),
        apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.SUPPORT_UNITS),
      ]);

      asset = assetData.data;
      selectedStatus = asset?.status || 'normal';
      allEquipment = (allData.data || []).filter((a: Asset) => a.uuid !== assetId);
      console.log('equipment sample:', allEquipment[0]); // ← เพิ่มบรรทัดนี้
      supportUnits = unitsData.data || [];
    } catch (e) {
      error = 'ไม่สามารถโหลดข้อมูลได้';
    } finally {
      loading = false;
    }
  }

  // Dropdown search — แสดงเฉพาะครุภัณฑ์ที่มีสถานะเดียวกับครุภัณฑ์หลัก
  $: filteredEquipment = searchQ.trim()
    ? allEquipment.filter(e =>
        e.status === selectedStatus &&
        !extraEquipment.find(x => x.uuid === e.uuid) &&
        (e.equipmentName.toLowerCase().includes(searchQ.toLowerCase()) ||
        e.equipmentCode.toLowerCase().includes(searchQ.toLowerCase()))
      )
    : allEquipment.filter(e =>
        e.status === selectedStatus &&
        !extraEquipment.find(x => x.uuid === e.uuid)
      ).slice(0, 20);

  function selectEquipment(eq: Asset) {
    extraEquipment = [...extraEquipment, eq];
    searchQ = '';
    showDropdown = false;
  }

  function removeEquipment(uuid: string) {
    extraEquipment = extraEquipment.filter(e => e.uuid !== uuid);
  }

  function handleDropdownClickOutside(e: MouseEvent) {
    if (showDropdown && dropdownEl && !dropdownEl.contains(e.target as Node)) {
      showDropdown = false;
    }
  }

  function validate(): boolean {
    errors = {};
    if (selectedStatus === 'borrowed') {
      if (!borrowerName.trim()) errors.borrowerName = true;
      if (!borrowUnitId) errors.borrowUnitId = true;
      if (!borrowDate) errors.borrowDate = true;
      if (!returnDate) errors.returnDate = true;
    } else if (selectedStatus === 'repair') {
      if (!repairDate) errors.repairDate = true;
      if (!repairBy.trim()) errors.repairBy = true;
    } else if (selectedStatus === 'unavailable') {
      if (!unavailableReason.trim()) errors.unavailableReason = true;
    } else if (selectedStatus === 'disposed') {
      if (!disposeDate) errors.disposeDate = true;
    }
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    saving = true;
    saveError = '';

    try {
      // Build remark string based on status
      let remarkParts: string[] = [];
      if (selectedStatus === 'borrowed') {
        remarkParts.push(`ผู้ยืม: ${borrowerName}`);
        const unitName = supportUnits.find(u => u.id === borrowUnitId)?.name || '';
        if (unitName) remarkParts.push(`หน่วยงาน: ${unitName}`);
        if (borrowDate) remarkParts.push(`วันที่ยืม: ${borrowDate}`);
        if (returnDate) remarkParts.push(`วันที่คืน: ${returnDate}`);
      } else if (selectedStatus === 'repair') {
        if (repairDate) remarkParts.push(`วันที่แจ้ง: ${repairDate}`);
        remarkParts.push(`ผู้แจ้ง: ${repairBy}`);
      } else if (selectedStatus === 'unavailable') {
        remarkParts.push(unavailableReason);
      } else if (selectedStatus === 'disposed') {
        if (disposeDate) remarkParts.push(`วันที่จำหน่าย: ${disposeDate}`);
        if (disposePrice) remarkParts.push(`ราคา: ${disposePrice}`);
      }
      if (remark.trim()) remarkParts.push(remark.trim());

      const payload = {
        status: selectedStatus,
        remark: remarkParts.join(' | ') || null,
      };

      // Save all equipment (main + extra)
      const targets = [assetId, ...extraEquipment.map(e => e.uuid)];
      await Promise.all(targets.map(uuid =>
        apiFetch(API_ENDPOINTS.ASSET_DETAIL(uuid), {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      ));

      goto(`/equipments/detail/${assetId}`);
    } catch (e) {
      saveError = 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
    } finally {
      saving = false;
    }
  }

  onMount(fetchData);
</script>

<svelte:window on:click={handleDropdownClickOutside} />

<div class="page-container">
  {#if loading}
    <div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>
  {:else if error || !asset}
    <div class="error-box"><p>❌ {error || 'ไม่พบข้อมูล'}</p></div>
  {:else}
    <h1 class="page-title">แก้ไขสถานะครุภัณฑ์</h1>

    <!-- Status Tabs -->
    <div class="status-tabs">
      {#each statusTabs as tab}
        <button
          class="status-tab"
          class:active={selectedStatus === tab.value}
          style={selectedStatus === tab.value ? `--tab-color:${tab.color}` : ''}
          on:click={() => selectedStatus = tab.value}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Main Equipment Card -->
    <div class="card">
      <div class="card-meta">ครุภัณฑ์หลัก</div>
      <div class="equipment-title">{asset.equipmentName} • {asset.equipmentCode}</div>

      <!-- Additional Equipment -->
      <div class="extra-label">เพิ่มครุภัณฑ์อื่น ๆ</div>
      <div class="dropdown-wrap" bind:this={dropdownEl}>
        <div
          class="dropdown-trigger"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="equipment-dropdown-list"
          aria-haspopup="listbox"
          tabindex="0"
          on:click={() => showDropdown = !showDropdown}
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDropdown = !showDropdown; } }}
        >
          <input
            class="dropdown-search"
            placeholder="ครุภัณฑ์ที่ต้องการแก้ไขสถานะ"
            bind:value={searchQ}
            on:focus={() => showDropdown = true}
            on:click|stopPropagation
            tabindex="-1"
          />
          <svg class="chevron {showDropdown ? 'open' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {#if showDropdown}
          <div class="dropdown-menu" id="equipment-dropdown-list" role="listbox">
            {#if filteredEquipment.length === 0}
              <div class="dropdown-empty">ไม่พบครุภัณฑ์</div>
            {:else}
              {#each filteredEquipment as eq (eq.uuid)}
                <button class="dropdown-item" type="button" on:click={() => selectEquipment(eq)}>
                  <span class="item-name">{eq.equipmentName}</span>
                  <span class="item-code">{eq.equipmentCode}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <!-- Selected chips -->
      {#if extraEquipment.length > 0}
        <div class="chips">
          {#each extraEquipment as eq (eq.uuid)}
            <div class="chip">
              <span>{eq.equipmentName} • {eq.equipmentCode}</span>
              <button class="chip-remove" type="button" aria-label="ลบ" on:click={() => removeEquipment(eq.uuid)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Status-specific Form -->
    {#if selectedStatus !== 'normal'}
      <div class="card">
        <h2 class="card-title">{formTitles[selectedStatus]}</h2>

        {#if selectedStatus === 'borrowed'}
          <div class="form-grid">
            <div class="form-group" class:has-error={errors.borrowerName}>
              <label class="label" for="cs-borrowerName">ผู้ยืม <span class="required">*</span></label>
              <input id="cs-borrowerName" class="input" bind:value={borrowerName} placeholder="ชื่อผู้ยืม" />
            </div>
            <div class="form-group" class:has-error={errors.borrowUnitId}>
              <label class="label" for="cs-borrowUnitId">หน่วยงานที่ยืม <span class="required">*</span></label>
              <select id="cs-borrowUnitId" class="input" bind:value={borrowUnitId}>
                <option value={0}>กรุณาเลือก</option>
                {#each supportUnits as u}
                  <option value={u.id}>{u.name}</option>
                {/each}
              </select>
            </div>
            <div class="form-group" class:has-error={errors.borrowDate}>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="label">วันที่ยืม <span class="required">*</span></label>
              <ThaiDatePicker bind:value={borrowDate} error={errors.borrowDate} inputClass="form-input" />
            </div>
            <div class="form-group" class:has-error={errors.returnDate}>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="label">วันที่คืน <span class="required">*</span></label>
              <ThaiDatePicker bind:value={returnDate} error={errors.returnDate} inputClass="form-input" />
            </div>
          </div>

        {:else if selectedStatus === 'repair'}
          <div class="form-grid">
            <div class="form-group" class:has-error={errors.repairDate}>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="label">วันที่ยืม <span class="required">*</span></label>
              <ThaiDatePicker bind:value={repairDate} error={errors.repairDate} inputClass="form-input" />
            </div>
            <div class="form-group" class:has-error={errors.repairBy}>
              <label class="label" for="cs-repairBy">ผู้ยืม <span class="required">*</span></label>
              <input id="cs-repairBy" class="input" bind:value={repairBy} placeholder="ชื่อผู้แจ้งซ่อม" />
            </div>
          </div>
          <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">เอกสารการซ่อม</label>
            <label class="file-input-label">
              <input type="file" class="file-input-hidden" on:change={(e) => {
                const t = e.target as HTMLInputElement;
                repairFile = t.files?.[0] || null;
              }} />
              <span class="file-input-text">{repairFile ? repairFile.name : 'choose file no file chosen'}</span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </label>
          </div>

        {:else if selectedStatus === 'unavailable'}
          <div class="form-group" class:has-error={errors.unavailableReason}>
            <label class="label" for="cs-unavailableReason">เหตุผลที่ไม่พร้อมใช้งาน <span class="required">*</span></label>
            <textarea id="cs-unavailableReason" class="textarea" bind:value={unavailableReason} rows="4" placeholder="ระบุเหตุผล..."></textarea>
          </div>

        {:else if selectedStatus === 'disposed'}
          <div class="form-grid">
            <div class="form-group" class:has-error={errors.disposeDate}>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="label">วันที่จำหน่าย <span class="required">*</span></label>
              <ThaiDatePicker bind:value={disposeDate} error={errors.disposeDate} inputClass="form-input" />
            </div>
            <div class="form-group">
              <label class="label" for="cs-disposePrice">ราคาจำหน่าย</label>
              <input id="cs-disposePrice" class="input" type="number" bind:value={disposePrice} placeholder="0.00" />
            </div>
          </div>
          <div class="form-group">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="label">เอกสารการจำหน่าย</label>
            <label class="file-input-label">
              <input type="file" class="file-input-hidden" on:change={(e) => {
                const t = e.target as HTMLInputElement;
                disposeFile = t.files?.[0] || null;
              }} />
              <span class="file-input-text">{disposeFile ? disposeFile.name : 'choose file no file chosen'}</span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </label>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Remark -->
    <div class="card">
      <label class="label" for="cs-remark">หมายเหตุ</label>
      <textarea id="cs-remark" class="textarea" bind:value={remark} rows="3" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
    </div>

    {#if saveError}
      <div class="save-error">{saveError}</div>
    {/if}

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="btn-confirm" on:click={handleSubmit} disabled={saving}>
        {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
      </button>
      <button class="btn-cancel" on:click={() => goto(`/equipments/detail/${assetId}`)}>
        ยกเลิก
      </button>
    </div>
  {/if}
</div>

<style>
  .page-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1.25rem;
  }

  /* Status tabs */
  .status-tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }

  .status-tab {
    padding: 0.5rem 1.125rem;
    border-radius: 0.5rem;
    border: 1.5px solid #e5e7eb;
    background: white;
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .status-tab:hover:not(.active) {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .status-tab.active {
    border-color: var(--tab-color, #ffa200);
    color: var(--tab-color, #ffa200);
    background: white;
    font-weight: 600;
  }

  /* Cards */
  .card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .card-meta {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-bottom: 0.375rem;
  }

  .card-title {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 1rem;
  }

  .equipment-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1rem;
  }

  /* Additional equipment dropdown */
  .extra-label {
    font-size: 0.8125rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .dropdown-wrap {
    position: relative;
    margin-bottom: 0.75rem;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    width: 100%;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0 0.75rem;
    cursor: pointer;
    gap: 0.5rem;
  }

  .dropdown-search {
    flex: 1;
    border: none;
    outline: none;
    padding: 0.625rem 0;
    font-size: 0.875rem;
    color: #374151;
    background: transparent;
    cursor: text;
  }

  .dropdown-search::placeholder {
    color: #9ca3af;
  }

  .chevron {
    width: 1rem;
    height: 1rem;
    color: #9ca3af;
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 50;
    max-height: 220px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
    gap: 0.125rem;
  }

  .dropdown-item:hover {
    background: #fffbf5;
  }

  .item-name {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 500;
  }

  .item-code {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .dropdown-empty {
    padding: 0.75rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  /* Chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: #f3f4f6;
    border-radius: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    color: #374151;
  }

  .chip-remove {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    color: #9ca3af;
    transition: color 0.15s;
  }

  .chip-remove:hover {
    color: #ef4444;
  }

  /* Form */
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
  }

  .required {
    color: #ef4444;
  }

  .input {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    width: 100%;
    box-sizing: border-box;
    background: white;
    appearance: none;
  }

  .input:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255,162,0,0.15);
  }

  .has-error .input,
  .has-error :global(.picker-btn) {
    border-color: #ef4444;
  }

  .textarea {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    font-family: inherit;
  }

  .textarea:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 2px rgba(255,162,0,0.15);
  }

  /* File input */
  .file-input-label {
    display: flex;
    align-items: center;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    cursor: pointer;
    background: white;
    gap: 0.5rem;
  }

  .file-input-hidden {
    display: none;
  }

  .file-input-text {
    flex: 1;
    font-size: 0.875rem;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Action buttons */
  .save-error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .btn-confirm {
    background: #ffa200;
    color: white;
    border: none;
    padding: 0.75rem 3rem;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-confirm:hover:not(:disabled) {
    background: #e69200;
  }

  .btn-confirm:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1.5px solid #e5e7eb;
    padding: 0.75rem 2.5rem;
    border-radius: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel:hover {
    border-color: #9ca3af;
    background: #f9fafb;
  }
</style>