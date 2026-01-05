<script lang="ts">
  import { page } from "$app/stores";

  // ข้อมูลเมนูตามรายการที่คุณระบุ
  const links = [
    { href: "/", label: "แดชบอร์ด", icon: "📊" },
    { 
      label: "ครุภัณฑ์", 
      icon: "📦",
      children: [
        { href: "/equipments/add-equipments", label: "ลงทะเบียนครุภัณฑ์" },
        { href: "/equipments", label: "สืบค้นครุภัณฑ์" },
        { href: "/equipments", label: "รายงานค่าเสื่อม" },
      ]
    },
    { 
      label: "เลข อว.", 
      icon: "🧾",
      children: [
        { href: "/mhesi", label: "ลงทะเบียนเลข อว." },
        { href: "/mhesi", label: "สืบค้นเลข อว." },
      ]
    },
    { 
      label: "โครงการ", 
      icon: "📁",
      children: [
        { href: "/projects", label: "ลงทะเบียนโครงการ" },
        { href: "/projects", label: "สืบค้นโครงการ" },
      ]
    },
    { href: "/reports", label: "รายงาน", icon: "📈" },
  ];

  // เก็บสถานะการเปิด/ปิด Dropdown
  let openMenus: Record<string, boolean> = {
    "ครุภัณฑ์": false,
    "เลข อว.": false,
    "โครงการ": false,
  };

  function toggleMenu(label: string) {
    openMenus[label] = !openMenus[label];
  }

  // ตรวจสอบสถานะ Active ของ URL [cite: 2]
  $: currentPath = $page.url.pathname;
  const isActive = (p: string, href: string) =>
    p === href || (href !== "/" && p.startsWith(href));
</script>

<aside
  class="fixed left-0 top-0 h-screen w-(--sidebar-w) bg-[#f39c12] text-white flex flex-col shadow-lg"
>
  <div class="pt-8 pb-6 px-5 text-center">
    <div class="mb-4 flex justify-center">
      <div class="w-24 h-24 rounded-full bg-white flex items-center justify-center p-2 shadow-sm">
        <img src="/images/logo.png" alt="logo" class="w-20 h-20 object-contain" />
      </div>
    </div>
    <div class="leading-tight">
      <div class="font-bold text-lg">ระบบจัดการครุภัณฑ์</div>
      <div class="text-xs opacity-90 font-light">คณะวิทยาศาสตร์</div>
    </div>
  </div>

  <hr class="border-white/20 mx-6 mb-4"/>

  <nav class="flex-1 px-3 space-y-1 overflow-y-auto">
    {#each links as l}
      <div>
        {#if l.children}
          <button
            on:click={() => toggleMenu(l.label)}
            class="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm hover:bg-black/5 transition-colors
                  {l.children.some(child => isActive(currentPath, child.href)) ? 'bg-white/20' : ''}"
          >
            <div class="flex items-center gap-4">
              <span class="text-xl">{l.icon}</span>
              <span class="font-medium">{l.label}</span>
            </div>
            <span class="text-[10px] transform transition-transform {openMenus[l.label] ? 'rotate-180' : ''}">
              ▼
            </span>
          </button>

          {#if openMenus[l.label]}
            <div class="mt-1 flex flex-col">
              {#each l.children as child}
                <a
                  href={child.href}
                  class="block pl-14 py-2 text-sm opacity-90 hover:opacity-100 hover:translate-x-1 transition-all
                        {isActive(currentPath, child.href) ? 'font-bold underline underline-offset-4' : ''}"
                >
                  {child.label}
                </a>
              {/each}
            </div>
          {/if}
        {:else}
          <a
            href={l.href}
            class="flex items-center gap-4 px-4 py-3 rounded-lg text-sm hover:bg-black/5 transition-colors
                  {isActive(currentPath, l.href) ? 'bg-white/20' : 'opacity-90'}"
          >
            <span class="text-xl">{l.icon}</span>
            <span class="font-medium">{l.label}</span>
          </a>
        {/if}
      </div>
    {/each}
  </nav>

  <div class="p-4 bg-black/5 border-t border-white/10">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 bg-gray-200">
        <img src="https://ui-avatars.com/api/?name=Sommoot" alt="User" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate">นายสมมุติ มีอยู่จริง</p>
        <p class="text-[10px] opacity-80 truncate">sommoot@kmitl.ac.th</p>
      </div>
      <button class="text-white/60 hover:text-white transition-colors">
        <span class="text-xs">•••</span>
      </button>
    </div>
  </div>
</aside>

<style>
  /* ซ่อน Scrollbar สำหรับความสวยงาม */
  nav::-webkit-scrollbar {
    width: 0px;
  }
</style>