import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import './LanguageToggle.css'

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const languages: Array<{ value: 'ko' | 'en' | 'ja'; label: string; flag: string }> = [
    { value: 'ko', label: t('language.ko'), flag: '🇰🇷' },
    { value: 'en', label: t('language.en'), flag: '🇺🇸' },
    { value: 'ja', label: t('language.ja'), flag: '🇯🇵' },
  ]

  const currentLanguage = languages.find(l => l.value === language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="language-toggle" ref={dropdownRef}>
      <button
        className="language-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        title={currentLanguage.label}
        aria-label={currentLanguage.label}
        aria-expanded={isOpen}
      >
        <span className="language-toggle-icon">{currentLanguage.flag}</span>
      </button>
      {isOpen && (
        <div className="language-toggle-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.value}
              className={`language-toggle-option ${language === lang.value ? 'active' : ''}`}
              onClick={() => {
                setLanguage(lang.value)
                setIsOpen(false)
              }}
              title={lang.label}
              aria-label={lang.label}
            >
              <span className="language-option-flag">{lang.flag}</span>
              <span className="language-option-label">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
