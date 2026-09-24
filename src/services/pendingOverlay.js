// Menggabungkan usulan pending ke salinan data live, HANYA untuk tampilan (tidak ditulis ke Firestore).
// Node yang terpengaruh diberi field `unverifiedLabel` yang dirender sebagai penanda di kartu.

export const UNVERIFIED_LABEL = 'BELUM TERVERIFIKASI'
export const PENDING_REMOVAL_LABEL = 'USULAN HAPUS · BELUM TERVERIFIKASI'

export function mergePendingIntoNodes(liveNodes, pendingItems) {
  const liveById = new Map(liveNodes.map((n) => [n.id, n]))
  const nodes = liveNodes.map((n) => ({ ...n }))
  const indexById = new Map(nodes.map((n, i) => [n.id, i]))

  const ordered = [...pendingItems].sort(
    (a, b) => (a.submittedAt?.toMillis?.() ?? 0) - (b.submittedAt?.toMillis?.() ?? 0),
  )

  for (const item of ordered) {
    const payload = item.payload ?? {}

    for (const node of payload.addNodesData ?? []) {
      if (indexById.has(node.id)) continue
      indexById.set(node.id, nodes.length)
      nodes.push({ ...node, unverifiedLabel: UNVERIFIED_LABEL })
    }

    for (const node of payload.updateNodesData ?? []) {
      const index = indexById.get(node.id)
      if (index == null) continue // node sudah tidak ada di data live

      // Payload berisi snapshot PENUH node saat diedit. Terapkan hanya field yang berbeda
      // dari data live aslinya; kalau tidak, usulan belakangan menimpa usulan sebelumnya
      // (mis. ubah alamat membawa pids lama & menghapus pasangan yang baru diusulkan).
      const delta = diffFromLive(liveById.get(node.id) ?? {}, node)
      const merged = { ...nodes[index], ...delta }
      // Update yang cuma mengubah relasi (mis. pids karena pasangan baru) tidak perlu ditandai.
      if (VISIBLE_FIELDS.some((key) => key in delta)) merged.unverifiedLabel = UNVERIFIED_LABEL
      nodes[index] = merged
    }

    const removeIndex = indexById.get(payload.removeNodeId)
    if (removeIndex != null) {
      nodes[removeIndex] = { ...nodes[removeIndex], unverifiedLabel: PENDING_REMOVAL_LABEL }
    }
  }

  return nodes
}

const VISIBLE_FIELDS = ['anak', 'name', 'gender', 'born', 'die', 'email', 'phone', 'city', 'photo']

function normalize(value) {
  if (value == null || value === '') return ''
  return Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value
}

// Dipakai saat MENGIRIM usulan: ubah snapshot penuh node menjadi delta terhadap data live,
// supaya saat disetujui (updateDoc = merge) tidak menimpa field yang diubah usulan lain.
export function toDeltaPayload(payload, liveNodes) {
  const liveById = new Map(liveNodes.map((n) => [n.id, n]))
  const updateNodesData = []

  for (const node of payload.updateNodesData ?? []) {
    const live = liveById.get(node.id)
    if (!live) {
      updateNodesData.push(node)
      continue
    }
    const delta = diffFromLive(live, node)
    if (Object.keys(delta).length) updateNodesData.push({ id: node.id, ...delta })
  }

  return { ...payload, updateNodesData }
}

// Salinan data live SEBELUM perubahan untuk node yang diubah/dihapus, disimpan bersama usulan.
// Dengan ini riwayat tetap bisa menampilkan "sebelum → sesudah" setelah usulan disetujui
// (saat itu data live sudah sama dengan usulannya).
export function snapshotBefore(payload, liveNodes) {
  const liveById = new Map(liveNodes.map((n) => [n.id, n]))
  const ids = [
    ...(payload.updateNodesData ?? []).map((n) => n.id),
    ...(payload.removeNodeId != null ? [payload.removeNodeId] : []),
  ]
  const before = {}
  for (const id of ids) {
    const live = liveById.get(id)
    if (live) before[id] = JSON.parse(JSON.stringify(live))
  }
  return before
}

function diffFromLive(live, proposed) {
  const delta = {}
  for (const [key, value] of Object.entries(proposed)) {
    if (normalize(value) !== normalize(live[key])) delta[key] = value
  }
  return delta
}
