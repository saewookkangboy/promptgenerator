import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import './ThemeToggle.css'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const themes: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { value: 'light', label: t('theme.light'), icon: '☀️' },
    { value: 'dark', label: t('theme.dark'), icon: '🌙' },
    { value: 'system', label: t('theme.system'), icon: '💻' },
  ]

  const currentTheme = themes.find(t => t.value === theme) || themes[0]

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
    <div className="theme-toggle" ref={dropdownRef}>
      <button
        className="theme-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        title={currentTheme.label}
        aria-label={currentTheme.label}
        aria-expanded={isOpen}
      >
        <span className="theme-toggle-icon">{currentTheme.icon}</span>
      </button>
      {isOpen && (
        <div className="theme-toggle-dropdown">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              className={`theme-toggle-option ${theme === themeOption.value ? 'active' : ''}`}
              onClick={() => {
                setTheme(themeOption.value)
                setIsOpen(false)
              }}
              title={themeOption.label}
              aria-label={themeOption.label}
            >
              <span className="theme-option-icon">{themeOption.icon}</span>
              <span className="theme-option-label">{themeOption.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
