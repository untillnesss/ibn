import { createApp, h } from 'vue'
import PhotoCropModal from '@/components/PhotoCropModal.vue'

export function openPhotoCropModal(file) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    function cleanup() {
      app.unmount()
      container.remove()
    }

    const app = createApp({
      render: () =>
        h(PhotoCropModal, {
          file,
          onConfirm: (blob) => {
            cleanup()
            resolve(blob)
          },
          onCancel: () => {
            cleanup()
            resolve(null)
          },
        }),
    })

    app.mount(container)
  })
}
