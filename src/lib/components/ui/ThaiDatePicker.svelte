<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';

  export let value: string = '';
  export let placeholder: string = 'วว/ดด/ปปปป';
  export let error: boolean = false;
  export let inputClass: string = 'input';

  const dispatch = createEventDispatcher<{ change: string }>();

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
    'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
    'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  // 'day' | 'month' | 'year'
  let mode: 'day' | 'month' | 'year' = 'day';
  let open = false;
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();

  // Year picker: show a range of years
  const YEAR_PAGE = 16;
  let yearRangeStart = Math.floor((new Date().getFullYear()) / YEAR_PAGE) * YEAR_PAGE;

  // Position for portal calendar
  let calTop = 0;
  let calLeft = 0;
  const CAL_HEIGHT = 320; // approximate calendar height in px
  let btnEl: HTMLButtonElement;

  // Portal: move calendar div to body
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() { node.remove(); }
    };
  }

  function closeOnScroll() {
    if (open) open = false;
  }

  onDestroy(() => {
    open = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', closeOnScroll, true);
    }
  });

  $: selectedDate = value ? new Date(value + 'T00:00:00') : null;

  $: displayValue = (() => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${parseInt(y) + 543}`;
  })();

  function openPicker() {
    const d = selectedDate || new Date();
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    yearRangeStart = Math.floor(viewYear / YEAR_PAGE) * YEAR_PAGE;
    mode = 'day';
    // Calculate fixed position from button — open upward if not enough space below
    if (btnEl) {
      const rect = btnEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 6;
      calLeft = rect.left;
      calTop = spaceBelow >= CAL_HEIGHT
        ? rect.bottom + 6
        : rect.top - CAL_HEIGHT - 6;
    }
    open = true;
    window.addEventListener('scroll', closeOnScroll, true);
  }

  function closePicker() {
    open = false;
    window.removeEventListener('scroll', closeOnScroll, true);
  }

  function prevMonth() {
    if (viewMonth === 0) { viewMonth = 11; viewYear--; }
    else viewMonth--;
  }

  function nextMonth() {
    if (viewMonth === 11) { viewMonth = 0; viewYear++; }
    else viewMonth++;
  }

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    value = `${viewYear}-${m}-${d}`;
    dispatch('change', value);
    closePicker();
  }

  function clearDate() {
    value = '';
    dispatch('change', '');
    closePicker();
  }

  function goToday() {
    const t = new Date();
    viewYear = t.getFullYear();
    viewMonth = t.getMonth();
    selectDay(t.getDate());
  }

  function selectMonth(m: number) {
    viewMonth = m;
    mode = 'day';
  }

  function selectYear(y: number) {
    viewYear = y;
    mode = 'month';
  }

  function prevYearPage() { yearRangeStart -= YEAR_PAGE; }
  function nextYearPage() { yearRangeStart += YEAR_PAGE; }

  $: daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  $: firstDay = new Date(viewYear, viewMonth, 1).getDay();
  $: beYear = viewYear + 543;
  $: yearRange = Array.from({ length: YEAR_PAGE }, (_, i) => yearRangeStart + i);
  $: beYearRangeStart = yearRangeStart + 543;
  $: beYearRangeEnd = yearRangeStart + YEAR_PAGE - 1 + 543;

  function isSelected(day: number): boolean {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === viewYear &&
           selectedDate.getMonth() === viewMonth &&
           selectedDate.getDate() === day;
  }

  function isToday(day: number): boolean {
    const t = new Date();
    return t.getFullYear() === viewYear &&
           t.getMonth() === viewMonth &&
           t.getDate() === day;
  }
</script>

<div class="picker-wrap">
  <!-- Visible input -->
  <button
    bind:this={btnEl}
    type="button"
    class="{inputClass} picker-btn"
    class:input-error={error}
    on:click={openPicker}
  >
    <span class={displayValue ? 'val' : 'ph'}>{displayValue || placeholder}</span>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  </button>

  <!-- Calendar (portaled to body) -->
  {#if open}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div use:portal class="cal-portal">
      <div class="backdrop" on:click={closePicker}></div>
      <div class="calendar" style="top:{calTop}px;left:{calLeft}px" on:click|stopPropagation>

      {#if mode === 'day'}
        <!-- Month/Year header -->
        <div class="cal-header">
          <button type="button" class="nav-btn" on:click={prevMonth}>‹</button>
          <button type="button" class="month-label-btn" on:click={() => (mode = 'month')}>
            {thaiMonths[viewMonth]} <span class="year-part">{beYear}</span>
            <span class="dropdown-arrow">▾</span>
          </button>
          <button type="button" class="nav-btn" on:click={nextMonth}>›</button>
        </div>

        <!-- Day names -->
        <div class="days-header">
          {#each thaiDays as d, i}
            <div class="day-name" class:sun={i === 0} class:sat={i === 6}>{d}</div>
          {/each}
        </div>

        <!-- Days grid -->
        <div class="days-grid">
          {#each { length: firstDay } as _}
            <div></div>
          {/each}
          {#each { length: daysInMonth } as _, i}
            {@const day = i + 1}
            <button
              type="button"
              class="day-btn"
              class:selected={isSelected(day)}
              class:today={isToday(day) && !isSelected(day)}
              on:click={() => selectDay(day)}
            >{day}</button>
          {/each}
        </div>

        <!-- Footer -->
        <div class="cal-footer">
          <button type="button" class="today-btn" on:click={goToday}>วันนี้</button>
          <button type="button" class="clear-btn" on:click={clearDate}>ล้าง</button>
        </div>

      {:else if mode === 'month'}
        <!-- Month picker -->
        <div class="cal-header">
          <button type="button" class="nav-btn" on:click={() => viewYear--}>‹</button>
          <button type="button" class="month-label-btn" on:click={() => (mode = 'year')}>
            <span class="year-part">{beYear}</span>
            <span class="dropdown-arrow">▾</span>
          </button>
          <button type="button" class="nav-btn" on:click={() => viewYear++}>›</button>
        </div>
        <div class="month-grid">
          {#each thaiMonthsShort as m, i}
            <button
              type="button"
              class="month-btn"
              class:month-selected={viewMonth === i && selectedDate?.getFullYear() === viewYear}
              class:month-current={new Date().getMonth() === i && new Date().getFullYear() === viewYear}
              on:click={() => selectMonth(i)}
            >{m}</button>
          {/each}
        </div>
        <div class="sub-footer">
          <button type="button" class="back-btn" on:click={() => (mode = 'day')}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            ย้อนกลับ
          </button>
        </div>

      {:else if mode === 'year'}
        <!-- Year picker -->
        <div class="cal-header">
          <button type="button" class="nav-btn" on:click={prevYearPage}>‹</button>
          <span class="month-label">{beYearRangeStart} – {beYearRangeEnd}</span>
          <button type="button" class="nav-btn" on:click={nextYearPage}>›</button>
        </div>
        <div class="year-grid">
          {#each yearRange as y}
            <button
              type="button"
              class="year-btn"
              class:year-selected={viewYear === y && selectedDate?.getFullYear() === y}
              class:year-current={new Date().getFullYear() === y}
              on:click={() => selectYear(y)}
            >{y + 543}</button>
          {/each}
        </div>
        <div class="sub-footer">
          <button type="button" class="back-btn" on:click={() => (mode = 'month')}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            ย้อนกลับ
          </button>
        </div>
      {/if}

    </div>
    </div>
  {/if}
</div>

<style>
  .picker-wrap {
    position: relative;
    width: 100%;
  }

  .picker-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    cursor: pointer;
    background: white;
    /* Standalone input styling (works even when inputClass CSS is scoped) */
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    color: #374151;
    box-sizing: border-box;
    font-family: inherit;
    line-height: 1.5;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .picker-btn:focus {
    outline: none;
    border-color: #ffa200;
    box-shadow: 0 0 0 3px rgba(255, 162, 0, 0.12);
  }

  .picker-btn.input-error {
    border-color: #dc2626;
  }

  .picker-btn svg {
    flex-shrink: 0;
    color: #9ca3af;
  }

  .val { color: #111827; font-size: 0.875rem; }
  .ph  { color: #9ca3af; font-size: 0.875rem; }

  /* Portal wrapper — appended to body, must not create a stacking context */
  :global(.cal-portal) {
    pointer-events: none;
  }

  /* Backdrop */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 9998;
    pointer-events: all;
  }

  /* Calendar popup */
  .calendar {
    position: fixed;
    z-index: 9999;
    pointer-events: all;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 0.75rem;
    min-width: 280px;
  }

  /* Header */
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .month-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #111827;
  }

  .month-label-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    color: #111827;
    padding: 0.2rem 0.5rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: background 0.15s;
  }

  .month-label-btn:hover { background: #f3f4f6; }

  .sub-footer {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .back-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
    border-radius: 0.375rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: background 0.15s;
  }

  .back-btn:hover { background: #f3f4f6; color: #111827; }

  .year-part { color: #111827; }

  .dropdown-arrow {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .nav-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    font-size: 1.25rem;
    line-height: 1;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: background 0.15s;
  }

  .nav-btn:hover { background: #f3f4f6; color: #111827; }

  /* Day names row */
  .days-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 0.25rem;
  }

  .day-name {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 500;
    color: #9ca3af;
    padding: 0.25rem 0;
  }

  .day-name.sun { color: #ef4444; }
  .day-name.sat { color: #3b82f6; }

  /* Days grid */
  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .day-btn {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    border: none;
    background: none;
    border-radius: 0.375rem;
    cursor: pointer;
    color: #374151;
    transition: background 0.15s;
  }

  .day-btn:hover { background: #f3f4f6; }

  .day-btn.today {
    color: #ffa200;
    font-weight: 700;
    border: 1.5px solid #ffa200;
  }

  .day-btn.selected {
    background: #ffa200;
    color: white;
    font-weight: 600;
  }

  /* Footer */
  .cal-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f3f4f6;
  }

  .today-btn, .clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: background 0.15s;
  }

  .today-btn { color: #ffa200; font-weight: 500; }
  .today-btn:hover { background: #fff7e6; }

  .clear-btn { color: #6b7280; }
  .clear-btn:hover { background: #f3f4f6; }

  /* Month grid */
  .month-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 0.25rem 0;
  }

  .month-btn {
    padding: 0.6rem 0.25rem;
    border: none;
    background: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.8125rem;
    color: #374151;
    transition: background 0.15s;
    text-align: center;
  }

  .month-btn:hover { background: #f3f4f6; }

  .month-btn.month-selected {
    background: #ffa200;
    color: white;
    font-weight: 600;
  }

  .month-btn.month-current {
    color: #ffa200;
    font-weight: 700;
  }

  .month-btn.month-selected.month-current {
    color: white;
  }

  /* Year grid */
  .year-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 0.25rem 0;
  }

  .year-btn {
    padding: 0.5rem 0.25rem;
    border: none;
    background: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.8125rem;
    color: #374151;
    transition: background 0.15s;
    text-align: center;
  }

  .year-btn:hover { background: #f3f4f6; }

  .year-btn.year-selected {
    background: #ffa200;
    color: white;
    font-weight: 600;
  }

  .year-btn.year-current {
    color: #ffa200;
    font-weight: 700;
  }

  .year-btn.year-selected.year-current {
    color: white;
  }
</style>
