<script lang="ts">
  import { slide } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  export let options: { value: any; label: string }[];
  export let value: any = null;
  export let placeholder: string = 'กรุณาเลือก';
  export let fullWidth: boolean = false;

  const dispatch = createEventDispatcher<{ change: any }>();

  let isOpen = false;

  $: selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  function toggle() {
    isOpen = !isOpen;
  }

  function select(option: { value: any; label: string }) {
    value = option.value;
    isOpen = false;
    dispatch('change', option.value);
  }
</script>

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
  }

  .dropdown-button:hover {
    border-color: #9ca3af;
  }

  .dropdown-button.open {
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.1);
  }

  .chevron {
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 6px solid currentColor;
    transition: transform 0.3s ease;
    flex-shrink: 0;
  }

  .dropdown-button.open .chevron {
    transform: rotate(180deg);
  }

  .placeholder {
    color: #9ca3af;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 150px;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .dropdown-item {
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.2s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-size: 14px;
  }

  .dropdown-item:hover {
    background-color: #f3f4f6;
  }

  .dropdown-item.active {
    background-color: #fef3f2;
    color: #ffa200;
    font-weight: 500;
  }
</style>

<div class="dropdown-wrapper" class:full-width={fullWidth}>
  <button class="dropdown-button {isOpen ? 'open' : ''}" on:click={toggle} type="button">
    <span class={value === null ? 'placeholder' : ''}>{selectedLabel}</span>
    <span class="chevron"></span>
  </button>
  {#if isOpen}
    <div class="dropdown-menu" transition:slide={{ duration: 150 }}>
      {#each options as option}
        <button
          class="dropdown-item {value === option.value ? 'active' : ''}"
          on:click={() => select(option)}
          type="button"
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
