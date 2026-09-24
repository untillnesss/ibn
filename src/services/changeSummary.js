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
  cancelled: 'Dibatalkan',
}

// ── Diff terperinci (halaman admin & riwayat) ────────────────────────

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

// Nilai "sebelum": snapshot `item.before` (disimpan saat dikirim) bila ada, kalau tidak dari
// data live. Untuk pengajuan lama yang sudah diproses dan tanpa snapshot, "sebelum" tidak
// diketahui (data live sudah berubah), jadi yang ditampilkan hanya nilai usulan.
export function describeChangeDetailed(item, liveById = {}) {
  const payload = item.payload ?? {}
  const snapshot = item.before ?? {}
  const addNodes = payload.addNodesData ?? []
  const newById = Object.fromEntries(addNodes.map((n) => [n.id, n]))
  const nameOf = (id) =>
    snapshot[id]?.name ||
    liveById[id]?.name ||
    newById[id]?.name ||
    (newById[id] ? '(anggota baru)' : null)

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
    const hasSnapshot = node.id in snapshot
    const beforeKnown = hasSnapshot || item.status === 'pending' || item.status == null
    const base = snapshot[node.id] ?? liveById[node.id] ?? {}

    const rows = beforeKnown
      ? Object.entries(FIELD_LABELS)
          .filter(([key]) => key in node && (node[key] ?? '') !== (base[key] ?? ''))
          .map(([key, label]) => ({
            label,
            before: formatFieldValue(key, base[key]),
            after: formatFieldValue(key, node[key]),
          }))
      : Object.entries(FIELD_LABELS)
          .filter(([key]) => key in node && !isEmpty(node[key]))
          .map(([key, label]) => ({ label, after: formatFieldValue(key, node[key]) }))

    // Update yang cuma mengubah relasi (pids/fid/mid) sudah dijelaskan di kartu anggota baru.
    if (rows.length === 0) continue

    blocks.push({ type: 'update', heading: base.name || node.name || node.id, rows })
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
