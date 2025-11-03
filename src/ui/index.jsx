import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import '../styles.scss';

// Initialize React app
const container = document.getElementById('ui-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

