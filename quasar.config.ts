import { configure } from 'quasar/wrappers'

export default configure(() => {
  return {
    boot: ['pinia', 'dark-mode'],

    css: ['app.scss'],

    extras: [
      'roboto-font',
      'material-icons',
    ],

    build: {
      target: { browser: ['es2022', 'firefox115', 'chrome115', 'safari14'] },
      typescript: { strict: true },
      vueRouterMode: 'history',
    },

    framework: {
      config: {
        dark: 'auto',
      },
      plugins: [
        'Notify',
        'Dialog',
        'Loading',
        'LocalStorage',
        'BottomSheet',
      ],
    },

    animations: [],

    capacitor: {
      hideSplashscreen: true,
    },

    pwa: {
      workboxMode: 'GenerateSW',
      manifestOptions: {
        name: 'Filetics Trainer',
        short_name: 'Filetics',
        description: 'AI-powered 12-week training plans',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1a2e',
        theme_color: '#e94560',
        icons: [
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    },
  }
})
