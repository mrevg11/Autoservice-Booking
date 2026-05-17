import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const handleChunkError = (message: string) => {
  const isChunkError =
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('ChunkLoadError');
  if (isChunkError) {
    const reloadKey = 'chunk_reload_attempted';
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    }
  }
};

window.addEventListener('error', (event) => {
  handleChunkError(event.message ?? '');
});

window.addEventListener('unhandledrejection', (event) => {
  handleChunkError(event.reason?.message ?? '');
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
