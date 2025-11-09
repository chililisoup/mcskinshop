import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';
import MCSkinShop from './components/special/mcskinshop';

const container = document.getElementById('root');
if (!container) throw new Error('No root node!');

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <MCSkinShop />
  </React.StrictMode>
);
