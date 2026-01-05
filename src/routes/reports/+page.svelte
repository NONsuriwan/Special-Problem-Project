<script lang="ts">
  let tab: 'ครุภัณฑ์' | 'เลข อว.' | 'โครงการ' = 'ครุภัณฑ์';
  let category = 'ทั้งหมด';
  let fy = 'ทั้งหมด';
  let status = 'ทั้งหมด';
  let unit = 'ทั้งหมด';

  const gen = () => {
    alert(`สร้างรายงาน: ${tab}\nประเภท: ${category}\nปีงบ: ${fy}\nสถานะ: ${status}\nหน่วยงาน: ${unit}`);
  }
</script>

<h2 class="text-2xl font-extrabold mb-2">รายงาน</h2>
<p class="text-sm text-gray-500 mb-4">จัดการและสรุปข้อมูลของครุภัณฑ์</p>

<div class="rounded-xl border bg-white p-6 max-w-4xl">
  <div class="mb-4 flex gap-2">
    {#each ['ครุภัณฑ์','เลข อว.','โครงการ'] as t}
      <button class="px-4 py-2 rounded-full border text-sm hover:bg-gray-50 {tab===t?'bg-gray-100 border-gray-300':''}"
        on:click={() => (tab = t as any)}>{t}</button>
    {/each}
  </div>

  <div class="grid sm:grid-cols-2 gap-4">
    <div>
      <div class="text-sm mb-1">ประเภท{tab === 'ครุภัณฑ์' ? 'ครุภัณฑ์' : tab}</div>
      <select bind:value={category} class="w-full rounded-lg border px-3 py-2 text-sm">
        <option>ทั้งหมด</option>
        <option>ครุภัณฑ์สำนักงาน</option>
        <option>เครื่องมือวิทยาศาสตร์</option>
        <option>อุปกรณ์เคลื่อนที่</option>
      </select>
    </div>
    <div>
      <div class="text-sm mb-1">ปีงบประมาณ</div>
      <select bind:value={fy} class="w-full rounded-lg border px-3 py-2 text-sm">
        <option>ทั้งหมด</option>
        <option>2566</option>
        <option>2567</option>
        <option>2568</option>
      </select>
    </div>
    <div>
      <div class="text-sm mb-1">สถานะ</div>
      <select bind:value={status} class="w-full rounded-lg border px-3 py-2 text-sm">
        <option>ทั้งหมด</option>
        <option>พร้อมใช้งาน</option>
        <option>กำลังซ่อม</option>
        <option>ระงับใช้</option>
      </select>
    </div>
    <div>
      <div class="text-sm mb-1">หน่วยงาน</div>
      <select bind:value={unit} class="w-full rounded-lg border px-3 py-2 text-sm">
        <option>ทั้งหมด</option>
        <option>ภาควิชา A</option>
        <option>ภาควิชา B</option>
      </select>
    </div>
  </div>

  <div class="mt-6">
    <button on:click={gen} class="rounded-lg bg-brand-500 text-white px-4 py-2 text-sm hover:bg-brand-600">
      สร้างรายงาน
    </button>
  </div>
</div>
