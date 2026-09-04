export async function uploadPhoto(blob) {
  const formData = new FormData()
  formData.append('file', blob, 'photo.jpg')

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
    method: 'POST',
    headers: { 'X-API-Key': import.meta.env.VITE_UPLOAD_API_KEY },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.url
}
