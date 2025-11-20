import { createApp } from 'vue'
import App from './App.vue'
import './assets/css/tailwind.css';

// Проверка пути для GitHub Pages
if (window.location.pathname !== '/xsd-constructor/' && !window.location.pathname.includes('/xsd-constructor/#')) {
  window.location.href = '/xsd-constructor/';
}

createApp(App).mount('#app')
