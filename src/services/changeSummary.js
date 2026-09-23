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

// ── Diff terperinci untuk halaman admin ──────────────────────────────
// Nilai "sebelum" diambil dari data live (koleksi families). Hanya akurat untuk item
// yang masih pending, karena data live belum tersentuh.

function isEmpty(value) {
  return value == null || value === ''
}

function formatFieldValue(key, value) {
  if (isEmpty(value)) return '—'
  if (key === 'gender') return GENDER_LABELS[value] ?? value
  if ((key === 'born' || key === 'die') && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  return String(value)
}

function joinNames(names) {
  const valid = names.filter(Boolean)
  if (valid.length <= 1) return valid[0] ?? ''
  return `${valid.slice(0, -1).join(', ')} & ${valid.at(-1)}`
}

export function describeChangeDetailed(item, liveById = {}) {
  const payload = item.payload ?? {}
  const addNodes = payload.addNodesData ?? []
  const newById = Object.fromEntries(addNodes.map((n) => [n.id, n]))
  const nameOf = (id) =>
    liveById[id]?.name || newById[id]?.name || (newById[id] ? '(anggota baru)' : null)

  const blocks = []

  for (const node of addNodes) {
    const relations = []
    const parents = joinNames([nameOf(node.fid), nameOf(node.mid)])
    if (parents) relations.push(`Anak dari ${parents}`)

    const partners = joinNames((node.pids ?? []).map(nameOf))
    if (partners) relations.push(`Pasangan dari ${partners}`)

    // Orang tua baru: node lama yang fid/mid-nya diarahkan ke node baru ini.
    const children = joinNames(
      (payload.updateNodesData ?? [])
        .filter((u) => u.fid === node.id || u.mid === node.id)
        .map((u) => nameOf(u.id)),
    )
    if (children) relations.push(`Orang tua dari ${children}`)

    blocks.push({
      type: 'add',
      heading: node.name || '(tanpa nama)',
      relations,
      rows: Object.entries(FIELD_LABELS)
        .filter(([key]) => !isEmpty(node[key]))
        .map(([key, label]) => ({ label, after: formatFieldValue(key, node[key]) })),
    })
  }

  for (const node of payload.updateNodesData ?? []) {
    const live = liveById[node.id] ?? {}
    const rows = Object.entries(FIELD_LABELS)
      .filter(([key]) => key in node && (node[key] ?? '') !== (live[key] ?? ''))
      .map(([key, label]) => ({
        label,
        before: formatFieldValue(key, live[key]),
        after: formatFieldValue(key, node[key]),
      }))

    // Update yang cuma mengubah relasi (pids/fid/mid) sudah dijelaskan di kartu anggota baru.
    if (rows.length === 0) continue

    blocks.push({ type: 'update', heading: live.name || node.name || node.id, rows })
  }

  if (payload.removeNodeId != null) {
    blocks.push({
      type: 'remove',
      heading: item.removeNodeName ?? nameOf(payload.removeNodeId) ?? payload.removeNodeId,
      rows: [],
    })
  }

  return blocks
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
