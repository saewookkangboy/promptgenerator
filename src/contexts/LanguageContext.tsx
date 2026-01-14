import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'ko' | 'en' | 'ja'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 번역 데이터 타입
type Translations = Record<string, string | Record<string, string>>

// 기본 번역 데이터 (한국어)
const defaultTranslations: Translations = {
  // App.tsx
  'app.title': '프롬프트 메이커',
  'app.subtitle': '텍스트, 이미지, 동영상 생성용 프롬프트를 생성합니다',
  'app.tab.text': '텍스트 콘텐츠',
  'app.tab.image': '이미지 생성',
  'app.tab.video': '동영상 생성',
  'app.tab.engineering': '프롬프트 엔지니어링',
  'app.tab.templates': '템플릿 갤러리',
  'app.tab.about': 'About',
  'app.admin': 'Admin',
  'app.footer.copyright': '© 2025 chunghyo park. Built to move the market. All rights reserved.',
  'app.footer.about': 'About',
  
  // 공통
  'common.select': '선택 안함',
  'common.submit': '제출',
  'common.cancel': '취소',
  'common.close': '닫기',
  'common.save': '저장',
  'common.delete': '삭제',
  'common.edit': '편집',
  'common.loading': '로딩 중...',
  'common.error': '오류가 발생했습니다',
  
  // 테마
  'theme.label': '테마',
  'theme.light': '라이트 모드',
  'theme.dark': '다크 모드',
  'theme.system': '시스템 모드',
  
  // 언어
  'language.label': '언어',
  'language.ko': '한국어',
  'language.en': 'English',
  'language.ja': '日本語',
}

// 영어 번역
const enTranslations: Translations = {
  ...defaultTranslations,
  'app.title': 'Prompt Maker',
  'app.subtitle': 'Generate prompts for text, image, and video generation',
  'app.tab.text': 'Text Content',
  'app.tab.image': 'Image Generation',
  'app.tab.video': 'Video Generation',
  'app.tab.engineering': 'Prompt Engineering',
  'app.tab.templates': 'Template Gallery',
  'app.tab.about': 'About',
  'app.footer.copyright': '© 2025 chunghyo park. Built to move the market. All rights reserved.',
  'common.select': 'None',
  'common.submit': 'Submit',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'theme.label': 'Theme',
  'theme.light': 'Light Mode',
  'theme.dark': 'Dark Mode',
  'theme.system': 'System Mode',
  'language.label': 'Language',
  'language.ko': 'Korean',
  'language.en': 'English',
  'language.ja': 'Japanese',
}

// 일본어 번역
const jaTranslations: Translations = {
  ...defaultTranslations,
  'app.title': 'プロンプトメーカー',
  'app.subtitle': 'テキスト、画像、動画生成用のプロンプトを生成します',
  'app.tab.text': 'テキストコンテンツ',
  'app.tab.image': '画像生成',
  'app.tab.video': '動画生成',
  'app.tab.engineering': 'プロンプトエンジニアリング',
  'app.tab.templates': 'テンプレートギャラリー',
  'app.tab.about': 'About',
  'app.footer.copyright': '© 2025 chunghyo park. Built to move the market. All rights reserved.',
  'common.select': '選択なし',
  'common.submit': '送信',
  'common.cancel': 'キャンセル',
  'common.close': '閉じる',
  'common.save': '保存',
  'common.delete': '削除',
  'common.edit': '編集',
  'common.loading': '読み込み中...',
  'common.error': 'エラーが発生しました',
  'theme.label': 'テーマ',
  'theme.light': 'ライトモード',
  'theme.dark': 'ダークモード',
  'theme.system': 'システムモード',
  'language.label': '言語',
  'language.ko': '韓国語',
  'language.en': '英語',
  'language.ja': '日本語',
}

const translations: Record<Language, Translations> = {
  ko: defaultTranslations,
  en: enTranslations,
  ja: jaTranslations,
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // localStorage에서 언어 설정 불러오기
    const saved = localStorage.getItem('language')
    if (saved === 'ko' || saved === 'en' || saved === 'ja') {
      return saved
    }
    // 브라우저 언어 감지
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('ko')) return 'ko'
    if (browserLang.startsWith('ja')) return 'ja'
    return 'en'
  })

  useEffect(() => {
    // 언어 설정을 localStorage에 저장
    localStorage.setItem('language', language)
    // HTML lang 속성 업데이트
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]
    let value = translation[key] || defaultTranslations[key] || key

    // 중첩된 키 지원 (예: 'common.button.submit')
    if (typeof value === 'object') {
      // 중첩된 객체인 경우, 더 깊은 키 탐색 필요
      const keys = key.split('.')
      let current: any = translation
      for (const k of keys) {
        current = current?.[k]
        if (!current) break
      }
      value = current || key
    }

    // 파라미터 치환
    if (params && typeof value === 'string') {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return typeof value === 'string' ? value : key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// 번역 함수를 직접 export (컴포넌트 외부에서 사용)
export function getTranslation(language: Language, key: string): string {
  const translation = translations[language]
  const value = translation[key] || translations.ko[key] || key
  return typeof value === 'string' ? value : key
}
