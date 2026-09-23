<script setup>
import { ref, watch, onUnmounted } from 'vue'
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/main'
import { currentUser, isAdmin, authReady } from '@/services/authState'
import { signInWithGoogle, signOutUser } from '@/services/authActions'
import { applyChangePayload } from '@/services/familyDataService'
import {
  describeChange,
  formatDate,
  sortBySubmittedAt,
  useRemovedNames,
} from '@/services/changeSummary'

const { removedNames, resolveRemovedNames } = useRemovedNames()

const login = signInWithGoogle
const logout = signOutUser

const pendingItems = ref([])
const busyIds = ref(new Set())
let unsubscribeQueue = null

watch(
  isAdmin,
  (admin) => {
    if (unsubscribeQueue) {
      unsubscribeQueue()
      unsubscribeQueue = null
    }
    if (!admin) {
      pendingItems.value = []
      return
    }

    // Tanpa orderBy supaya tidak perlu composite index; diurutkan di klien.
    const q = query(collection(db, 'pending_changes'), where('status', '==', 'pending'))

    unsubscribeQueue = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      pendingItems.value = sortBySubmittedAt(items, 'asc')
      resolveRemovedNames(pendingItems.value)
    })
  },
  { immediate: true },
)

onUnmounted(() => {
  if (unsubscribeQueue) unsubscribeQueue()
})

async function resolve(item, status) {
  busyIds.value = new Set(busyIds.value).add(item.id)
  try {
    if (status === 'approved') await applyChangePayload(item.payload)
    await updateDoc(doc(db, 'pending_changes', item.id), {
      status,
      resolvedAt: serverTimestamp(),
      resolvedBy: currentUser.value.email,
    })
  } catch (err) {
    console.error(err)
    alert('Gagal memproses perubahan. Silakan coba lagi.')
  } finally {
    const next = new Set(busyIds.value)
    next.delete(item.id)
    busyIds.value = next
  }
}

const approve = (item) => resolve(item, 'approved')
const reject = (item) => resolve(item, 'rejected')
</script>

<template>
  <div class="admin">
    <div v-if="!authReady" class="login-panel">
      <p class="empty">Memuat...</p>
    </div>

    <div v-else-if="!currentUser" class="login-panel">
      <h1>Login Admin</h1>
      <button type="button" class="btn-google" @click="login">Masuk dengan Google</button>
      <RouterLink to="/" class="back-link">← Kembali ke silsilah</RouterLink>
    </div>

    <div v-else-if="!isAdmin" class="login-panel">
      <h1>Akses Ditolak</h1>
      <p class="empty">
        Akun <strong>{{ currentUser.email }}</strong> bukan admin silsilah ini.
      </p>
      <button type="button" @click="logout">Keluar &amp; ganti akun</button>
      <RouterLink to="/" class="back-link">← Kembali ke silsilah</RouterLink>
    </div>

    <div v-else class="queue-panel">
      <div class="header">
        <h1>Perubahan Menunggu Persetujuan ({{ pendingItems.length }})</h1>
        <div class="account">
          <RouterLink to="/" class="back-link">← Silsilah</RouterLink>
          <span>{{ currentUser.email }}</span>
          <button type="button" @click="logout">Keluar</button>
        </div>
      </div>

      <p v-if="pendingItems.length === 0" class="empty">Tidak ada perubahan yang menunggu.</p>

      <div v-for="item in pendingItems" :key="item.id" class="card">
        <div class="meta">
          <span class="submitter">
            {{ item.submittedBy }}
            <span v-if="item.submitterEmail" class="email">({{ item.submitterEmail }})</span>
          </span>
          <span class="date">{{ formatDate(item.submittedAt) }}</span>
        </div>

        <div v-for="(change, i) in describeChange(item, removedNames)" :key="i" class="change">
          <p class="heading">{{ change.heading }}</p>
          <p v-for="(line, j) in change.details" :key="j" class="detail">{{ line }}</p>
        </div>

        <div class="actions">
          <button
            type="button"
            class="btn-reject"
            :disabled="busyIds.has(item.id)"
            @click="reject(item)"
          >
            Tolak
          </button>
          <button
            type="button"
            class="btn-approve"
            :disabled="busyIds.has(item.id)"
            @click="approve(item)"
          >
            Setujui
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background: #121212;
  color: #fff;
  padding: 24px;
  font-family: sans-serif;
}

.login-panel {
  max-width: 320px;
  margin: 80px auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-panel button.btn-google {
  background: #fff;
  color: #1f1f1f;
  font-weight: bold;
}

.login-panel button,
.queue-panel button {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: #039be5;
  color: #fff;
}

.error {
  color: #f57c00;
  font-size: 13px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.empty {
  color: #aeaeae;
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #aeaeae;
  font-size: 13px;
}

.back-link {
  color: #039be5;
  font-size: 13px;
  text-decoration: none;
}

.email {
  color: #777;
}

.queue-panel button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.card {
  background: #1e1e1e;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: #aeaeae;
  font-size: 13px;
  margin-bottom: 8px;
}

.change {
  margin-bottom: 8px;
}

.heading {
  font-weight: bold;
  margin: 0 0 4px;
}

.detail {
  margin: 0;
  color: #ccc;
  font-size: 14px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.btn-reject {
  background: #444 !important;
}

.btn-approve {
  background: #039be5 !important;
}
</style>
