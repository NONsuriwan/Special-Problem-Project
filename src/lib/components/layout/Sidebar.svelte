<script lang="ts">
  import { slide } from 'svelte/transition';
  import { page } from "$app/stores";
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { pageTitle, pageSubtitle } from "$lib/stores/pageTitle";
  import { apiFetch } from '$lib/api/client';
  import { API_ENDPOINTS } from '$lib/api/endpoints';
  import Icon from '$lib/components/ui/Icon.svelte';

  // ข้อมูลเมนูตามรายการที่คุณระบุ
  const links = [
    { href: "/", label: "แดชบอร์ด", icon: "chart-bar", subtitle: "ภาพรวมครุภัณฑ์คณะวิทยาศาสตร์" },
    {
      label: "ครุภัณฑ์",
      icon: "box",
      basePath: "/equipments",
      defaultTitle: "สืบค้นครุภัณฑ์รอเบิกจ่าย",
      defaultSubtitle: "รายการครุภัณฑ์ที่รอดำเนินการเบิกจ่าย",
      children: [
        { href: "/equipments/add-equipments", label: "ลงทะเบียนครุภัณฑ์", subtitle: "เพิ่มครุภัณฑ์ใหม่เข้าสู่ระบบ" },
        { href: "/equipments/disburse",  label: "เบิกจ่ายครุภัณฑ์",          subtitle: "เบิกจ่ายครุภัณฑ์ที่รอดำเนินการ" },
        { href: "/equipments/pending",   label: "สืบค้นครุภัณฑ์รอเบิกจ่าย",    subtitle: "รายการครุภัณฑ์ที่รอดำเนินการเบิกจ่าย" },
        { href: "/equipments/disbursed", label: "สืบค้นครุภัณฑ์เบิกจ่ายสำเร็จ", subtitle: "รายการครุภัณฑ์ที่เบิกจ่ายเสร็จสิ้นแล้ว" },
        { href: "/equipments/depreciation", label: "รายงานค่าเสื่อม",          subtitle: "รายงานค่าเสื่อมราคาของครุภัณฑ์" },
      ]
    },
    {
      label: "เลข อว.",
      icon: "document-text",
      basePath: "/mhesi",
      children: [
        { href: "/mhesi/add-mhesi", label: "ลงทะเบียนเลข อว.", subtitle: "เพิ่มเลข อว. ใหม่เข้าสู่ระบบ" },
        { href: "/mhesi", label: "สืบค้นเลข อว.", subtitle: "ค้นหา จัดการ และเพิ่มกิจกรรม" },
      ]
    },
    {
      label: "โครงการ",
      icon: "folder",
      basePath: "/projects",
      children: [
        { href: "/projects/add-project", label: "ลงทะเบียนโครงการ", subtitle: "เพิ่มโครงการใหม่เข้าสู่ระบบ" },
        { href: "/projects", label: "สืบค้นโครงการ", subtitle: "ค้นหา จัดการ และเพิ่มโครงการ" },
      ]
    },
    { href: "/reports", label: "รายงาน", icon: "trending-up", subtitle: "จัดการและสรุปข้อมูลของครุภัณฑ์", exact: true },
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

  // ตรวจสอบสถานะ Active ของ URL
  $: currentPath = $page.url.pathname;
  const isActive = (p: string, href: string, exact = false) =>
    p === href || (!exact && href !== "/" && p.startsWith(href + '/'));

  // Auto-open dropdown เมื่อ child active หรืออยู่ใต้ basePath
  $: {
    for (const l of links) {
      if (l.children) {
        const childMatch = l.children.some(c => c.href && isActive(currentPath, c.href));
        const baseMatch = l.basePath && currentPath.startsWith(l.basePath + '/');
        if (childMatch || baseMatch) openMenus[l.label] = true;
      }
    }
  }


  function selectChild(label: string, subtitle: string) {
    pageTitle.set(label);
    pageSubtitle.set(subtitle);
    sessionStorage.setItem('lastPageTitle', label);
    sessionStorage.setItem('lastPageSubtitle', subtitle);
  }

  function selectLink(label: string, subtitle: string) {
    pageTitle.set(label);
    pageSubtitle.set(subtitle);
  }

  // อัปเดต title/subtitle จาก URL — ใช้ afterNavigate เพื่อให้ทำงานหลัง navigation เสร็จ
  function updateTitle(path: string) {
    let found = false;
    for (const l of links) {
      if (!l.children && l.href && isActive(path, l.href, l.exact)) {
        pageTitle.set(l.label);
        pageSubtitle.set(l.subtitle ?? '');
        found = true;
        break;
      }
      if (l.children) {
        const matched = l.children.find(c => c.href && isActive(path, c.href, true));
        if (matched) {
          pageTitle.set(matched.label);
          pageSubtitle.set(matched.subtitle ?? '');
          sessionStorage.setItem('lastPageTitle', matched.label);
          sessionStorage.setItem('lastPageSubtitle', matched.subtitle ?? '');
          found = true;
          break;
        }
        if (l.basePath && path.startsWith(l.basePath + '/')) {
          const stored = sessionStorage.getItem('lastPageTitle');
          const storedSub = sessionStorage.getItem('lastPageSubtitle');
          pageTitle.set(stored || l.defaultTitle || l.label);
          pageSubtitle.set(storedSub || l.defaultSubtitle || '');
          found = true;
          break;
        }
      }
    }
    if (!found && isActive(path, '/admin')) {
      pageTitle.set('จัดการผู้ใช้');
      pageSubtitle.set('จัดการและกำหนดสิทธิ์ผู้ใช้งานระบบ');
    }
  }

  afterNavigate(() => {
    updateTitle($page.url.pathname);
  });

  onMount(() => {
    updateTitle($page.url.pathname);
  });

  // ── User / Auth ──────────────────────────────
  type UserInfo = {
    uuid: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };

  let userInfo: UserInfo | null = null;
  let showUserMenu = false;
  let loggingOut = false;

  $: displayName = userInfo
    ? [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') || userInfo.email
    : '—';

  $: avatarUrl = userInfo
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=f39c12&bold=true`
    : `https://ui-avatars.com/api/?name=U&background=ffffff&color=f39c12`;

  async function fetchUser() {
    try {
      const result = await apiFetch<{ data: UserInfo }>(API_ENDPOINTS.AUTH.ME);
      userInfo = result.data;
    } catch (_) { /* ไม่แสดง error */ }
  }

  async function logout() {
    loggingOut = true;
    try {
      await apiFetch(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
    } catch (_) { /* ignore */ } finally {
      loggingOut = false;
      showUserMenu = false;
      // hard reload เพื่อให้ server hooks reset สถานะ auth ใหม่
      window.location.href = '/login';
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.user-bar')) {
      showUserMenu = false;
    }
  }

  onMount(() => {
    fetchUser();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });
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

  <nav class="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
    {#each links as l}
      <div>
        {#if l.children}
          <button
            on:click={() => toggleMenu(l.label)}
            class="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-black/5 transition-colors"
          >
            <div class="flex items-center gap-4">
              <span class="sidebar-icon"><Icon name={l.icon} size={24} strokeWidth={1.8} /></span>
              <span class="text-b6 ">{l.label}</span>
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
                  class="child-link flex items-start gap-2 ml-2 pl-2 pr-3 py-3 text-b6 transition-all rounded-lg
                        {isActive(currentPath, child.href, true) ? 'child-active bg-white/20' : 'opacity-70 hover:opacity-100'}"
                >
                  <span class="text-white/50 leading-5 shrink-0">›</span>
                  <span class="leading-5 {isActive(currentPath, child.href, true) ? 'font-medium' : ''}">{child.label}</span>
                </a>
              {/each}
            </div>
          {/if}
        {:else}
          <a
            href={l.href}
            on:click={() => selectLink(l.label, l.subtitle ?? '')}
            class="flex items-center gap-5 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors
                  {isActive(currentPath, l.href, l.exact) ? 'bg-white/20' : 'opacity-90'}"
          >
            <span class="sidebar-icon"><Icon name={l.icon} size={24} strokeWidth={1.8} /></span>
            <span class="text-b6">{l.label}</span>
          </a>
        {/if}
      </div>
    {/each}

    {#if $page.data.user?.role === 'admin'}
      <a
        href="/admin/users"
        class="flex items-center gap-5 px-4 py-3 rounded-lg hover:bg-black/5 transition-colors
               {isActive(currentPath, '/admin') ? 'bg-white/20' : 'opacity-90'}"
      >
        <span class="sidebar-icon"><Icon name="users" size={24} strokeWidth={1.8} /></span>
        <span class="text-b6">จัดการผู้ใช้</span>
      </a>
    {/if}
  </nav>

  <!-- User bar -->
  <div class="user-bar relative p-4 bg-black/5 border-t border-white/10">
    <!-- Popup menu — appears above -->
    {#if showUserMenu}
      <div class="user-popup" transition:slide={{ duration: 150 }}>
        <button class="user-popup-logout" on:click={logout} disabled={loggingOut}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v1"/>
          </svg>
          {loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
        </button>
      </div>
    {/if}

    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 bg-white/20 shrink-0">
        <img src={avatarUrl} alt="User" class="w-full h-full object-cover" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-b6 font-semibold truncate">{displayName}</p>
        <p class="text-[12px] opacity-80 truncate">{userInfo?.email ?? '—'}</p>
      </div>
      <button
        class="dots-btn"
        on:click|stopPropagation={() => (showUserMenu = !showUserMenu)}
        title="ตัวเลือก"
      >
        <span class="dots-icon">•••</span>
      </button>
    </div>
  </div>
</aside>

<style>
  .sidebar-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .child-link {
    letter-spacing: 0.01em;
  }

  .child-active {
    opacity: 1;
    font-weight: 600;
  }

  .child-label-active {
    border-bottom: 1px solid rgba(255, 255, 255, 0.7);
    padding-bottom: 1px;
  }

  /* ซ่อน Scrollbar สำหรับความสวยงาม */
  nav::-webkit-scrollbar {
    width: 0px;
  }

  :global(.chevron-icon) {
    transition: transform 0.3s ease;
  }

  /* ── Dots button ── */
  .dots-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.375rem;
    border-radius: 0.375rem;
    transition: background 0.15s;
    flex-shrink: 0;
    line-height: 1;
  }

  .dots-btn:hover {
    background: rgba(255,255,255,0.15);
  }

  .dots-icon {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.7);
    letter-spacing: 1px;
  }

  /* ── User Popup ── */
  .user-popup {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    left: 0.75rem;
    right: 0.75rem;
    background: #fff;
    border-radius: 0.875rem;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
    z-index: 50;
  }

  .user-popup-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1rem 0.875rem;
  }

  .user-popup-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 2px solid #f0f0f0;
    flex-shrink: 0;
    object-fit: cover;
  }

  .user-popup-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    overflow: hidden;
  }

  .user-popup-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-popup-email {
    font-size: 0.75rem;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-popup-role {
    font-size: 0.6875rem;
    color: #f39c12;
    font-weight: 500;
    text-transform: capitalize;
    margin-top: 0.1rem;
  }

  .user-popup-divider {
    height: 1px;
    background: #f3f4f6;
    margin: 0;
  }

  .user-popup-logout {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #dc2626;
    transition: background 0.15s;
    text-align: left;
  }

  .user-popup-logout:hover:not(:disabled) {
    background: #fff5f5;
  }

  .user-popup-logout:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
