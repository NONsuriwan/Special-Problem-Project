<script lang="ts">
  import StatCard from '$lib/components/StatCard.svelte';

  const stats = [
    { label: 'ครุภัณฑ์ทั้งหมด', value: 'X,XXX', icon: '📦' },
    { label: 'พร้อมใช้งาน', value: 'X,XXX', icon: '✅' },
    { label: 'ถูกยืม', value: 'X,XXX', icon: '📥' },
    { label: 'กำลังซ่อม', value: 'X,XXX', icon: '🛠️' },
    { label: 'รอตรวจรับ', value: 'X,XXX', icon: '🧾' },
    { label: 'ไม่พร้อมใช้งาน', value: 'X,XXX', icon: '⛔' }
  ];
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {#each stats as s}
    <StatCard {...s} />
  {/each}
</div>

<div class="mt-8 rounded-xl border bg-white p-6">
  <div class="flex items-center justify-between">
    <h2 class="font-bold text-lg">สถิติการใช้งานครุภัณฑ์</h2>
    <select class="border rounded-lg px-3 py-2 text-sm">
      <option>ย้อนหลัง 7 วัน</option>
      <option>ย้อนหลัง 30 วัน</option>
      <option>ปีงบประมาณ</option>
    </select>
  </div>
  <div class="mt-6 h-56 grid place-items-center text-gray-500">
    (พื้นที่สำหรับกราฟ/แดชบอร์ด)
  </div>
</div>
