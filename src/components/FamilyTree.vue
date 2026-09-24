<script setup>
import { ref, onMounted, useTemplateRef, onUnmounted, watch } from 'vue'
import FamilyTree from '@balkangraph/familytree.js'
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/main'
import maleAvatar from '@/assets/avatars/male-avatar.svg'
import femaleAvatar from '@/assets/avatars/female-avatar.svg'
import { openPhotoCropModal } from '@/services/photoCropLauncher'
import { uploadPhoto } from '@/services/uploadService'
import { openImageLightbox } from '@/services/imageLightbox'
import { applyChangePayload, fetchAllFamilies } from '@/services/familyDataService'
import { currentUser, isAdmin } from '@/services/authState'
import { ensureLoggedIn } from '@/services/authActions'
import { notifyError, notifyInfo, notifySuccess, notifyWarning } from '@/services/notify'
import { showPending, editFormOpen } from '@/services/viewState'
import { mergePendingIntoNodes, toDeltaPayload } from '@/services/pendingOverlay'

const tableName = 'families'

const tree = useTemplateRef('tree')
const familyTreeNodes = ref([])

let familyTree, unsubscribe

function handleAvatarClick(e) {
  const avatarImg = e.target.closest('#bft-avatar img')
  if (avatarImg && avatarImg.src) {
    openImageLightbox(avatarImg.src)
  }
}

onMounted(() => {
  const familiesRef = collection(db, tableName)

  unsubscribe = onSnapshot(familiesRef, (snapshot) => {
    familyTreeNodes.value = snapshot.docs.map((doc) => {
      return doc.data()
    })

    myTree(tree.value, familyTreeNodes.value)

    if (unsubscribe) unsubscribe()
  })

  document.addEventListener('click', handleAvatarClick)

  // Form edit dirender library langsung ke DOM; amati keberadaannya.
  formObserver = new MutationObserver(() => {
    editFormOpen.value = !!tree.value?.querySelector('[data-bft-edit-form]')

    // Field Foto hanya boleh diisi lewat tombol "Unggah" (URL hasil upload), bukan diketik.
    // readonly (bukan disabled) supaya nilainya tetap terbaca saat "Simpan".
    const photoInput = tree.value?.querySelector('[data-bft-edit-form] input[data-binding="photo"]')
    if (photoInput && !photoInput.readOnly) photoInput.readOnly = true
  })
  formObserver.observe(tree.value, { childList: true, subtree: true })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  stopPendingSubscription()
  formObserver?.disconnect()
  editFormOpen.value = false
  document.removeEventListener('click', handleAvatarClick)
})

let formObserver = null

// ── Mode "Tampilkan belum terverifikasi" ────────────────────────────
// Semua user yang login melihat semua usulan pending (sesuai firestore.rules).
// Penggabungan hanya di memori, tidak ditulis ke Firestore.
let unsubscribePending = null
let pendingViewActive = false

function stopPendingSubscription() {
  if (unsubscribePending) {
    unsubscribePending()
    unsubscribePending = null
  }
}

function syncPendingView() {
  stopPendingSubscription()
  if (!familyTree) return // tree belum siap; dipanggil lagi di akhir myTree()

  if (!showPending.value || !currentUser.value) {
    if (!currentUser.value) showPending.value = false
    if (pendingViewActive) {
      pendingViewActive = false
      revertToLiveData()
    }
    return
  }

  pendingViewActive = true
  const q = query(collection(db, 'pending_changes'), where('status', '==', 'pending'))

  unsubscribePending = onSnapshot(
    q,
    async (snapshot) => {
      const items = snapshot.docs.map((d) => d.data())
      const live = await fetchAllFamilies()
      if (!showPending.value) return // toggle dimatikan saat menunggu data
      familyTreeNodes.value = live
      renderNodes(mergePendingIntoNodes(live, items))
    },
    (err) => {
      console.error(err)
      notifyError('Gagal memuat data', 'Perubahan yang belum terverifikasi tidak dapat dimuat.')
      showPending.value = false
    },
  )
}

