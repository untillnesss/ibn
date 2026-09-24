<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/main'
import { currentUser, authReady } from '@/services/authState'
import { signInWithGoogle, signOutUser } from '@/services/authActions'
import GoogleIcon from '@/components/GoogleIcon.vue'
import {
  STATUS_LABELS,
  describeChange,
  formatDate,
  sortBySubmittedAt,
  useRemovedNames,
} from '@/services/changeSummary'

const { removedNames, resolveRemovedNames } = useRemovedNames()

const items = ref([])
const filter = ref('all')
let unsubscribe = null

watch(
  currentUser,
  (user) => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    if (!user) {
      items.value = []
      return
    }

    const q = query(collection(db, 'pending_changes'), where('submitterUid', '==', user.uid))
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        items.value = sortBySubmittedAt(docs, 'desc')
        resolveRemovedNames(items.value)
      },
      (err) => console.error(err),
    )
  },
  { immediate: true },
)

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const counts = computed(() => {
  const result = { all: items.value.length, pending: 0, approved: 0, rejected: 0 }
  for (const item of items.value) result[item.status] = (result[item.status] ?? 0) + 1
  return result
})

const filteredItems = computed(() =>
  filter.value === 'all' ? items.value : items.value.filter((i) => i.status === filter.value),
)

const FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: STATUS_LABELS.pending },
  { value: 'approved', label: STATUS_LABELS.approved },
  { value: 'rejected', label: STATUS_LABELS.rejected },
]
</script>

<template>
  <div class="page">
    <div v-if="!authReady" class="center">
      <p class="muted">Memuat...</p>
    </div>

    <div v-else-if="!currentUser" class="center">
      <h1>Riwayat Perubahan</h1>
      <p class="muted">Masuk dengan akun Google untuk melihat perubahan yang pernah Anda usulkan.</p>
      <button type="button" class="btn-google" @click="signInWithGoogle">
        <GoogleIcon />
        <span>Masuk dengan Google</span>
      </button>
      <RouterLink to="/" class="link">← Kembali ke silsilah</RouterLink>
    </div>

    <template v-else>
      <div class="header">
        <div>
          <RouterLink to="/" class="link">← Silsilah</RouterLink>
          <h1>Riwayat Perubahan Saya</h1>
        </div>
        <div class="account">
          <span>{{ currentUser.email }}</span>
          <button type="button" class="btn" @click="signOutUser">Keluar</button>
        </div>
      </div>

      <div class="filters">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          class="chip"
          :class="{ active: filter === f.value }"
          @click="filter = f.value"
        >
          {{ f.label }} ({{ counts[f.value] }})
        </button>
      </div>

      <p v-if="filteredItems.length === 0" class="muted">Belum ada perubahan di sini.</p>

      <div v-for="item in filteredItems" :key="item.id" class="card">
        <div class="meta">
          <span class="date">{{ formatDate(item.submittedAt) }}</span>
          <span class="badge" :class="item.status">{{ STATUS_LABELS[item.status] ?? item.status }}</span>
        </div>

        <div v-for="(change, i) in describeChange(item, removedNames)" :key="i" class="change">
          <p class="heading">{{ change.heading }}</p>
          <p v-for="(line, j) in change.details" :key="j" class="detail">{{ line }}</p>
        </div>

        <p v-if="item.resolvedAt" class="muted small">
          {{ item.status === 'approved' ? 'Disetujui' : 'Ditolak' }} pada
          {{ formatDate(item.resolvedAt) }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #121212;
  color: #fff;
  padding: 24px;
  font-family: sans-serif;
  max-width: 760px;
  margin: 0 auto;
}

.center {
  max-width: 340px;
  margin: 80px auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.header h1 {
  margin: 4px 0 0;
  font-size: 22px;
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #aeaeae;
  font-size: 13px;
}

.muted {
  color: #aeaeae;
}

.small {
  font-size: 12px;
  margin: 8px 0 0;
}

.link {
  color: #039be5;
  font-size: 13px;
  text-decoration: none;
}

.btn,
.btn-google {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: #039be5;
  color: #fff;
}

.btn-google {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #fff;
  color: #1f1f1f;
  font-weight: bold;
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #444;
  background: transparent;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
}

.chip.active {
  background: #039be5;
  border-color: #039be5;
  color: #fff;
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
  align-items: center;
  color: #aeaeae;
  font-size: 13px;
  margin-bottom: 8px;
}

.badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
}

.badge.pending {
  background: #5c4400;
  color: #ffcc4d;
}

.badge.approved {
  background: #0d4020;
  color: #5ee08a;
}

.badge.rejected {
  background: #4d1414;
  color: #ff7a7a;
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
</style>
