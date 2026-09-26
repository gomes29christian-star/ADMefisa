import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/common/ErrorBoundary';
import './index.css';

console.log('[Clínica Mefisa] Inicializando aplicação...');

try {
  (window as any).__MEFISA_STARTED__ = true;
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('Elemento #root não foi encontrado no DOM.');
  }

  // Remove o indicador estático de carregamento imediatamente para liberar o DOM para o React
  const loader = document.getElementById('initial-loading-fallback');
  if (loader) {
    loader.remove();
  }

  const root = createRoot(rootEl);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  console.log('[Clínica Mefisa] Aplicação montada com sucesso.');
} catch (e: any) {
  console.error('[Clínica Mefisa] Erro crítico ao montar aplicação:', e);
  if (typeof (window as any).showDiagnosticError === 'function') {
    (window as any).showDiagnosticError('Erro ao montar React: ' + (e?.message || String(e)));
  }
}

