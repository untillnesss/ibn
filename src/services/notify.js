import Swal from 'sweetalert2'

// Satu tempat untuk gaya dialog seluruh aplikasi (pengganti alert()/confirm() bawaan).
const base = Swal.mixin({
  theme: 'dark',
  confirmButtonColor: '#039be5',
  cancelButtonColor: '#444',
  confirmButtonText: 'OK',
  cancelButtonText: 'Batal',
  reverseButtons: true,
})

export function notifySuccess(title, text) {
  return base.fire({ icon: 'success', title, text })
}

export function notifyError(title, text) {
  return base.fire({ icon: 'error', title, text })
}

export function notifyWarning(title, text) {
  return base.fire({ icon: 'warning', title, text })
}

export function notifyInfo(title, text) {
  return base.fire({ icon: 'info', title, text })
}

// Mengembalikan true kalau user menekan tombol konfirmasi.
export async function confirmDialog({ title, text, confirmText = 'Ya', icon = 'question' }) {
  const result = await base.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
  })
  return result.isConfirmed
}
