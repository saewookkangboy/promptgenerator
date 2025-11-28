import { analyticsAPI, getToken } from './api'
import { showNotification } from './notifications'

type PromptCategory = 'TEXT' | 'IMAGE' | 'VIDEO' | 'ENGINEERING' | 'UNKNOWN'

interface SaveFailureContext {
  inputPreview?: string
  options?: any
}

/**
 * 로그인 여부 확인 (토큰 존재만 확인)
 */
export const hasPromptSaveAuth = (): boolean => {
  return !!getToken()
}

/**
 * 프롬프트 저장 실패 시 사용자에게 알리고 관리자용 로그를 서버에 남김
 */
export async function reportPromptSaveFailure(
  category: PromptCategory,
  reason: string,
  context: SaveFailureContext = {},
  message?: string
) {
  const toastMessage =
    message ||
    '프롬프트를 서버에 저장하지 못했습니다. 로그인 상태와 네트워크를 확인해주세요.'

  showNotification(toastMessage, 'error')

  try {
    await analyticsAPI.logPromptSaveFailure({
      category,
      reason,
      context,
    })
  } catch (error) {
    console.warn('[PromptSaveReporter] 실패 로그 전송 실패:', error)
  }
}
