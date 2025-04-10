import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { VueFire, VueFireFirestoreOptionsAPI } from 'vuefire'

// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyC96yRx9ISiCgYPgVzq9cwlN226gxmDuCY',
  authDomain: 'ibn-silsilah.firebaseapp.com',
  projectId: 'ibn-silsilah',
  storageBucket: 'ibn-silsilah.firebasestorage.app',
  messagingSenderId: '875917133519',
  appId: '1:875917133519:web:44e3380532420659eb59ba',
  measurementId: 'G-1YNFY1JHPN',
}

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig)
export const db = getFirestore(firebaseApp)

const app = createApp(App)

app.use(router)

app.use(VueFire, {
  firebaseApp,
  modules: [VueFireFirestoreOptionsAPI()],
})

app.mount('#app')
