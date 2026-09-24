<script setup>
import { currentUser, isAdmin, authReady } from '@/services/authState'
import { signInWithGoogle, signOutUser, ensureLoggedIn } from '@/services/authActions'
import { showPending, editFormOpen } from '@/services/viewState'
import GoogleIcon from '@/components/GoogleIcon.vue'

async function togglePending() {
  if (showPending.value) {
    showPending.value = false
    return
  }
  // Data pending hanya boleh dibaca oleh user yang sudah login (lihat firestore.rules).
  const user = await ensureLoggedIn()
  if (user) showPending.value = true
}
</script>

<template>
  <div v-if="authReady && !editFormOpen" class="account-panel">
    <div class="account-bar">
      <button v-if="!currentUser" type="button" class="btn-google" @click="signInWithGoogle">
        <GoogleIcon :size="16" />
        <span>Masuk dengan Google</span>
      </button>

      <template v-else>
        <img
          v-if="currentUser.photoURL"
          :src="currentUser.photoURL"
          alt=""
          class="avatar"
          referrerpolicy="no-referrer"
        />
        <span class="name">{{ currentUser.displayName ?? currentUser.email }}</span>
        <RouterLink to="/riwayat" class="link">Riwayat</RouterLink>
        <RouterLink v-if="isAdmin" to="/admin" class="link">Admin</RouterLink>
        <button type="button" class="link-btn" @click="signOutUser">Keluar</button>
      </template>
    </div>

    <label class="pending-toggle" :class="{ active: showPending }">
      <input
        type="checkbox"
        :checked="showPending"
        @click.prevent="togglePending"
      />
      <span class="switch" aria-hidden="true"></span>
      <span>Tampilkan belum terverifikasi</span>
    </label>
  </div>
</template>

<style scoped>
.account-panel {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  font-family: sans-serif;
  font-size: 13px;
  max-width: calc(100vw - 32px);
}

.account-bar,
.pending-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: rgba(30, 30, 30, 0.92);
  border: 1px solid #333;
  border-radius: 999px;
  color: #ddd;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link,
.link-btn {
  color: #039be5;
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.btn-google {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  color: #1f1f1f;
  border: none;
  border-radius: 999px;
  padding: 6px 14px 6px 10px;
  font-weight: bold;
  cursor: pointer;
}

.pending-toggle {
  cursor: pointer;
  user-select: none;
}

.pending-toggle.active {
  border-color: #ffcc4d;
  color: #ffcc4d;
}

.pending-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch {
  position: relative;
  width: 30px;
  height: 16px;
  border-radius: 999px;
  background: #555;
  transition: background 0.2s;
  flex-shrink: 0;
}

.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.pending-toggle.active .switch {
  background: #ffcc4d;
}

.pending-toggle.active .switch::after {
  transform: translateX(14px);
}

.pending-toggle input:focus-visible + .switch {
  outline: 2px solid #039be5;
  outline-offset: 2px;
}

</style>
