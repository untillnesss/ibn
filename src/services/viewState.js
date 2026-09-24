import { ref } from 'vue'

// Toggle "Tampilkan belum terverifikasi" di halaman silsilah.
export const showPending = ref(false)

// true selama form edit/detail anggota terbuka (bilah akun disembunyikan agar tidak menimpa form).
export const editFormOpen = ref(false)
