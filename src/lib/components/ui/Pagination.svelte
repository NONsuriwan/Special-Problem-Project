<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dropdown from './Dropdown.svelte';

  export let currentPage: number = 1;
  export let totalPages: number = 0;
  export let totalItems: number = 0;
  export let limit: number = 10;
  export let limitOptions: number[] = [10, 25, 50, 100];

  const dispatch = createEventDispatcher<{ change: { page: number; limit: number } }>();

  function goToPage(p: number) {
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    dispatch('change', { page: currentPage, limit });
  }

  function onLimitChange() {
    currentPage = 1;
    dispatch('change', { page: currentPage, limit });
  }

  $: pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  })();
</script>

<div class="pagination-bar">
  <div class="pagination-info">
    <span class="pagination-label">แสดง</span>
    <Dropdown
      compact
      dropUp
      options={limitOptions.map(o => ({ value: o, label: String(o) }))}
      bind:value={limit}
      on:change={onLimitChange}
    />
    <span class="pagination-label">รายการต่อหน้า</span>
    <span class="pagination-count">
      ({totalItems.toLocaleString('th-TH')} รายการทั้งหมด)
    </span>
  </div>

  <div class="pagination-nav">
    <button
      class="page-btn nav-btn"
      disabled={currentPage === 1}
      on:click={() => goToPage(currentPage - 1)}
      aria-label="หน้าก่อนหน้า"
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    {#each pageNumbers as p}
      {#if p === '...'}
        <span class="page-ellipsis">…</span>
      {:else}
        <button
          class="page-btn {currentPage === p ? 'active' : ''}"
          disabled={currentPage === p}
          on:click={() => goToPage(typeof p === 'number' ? p : 0)}
        >{p}</button>
      {/if}
    {/each}

    <button
      class="page-btn nav-btn"
      disabled={currentPage === totalPages}
      on:click={() => goToPage(currentPage + 1)}
      aria-label="หน้าถัดไป"
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</div>
