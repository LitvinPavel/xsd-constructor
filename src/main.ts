import { createApp } from 'vue'
import App from './App.vue'
import DevExtreme from './plugins/devextreme'

const app = createApp(App)

// Установка плагина DevExtreme
app.use(DevExtreme)

app.mount('#app')