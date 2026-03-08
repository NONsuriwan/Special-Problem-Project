<script lang="ts">
  import { signIn } from '@auth/sveltekit/client';
</script>

<div class="login-page">
  <!-- Decorative background orbs -->
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>

  <div class="login-card">
    <!-- Icon -->
    <div class="icon-wrap">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    </div>

    <!-- Title -->
    <h1 class="title">ระบบจัดการครุภัณฑ์</h1>
    <p class="subtitle">คณะวิทยาศาสตร์</p>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Google Sign In -->
    <button
      class="google-btn"
      onclick={() => window.location.href = 'http://localhost:3000/api/auth/google'}
    >
      <svg class="g-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span>เข้าสู่ระบบด้วย Google</span>
    </button>

    <p class="hint">เฉพาะบัญชี Google ของมหาวิทยาลัยเท่านั้น</p>
  </div>
</div>

<style>
  /* ===== Background ===== */
  .login-page {
    min-height: 100vh;
    background: linear-gradient(145deg, #7a3a00 0%, #c47000 45%, #ffa200 80%, #ffbe4d 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
  }

  /* Soft decorative orbs */
  .orb {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    pointer-events: none;
  }
  .orb-1 {
    width: 520px;
    height: 520px;
    top: -180px;
    right: -120px;
  }
  .orb-2 {
    width: 360px;
    height: 360px;
    bottom: -130px;
    left: -80px;
    background: rgba(0, 0, 0, 0.08);
  }

  /* ===== Card ===== */
  .login-card {
    position: relative;
    z-index: 1;
    background: white;
    border-radius: 1.5rem;
    padding: 3rem 2.75rem 2.5rem;
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow:
      0 2px 4px rgba(0,0,0,0.04),
      0 12px 32px rgba(100, 40, 0, 0.18),
      0 40px 80px rgba(100, 40, 0, 0.12);
  }

  /* ===== Icon ===== */
  .icon-wrap {
    width: 4rem;
    height: 4rem;
    background: linear-gradient(135deg, #ffa200, #ffcc66);
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    box-shadow: 0 6px 20px rgba(255, 162, 0, 0.4);
  }

  .icon-wrap svg {
    width: 2rem;
    height: 2rem;
    color: white;
  }

  /* ===== Text ===== */
  .title {
    font-size: 1.375rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.375rem;
    letter-spacing: -0.02em;
    text-align: center;
  }

  .subtitle {
    font-size: 0.875rem;
    color: #9ca3af;
    margin: 0 0 2rem;
    text-align: center;
    letter-spacing: 0.01em;
  }

  /* ===== Divider ===== */
  .divider {
    width: 100%;
    height: 1px;
    background: #f3f4f6;
    margin-bottom: 2rem;
  }

  /* ===== Google Button ===== */
  .google-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.875rem 1.5rem;
    background: white;
    border: 1.5px solid #e5e7eb;
    border-radius: 0.75rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #1f2937;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1.25rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .google-btn:hover {
    border-color: #ffa200;
    box-shadow: 0 4px 16px rgba(255, 162, 0, 0.2);
    transform: translateY(-1px);
  }

  .google-btn:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .g-logo {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  /* ===== Hint ===== */
  .hint {
    font-size: 0.75rem;
    color: #d1d5db;
    margin: 0;
    text-align: center;
    letter-spacing: 0.01em;
  }
</style>
