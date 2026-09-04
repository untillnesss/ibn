<script setup>
import { ref, onMounted, useTemplateRef, onUnmounted } from 'vue'
import FamilyTree from '@balkangraph/familytree.js'
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/main'
import maleAvatar from '@/assets/avatars/male-avatar.svg'
import femaleAvatar from '@/assets/avatars/female-avatar.svg'

const tableName = 'families'

const tree = useTemplateRef('tree')
const familyTreeNodes = ref([])

let familyTree, unsubscribe

onMounted(() => {
  const familiesRef = collection(db, tableName)

  unsubscribe = onSnapshot(familiesRef, (snapshot) => {
    familyTreeNodes.value = snapshot.docs.map((doc) => {
      return doc.data()
    })

    myTree(tree.value, familyTreeNodes.value)

    if (unsubscribe) unsubscribe()
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

function myTree(domEl, x) {
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
        <g id="sriniz_expand_icon" style="cursor:pointer;">
          <circle cx="11" cy="11" r="14" fill="#ffffff"></circle>
          <line x1="5" y1="11" x2="17" y2="11" stroke-width="2" stroke="#888888"></line>
          <line x1="11" y1="5" x2="11" y2="17" stroke-width="2" stroke="#888888"></line>
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

  // Male
  FamilyTree.templates.sriniz_male = Object.assign({}, FamilyTree.templates.sriniz)
  FamilyTree.templates.sriniz_male.node =
    '<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#039BE5" stroke="#aeaeae" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz_male.field_0 = field0Template
  FamilyTree.templates.sriniz_male.field_1 = field1Template
  FamilyTree.templates.sriniz_male.field_2 = field2Template

  // Female
  FamilyTree.templates.sriniz_female = Object.assign({}, FamilyTree.templates.sriniz)
  FamilyTree.templates.sriniz_female.node =
    '<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#FF46A3" stroke="#aeaeae" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz_female.field_0 = field0Template
  FamilyTree.templates.sriniz_female.field_1 = field1Template
  FamilyTree.templates.sriniz_female.field_2 = field2Template

  const expandIcon = '<use x="270" y="13" xlink:href="#sriniz_expand_icon"><title>Expand</title></use>'

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
    orderBy: 'anak',
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
        { type: 'textbox', label: 'Foto', binding: 'photo', btn: 'Upload' },
      ],
    },
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

  familyTree.onUpdateNode(async (args) => {
    console.log(args)

    args.addNodesData.forEach(async (node) => {
      await addDocWithIdInData(node)
    })

    args.updateNodesData.forEach(async (node) => {
      await updateByField(node.id, node)
    })

    if (args.removeNodeId != null) {
      await deleteDocsByField(args.removeNodeId)
    }
  })
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

async function addDocWithIdInData(data) {
  // Step 1: Create a doc reference with a new ID
  const docRef = doc(collection(db, tableName)) // auto-generates an ID
  const id = docRef.id

  // Step 2: Prepare your data with the ID included
  const storedData = {
    doc_id: id, // include the generated ID in the data
    ...data,
  }

  // Step 3: Set the document with the ID
  await setDoc(docRef, storedData)

  console.log('Document created with ID and stored in data:', id)
  return id
}

async function updateByField(id, data) {
  const q = query(collection(db, tableName), where('id', '==', id))

  const querySnapshot = await getDocs(q)

  const updatePromises = querySnapshot.docs.map((document) =>
    updateDoc(doc(db, tableName, document.id), {
      ...data,
    }),
  )

  await Promise.all(updatePromises)

  console.log('Document(s) updated based on field match')
}

async function deleteDocsByField(id) {
  const q = query(collection(db, tableName), where('id', '==', id))

  try {
    const querySnapshot = await getDocs(q)
    const deletePromises = querySnapshot.docs.map((document) =>
      deleteDoc(doc(db, tableName, document.id)),
    )

    await Promise.all(deletePromises)
    console.log('Matching documents deleted')
  } catch (error) {
    console.error('Error deleting documents:', error)
  }
}
</script>

<template>
  <div id="tree" ref="tree"></div>
</template>

<style scoped></style>
