(() => {
  const root = document.documentElement
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  let followsSystem = true

  function readPreference() {
    try {
      const stored = window.localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') {
        followsSystem = false
        return stored
      }
    } catch {
      followsSystem = true
    }
    followsSystem = true
    return media.matches ? 'dark' : 'light'
  }

  function applyTheme(theme) {
    root.dataset.theme = theme
    root.style.colorScheme = theme
    const updateThemeColor = () => {
      const color = getComputedStyle(root).getPropertyValue('--theme-color').trim()
      const themeColor = document.querySelector('meta[name="theme-color"]')
      if (color && themeColor) themeColor.content = color
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateThemeColor, { once: true })
    } else {
      updateThemeColor()
    }
    window.dispatchEvent(new Event('themechange'))
  }

  applyTheme(readPreference())
  media.addEventListener('change', () => {
    if (followsSystem) applyTheme(media.matches ? 'dark' : 'light')
  })
  window.addEventListener('storage', (event) => {
    if (event.key !== 'theme') return
    followsSystem = event.newValue !== 'dark' && event.newValue !== 'light'
    applyTheme(followsSystem ? (media.matches ? 'dark' : 'light') : event.newValue)
  })
  window.addEventListener('DOMContentLoaded', () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => root.setAttribute('data-theme-ready', ''))
    })
  })
})()