watch([showPending, currentUser], syncPendingView)

function myTree(domEl, x) {
  FamilyTree.templates.father.node = FamilyTree.templates.father.node.replace('Add father', 'Tambah Ayah')
  FamilyTree.templates.mother.node = FamilyTree.templates.mother.node.replace('Add mother', 'Tambah Ibu')
  FamilyTree.templates.husband.node = FamilyTree.templates.husband.node.replace('Add husband', 'Tambah Suami')
  FamilyTree.templates.wife.node = FamilyTree.templates.wife.node.replace('Add wife', 'Tambah Istri')
  FamilyTree.templates.son.node = FamilyTree.templates.son.node.replace('Add son', 'Tambah Anak Laki-laki')
  FamilyTree.templates.daughter.node = FamilyTree.templates.daughter.node.replace(
    'Add daughter',
    'Tambah Anak Perempuan',
  )
  FamilyTree.templates.partner.node = FamilyTree.templates.partner.node.replace(
    'Add partner',
    'Tambah Pasangan',
  )

  FamilyTree.templates.sriniz = Object.assign({}, FamilyTree.templates.base)

  FamilyTree.templates.sriniz.size = [340, 90]
  FamilyTree.templates.sriniz.node =
    '<rect x="0" y="0" height="90" width="340" stroke-width="1" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz.nodeMenuButton =
    '<use data-ctrl-n-menu-id="{id}" x="305" y="55" xlink:href="#sriniz_node_menu"/>'

  FamilyTree.templates.sriniz.nodeTreeMenuButton =
    '<use data-ctrl-n-t-menu-id="{id}" x="305" y="13" xlink:href="#base_tree_menu"/>'

  FamilyTree.templates.sriniz.nodeTreeMenuCloseButton =
    '<use data-ctrl-n-t-menu-c="" x="305" y="13" xlink:href="#base_tree_menu_close"/>'

  FamilyTree.templates.sriniz.defs = `
        <g transform="matrix(0.05,0,0,0.05,-13 ,-12)" id="heart">
          <path d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z" style="fill:#fff;stroke:red;stroke-miterlimit:10;stroke-width:24px" fill="red"></path><path d="M256,360a16,16,0,0,1-9-2.78c-39.3-26.68-56.32-45-65.7-56.41-20-24.37-29.58-49.4-29.3-76.5.31-31.06,25.22-56.33,55.53-56.33,20.4,0,35,10.63,44.1,20.41a6,6,0,0,0,8.72,0c9.11-9.78,23.7-20.41,44.1-20.41,30.31,0,55.22,25.27,55.53,56.33.28,27.1-9.31,52.13-29.3,76.5-9.38,11.44-26.4,29.73-65.7,56.41A16,16,0,0,1,256,360Z" fill="red"></path>
        </g>
        <g id="sriniz_node_menu" style="cursor:pointer;">
          <circle cx="11" cy="11" r="14" fill="#ffffff"></circle>
          <circle cx="5" cy="11" r="2" fill="#888888"></circle>
          <circle cx="11" cy="11" r="2" fill="#888888"></circle>
          <circle cx="17" cy="11" r="2" fill="#888888"></circle>
        </g>
        <g id="sriniz_male_up">
          <circle cx="15" cy="15" r="10" fill="#fff" stroke="#fff" stroke-width="1"></circle>
          ${FamilyTree.icon.ft(15, 15, '#039BE5', 7.5, 7.5)}
        </g>

        <g id="sriniz_female_up">
          <circle cx="15" cy="15" r="10" fill="#fff" stroke="#fff" stroke-width="1"></circle>
          ${FamilyTree.icon.ft(15, 15, '#FF46A3', 7.5, 7.5)}
        </g>`

  const field0Template =
    '<text style="font-size: 16px; font-weight: bold;" fill="#ffffff" x="100" y="30">{val}</text>'
  const field1Template =
    '<text style="font-size: 12px; font-weight: bold;" fill="#ffffff" x="100" y="50">{val}</text>'
  const field2Template =
    '<text data-width="150" style="font-size: 11px;" fill="#ffffff" x="100" y="68">{val}</text>'
  // Penanda "Belum Terverifikasi": hanya dirender kalau node punya unverifiedLabel
  // (diisi oleh pendingOverlay saat toggle aktif). Garis putus-putus kuning + label.
  const unverifiedTemplate =
    '<rect x="2" y="2" width="336" height="86" rx="14" ry="14" fill="none" stroke="#ffcc4d" stroke-width="3" stroke-dasharray="8 5"></rect>' +
    '<rect x="100" y="73" width="170" height="14" rx="7" ry="7" fill="#ffcc4d"></rect>' +
    '<text x="185" y="83.5" text-anchor="middle" style="font-size: 8.5px; font-weight: bold;" fill="#5c4400">{val}</text>'

  // Male
  FamilyTree.templates.sriniz_male = Object.assign({}, FamilyTree.templates.sriniz)
  FamilyTree.templates.sriniz_male.node =
    '<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#039BE5" stroke="#aeaeae" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz_male.field_0 = field0Template
  FamilyTree.templates.sriniz_male.field_1 = field1Template
  FamilyTree.templates.sriniz_male.field_2 = field2Template
  FamilyTree.templates.sriniz_male.field_4 = unverifiedTemplate

  // Female
  FamilyTree.templates.sriniz_female = Object.assign({}, FamilyTree.templates.sriniz)
  FamilyTree.templates.sriniz_female.node =
    '<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#FF46A3" stroke="#aeaeae" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz_female.field_0 = field0Template
  FamilyTree.templates.sriniz_female.field_1 = field1Template
  FamilyTree.templates.sriniz_female.field_2 = field2Template
  FamilyTree.templates.sriniz_female.field_4 = unverifiedTemplate

  // Tombol buka cabang (muncul hanya pada kartu yang keturunannya sedang disembunyikan).
  // Library menggambarnya di grup terpisah yang titik nol-nya = TENGAH BAWAH kartu,
  // jadi translate(-68, 10) = pil selebar 136px terpusat, 10px di bawah kartu.
  const expandIcon =
    '<g transform="translate(-68, 10)" style="cursor:pointer;">' +
    '<title>Lihat Keturunan</title>' +
    '<rect x="0" y="0" width="136" height="26" rx="13" ry="13" fill="#ffffff" stroke="#aeaeae" stroke-width="1"></rect>' +
    '<path d="M14 10 l5 5 l5 -5" fill="none" stroke="#039BE5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
    '<text x="79" y="17.5" text-anchor="middle" style="font-size: 12px; font-weight: bold;" fill="#333333">Lihat Keturunan</text>' +
    '</g>'

  FamilyTree.templates.sriniz_male.plus = expandIcon
  FamilyTree.templates.sriniz_female.plus = expandIcon

  // Image
  const imgTemplate =
    '<clipPath id="ulaImg">' +
    '<rect height="75" width="75" x="7" y="7" stroke-width="1" fill="#FF46A3" stroke="#aeaeae" rx="15" ry="15"></rect>' +
    '</clipPath>' +
    '<image x="7" y="7" preserveAspectRatio="xMidYMid slice" clip-path="url(#ulaImg)" xlink:href="{val}" width="75" height="75">' +
    '</image>'

  FamilyTree.templates.sriniz_male.img_0 = imgTemplate
  FamilyTree.templates.sriniz_female.img_0 = imgTemplate

  FamilyTree.templates.sriniz_male.up = '<use x="310" y="0" xlink:href="#sriniz_male_up"></use>'
  FamilyTree.templates.sriniz_female.up = '<use x="310" y="0" xlink:href="#sriniz_female_up"></use>'

  // Pointer
  FamilyTree.templates.sriniz.pointer =
    '<g data-pointer="pointer" transform="matrix(0,0,0,0,80,80)">><g transform="matrix(0.3,0,0,0.3,-17,-17)">' +
    '<polygon fill="#039BE5" points="53.004,173.004 53.004,66.996 0,120" />' +
    '<polygon fill="#039BE5" points="186.996,66.996 186.996,173.004 240,120" />' +
    '<polygon fill="#FF46A3" points="66.996,53.004 173.004,53.004 120,0" />' +
    '<polygon fill="#FF46A3" points="120,240 173.004,186.996 66.996,186.996" />' +
    '<circle fill="red" cx="120" cy="120" r="30" />' +
    '</g></g>'

  FamilyTree.miniMap.draggable = false
  FamilyTree.SEARCH_PLACEHOLDER = 'Cari berdasarkan nama...'

  familyTree = new FamilyTree(domEl, {
    nodes: x,
    sticky: false,
    mouseScrool: FamilyTree.none,
    scaleInitial: getOptions().scaleInitial,
    mode: 'dark',
    template: 'sriniz',
    roots: ['_ui8p'],
    nodeMenu: {
      edit: { text: 'Ubah' },
      details: { text: 'Lihat Selengkapnya' },
    },
    levelSeparation: 100,
    siblingSeparation: 80,
    minPartnerSeparation: 50,
    orderBy: 'born',
    miniMap: true,
    toolbar: {
      fullScreen: true,
      zoom: true,
      fit: true,
      expandAll: true,
    },

    scaleMax: 1.5,
    nodeTreeMenu: false,
    nodeBinding: {
      field_0: 'name',
      field_1: 'born',
      field_2: 'city',
      field_3: 'anak',
      field_4: 'unverifiedLabel',
      img_0: 'photo',
    },
    editForm: {
      generateElementsFromFields: false,
      titleBinding: 'name',
      photoBinding: 'photo',
      addMoreBtn: '',
      addMore: '',
      addMoreFieldName: '',
      saveAndCloseBtn: 'Simpan',
      cancelBtn: 'Tutup',
      elements: [
        { type: 'textbox', label: 'Anak Ke-', binding: 'anak' },
        { type: 'textbox', label: 'Nama Lengkap', binding: 'name' },
        {
          type: 'select',
          options: [
            { value: 'male', text: 'Pria' },
            { value: 'female', text: 'Wanita' },
          ],
          label: 'Jenis Kelamin',
          binding: 'gender',
        },
        [
          { type: 'date', label: 'Tanggal Lahir', binding: 'born' },
          { type: 'date', label: 'Meninggal (opsional)', binding: 'die' },
        ],
        [
          { type: 'textbox', label: 'Instagram', binding: 'email' },
          { type: 'textbox', label: 'WA', binding: 'phone' },
        ],
        { type: 'textbox', label: 'Alamat', binding: 'city' },
        { type: 'textbox', label: 'Foto', binding: 'photo', btn: 'Unggah' },
      ],
    },
  })

  familyTree.editUI.on('element-btn-click', function (sender, args) {
    FamilyTree.fileUploadDialog(async function (file) {
      if (!file) return

      const croppedBlob = await openPhotoCropModal(file)
      if (!croppedBlob) return

      try {
        const url = await uploadPhoto(croppedBlob)
        args.input.value = url
        if (typeof sender.setAvatar === 'function') sender.setAvatar(url)
      } catch (err) {
        console.error('Photo upload failed:', err)
        notifyError('Gagal mengunggah foto', 'Silakan coba lagi.')
      }
    })
  })

  familyTree.on('render-link', function (sender, args) {
    if (args.cnode.ppid != undefined)
      args.html +=
        '<use data-ctrl-ec-id="' +
        args.node.id +
        '" xlink:href="#heart" x="' +
        args.p.xa +
        '" y="' +
        args.p.ya +
        '"/>'
    if (args.cnode.isPartner && args.node.partnerSeparation == 50)
      args.html +=
        '<use data-ctrl-ec-id="' +
        args.node.id +
        '" xlink:href="#heart" x="' +
        args.p.xb +
        '" y="' +
        args.p.yb +
        '"/>'
  })

  familyTree.on('field', function (sender, args) {
    if (args.name == 'photo' && !args.data.templateName && !args.data.tags) {
      if (args.value == '' || args.value == null) {
        args.value = args.data.gender == 'female' ? femaleAvatar : maleAvatar
      }
    }

    if (args.name == 'city') {
      args.value = 'Alamat: ' + (args.value || '')
    }

    if (args.name == 'born') {
      if (args.value == '' || args.value == null) {
        args.value = '-'
        return
      }
      try {
        let date = new Date(args.value)
        args.value = date.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      } catch {
        args.value = '-'
      }
    }

    if (args.name == 'die') {
      let date = new Date(args.value)
      args.value = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  })

  familyTree.on('expcollclick', function (sender, isCollapsing, nodeId) {
    var node = familyTree.getNode(nodeId)
    if (isCollapsing) {
      familyTree.expandCollapse(nodeId, [], node.ftChildrenIds)
    } else {
      familyTree.expandCollapse(nodeId, node.ftChildrenIds, [])
    }
    return false
  })

  requireLoginBeforeEditing(familyTree)
  familyTree.on('redraw', centerExpandButtonsBetweenPartners)
  if (showPending.value) syncPendingView()

  // Validasi sebelum form anggota BARU (draft) boleh disimpan.
  familyTree.editUI.on('save', function (sender, args) {
    if (!draft || args.data.id !== draft.currentId) return
    const error = validateNewMember(args.data)
    if (error) {
      notifyWarning('Data belum lengkap', error)
      return false // form tetap terbuka, isian tidak hilang
    }
  })

  // Form anggota baru ditutup tanpa disimpan: batalkan seluruh penambahan.
  familyTree.editUI.on('cancel', function (sender, args) {
    if (draft && args.id === draft.currentId) discardDraft()
  })

  familyTree.onUpdateNode(async (args) => {
    if (draft) {
      await continueDraft(args)
      return
    }

    // Quick-add dari panel "Tambah" membuat node kosong: tahan dulu sebagai draft.
    if (args.addNodesData?.length) {
      startDraft(args)
      return
    }

    await submitChange(clonePayload(args))
  })
}

// ── Draft anggota baru ─────────────────────────────────────────────
// Satu klik "Tambah ..." bisa membuat lebih dari satu node (mis. anak + pasangan).
// Semua node baru harus diisi & disimpan lewat form, baru dikirim sebagai SATU proposal.
let draft = null // { payload, queue: [id...], currentId }

// Mengembalikan pesan error (string) kalau data anggota baru belum lengkap, atau null kalau valid.
function validateNewMember(node) {
  // TODO(human)
}

function clonePayload(payload) {
  // Deep clone: memutus referensi ke objek milik library & membuang nilai undefined (ditolak Firestore).
  return JSON.parse(
    JSON.stringify({
      addNodesData: payload.addNodesData ?? [],
      updateNodesData: payload.updateNodesData ?? [],
      removeNodeId: payload.removeNodeId ?? null,
    }),
  )
}

function startDraft(args) {
  const payload = clonePayload(args)
  draft = { payload, queue: payload.addNodesData.map((n) => n.id), currentId: null }
  openNextDraftForm()
}

function openNextDraftForm() {
  draft.currentId = draft.queue.shift()
  // Tunggu animasi penyisipan node selesai sebelum membuka form.
  setTimeout(() => {
    if (draft) familyTree.editUI.show(draft.currentId)
  }, 400)
}

async function continueDraft(args) {
  const saved = clonePayload(args).updateNodesData.find((n) => n.id === draft.currentId)
  if (!saved) {
    // Ada perubahan lain di tengah pengisian draft: batalkan draft agar data tidak tercampur.
    discardDraft()
    notifyInfo('Dibatalkan', 'Penambahan anggota baru dibatalkan.')
    return
  }

  mergeIntoDraft(clonePayload(args))

  if (draft.queue.length) {
    openNextDraftForm()
    return
  }

  const payload = draft.payload
  draft = null
  await submitChange(payload)
}

function mergeIntoDraft(args) {
  const { payload } = draft
  for (const node of args.updateNodesData) {
    const addIndex = payload.addNodesData.findIndex((n) => n.id === node.id)
    if (addIndex !== -1) {
      payload.addNodesData[addIndex] = { ...payload.addNodesData[addIndex], ...node }
      continue
    }
    const updateIndex = payload.updateNodesData.findIndex((n) => n.id === node.id)
    if (updateIndex !== -1) payload.updateNodesData[updateIndex] = node
    else payload.updateNodesData.push(node)
  }
}

function discardDraft() {
  draft = null
  revertToLiveData()
}

// ── Kirim perubahan ────────────────────────────────────────────────
async function submitChange(payload) {
  if (isAdmin.value) {
    await applyChangePayload(payload)
    return
  }

  const user = currentUser.value
  if (!user) {
    // Jalur cadangan (mis. tombol hapus di tampilan detail): tanpa login, batalkan saja.
    await revertToLiveData()
    notifyInfo('Masuk diperlukan', 'Silakan masuk dengan Google terlebih dahulu (tombol di kiri atas).')
    return
  }

  try {
    const live = await fetchAllFamilies()
    const deltaPayload = toDeltaPayload(payload, live)
    const removeNodeName =
      payload.removeNodeId != null
        ? (live.find((n) => n.id === payload.removeNodeId)?.name ?? null)
        : null

    const isEmpty =
      !deltaPayload.addNodesData.length &&
      !deltaPayload.updateNodesData.length &&
      deltaPayload.removeNodeId == null
    if (isEmpty) {
      notifyInfo('Tidak ada perubahan', 'Data yang disimpan sama dengan data saat ini.')
      return
    }

    await addDoc(collection(db, 'pending_changes'), {
      payload: deltaPayload,
      removeNodeName,
      submittedBy: user.displayName ?? user.email,
      submitterEmail: user.email,
      submitterUid: user.uid,
      submittedAt: serverTimestamp(),
      status: 'pending',
    })
    notifySuccess(
      'Terkirim',
      'Perubahan Anda menunggu persetujuan admin. Lihat statusnya di menu "Riwayat".',
    )
  } catch (err) {
    console.error(err)
    notifyError('Gagal mengirim perubahan', 'Silakan coba lagi.')
  } finally {
    await revertToLiveData()
  }
}

// Library menaruh tombol "Lihat Keturunan" di tengah bawah kartu yang ditutup. Padahal anak-anak
// milik PASANGAN, dan garis keturunan turun dari titik tengah di antara kedua kartu (ikon hati).
// Setelah setiap render, geser tombol ke titik tengah itu.
function centerExpandButtonsBetweenPartners() {
  for (const group of familyTree.element.querySelectorAll('g[data-ctrl-ec-id]')) {
    const node = familyTree.getNode(group.getAttribute('data-ctrl-ec-id'))
    if (!node) continue

    const partner = familyTree.getNode(findCoParentId(node))
    if (!partner || partner.y !== node.y) continue // tanpa pasangan / beda baris: biarkan

    const midX = (node.x + node.w / 2 + partner.x + partner.w / 2) / 2
    group.setAttribute('transform', `matrix(1,0,0,1,${midX},${node.y + node.h})`)
  }
}

// Pasangan yang benar-benar menjadi orang tua kedua dari anak-anak node ini
// (penting kalau seseorang punya lebih dari satu pasangan).
function findCoParentId(node) {
  for (const childId of node.ftChildrenIds ?? []) {
    const child = familyTree.get(childId)
    const other = child?.fid === node.id ? child.mid : child?.mid === node.id ? child.fid : null
    if (other) return other
  }
  return Object.values(node.pids ?? {})[0]
}

async function revertToLiveData() {
  familyTreeNodes.value = await fetchAllFamilies()
  renderNodes(familyTreeNodes.value)
}

function renderNodes(nodes) {
  // Jangan pakai familyTree.load(): itu menggambar dengan action.init yang mereset kamera
  // ke posisi awal. action.update menggambar ulang dengan viewBox (posisi & zoom) saat ini.
  familyTree.config.nodes = nodes
  familyTree.draw(FamilyTree.action.update)
}

// Form edit & panel "Tambah" hanya boleh dibuka setelah login Google.
// Mode "lihat detail" (editUI.show(id, true)) tetap terbuka untuk semua.
function requireLoginBeforeEditing(tree) {
  const originalShow = tree.editUI.show.bind(tree.editUI)
  tree.editUI.show = function (id, detailsMode, ...rest) {
    if (detailsMode) return originalShow(id, detailsMode, ...rest)
    if (blockedByPendingPreview()) return false
    if (currentUser.value) return originalShow(id, detailsMode, ...rest)
    ensureLoggedIn().then((user) => {
      if (user) originalShow(id, detailsMode, ...rest)
    })
    return false
  }

  const originalShowTreeMenu = tree.showTreeMenu.bind(tree)
  tree.showTreeMenu = function (id) {
    if (blockedByPendingPreview()) return
    if (currentUser.value) return originalShowTreeMenu(id)
    ensureLoggedIn().then((user) => {
      if (user) originalShowTreeMenu(id)
    })
  }
}

// Saat data pending ikut ditampilkan, tree berisi campuran data live + usulan.
// Mengedit di kondisi ini akan mengirim usulan orang lain sebagai data asli, jadi dikunci.
function blockedByPendingPreview() {
  if (!showPending.value) return false
  notifyInfo(
    'Mode pratinjau aktif',
    'Matikan "Tampilkan belum terverifikasi" terlebih dahulu untuk mengubah data.',
  )
  return true
}

function getOptions() {
  const searchParams = new URLSearchParams(window.location.search)
  var fit = searchParams.get('fit')
  var enableSearch = true
  var scaleInitial = 1
  if (fit == 'yes') {
    enableSearch = false
    scaleInitial = FamilyTree.match.boundary
  }
  return { enableSearch, scaleInitial }
}

</script>

<template>
  <div id="tree" ref="tree"></div>
</template>

<style scoped></style>

<style>
#bft-avatar img {
  cursor: zoom-in;
}

