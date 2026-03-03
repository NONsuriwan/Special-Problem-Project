<script lang="ts">
  export let label: string;
  export let value: string | number = 0;
  export let icon: string = '📊';
</script>

<div class="rounded-xl shadow-sm border p-4 bg-white">
  <div class="flex items-center gap-3">
    <div class="h-10 w-10 grid place-items-center rounded-lg bg-brand-100 text-xl">
      {icon}
    </div>
    <div>
      <div class="text-xs text-gray-500">{label}</div>
      <div class="text-2xl font-bold">{value}</div>
    </div>
  </div>
</div>
