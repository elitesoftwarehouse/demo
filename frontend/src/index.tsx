import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Note: This file is present for completeness. The BookingStatusBadge component can be imported from components.

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
}
