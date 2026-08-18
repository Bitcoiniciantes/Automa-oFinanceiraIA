import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import AuthGate from './AuthGate'
import './Dashboard.module.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthGate />
    </HashRouter>
  </React.StrictMode>,
)
