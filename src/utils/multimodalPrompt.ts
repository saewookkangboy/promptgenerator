/**
 * 멀티모달 프롬프트 지원
 * 이미지, 텍스트, 비디오 조합 프롬프트 생성
 */

export interface MultimodalInput {
  type: 'text' | 'image' | 'video' | 'audio'
  content: string | File | Blob
  description?: string
}

export interface MultimodalPrompt {
  text: string
  images?: Array<{ url: string; description: string }>
  videos?: Array<{ url: string; description: string }>
  audio?: Array<{ url: string; description: string }>
}

/**
 * 멀티모달 프롬프트 생성
 */
export function createMultimodalPrompt(
  baseText: string,
  inputs: MultimodalInput[]
): MultimodalPrompt {
  const prompt: MultimodalPrompt = {
    text: baseText,
  }

  // 이미지 처리
  const images = inputs
    .filter(input => input.type === 'image')
    .map(input => ({
      url: typeof input.content === 'string' ? input.content : URL.createObjectURL(input.content),
      description: input.description || 'User provided image',
    }))

  if (images.length > 0) {
    prompt.images = images
  }

  // 비디오 처리
  const videos = inputs
    .filter(input => input.type === 'video')
    .map(input => ({
      url: typeof input.content === 'string' ? input.content : URL.createObjectURL(input.content),
      description: input.description || 'User provided video',
    }))

  if (videos.length > 0) {
    prompt.videos = videos
  }

  // 오디오 처리
  const audio = inputs
    .filter(input => input.type === 'audio')
    .map(input => ({
      url: typeof input.content === 'string' ? input.content : URL.createObjectURL(input.content),
      description: input.description || 'User provided audio',
    }))

  if (audio.length > 0) {
    prompt.audio = audio
  }

  return prompt
}

/**
 * 이미지 프롬프트에 이미지 참조 추가
 */
export function addImageReference(
  basePrompt: string,
  imageUrl: string,
  description?: string
): string {
  return `${basePrompt}

[Image Reference]
URL: ${imageUrl}
${description ? `Description: ${description}` : ''}

Please consider this image when generating your response.`
}

/**
 * 비디오 프롬프트에 비디오 참조 추가
 */
export function addVideoReference(
  basePrompt: string,
  videoUrl: string,
  description?: string,
  timestamps?: Array<{ start: number; end: number; description: string }>
): string {
  let videoPrompt = `${basePrompt}

[Video Reference]
URL: ${videoUrl}
${description ? `Description: ${description}` : ''}`

  if (timestamps && timestamps.length > 0) {
    videoPrompt += `\n\nKey Timestamps:`
    timestamps.forEach(ts => {
      videoPrompt += `\n${ts.start}s - ${ts.end}s: ${ts.description}`
    })
  }

  videoPrompt += `\n\nPlease consider this video content when generating your response.`

  return videoPrompt
}

/**
 * 멀티모달 프롬프트를 텍스트로 변환 (API 전송용)
 */
export function formatMultimodalPromptForAPI(prompt: MultimodalPrompt): string {
  let formatted = prompt.text

  if (prompt.images && prompt.images.length > 0) {
    formatted += '\n\n[Images]\n'
    prompt.images.forEach((img, idx) => {
      formatted += `${idx + 1}. ${img.url} - ${img.description}\n`
    })
  }

  if (prompt.videos && prompt.videos.length > 0) {
    formatted += '\n\n[Videos]\n'
    prompt.videos.forEach((vid, idx) => {
      formatted += `${idx + 1}. ${vid.url} - ${vid.description}\n`
    })
  }

  if (prompt.audio && prompt.audio.length > 0) {
    formatted += '\n\n[Audio]\n'
    prompt.audio.forEach((aud, idx) => {
      formatted += `${idx + 1}. ${aud.url} - ${aud.description}\n`
    })
  }

  return formatted
}

/**
 * 파일을 Base64로 변환 (이미지/비디오 업로드용)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // data:image/...;base64, 부분 제거
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 이미지 파일 검증
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원하지 않는 이미지 형식입니다. JPEG, PNG, GIF, WebP만 지원합니다.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: '이미지 크기가 너무 큽니다. 10MB 이하의 파일만 업로드할 수 있습니다.',
    }
  }

  return { valid: true }
}

/**
 * 비디오 파일 검증
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg']
  const maxSize = 100 * 1024 * 1024 // 100MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: '지원하지 않는 비디오 형식입니다. MP4, WebM, OGG만 지원합니다.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: '비디오 크기가 너무 큽니다. 100MB 이하의 파일만 업로드할 수 있습니다.',
    }
  }

  return { valid: true }
}
