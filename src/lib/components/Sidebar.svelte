<script lang="ts">
  import { page } from "$app/stores";

  const links = [
    { href: "/", label: "แดชบอร์ด", icon: "🏠" },
    { href: "/equipments", label: "ครุภัณฑ์", icon: "📦" },
    { href: "/mhesi", label: "เลข อว.", icon: "🧾" },
    { href: "/projects", label: "โครงการ", icon: "📁" },
    { href: "/reports", label: "รายงาน", icon: "📊" },
  ];

  const isActive = (p: string, href: string) =>
    p === href || (href !== "/" && p.startsWith(href));
</script>

<aside
  class="fixed left-0 top-0 h-screen w-(--sidebar-w) bg-brand-500 text-white flex flex-col"
>
  <div class="pt-5 pb-5 px-5 border-b border-white/20 text-center">
    <div class="mb-4 flex justify-center">
      <div class="w-32 h-32 rounded-full bg-white flex items-center justify-center">
        <img src="/images/logo.png" alt="logo" class="w-28 h-28 object-contain" />
      </div>
    </div>
    <div class="leading-tight">
      <div class="font-semibold text-base">ระบบบริหารครุภัณฑ์</div>
      <div class="text-xs opacity-90">คณะวิทยาศาสตร์</div>
    </div>
  </div>

  <nav class="flex-1 mt-6 px-3 space-y-2">
    <!-- ตัวอักษรใน sidebar ระหว่างรอ-->
    {#await $page}
      <div class="px-3 py-2 text-sm opacity-90">กำลังโหลด…</div>
    {:then p}
      {#each links as l}
        <!-- ตัวอักษรใน sidebar -->
        <a
          href={l.href}
          class="flex items-center gap-4 px-4 py-3 rounded-lg text-base hover:bg-white/10 transition
                {isActive(p.url.pathname, l.href) ? 'bg-white/15' : 'opacity-90'}"
        >
          <!-- icon -->
          <span class="text-2xl">{l.icon}</span>
          <!-- ตัวอักษร -->
          <span>{l.label}</span>
        </a>
        <hr class="border-white/20"/>
      {/each}
    {/await}
  </nav>
</aside>
