<script setup>
import { currentUser, isAdmin, authReady } from '@/services/authState'
import { signInWithGoogle, signOutUser } from '@/services/authActions'
</script>

<template>
  <div v-if="authReady" class="account-bar">
    <button v-if="!currentUser" type="button" class="btn-google" @click="signInWithGoogle">
      Masuk dengan Google
    </button>

    <template v-else>
      <img v-if="currentUser.photoURL" :src="currentUser.photoURL" alt="" class="avatar" />
      <span class="name">{{ currentUser.displayName ?? currentUser.email }}</span>
      <RouterLink to="/riwayat" class="link">Riwayat</RouterLink>
      <RouterLink v-if="isAdmin" to="/admin" class="link">Admin</RouterLink>
      <button type="button" class="link-btn" @click="signOutUser">Keluar</button>
    </template>
  </div>
</template>

<style scoped>
.account-bar {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: rgba(30, 30, 30, 0.92);
  border: 1px solid #333;
  border-radius: 999px;
  font-family: sans-serif;
  font-size: 13px;
  color: #ddd;
  max-width: calc(100vw - 32px);
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
  background: #fff;
  color: #1f1f1f;
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: bold;
  cursor: pointer;
}
</style>
