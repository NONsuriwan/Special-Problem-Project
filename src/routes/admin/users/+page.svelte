<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';
  import Dropdown from '$lib/components/ui/Dropdown.svelte';

  type User = {
    uuid: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    departmentId: number | null;
    departmentName: string | null;
    createdAt: string;
  };

  let items: User[] = [];
  let loading = true;
  let error = '';
  let q = '';
  let searchQuery = '';
  let filterRole = '';

  const roleOptions = [
    { value: '', label: 'ทุก Role' },
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
  ];

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    user: 'User',
  };

  const roleBadgeClass: Record<string, string> = {
    admin:   'badge-admin',
    manager: 'badge-manager',
    user:    'badge-user',
  };

  let showDeleteDialog = false;
  let deleteTarget: User | null = null;
  let deleting = false;

  async function fetchUsers() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (filterRole)  params.set('role', filterRole);
      const path = `${API_ENDPOINTS.USERS}?${params.toString()}`;
      const result = await apiFetch<{ success: boolean; data: User[] }>(path);
      items = result.data || [];
    } catch (e) {
      error = 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้';
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    searchQuery = q;
    fetchUsers();
  }

  function confirmDelete(user: User) {
    deleteTarget = user;
    showDeleteDialog = true;
  }

  async function doDelete() {
    if (!deleteTarget) return;
    deleting = true;
    try {
      await apiFetch(API_ENDPOINTS.USER_DETAIL(deleteTarget.uuid), { method: 'DELETE' });
      items = items.filter(u => u.uuid !== deleteTarget!.uuid);
      showDeleteDialog = false;
      deleteTarget = null;
    } catch (e) {
      error = 'ลบผู้ใช้ไม่สำเร็จ';
    } finally {
      deleting = false;
    }
  }

  onMount(fetchUsers);
</script>

<div class="page-container">
  <div class="search-container">
    <div class="search-input-wrapper">
      <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        bind:value={q}
        on:keydown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="ค้นหาชื่อ หรือ email..."
        class="search-input"
      />
      {#if q}
        <button class="search-clear-btn" on:click={() => { q = ''; searchQuery = ''; fetchUsers(); }} aria-label="ล้าง">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      {/if}
      <button class="search-submit-btn" on:click={handleSearch}>ค้นหา</button>
    </div>
    <div class="role-filter">
      <Dropdown
        options={roleOptions}
        bind:value={filterRole}
        on:change={fetchUsers}
        placeholder="ทุก Role"
      />
    </div>
    <button class="btn-primary" style="margin-left:auto" on:click={() => goto('/admin/users/add-user')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      เพิ่มผู้ใช้
    </button>
  </div>

  {#if loading}
    <div class="loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>
  {:else if error}
    <div class="error-box"><p>❌ {error}</p><button class="retry-btn" on:click={fetchUsers}>ลองอีกครั้ง</button></div>
  {:else if items.length === 0}
    <div class="empty-box"><p>ไม่พบข้อมูลผู้ใช้</p></div>
  {:else}
    <div class="card-wrapper">
      <div class="table-container table-no-radius">
        <table class="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>ชื่อ</th>
              <th>นามสกุล</th>
              <th>Role</th>
              <th>หน่วยงาน</th>
              <th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            {#each items as u (u.uuid)}
              <tr>
                <td>{u.email}</td>
                <td>{u.firstName || '-'}</td>
                <td>{u.lastName || '-'}</td>
                <td><span class="badge {roleBadgeClass[u.role] || 'badge-user'}">{roleLabels[u.role] || u.role}</span></td>
                <td>{u.departmentName || '-'}</td>
                <td>
                  <div class="row-actions">
                    <button class="action-btn edit-btn" on:click={() => goto(`/admin/users/${u.uuid}`)}>แก้ไข</button>
                    <button class="action-btn delete-btn" on:click={() => confirmDelete(u)}>ลบ</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirm Dialog -->
{#if showDeleteDialog}
  <div class="modal-overlay" on:click|self={() => (showDeleteDialog = false)} role="presentation">
    <div class="modal-content">
      <h3 class="modal-title">ยืนยันการลบ</h3>
      <p class="modal-text">ต้องการลบผู้ใช้ <strong>{deleteTarget?.email}</strong> ใช่หรือไม่?</p>
      <div class="modal-actions">
        <button class="btn-cancel" on:click={() => (showDeleteDialog = false)} disabled={deleting}>ยกเลิก</button>
        <button class="btn-delete" on:click={doDelete} disabled={deleting}>{deleting ? 'กำลังลบ...' : 'ลบ'}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
  .header-actions { display: flex; gap: 0.75rem; }
  .search-container { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; }
  .role-filter { width: 160px; flex-shrink: 0; }
  .table { table-layout: auto; width: 100%; }
  .table th { padding: 0.875rem 1rem; text-transform: none; font-size: 0.875rem; letter-spacing: normal; }
  .table td { padding: 0.875rem 1rem; font-size: 0.875rem; }
  .card-wrapper { background: white; border-radius: 0.75rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  .table-no-radius { border-radius: 0 !important; box-shadow: none !important; }
  .badge { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .badge-admin   { background: #fef3c7; color: #92400e; }
  .badge-manager { background: #dbeafe; color: #1e40af; }
  .badge-user    { background: #f3f4f6; color: #374151; }
  .row-actions { display: flex; gap: 0.5rem; }
  .action-btn { padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.8125rem; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
  .edit-btn { background: #f3f4f6; color: #374151; border-color: #e5e7eb; }
  .edit-btn:hover { background: #e5e7eb; }
  .delete-btn { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .delete-btn:hover { background: #fecaca; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 500; display: flex; align-items: center; justify-content: center; }
  .modal-content { background: white; border-radius: 1rem; padding: 2rem; width: min(420px, 90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); }
  .modal-title { font-size: 1.125rem; font-weight: 700; color: #111827; margin: 0 0 0.75rem; }
  .modal-text { color: #4b5563; margin: 0 0 1.5rem; }
  .modal-actions { display: flex; justify-content: center; gap: 0.75rem; }
  .modal-actions button { flex: 1; max-width: 8rem; }
  .btn-cancel { padding: 0.5rem 1.25rem; border: 1px solid #d1d5db; border-radius: 0.5rem; background: white; color: #374151; font-size: 0.875rem; cursor: pointer; }
  .btn-delete { padding: 0.5rem 1.25rem; border: none; border-radius: 0.5rem; background: #dc2626; color: white; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
  .btn-delete:hover:not(:disabled) { background: #b91c1c; }
  .btn-delete:disabled, .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
