import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';
import MCSkinShop from './components/special/mcskinshop';
import SessionManager from '@tools/sessionman';
import * as GlobalEventHandlers from '@tools/globaleventhandlers';

const container = document.getElementById('root');
if (!container) throw new Error('No root node!');

const root = createRoot(container);

await SessionManager.init();
GlobalEventHandlers.init();

root.render(
  <React.StrictMode>
    <MCSkinShop />
  </React.StrictMode>
);
