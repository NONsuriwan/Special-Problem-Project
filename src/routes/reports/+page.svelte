<script lang="ts">
  import Dropdown from '$lib/components/ui/Dropdown.svelte';

  let tab: 'ครุภัณฑ์' | 'เลข อว.' | 'โครงการ' = 'ครุภัณฑ์';
  let category = 'ทั้งหมด';
  let fy = 'ทั้งหมด';
  let status = 'ทั้งหมด';
  let unit = 'ทั้งหมด';

  const categoryOptions = ['ทั้งหมด', 'ครุภัณฑ์สำนักงาน', 'เครื่องมือวิทยาศาสตร์', 'อุปกรณ์เคลื่อนที่']
    .map(v => ({ value: v, label: v }));

  const fyOptions = ['ทั้งหมด', '2566', '2567', '2568']
    .map(v => ({ value: v, label: v }));

  const statusOptions = ['ทั้งหมด', 'พร้อมใช้งาน', 'กำลังซ่อม', 'ระงับใช้']
    .map(v => ({ value: v, label: v }));

  const unitOptions = ['ทั้งหมด', 'ภาควิชา A', 'ภาควิชา B']
    .map(v => ({ value: v, label: v }));

  const gen = () => {
    alert(`สร้างรายงาน: ${tab}\nประเภท: ${category}\nปีงบ: ${fy}\nสถานะ: ${status}\nหน่วยงาน: ${unit}`);
  }
</script>

<div class="rounded-xl border bg-white p-6 max-w-4xl">
  <div class="mb-4 flex gap-2">
    {#each ['ครุภัณฑ์','เลข อว.','โครงการ'] as t}
      <button class="text-b6 px-4 py-2 rounded-full border hover:bg-gray-50 {tab===t?'bg-gray-100 border-gray-300':''}"
        on:click={() => (tab = t as any)}>{t}</button>
    {/each}
  </div>

  <div class="grid sm:grid-cols-2 gap-4">
    <div>
      <label class="text-b6 mb-2 block">ประเภท{tab === 'ครุภัณฑ์' ? 'ครุภัณฑ์' : tab}</label>
      <Dropdown fullWidth options={categoryOptions} bind:value={category} />
    </div>
    <div>
      <label class="text-b6 mb-2 block">ปีงบประมาณ</label>
      <Dropdown fullWidth options={fyOptions} bind:value={fy} />
    </div>
    <div>
      <label class="text-b6 mb-2 block">สถานะ</label>
      <Dropdown fullWidth options={statusOptions} bind:value={status} />
    </div>
    <div>
      <label class="text-b6 mb-2 block">หน่วยงาน</label>
      <Dropdown fullWidth options={unitOptions} bind:value={unit} />
    </div>
  </div>

  <div class="mt-6">
    <button on:click={gen} class="text-b5 rounded-lg bg-brand-500 text-white px-4 py-2 hover:bg-brand-600">
      สร้างรายงาน
    </button>
  </div>
</div>