/* Tombol "Unggah" di field Foto. Bawaan library: link bergaris bawah yang menempel di
   garis atas field (top:-1px; right:50px). Dijadikan tombol pil, sejajar tengah dengan isian. */
.bft-edit-form [data-input-btn] {
  top: 50% !important;
  right: 10px !important;
  transform: translateY(-50%);
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  height: auto !important;
  line-height: 1 !important;
  padding: 7px 14px 7px 11px;
  border-radius: 999px;
  background: #039be5;
  color: #ffffff !important;
  font-size: 12px;
  font-weight: bold;
  text-decoration: none !important;
  cursor: pointer;
  transition: background 0.15s;
}

.bft-edit-form [data-input-btn]::before {
  content: '';
  width: 14px;
  height: 14px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 16V4'/%3E%3Cpath d='M7 9l5-5 5 5'/%3E%3Cpath d='M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.bft-edit-form [data-input-btn]:hover {
  background: #0288d1;
}

/* Beri ruang di kanan isian supaya URL foto yang panjang tidak tertutup tombol. */
.bft-edit-form .bft-input:has([data-input-btn]) input {
  padding-right: 110px !important;
}

/* Field Foto readonly: tampilkan sebagai teks redup, tanpa kursor ketik. */
.bft-edit-form input[readonly] {
  color: #9e9e9e !important;
  cursor: default;
}
</style>
