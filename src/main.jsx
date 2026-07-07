import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { initAppHeal } from './lib/appHeal.js'

// ריפוי-עצמי לבאנדל ישן — חייב להירשם לפני שראוטים עצלים מתחילים להיטען
initAppHeal()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
