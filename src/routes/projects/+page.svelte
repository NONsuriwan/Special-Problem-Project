<script lang="ts">
  type Project = { id: string; name: string; type: string; date: string; budget: number };
  let q = ''; let filter = 'ทั้งหมด';

  const projects: Project[] = [
    { id: '20241120002', name: 'จัดซื้อโต๊ะ', type: 'ครุภัณฑ์สำนักงาน', date: '20/11/2024', budget: 5000 }
  ];

  $: list = projects.filter(p =>
    (filter === 'ทั้งหมด' || p.type === filter) &&
    (q === '' || [p.id, p.name, p.type].join(' ').includes(q))
  );

  const types = ['ทั้งหมด','ครุภัณฑ์สำนักงาน','เครื่องมือวิทยาศาสตร์','อุปกรณ์เคลื่อนที่'];
</script>

<h2 class="text-2xl font-extrabold mb-2">สืบค้นโครงการ</h2>
<p class="text-sm text-gray-500 mb-4">ค้นหา จัดการ และเพิ่มโครงการ</p>

<div class="flex items-center gap-3 mb-4">
  <input bind:value={q} placeholder="ค้นหาด้วยรหัส/ชื่อโครงการ…" class="w-80 rounded-lg border px-3 py-2 text-sm" />
  <select bind:value={filter} class="rounded-lg border px-3 py-2 text-sm">
    {#each types as t}<option>{t}</option>{/each}
  </select>
  <button class="rounded-lg bg-brand-500 text-white px-4 py-2 text-sm hover:bg-brand-600">ค้นหา</button>
  <a href="/projects/new" class="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">เพิ่มโครงการ</a>
</div>

<div class="overflow-auto rounded-xl border bg-white">
  <table class="min-w-[700px] w-full text-sm">
    <thead class="bg-gray-50">
      <tr class="[&>th]:px-4 [&>th]:py-3 text-left">
        <th>หมายเลขโครงการ</th><th>ชื่อโครงการ</th><th>ประเภท</th><th>วันที่</th><th class="text-right pr-4">งบประมาณ</th>
      </tr>
    </thead>
    <tbody>
      {#each list as p}
        <tr class="border-t hover:bg-gray-50">
          <td class="px-4 py-2">{p.id}</td>
          <td class="px-4 py-2">{p.name}</td>
          <td class="px-4 py-2">{p.type}</td>
          <td class="px-4 py-2">{p.date}</td>
          <td class="px-4 py-2 text-right pr-4">{p.budget.toLocaleString()}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
