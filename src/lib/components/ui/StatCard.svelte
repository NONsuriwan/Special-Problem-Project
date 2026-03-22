<script lang="ts">
  import Icon from './Icon.svelte';
  export let label: string;
  export let value: string | number = 0;
  export let icon: string = 'chart-bar';
  export let color: string = '#f39c12';
  export let bg: string = '#fff8ec';
</script>

<div class="rounded-xl shadow-sm border p-4 bg-white">
  <div class="flex items-center gap-3">
    <div class="stat-icon-wrap" style="background:{bg}; color:{color}">
      <Icon name={icon} size={22} strokeWidth={1.8} {color} />
    </div>
    <div>
      <div class="text-xs text-gray-500">{label}</div>
      <div class="text-2xl font-bold">{value}</div>
    </div>
  </div>
</div>

<style>
  .stat-icon-wrap {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
</style>
