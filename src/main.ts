import { createApp } from 'vue'
import { Quasar, Notify, Dialog, Loading, LocalStorage, BottomSheet } from 'quasar'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

import '@quasar/extras/roboto-font/roboto-font.css'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/app.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Quasar, {
  plugins: { Notify, Dialog, Loading, LocalStorage, BottomSheet },
  config: {
    dark: 'auto',
  },
})

app.mount('#q-app')
