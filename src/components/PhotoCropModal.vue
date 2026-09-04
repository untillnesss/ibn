<script setup>
import { ref, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { Cropper, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = defineProps({
  file: { type: File, required: true },
})
const emit = defineEmits(['confirm', 'cancel'])

const MAX_OUTPUT_SIZE = 800
const JPEG_QUALITY = 0.85

const cropper = useTemplateRef('cropper')
const imageSrc = ref('')

onMounted(() => {
  imageSrc.value = URL.createObjectURL(props.file)
})

onUnmounted(() => {
  if (imageSrc.value) URL.revokeObjectURL(imageSrc.value)
})

function cancel() {
  emit('cancel')
}

function confirm() {
  const result = cropper.value?.getResult()
  const sourceCanvas = result?.canvas
  if (!sourceCanvas) {
    emit('cancel')
    return
  }

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = MAX_OUTPUT_SIZE
  outputCanvas.height = MAX_OUTPUT_SIZE
  const ctx = outputCanvas.getContext('2d')
  ctx.drawImage(sourceCanvas, 0, 0, MAX_OUTPUT_SIZE, MAX_OUTPUT_SIZE)

  outputCanvas.toBlob(
    (blob) => {
      if (blob) emit('confirm', blob)
      else emit('cancel')
    },
    'image/jpeg',
    JPEG_QUALITY,
  )
}
</script>

<template>
  <div class="overlay">
    <div class="panel">
      <div class="cropper-wrap">
        <Cropper
          ref="cropper"
          :src="imageSrc"
          :stencil-component="RectangleStencil"
          :stencil-props="{ aspectRatio: 1 }"
        />
      </div>
      <div class="actions">
        <button type="button" class="btn btn-cancel" @click="cancel">Batal</button>
        <button type="button" class="btn btn-confirm" @click="confirm">Pakai Foto</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 16px;
  width: min(500px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cropper-wrap {
  height: min(500px, 60vh);
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel {
  background: #333;
  color: #fff;
}

.btn-confirm {
  background: #039be5;
  color: #fff;
}
</style>
