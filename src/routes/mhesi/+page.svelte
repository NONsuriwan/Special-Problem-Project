<script lang="ts">
  type Row = { no: string; item: string; project: string; date: string; amount: number };
  let q = ''; let tab = 'ทั้งหมด';
  const cats = ['ทั้งหมด','เครื่องมือวิทยาศาสตร์','เครื่องใช้ไฟฟ้า','อุปกรณ์เคลื่อนที่','เครื่องมือและอุปกรณ์งานช่าง'];

  const rows: Row[] = [
    { no: 'อว 7008.01(3)/0112', item: 'ขออนุมัติแผน', project: 'จัดซื้อโต๊ะ', date: '23/11/2024', amount: 5000 },
    { no: 'อว 7008.01(3)/0113', item: 'ประกาศผู้ชนะ', project: 'จัดซื้อโต๊ะ', date: '30/11/2024', amount: 5000 }
  ];

  $: filtered = rows.filter(r =>
    (tab === 'ทั้งหมด' || r.project.includes(tab)) &&
    (q === '' || [r.no, r.item, r.project].join(' ').includes(q))
  );
</script>

<h2 class="text-2xl font-extrabold mb-2">สืบค้นเลข อว.</h2>
<p class="text-sm text-gray-500 mb-4">ค้นหา จัดการ และเพิ่มกิจกรรม</p>

<div class="flex items-center gap-3 mb-4">
  <input bind:value={q} placeholder="ค้นหาเลข อว./รายการ/โครงการ…" class="w-96 rounded-lg border px-3 py-2 text-sm" />
  <button class="rounded-lg bg-brand-500 text-white px-4 py-2 text-sm hover:bg-brand-600">ค้นหา</button>
  <a href="/mhesi/new" class="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">เพิ่มเลข อว.</a>
</div>

<div class="flex flex-wrap gap-2 mb-3">
  {#each cats as c}
    <button class="px-3 py-1.5 rounded-full border text-sm hover:bg-gray-50 {tab===c?'bg-gray-100 border-gray-300':''}"
      on:click={() => (tab = c)}>{c}</button>
  {/each}
</div>

<div class="overflow-auto rounded-xl border bg-white">
  <table class="min-w-[800px] w-full text-sm">
    <thead class="bg-gray-50">
      <tr class="[&>th]:px-4 [&>th]:py-3 text-left">
        <th>เลข อว.</th><th>รายการ</th><th>โครงการ</th><th>วันที่</th><th class="text-right pr-4">งบประมาณ</th>
      </tr>
    </thead>
    <tbody>
      {#each filtered as r}
        <tr class="border-t hover:bg-gray-50">
          <td class="px-4 py-2">{r.no}</td>
          <td class="px-4 py-2">{r.item}</td>
          <td class="px-4 py-2">{r.project}</td>
          <td class="px-4 py-2">{r.date}</td>
          <td class="px-4 py-2 text-right pr-4">{r.amount.toLocaleString()}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
