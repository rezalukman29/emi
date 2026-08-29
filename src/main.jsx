import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import './superadmin.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
