import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/main'

const tableName = 'families'

export async function addDocWithIdInData(data) {
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

export async function updateByField(id, data) {
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

export async function deleteDocsByField(id) {
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

export async function findNodeById(id) {
  const q = query(collection(db, tableName), where('id', '==', id))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs[0]?.data() ?? null
}

export async function fetchAllFamilies() {
  const querySnapshot = await getDocs(collection(db, tableName))
  return querySnapshot.docs.map((document) => document.data())
}

export async function applyChangePayload({
  addNodesData = [],
  updateNodesData = [],
  removeNodeId = null,
}) {
  for (const node of addNodesData) {
    await addDocWithIdInData(node)
  }

  for (const node of updateNodesData) {
    await updateByField(node.id, node)
  }

  if (removeNodeId != null) {
    await deleteDocsByField(removeNodeId)
  }
}
