import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Initialize Office.js
declare global {
  interface Window {
    Office: any;
  }
}

// Initialize Office.js
if (typeof window !== 'undefined' && window.Office) {
  window.Office.onReady((info: any) => {
    if (info.host === window.Office.HostType.Outlook) {
      ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      )
    }
  });
} else {
  // Fallback for development
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
