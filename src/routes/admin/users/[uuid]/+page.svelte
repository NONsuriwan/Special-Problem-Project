<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';

  type MasterData = { id: number; name: string };

  $: uuid = $page.params.uuid;

  let departments: MasterData[] = [];
  let formData = {
    firstName: '',
    lastName: '',
    role: 'user' as string,
    departmentId: null as number | null,
  };
  let loading = false;
  let loadingUser = true;
  let showSuccessModal = false;
  let errorMessage = '';

  const roleOptions = [
    { value: 'user',    label: 'User' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin',   label: 'Admin' },
  ];

  async function fetchUser() {
    try {
      const result = await apiFetch<{ data: { firstName: string | null; lastName: string | null; role: string; departmentId: number | null } }>(API_ENDPOINTS.USER_DETAIL(uuid));
      const u = result.data;
      formData = {
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        role: u.role,
        departmentId: u.departmentId,
      };
    } catch (_) {
      errorMessage = 'ไม่พบข้อมูลผู้ใช้';
    } finally {
      loadingUser = false;
    }
  }

  async function fetchDepartments() {
    try {
      const result = await apiFetch<{ data: MasterData[] }>(API_ENDPOINTS.MASTERS.DEPARTMENTS);
      departments = result.data || [];
    } catch (_) {}
  }

  async function handleSubmit() {
    errorMessage = '';
    loading = true;
    try {
      await apiFetch(API_ENDPOINTS.USER_DETAIL(uuid), {
        method: 'PUT',
        body: JSON.stringify({
          firstName: formData.firstName.trim() || null,
          lastName: formData.lastName.trim() || null,
          role: formData.role,
          departmentId: formData.departmentId || null,
        }),
      });
      showSuccessModal = true;
      setTimeout(() => goto('/admin/users'), 1500);
    } catch (e: unknown) {
      errorMessage = (e instanceof Error ? e.message : null) || 'เกิดข้อผิดพลาดในการบันทึก';
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    await Promise.all([fetchUser(), fetchDepartments()]);
  });
</script>

<div class="page-container">
  <div class="content-wrapper">
    <div class="header"><h1 class="text-h2">แก้ไขผู้ใช้</h1></div>
    {#if loadingUser}
      <div class="loading"><div class="spinner"></div><p>กำลังโหลด...</p></div>
    {:else}
      <div class="form-card">
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-grid">
            <div class="form-group">
              <label class="label">ชื่อ</label>
              <input type="text" bind:value={formData.firstName} class="input" />
            </div>
            <div class="form-group">
              <label class="label">นามสกุล</label>
              <input type="text" bind:value={formData.lastName} class="input" />
            </div>
            <div class="form-group">
              <label class="label">Role <span class="required">*</span></label>
              <Dropdown fullWidth options={roleOptions} bind:value={formData.role} />
            </div>
            <div class="form-group">
              <label class="label">หน่วยงาน</label>
              <Dropdown fullWidth options={[{ value: null, label: 'ไม่ระบุ' }, ...departments.map(d => ({ value: d.id, label: d.name }))]} bind:value={formData.departmentId} />
            </div>
          </div>

          {#if errorMessage}
            <div class="error-banner"><span>{errorMessage}</span></div>
          {/if}

          <div class="form-actions">
            <button type="submit" class="btn-submit" disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            <button type="button" class="btn-cancel" on:click={() => goto('/admin/users')} disabled={loading}>ยกเลิก</button>
          </div>
        </form>
      </div>
    {/if}
  </div>
</div>

{#if showSuccessModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="success-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg></div>
      <h3 class="modal-title">บันทึกสำเร็จ</h3>
      <p class="modal-text">แก้ไขผู้ใช้เรียบร้อยแล้ว</p>
    </div>
  </div>
{/if}
