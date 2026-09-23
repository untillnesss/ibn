import { ref } from 'vue'
import { findNodeById } from '@/services/familyDataService'

const GENDER_LABELS = { male: 'Pria', female: 'Wanita' }
const FIELD_LABELS = {
  anak: 'Anak Ke-',
  name: 'Nama Lengkap',
  gender: 'Jenis Kelamin',
  born: 'Tanggal Lahir',
  die: 'Meninggal',
  email: 'Instagram',
  phone: 'WA',
  city: 'Alamat',
  photo: 'Foto',
}

export const STATUS_LABELS = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

function fieldLines(node) {
  return Object.entries(FIELD_LABELS)
    .filter(([key]) => node[key] != null && node[key] !== '')
    .map(([key, label]) => {
      const value = key === 'gender' ? (GENDER_LABELS[node[key]] ?? node[key]) : node[key]
      return `${label}: ${value}`
    })
}

export function describeChange(item, removedNames = {}) {
  const lines = []

  for (const node of item.payload?.addNodesData ?? []) {
    lines.push({ heading: 'Tambah anggota baru', details: fieldLines(node) })
  }

  for (const node of item.payload?.updateNodesData ?? []) {
    lines.push({ heading: 'Ubah data', details: fieldLines(node) })
  }

  const removeNodeId = item.payload?.removeNodeId
  if (removeNodeId != null) {
    const name = item.removeNodeName ?? removedNames[removeNodeId] ?? removeNodeId
    lines.push({ heading: 'Hapus anggota', details: [name] })
  }

  return lines
}

// Untuk dokumen lama yang belum menyimpan removeNodeName saat dikirim.
export function useRemovedNames() {
  const removedNames = ref({})

  async function resolveRemovedNames(items) {
    for (const item of items) {
      const removeNodeId = item.payload?.removeNodeId
      if (removeNodeId == null || item.removeNodeName || removedNames.value[removeNodeId]) continue
      const node = await findNodeById(removeNodeId)
      removedNames.value = { ...removedNames.value, [removeNodeId]: node?.name ?? removeNodeId }
    }
  }

  return { removedNames, resolveRemovedNames }
}

export function sortBySubmittedAt(items, direction = 'asc') {
  const sign = direction === 'asc' ? 1 : -1
  return [...items].sort(
    (a, b) => sign * ((a.submittedAt?.toMillis?.() ?? 0) - (b.submittedAt?.toMillis?.() ?? 0)),
  )
}

export function formatDate(timestamp) {
  if (!timestamp?.toDate) return '-'
  return timestamp.toDate().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
