<script lang="ts">
  import Dropdown from './Dropdown.svelte';

  export let currentPage: number = 1;
  export let totalPages: number = 1;
  export let totalItems: number = 0;
  export let limit: number = 20;
  export let limitOptions: number[] = [10, 25, 50, 100];
  export let onpagechange: (() => void) | undefined = undefined;
  export let onlimitchange: (() => void) | undefined = undefined;

  let jumpPage = '';

  $: pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  })();

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === currentPage) return;
    currentPage = p;
    onpagechange?.();
  }

  function handleJump() {
    const p = parseInt(jumpPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) goToPage(p);
    jumpPage = '';
  }

  function handleLimitChange() {
    currentPage = 1;
    onlimitchange?.();
  }
</script>

<div class="pagination-bar">
  <div class="pagination-info">
    <span class="pagination-label">แสดง</span>
    <Dropdown
      compact
      dropUp
      options={limitOptions.map(o => ({ value: o, label: String(o) }))}
      bind:value={limit}
      on:change={handleLimitChange}
    />
    <span class="pagination-label">รายการต่อหน้า</span>
    <span class="pagination-count">({totalItems.toLocaleString('th-TH')} รายการทั้งหมด)</span>
  </div>

  <div class="pagination-nav">
    <button class="page-btn nav-btn" disabled={currentPage === 1} on:click={() => goToPage(currentPage - 1)} aria-label="หน้าก่อนหน้า">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
    </button>
    {#each pageNumbers as p}
      {#if p === '...'}
        <span class="page-ellipsis">…</span>
      {:else}
        <button
          class="page-btn"
          class:active={currentPage === p}
          disabled={currentPage === p}
          on:click={() => goToPage(Number(p))}
        >{p}</button>
      {/if}
    {/each}
    <button class="page-btn nav-btn" disabled={currentPage === totalPages} on:click={() => goToPage(currentPage + 1)} aria-label="หน้าถัดไป">
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
    </button>
    <div class="pagination-jump">
      <span>ไปหน้า</span>
      <input
        class="pagination-jump-input"
        type="number"
        min="1"
        max={totalPages}
        bind:value={jumpPage}
        on:keydown={e => e.key === 'Enter' && handleJump()}
      />
      <button class="pagination-jump-btn" on:click={handleJump}>ไป</button>
    </div>
  </div>
</div>

<style>
  .pagination-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.25rem;
    background: white;
    border-top: 1px solid #f3f4f6;
  }
  .pagination-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
  }
  .pagination-label { color: #6b7280; }
  .pagination-count { color: #9ca3af; font-size: 0.8125rem; margin-left: 0.25rem; }
  .pagination-nav { display: flex; align-items: center; gap: 0.25rem; }
  .page-btn {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
  }
  .page-btn:hover:not(:disabled):not(.active) { border-color: #ffa200; color: #ffa200; background: #fffbf5; }
  .page-btn.active { background: #ffa200; border-color: #ffa200; color: white; font-weight: 600; box-shadow: 0 1px 4px rgba(255,162,0,0.35); }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .page-btn.active:disabled { opacity: 1; cursor: default; }
  .nav-btn { color: #6b7280; }
  .page-ellipsis { min-width: 2rem; text-align: center; color: #9ca3af; font-size: 0.875rem; user-select: none; }
  .pagination-jump {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: 0.75rem;
    padding-left: 0.75rem;
    border-left: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 0.8125rem;
  }
  .pagination-jump-input {
    width: 3rem;
    height: 2rem;
    padding: 0 0.375rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    text-align: center;
    color: #374151;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
  }
  .pagination-jump-input:focus { border-color: #ffa200; }
  .pagination-jump-btn {
    height: 2rem;
    padding: 0 0.625rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .pagination-jump-btn:hover { border-color: #ffa200; color: #ffa200; background: #fffbf5; }
</style>
