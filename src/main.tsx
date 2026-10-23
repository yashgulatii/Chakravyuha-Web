import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

document.head
  .querySelectorAll('meta[data-rh="true"], link[data-rh="true"]')
  .forEach((element) => element.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
