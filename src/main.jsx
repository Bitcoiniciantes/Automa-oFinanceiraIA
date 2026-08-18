import React from 'react'
import ReactDOM from 'react-dom/client'
import AuthGate from './AuthGate'
import './Dashboard.module.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AuthGate /></React.StrictMode>
)
