import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import './style.css';

function showErr(msg: string) {
  let el = document.getElementById('dbg');
  if (!el) {
    el = document.createElement('pre');
    el.id = 'dbg';
    el.style.cssText = 'color:#f66;background:#200;padding:16px;white-space:pre-wrap;font-size:13px;z-index:9999;position:fixed;top:0;left:0;right:0;max-height:50vh;overflow:auto';
    document.body.appendChild(el);
  }
  el.textContent += msg + '\n\n';
}
window.addEventListener('error', (e: any) => showErr('ERR: ' + (e.error && e.error.stack || e.message)));
window.addEventListener('unhandledrejection', (e: any) => showErr('REJ: ' + (e.reason && e.reason.stack || e.reason)));

class Boundary extends React.Component<any, { err: any }> {
  state = { err: null };
  static getDerivedStateFromError(err: any) { return { err }; }
  render() {
    if (this.state.err) return React.createElement('pre', { style: { color: '#f66', padding: 20, whiteSpace: 'pre-wrap' } }, 'BOUNDARY: ' + (this.state.err.stack || String(this.state.err)));
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(<Boundary><HashRouter><App /></HashRouter></Boundary>);

// PWA: register the service worker (static-asset caching only; Supabase/API never cached)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW registration failed:', err));
  });
}
