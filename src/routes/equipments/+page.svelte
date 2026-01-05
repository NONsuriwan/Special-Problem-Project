<script lang="ts">
  type Asset = {
    code: string; name: string; category: string; status: string;
    date: string; price: number; building: string; room: string;
  };

  let q = '';
  let filter = 'ทั้งหมด';

  const items: Asset[] = [
    { code: 'ทท. 2567-0001', name: 'เก้าอี้สำนักงาน', category: 'ครุภัณฑ์สำนักงาน', status: 'ปกติ', date: '29/03/2024', price: 4000, building: 'SC08', room: '319' },
    { code: 'ทท. 2567-0002', name: 'โต๊ะสำนักงาน', category: 'ครุภัณฑ์สำนักงาน', status: 'กำลังซ่อม', date: '29/03/2024', price: 5000, building: 'SC08', room: '319' }
  ];

  $: rows = items.filter((x) => {
    const byFilter = filter === 'ทั้งหมด' || x.category === filter;
    const byQuery = q === '' || [x.code, x.name, x.building, x.room].join(' ').includes(q);
    return byFilter && byQuery;
  });

  const categories = ['ทั้งหมด', 'ครุภัณฑ์สำนักงาน', 'เครื่องมือวิทยาศาสตร์', 'เครื่องใช้ไฟฟ้า', 'อุปกรณ์เคลื่อนที่'];
</script>

<h2 class="text-2xl font-extrabold mb-2">สืบค้นครุภัณฑ์</h2>
<p class="text-sm text-gray-500 mb-4">ค้นหา จัดการ และเพิ่มครุภัณฑ์</p>

<div class="flex items-center gap-3 mb-4">
  <input bind:value={q} placeholder="พิมพ์เพื่อค้นหา…" class="w-72 rounded-lg border px-3 py-2 text-sm" />
  <select bind:value={filter} class="rounded-lg border px-3 py-2 text-sm">
    {#each categories as c}<option>{c}</option>{/each}
  </select>
  <button class="rounded-lg bg-brand-500 text-white px-4 py-2 text-sm hover:bg-brand-600">ค้นหา</button>
</div>

<div class="overflow-auto rounded-xl border bg-white">
  <table class="min-w-200 w-full text-sm">
    <thead class="bg-gray-50">
      <tr class="[&>th]:px-4 [&>th]:py-3 text-left">
        <th>รหัสครุภัณฑ์</th><th>ชื่อครุภัณฑ์</th><th>ประเภท</th><th>สถานะ</th>
        <th>วันที่ซื้อ</th><th>ราคา</th><th>อาคาร</th><th>ห้อง</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as r}
        <tr class="border-t hover:bg-gray-50">
          <td class="px-4 py-2">{r.code}</td>
          <td class="px-4 py-2">{r.name}</td>
          <td class="px-4 py-2">{r.category}</td>
          <td class="px-4 py-2">{r.status}</td>
          <td class="px-4 py-2">{r.date}</td>
          <td class="px-4 py-2">{r.price.toLocaleString()}</td>
          <td class="px-4 py-2">{r.building}</td>
          <td class="px-4 py-2">{r.room}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
