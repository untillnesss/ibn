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

  myTree(tree.value, familyTreeNodes.value)
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

function myTree(domEl, x) {
  FamilyTree.templates.sriniz = Object.assign({}, FamilyTree.templates.base)

  const nodeWidth = 380
  const nodeHeight = 95

  FamilyTree.templates.sriniz.size = [nodeWidth, nodeHeight]
  FamilyTree.templates.sriniz.node = `<rect x="0" y="0" height="${nodeHeight}" width="${nodeWidth}" stroke-width="1" rx="15" ry="15"></rect>`

  FamilyTree.templates.sriniz.nodeMenuButton =
    '<use data-ctrl-n-menu-id="{id}" x="350" y="70" xlink:href="#base_node_menu" fill="#ffffff"/>'

  FamilyTree.templates.sriniz.defs = `
        <g transform="matrix(0.05,0,0,0.05,-13 ,-12)" id="heart">
          <path d="M448,256c0-106-86-192-192-192S64,150,64,256s86,192,192,192S448,362,448,256Z" style="fill:#fff;stroke:red;stroke-miterlimit:10;stroke-width:24px" fill="red"></path><path d="M256,360a16,16,0,0,1-9-2.78c-39.3-26.68-56.32-45-65.7-56.41-20-24.37-29.58-49.4-29.3-76.5.31-31.06,25.22-56.33,55.53-56.33,20.4,0,35,10.63,44.1,20.41a6,6,0,0,0,8.72,0c9.11-9.78,23.7-20.41,44.1-20.41,30.31,0,55.22,25.27,55.53,56.33.28,27.1-9.31,52.13-29.3,76.5-9.38,11.44-26.4,29.73-65.7,56.41A16,16,0,0,1,256,360Z" fill="red"></path>
        </g>
        <g id="sriniz_male_up">
          <circle cx="15" cy="15" r="10" fill="#fff" stroke="#fff" stroke-width="1"></circle>
          ${FamilyTree.icon.ft(15, 15, '#0070a6', 7.5, 7.5)}
        </g>

        <g id="sriniz_female_up">
          <circle cx="15" cy="15" r="10" fill="#fff" stroke="#fff" stroke-width="1"></circle>
          ${FamilyTree.icon.ft(15, 15, '#bd00ad', 7.5, 7.5)}
        </g>`

  const field0Template =
    '<text data-width="200" style="font-size: 20px; font-weight: bold;" fill="#ffffff" x="130" y="30">{val}</text>'
  const field1Template =
    '<text data-width="180" style="font-size: 12px; font-weight: normal;" fill="#ffffff" x="130" y="50">Lahir: {val}</text>'
  const field2Template =
    '<text data-width="180" style="font-size: 12px; font-weight: normal;" fill="#ffffff" x="130" y="70">Alamat: {val}</text>'

  // Male
  FamilyTree.templates.sriniz_male = Object.assign({}, FamilyTree.templates.sriniz)
  FamilyTree.templates.sriniz_male.node =
    '<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#0070a6" stroke="#aeaeae" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz_male.field_0 = field0Template
  FamilyTree.templates.sriniz_male.field_1 = field1Template
  FamilyTree.templates.sriniz_male.field_2 = field2Template

  // Female
  FamilyTree.templates.sriniz_female = Object.assign({}, FamilyTree.templates.sriniz)
  FamilyTree.templates.sriniz_female.node =
    '<rect x="0" y="0" height="{h}" width="{w}" stroke-width="1" fill="#bd00ad" stroke="#aeaeae" rx="15" ry="15"></rect>'

  FamilyTree.templates.sriniz_female.field_0 = field0Template
  FamilyTree.templates.sriniz_female.field_1 = field1Template
  FamilyTree.templates.sriniz_female.field_2 = field2Template

  const expandIconMale =
    '<circle cx="97" cy="-16" r="10" fill="#0070a6" stroke="#fff" stroke-width="1"><title>Expand</title></circle>' +
    '<line x1="90" y1="-16" x2="104" y2="-16" stroke-width="1" stroke="#fff"></line>' +
    '<line x1="97" y1="-23" x2="97" y2="-9" stroke-width="1" stroke="#fff"></line>'

  const expandIconFemale =
    '<circle cx="97" cy="-16" r="10" fill="#bd00ad" stroke="#fff" stroke-width="1"></circle>' +
    '<line x1="90" y1="-16" x2="104" y2="-16" stroke-width="1" stroke="#fff"></line>' +
    '<line x1="97" y1="-23" x2="97" y2="-9" stroke-width="1" stroke="#fff"></line>'

  FamilyTree.templates.sriniz_male.plus = expandIconMale
  FamilyTree.templates.sriniz_female.plus = expandIconFemale

  // Image
  const imgTemplate =
    '<clipPath id="ulaImg">' +
    '<rect  height="75" width="75" x="45" y="10" stroke-width="1" fill="#bd00ad" stroke="#aeaeae" rx="15" ry="15"></rect>' +
    '</clipPath>' +
    '<image x="45" y="10" preserveAspectRatio="xMidYMid slice" clip-path="url(#ulaImg)" xlink:href="{val}" width="75" height="75">' +
    '</image>'

  FamilyTree.templates.sriniz_male.img_0 = imgTemplate
  FamilyTree.templates.sriniz_female.img_0 = imgTemplate

  FamilyTree.templates.sriniz_male.up = '<use x="350" y="0" xlink:href="#sriniz_male_up"></use>'
  FamilyTree.templates.sriniz_female.up = '<use x="350" y="0" xlink:href="#sriniz_female_up"></use>'

  // Pointer
  FamilyTree.templates.sriniz.pointer =
    '<g data-pointer="pointer" transform="matrix(0,0,0,0,80,80)">><g transform="matrix(0.3,0,0,0.3,-17,-17)">' +
    '<polygon fill="#0070a6" points="53.004,173.004 53.004,66.996 0,120" />' +
    '<polygon fill="#0070a6" points="186.996,66.996 186.996,173.004 240,120" />' +
    '<polygon fill="#bd00ad" points="66.996,53.004 173.004,53.004 120,0" />' +
    '<polygon fill="#bd00ad" points="120,240 173.004,186.996 66.996,186.996" />' +
    '<circle fill="red" cx="120" cy="120" r="30" />' +
    '</g></g>'

  familyTree = new FamilyTree(domEl, {
    nodes: x,
    mouseScrool: FamilyTree.none,
    scaleInitial: getOptions().scaleInitial,
    mode: 'dark',
    template: 'sriniz',
    roots: ['_ui8p'],
    nodeMenu: {
      edit: { text: 'Ubah' },
      details: { text: 'Lihat Selengkapnya' },
    },

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
    if (args.cnode.isPartner && args.node.partnerSeparation == 30)
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
    if (args.name == 'born') {
      let date = new Date(args.value)
      args.value = date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
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

  familyTree.onUpdateNode(async (args) => {
    console.log(args)

    args.addNodesData.forEach(async (node) => {
      await addDocWithIdInData(node)
    })

    args.updateNodesData.forEach(async (node) => {
      await updateDocument(node.doc_id, node)
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
async function updateDocument(docId, updatedData) {
  const docRef = doc(db, tableName, docId)

  try {
    await updateDoc(docRef, {
      ...updatedData,
    })

    console.log('Document updated successfully')
  } catch (error) {
    console.error('Error updating document:', error)
  }
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
