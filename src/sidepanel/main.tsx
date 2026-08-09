import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import './styles.css';

console.log('ShipDime side panel script loaded');
const mountElement = document.getElementById('root');
console.log('Mount element:', mountElement);

if (mountElement) {
  createRoot(mountElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} else {
  console.error('ShipDime side panel root element was not found');
}
