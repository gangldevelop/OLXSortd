import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize Office.js
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App platform="outlook" />
      </React.StrictMode>,
    )
  }
});
