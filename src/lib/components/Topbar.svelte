<script lang="ts">
  import { pageTitle, pageSubtitle } from "$lib/stores/pageTitle";
</script>

<header class="h-24 w-full border-b bg-white/80 backdrop-blur flex items-center justify-between px-6">
  <div>
    <h1 class="text-h2">{$pageTitle}</h1>
    {#if $pageSubtitle}
      <p class="text-b4 text-gray-500">{$pageSubtitle}</p>
    {/if}
  </div>
</header>
