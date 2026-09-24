import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import { auth } from '@/main'
import { currentUser } from '@/services/authState'
import { confirmDialog, notifyError } from '@/services/notify'

const IGNORED_ERRORS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

// Mengembalikan user yang login, atau null kalau dibatalkan/gagal.
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    return result.user
  } catch (err) {
    if (!IGNORED_ERRORS.includes(err.code)) {
      console.error(err)
      notifyError('Gagal masuk', 'Tidak bisa masuk dengan Google. Silakan coba lagi.')
    }
    return null
  }
}

export function signOutUser() {
  return signOut(auth)
}

export async function ensureLoggedIn() {
  if (currentUser.value) return currentUser.value
  const ok = await confirmDialog({
    title: 'Masuk diperlukan',
    text: 'Anda harus masuk dengan akun Google sebelum mengubah data silsilah.',
    confirmText: 'Masuk dengan Google',
    icon: 'info',
  })
  if (!ok) return null
  return signInWithGoogle()
}
