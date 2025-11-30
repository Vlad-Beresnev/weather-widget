import { createApp } from 'vue'
import './style.css'
import './styles/main.scss'
import App from './App.vue'

// keep Bootstrap JS for collapse, dropdowns, tooltips if needed
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

createApp(App).mount('#app')
