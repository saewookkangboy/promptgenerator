import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import './ThemeToggle.css'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()

  const themes: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'system', label: t('theme.system') },
  ]

  return (
    <div className="theme-toggle">
      <div className="theme-toggle-label">{t('theme.label', { default: '테마' })}</div>
      <div className="theme-toggle-buttons">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            className={`theme-toggle-button ${theme === themeOption.value ? 'active' : ''}`}
            onClick={() => setTheme(themeOption.value)}
            title={themeOption.label}
            aria-label={themeOption.label}
          >
            {themeOption.value === 'light' && '☀️'}
            {themeOption.value === 'dark' && '🌙'}
            {themeOption.value === 'system' && '💻'}
            <span className="theme-toggle-text">{themeOption.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
