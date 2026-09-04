import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'

export function openImageLightbox(src) {
  const img = new Image()
  img.src = src
  img.style.display = 'none'
  document.body.appendChild(img)

  const viewer = new Viewer(img, {
    inline: false,
    navbar: false,
    title: false,
    toolbar: {
      zoomIn: true,
      zoomOut: true,
      oneToOne: true,
      reset: true,
      rotateLeft: true,
      rotateRight: true,
    },
    hidden() {
      viewer.destroy()
      img.remove()
    },
  })

  viewer.show()
}
