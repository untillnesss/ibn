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
import { applyChangePayload, fetchAllFamilies } from '@/services/familyDataService'
import { describeChangeDetailed, formatDate, sortBySubmittedAt } from '@/services/changeSummary'

// Snapshot data live, sebagai nilai "sebelum" pada diff.
const liveById = ref({})

async function refreshLiveData() {
  const nodes = await fetchAllFamilies()
  liveById.value = Object.fromEntries(nodes.map((n) => [n.id, n]))
}

const TYPE_LABELS = { add: 'Baru', update: 'Diubah', remove: 'Dihapus' }

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
      refreshLiveData()
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

        <div
          v-for="(block, i) in describeChangeDetailed(item, liveById)"
          :key="i"
          class="change"
          :class="block.type"
        >
          <p class="heading">
            <span class="tag" :class="block.type">{{ TYPE_LABELS[block.type] }}</span>
            {{ block.heading }}
          </p>
          <p v-for="(relation, r) in block.relations" :key="`r${r}`" class="relation">
            {{ relation }}
          </p>

          <table v-if="block.rows.length" class="diff">
            <tbody>
              <tr v-for="(row, j) in block.rows" :key="j">
                <td class="label">{{ row.label }}</td>
                <td v-if="block.type === 'update'" class="before">{{ row.before }}</td>
                <td v-if="block.type === 'update'" class="arrow">→</td>
                <td class="after">{{ row.after }}</td>
              </tr>
            </tbody>
          </table>
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

.change {
  border-left: 3px solid #444;
  padding-left: 10px;
}

.change.add {
  border-left-color: #2e9e57;
}

.change.update {
  border-left-color: #d9a520;
}

.change.remove {
  border-left-color: #d9534f;
}

.tag {
  display: inline-block;
  font-size: 11px;
  font-weight: bold;
  padding: 1px 8px;
  border-radius: 999px;
  margin-right: 6px;
  vertical-align: middle;
}

.tag.add {
  background: #0d4020;
  color: #5ee08a;
}

.tag.update {
  background: #5c4400;
  color: #ffcc4d;
}

.tag.remove {
  background: #4d1414;
  color: #ff7a7a;
}

.relation {
  margin: 0 0 4px;
  color: #8ab4f8;
  font-size: 13px;
}

.diff {
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 4px;
}

.diff td {
  padding: 2px 8px 2px 0;
  vertical-align: top;
}

.diff .label {
  color: #aeaeae;
  white-space: nowrap;
}

.diff .before {
  color: #ff7a7a;
  text-decoration: line-through;
}

.diff .arrow {
  color: #777;
}

.diff .after {
  color: #e6e6e6;
}

.change.update .diff .after {
  color: #5ee08a;
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
