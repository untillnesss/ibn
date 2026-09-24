<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
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
import { currentUser, authReady } from '@/services/authState'
import { signInWithGoogle, signOutUser } from '@/services/authActions'
import GoogleIcon from '@/components/GoogleIcon.vue'
import { confirmDialog, notifyError, notifySuccess } from '@/services/notify'
import { STATUS_LABELS, formatDate, sortBySubmittedAt } from '@/services/changeSummary'
import { fetchAllFamilies } from '@/services/familyDataService'
import ChangeDetails from '@/components/ChangeDetails.vue'

// Data live: dipakai untuk nama relasi & nilai "sebelum" pengajuan lama yang belum punya snapshot.
const liveById = ref({})

async function refreshLiveData() {
  const nodes = await fetchAllFamilies()
  liveById.value = Object.fromEntries(nodes.map((n) => [n.id, n]))
}

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
        refreshLiveData()
      },
      (err) => {
        console.error(err)
        notifyError('Gagal memuat riwayat', 'Riwayat perubahan Anda tidak dapat dimuat.')
      },
    )
  },
  { immediate: true },
)

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const cancellingIds = ref(new Set())

async function cancelSubmission(item) {
  const ok = await confirmDialog({
    title: 'Batalkan pengajuan?',
    text: 'Pengajuan ini akan ditarik dan tidak akan diproses oleh admin.',
    confirmText: 'Ya, batalkan',
    icon: 'warning',
  })
  if (!ok) return

  cancellingIds.value = new Set(cancellingIds.value).add(item.id)
  try {
    // Rules hanya mengizinkan pemilik mengubah status pending -> cancelled (+ resolvedAt).
    await updateDoc(doc(db, 'pending_changes', item.id), {
      status: 'cancelled',
      resolvedAt: serverTimestamp(),
    })
    notifySuccess('Dibatalkan', 'Pengajuan Anda telah dibatalkan.')
  } catch (err) {
    console.error(err)
    // Paling mungkin: admin sudah memproses pengajuan ini lebih dulu.
    notifyError('Gagal membatalkan', 'Pengajuan mungkin sudah diproses admin. Silakan muat ulang.')
  } finally {
    const next = new Set(cancellingIds.value)
    next.delete(item.id)
    cancellingIds.value = next
  }
}

const RESOLVED_LABELS = { approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan' }

const counts = computed(() => {
  const result = { all: items.value.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 }
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
  { value: 'cancelled', label: STATUS_LABELS.cancelled },
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

    <div v-else class="container">
      <div class="header">
        <h1>Riwayat Perubahan Saya</h1>
        <div class="account">
          <RouterLink to="/" class="link">← Silsilah</RouterLink>
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

        <ChangeDetails :item="item" :live-by-id="liveById" />

        <p v-if="item.resolvedAt" class="muted small">
          {{ RESOLVED_LABELS[item.status] ?? 'Diproses' }} pada
          {{ formatDate(item.resolvedAt) }}
        </p>

        <div v-if="item.status === 'pending'" class="actions">
          <button
            type="button"
            class="btn-cancel"
            :disabled="cancellingIds.has(item.id)"
            @click="cancelSubmission(item)"
          >
            {{ cancellingIds.has(item.id) ? 'Membatalkan...' : 'Batalkan Pengajuan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #121212;
  color: #fff;
  padding: 24px;
  font-family: sans-serif;
  box-sizing: border-box;
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
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
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

.badge.cancelled {
  background: #333;
  color: #aeaeae;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.btn-cancel {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #d9534f;
  background: transparent;
  color: #ff7a7a;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
}

.btn-cancel:hover:not(:disabled) {
  background: #4d1414;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: wait;
}

.badge.rejected {
  background: #4d1414;
  color: #ff7a7a;
}

</style>
