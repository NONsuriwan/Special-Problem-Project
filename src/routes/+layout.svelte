<script lang="ts">
  import '../app.css';
  import type { LayoutData } from './$types';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';

  export let data: LayoutData;
</script>

{#if data.isAuthenticated}
  <div class="min-h-screen bg-gray-50">
    <Sidebar />
    <main class="ml-(--sidebar-w)">
      <Topbar />
      <section class="p-6">
        <slot />
      </section>
    </main>
  </div>
{:else}
  <slot />
{/if}
