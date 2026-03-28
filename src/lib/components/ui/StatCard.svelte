<script lang="ts">
  import Icon from './Icon.svelte';
  export let label: string;
  export let value: string | number = 0;
  export let icon: string = 'chart-bar';
  export let color: string = '#f39c12';
  export let bg: string = '#fff8ec';
</script>

<div class="stat-card">
  <div class="stat-icon-wrap" style="background:{bg}; color:{color}">
    <Icon name={icon} size={20} strokeWidth={1.8} {color} />
  </div>
  <div class="stat-body">
    <div class="stat-label">{label}</div>
    <div class="stat-value">{value}</div>
  </div>
  <div class="stat-accent" style="background:{color}"></div>
</div>

<style>
  .stat-card {
    position: relative;
    background: white;
    border-radius: 0.75rem;
    padding: 1.125rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    border: 1px solid #f1f1f1;
    overflow: hidden;
  }

  .stat-icon-wrap {
    width: 2.625rem;
    height: 2.625rem;
    border-radius: 0.625rem;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .stat-body {
    flex: 1;
    min-width: 0;
  }

  .stat-label {
    font-size: 0.78rem;
    color: #9ca3af;
    font-weight: 500;
    margin-bottom: 0.2rem;
    white-space: nowrap;
  }

  .stat-value {
    font-size: 1.625rem;
    font-weight: 700;
    color: #111827;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  .stat-accent {
    position: absolute;
    left: 0;
    top: 20%;
    bottom: 20%;
    width: 3px;
    border-radius: 0 2px 2px 0;
    opacity: 0.7;
  }
</style>
