import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';
import MCSkinShop from './components/special/mcskinshop';
import SessionManager from '@tools/sessionman';

const container = document.getElementById('root');
if (!container) throw new Error('No root node!');

const root = createRoot(container);

await SessionManager.initialize();

root.render(
  <React.StrictMode>
    <MCSkinShop />
  </React.StrictMode>
);
