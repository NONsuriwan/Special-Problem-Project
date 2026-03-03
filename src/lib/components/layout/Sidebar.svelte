<script lang="ts">
  import { slide } from 'svelte/transition';
  import { page } from "$app/stores";
  import { pageTitle, pageSubtitle } from "$lib/stores/pageTitle";

  // ข้อมูลเมนูตามรายการที่คุณระบุ
  const links = [
    { href: "/", label: "แดชบอร์ด", icon: "📊", subtitle: "ภาพรวมครุภัณฑ์คณะวิทยาศาสตร์" },
    {
      label: "ครุภัณฑ์",
      icon: "📦",
      children: [
        { href: "/equipments/add-equipments", label: "ลงทะเบียนครุภัณฑ์", subtitle: "เพิ่มครุภัณฑ์ใหม่เข้าสู่ระบบ" },
        { href: "/equipments", label: "สืบค้นครุภัณฑ์", subtitle: "ค้นหา จัดการ และเพิ่มครุภัณฑ์" },
        { href: "/equipments", label: "รายงานค่าเสื่อม", subtitle: "รายงานค่าเสื่อมราคาของครุภัณฑ์" },
      ]
    },
    {
      label: "เลข อว.",
      icon: "🧾",
      children: [
        { href: "/mhesi", label: "ลงทะเบียนเลข อว.", subtitle: "เพิ่มเลข อว. ใหม่เข้าสู่ระบบ" },
        { href: "/mhesi", label: "สืบค้นเลข อว.", subtitle: "ค้นหา จัดการ และเพิ่มกิจกรรม" },
      ]
    },
    {
      label: "โครงการ",
      icon: "📁",
      children: [
        { href: "/projects", label: "ลงทะเบียนโครงการ", subtitle: "เพิ่มโครงการใหม่เข้าสู่ระบบ" },
        { href: "/projects", label: "สืบค้นโครงการ", subtitle: "ค้นหา จัดการ และเพิ่มโครงการ" },
      ]
    },
    { href: "/reports", label: "รายงาน", icon: "📈", subtitle: "จัดการและสรุปข้อมูลของครุภัณฑ์" },
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

  // ติดตาม child ที่ถูกเลือกด้วย label
  let selectedChildLabel: string | null = null;

  function selectChild(label: string, subtitle: string) {
    selectedChildLabel = label;
    pageTitle.set(label);
    pageSubtitle.set(subtitle);
  }

  function selectLink(label: string, subtitle: string) {
    selectedChildLabel = null;
    pageTitle.set(label);
    pageSubtitle.set(subtitle);
  }

  // อัปเดต title/subtitle จาก URL ทุกครั้งที่ path เปลี่ยน
  $: {
    let found = false;
    for (const l of links) {
      if (!l.children && l.href && isActive(currentPath, l.href)) {
        pageTitle.set(l.label);
        pageSubtitle.set(l.subtitle ?? '');
        found = true;
        break;
      }
      if (l.children) {
        // หา child ที่ตรงกับ selectedChildLabel ก่อน ถ้าไม่มีค่อยใช้ first match
        const clicked = selectedChildLabel
          ? l.children.find(c => c.label === selectedChildLabel && c.href && isActive(currentPath, c.href))
          : null;
        const matched = clicked ?? l.children.find(c => c.href && isActive(currentPath, c.href));
        if (matched) {
          pageTitle.set(matched.label);
          pageSubtitle.set(matched.subtitle ?? '');
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
</script>

<aside
  class="fixed left-0 top-0 h-screen w-(--sidebar-w) bg-[#f39c12] text-white flex flex-col shadow-lg"
>
  <div class="pt-8 pb-6 px-5 text-center flex flex-col items-center justify-center">
    <div class="mb-4 flex justify-center">
      <div class="w-24 h-24 rounded-full bg-white flex items-center justify-center p-2 shadow-sm">
        <img src="/images/logo.png" alt="logo" class="w-20 h-20 object-contain" />
      </div>
    </div>
    <div class="leading-tight">
      <div class="text-b2">ระบบจัดการครุภัณฑ์</div>
      <div class="text-b4 opacity-90 font-light">คณะวิทยาศาสตร์</div>
    </div>
  </div>

  <hr class="border-white/20 mx-6 mb-4"/>

  <nav class="flex-1 px-3 space-y-1 overflow-y-auto">
    {#each links as l}
      <div>
        {#if l.children}
          <button
            on:click={() => toggleMenu(l.label)}
            class="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-black/5 transition-colors
                  {l.children.some(child => isActive(currentPath, child.href)) ? 'bg-white/20' : ''}"
          >
            <div class="flex items-center-safe gap-4">
              <span class="text-2xl">{l.icon}</span>
              <span class="text-b6">{l.label}</span>
            </div>
            <span class="text-[10px] transform transition-transform {openMenus[l.label] ? 'rotate-180' : ''}">
              ▼
            </span>
          </button>

          {#if openMenus[l.label]}
            <div class="mt-1 flex flex-col" transition:slide={{duration: 150}}>
              {#each l.children as child}
                <a
                  href={child.href}
                  on:click={() => selectChild(child.label, child.subtitle ?? '')}
                  class="block pl-20 py-2 text-b6 hover:translate-x-1 transition-all
                        {selectedChildLabel === child.label ? 'font-bold underline underline-offset-4' : ''}"
                >
                  {child.label}
                </a>
              {/each}
            </div>
          {/if}
        {:else}
          <a
            href={l.href}
            on:click={() => selectLink(l.label, l.subtitle ?? '')}
            class="flex items-center gap-5 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors
                  {isActive(currentPath, l.href) ? 'bg-white/20' : 'opacity-90'}"
          >
            <span class="text-xl">{l.icon}</span>
            <span class="text-b6">{l.label}</span>
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

  :global(.chevron-icon) {
    transition: transform 0.3s ease;
  }
</style>
