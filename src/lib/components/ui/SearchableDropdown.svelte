<script lang="ts">
  import { fade } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  export let options: { value: any; label: string; sublabel?: string }[] = [];
  export let value: any = null;
  export let placeholder: string = 'ค้นหา...';
  export let fullWidth: boolean = false;
  export let keepOpen: boolean = false;

  const dispatch = createEventDispatcher<{ change: any }>();

  let isOpen = false;
  let searchQ = '';
  let wrapperEl: HTMLDivElement;
  let inputEl: HTMLInputElement;
  let menuStyle = '';

  function calcMenuPosition() {
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuHeight = 320;
    if (spaceBelow >= Math.min(menuHeight, 200) || spaceBelow >= spaceAbove) {
      menuStyle = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;width:${rect.width}px;z-index:9999`;
    } else {
      menuStyle = `position:fixed;bottom:${window.innerHeight - rect.top + 4}px;left:${rect.left}px;width:${rect.width}px;z-index:9999`;
    }
  }

  $: selectedLabel = options.find(o => o.value === value)?.label ?? '';
  $: filtered = searchQ.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(searchQ.toLowerCase()) ||
        (o.sublabel ?? '').toLowerCase().includes(searchQ.toLowerCase())
      )
    : options.slice(0, 30);

  function open() {
    calcMenuPosition();
    isOpen = true;
    searchQ = '';
    setTimeout(() => inputEl?.focus(), 0);
  }

  function close() {
    isOpen = false;
    searchQ = '';
  }

  function select(option: { value: any; label: string }) {
    value = option.value;
    dispatch('change', option.value);
    if (keepOpen) {
      value = null;
      searchQ = '';
      setTimeout(() => inputEl?.focus(), 0);
    } else {
      close();
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (isOpen && wrapperEl && !wrapperEl.contains(e.target as Node)) {
      close();
    }
  }

  function handleScroll() {
    if (isOpen) {
      calcMenuPosition();
    }
  }

  function handleWheel(e: WheelEvent) {
    const el = e.currentTarget as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atTop = scrollTop === 0 && e.deltaY < 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
    if (atTop || atBottom) e.preventDefault();
  }
</script>

<svelte:window on:click|capture={handleClickOutside} on:scroll|capture={handleScroll} />

<style>
  .dropdown-wrapper {
    position: relative;
    display: inline-block;
  }

  .dropdown-wrapper.full-width {
    display: block;
    width: 100%;
  }

  .dropdown-button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 160px;
    width: 100%;
    box-sizing: border-box;
  }

  .dropdown-button:hover {
    border-color: #9ca3af;
  }

  .dropdown-button.open {
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.1);
  }

  .dropdown-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #111827;
    cursor: pointer;
    min-width: 0;
    font-family: inherit;
  }

  .dropdown-input::placeholder {
    color: #9ca3af;
  }

  .dropdown-input.show-placeholder {
    color: #9ca3af;
  }

  .chevron {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid #6b7280;
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }

  .dropdown-button.open .chevron {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    max-height: 320px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: inherit;
  }

  .dropdown-item:hover {
    background-color: #f3f4f6;
  }

  .dropdown-item.active {
    background-color: #fff8ec;
    color: #ffa200;
    font-weight: 500;
  }

  .item-label {
    font-size: 0.9375rem;
    color: #111827;
  }

  .dropdown-item.active .item-label {
    color: #ffa200;
  }

  .item-sublabel {
    font-size: 0.8125rem;
    color: #9ca3af;
    margin-top: 1px;
  }

  .dropdown-empty {
    padding: 12px;
    text-align: center;
    color: #9ca3af;
    font-size: 14px;
  }
</style>

<div class="dropdown-wrapper" class:full-width={fullWidth} bind:this={wrapperEl}>
  <div
    class="dropdown-button {isOpen ? 'open' : ''}"
    on:click={() => isOpen ? close() : open()}
    role="combobox"
    aria-expanded={isOpen}
  >
    <input
      bind:this={inputEl}
      class="dropdown-input {isOpen ? '' : (!selectedLabel ? 'show-placeholder' : '')}"
      value={isOpen ? searchQ : selectedLabel}
      on:input={e => { searchQ = (e.currentTarget as HTMLInputElement).value; }}
      placeholder={isOpen ? 'พิมพ์เพื่อค้นหา...' : placeholder}
      on:focus={open}
      on:click|stopPropagation
      readonly={!isOpen}
    />
    <span class="chevron"></span>
  </div>
  {#if isOpen}
    <div class="dropdown-menu" style={menuStyle} transition:fade={{ duration: 100 }} on:wheel|passive={false} on:wheel={handleWheel}>
      {#if filtered.length === 0}
        <div class="dropdown-empty">ไม่พบรายการ</div>
      {:else}
        {#each filtered as option (option.value)}
          <button
            class="dropdown-item {value === option.value ? 'active' : ''}"
            on:click={() => select(option)}
            type="button"
          >
            <span class="item-label">{option.label}</span>
            {#if option.sublabel}
              <span class="item-sublabel">{option.sublabel}</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
