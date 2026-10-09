import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import './superadmin.css'
import './i18n'
import App from './App'
import './sourceResponsive.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
