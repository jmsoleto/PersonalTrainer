import { Dark } from 'quasar'

export default () => {
  try {
    const raw = localStorage.getItem('pt-settings')
    if (raw) {
      const settings = JSON.parse(raw)
      if (settings.darkMode !== undefined) {
        Dark.set(settings.darkMode)
      }
    }
  } catch { /* use default auto */ }
}
