import { ref, computed } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'

export const currentUser = ref(null)
export const authReady = ref(false)

// Harus sama persis dengan daftar email di firestore.rules (fungsi isAdmin()).
const ADMIN_EMAILS = ['ping.mas.said@gmail.com']

export function isAdminUser(user) {
  if (!user || !user.emailVerified) return false
  return ADMIN_EMAILS.includes(user.email)
}

export const isAdmin = computed(() => isAdminUser(currentUser.value))

export function initAuthState(auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    authReady.value = true
  })
}
