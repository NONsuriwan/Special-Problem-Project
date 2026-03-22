<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';

  export let options: { value: any; label: string }[];
  export let value: any = null;
  export let placeholder: string = 'กรุณาเลือก';
  export let fullWidth: boolean = false;
  export let compact: boolean = false;
  export let dropUp: boolean = false;

  const dispatch = createEventDispatcher<{ change: any }>();

  let isOpen = false;
  let wrapperEl: HTMLDivElement;
  let menuStyle = '';

  $: selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() { node.remove(); }
    };
  }

  async function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      await tick();
      positionMenu();
    }
  }

  function positionMenu() {
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 220;
    const goUp = dropUp || (spaceBelow < menuHeight && rect.top > spaceBelow);

    if (goUp) {
      menuStyle = `top:${rect.top - 4}px; left:${rect.left}px; width:${rect.width}px; transform:translateY(-100%);`;
    } else {
      menuStyle = `top:${rect.bottom + 4}px; left:${rect.left}px; width:${rect.width}px;`;
    }
  }

  function select(option: { value: any; label: string }) {
    value = option.value;
    isOpen = false;
    dispatch('change', option.value);
  }

  function handleClickOutside(e: MouseEvent) {
    if (isOpen && wrapperEl && !wrapperEl.contains(e.target as Node)) {
      // The portalled menu is outside wrapperEl — don't close if clicking inside it
      if (!(e.target as Element).closest?.('.dd-menu')) {
        isOpen = false;
      }
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

<svelte:window
  on:click|capture={handleClickOutside}
  on:scroll={() => { if (isOpen) positionMenu(); }}
  on:resize={() => { if (isOpen) positionMenu(); }}
/>

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
    font-size: 14px;
    color: #374151;
  }

  .dropdown-button.compact {
    padding: 0.25rem 0.625rem;
    min-width: 64px;
    font-size: 0.8125rem;
    border-radius: 0.375rem;
    gap: 6px;
  }

  .dropdown-button:hover { border-color: #9ca3af; }

  .dropdown-button.open {
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.1);
  }

  .chevron {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transition: transform 0.3s ease;
    color: #374151;
  }

  .dropdown-button.compact .chevron { width: 14px; height: 14px; }
  .dropdown-button.open .chevron { transform: rotate(180deg); }

  .placeholder { color: #9ca3af; }

  :global(.dd-menu) {
    position: fixed;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    max-height: 220px;
    overflow-y: auto;
    z-index: 99999;
  }

  :global(.dd-item) {
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-size: 14px;
    color: #374151;
    display: block;
  }

  :global(.dd-item:hover) { background-color: #f3f4f6; }

  :global(.dd-item.active) {
    background-color: #fef3f2;
    color: #ffa200;
    font-weight: 500;
  }
</style>

<div class="dropdown-wrapper" class:full-width={fullWidth} bind:this={wrapperEl}>
  <button class="dropdown-button {isOpen ? 'open' : ''} {compact ? 'compact' : ''}" on:click={toggle} type="button">
    <span class={options.some(o => o.value === value) ? '' : 'placeholder'}>{selectedLabel}</span>
    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  </button>
  {#if isOpen}
    <div use:portal class="dd-menu" style={menuStyle} on:wheel|nonpassive={handleWheel}>
      {#each options as option, i (option.value ?? i)}
        <button
          class="dd-item {value === option.value ? 'active' : ''}"
          on:click={() => select(option)}
          type="button"
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
