import { useLanguage } from '../contexts/LanguageContext'
import './LanguageToggle.css'

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  const languages: Array<{ value: 'ko' | 'en' | 'ja'; label: string; flag: string }> = [
    { value: 'ko', label: t('language.ko'), flag: '🇰🇷' },
    { value: 'en', label: t('language.en'), flag: '🇺🇸' },
    { value: 'ja', label: t('language.ja'), flag: '🇯🇵' },
  ]

  return (
    <div className="language-toggle">
      <div className="language-toggle-label">{t('language.label', { default: '언어' })}</div>
      <div className="language-toggle-buttons">
        {languages.map((lang) => (
          <button
            key={lang.value}
            className={`language-toggle-button ${language === lang.value ? 'active' : ''}`}
            onClick={() => setLanguage(lang.value)}
            title={lang.label}
            aria-label={lang.label}
          >
            <span className="language-flag">{lang.flag}</span>
            <span className="language-text">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
