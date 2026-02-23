<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './+layout';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Topbar from '$lib/components/Topbar.svelte';
  
  export let data: LayoutData;
</script>

<div class="min-h-screen bg-gray-50">
  <Sidebar />
  <main class="ml-(--sidebar-w)">
    <Topbar />
    <section class="p-6">
      <slot />
    </section>
  </main>
</div>
