import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const AccessibilityBar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    isDarkMode,
    toggleDarkMode,
    isSuaveFont,
    toggleSuaveFont,
    increaseFontSize,
    decreaseFontSize,
    fontScale,
    isHighContrast,
    toggleHighContrast,
    showMonthInitials,
    toggleMonthInitials,
  } = useTheme();

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-full px-1.5 py-1 shadow-xs transition-colors select-none ${className}`}
      role="region"
      aria-label="Barra de Acessibilidade"
    >
      {/* 1. Botão [A] Suave (Fiel ao print) */}
      <button
        type="button"
        onClick={toggleSuaveFont}
        title={isSuaveFont ? 'Desativar modo suave (leitura anti-fadiga)' : 'Ativar modo suave (leitura anti-fadiga)'}
        aria-pressed={isSuaveFont}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
          isSuaveFont
            ? 'bg-[#e0ecff] text-[#204a75] dark:bg-blue-950/80 dark:text-blue-200 dark:border dark:border-blue-700/60 font-bold shadow-2xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        {/* Ícone de quadrado com letra A maiúscula dentro (como no print) */}
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="3.5" ry="3.5" />
          <path d="M8.5 16.5L12 7.5L15.5 16.5" />
          <path d="M9.8 13.5H14.2" />
        </svg>
        <span className="text-[11px] font-bold tracking-tight">Suave</span>
      </button>

      {/* 2. Botão A- (Diminuir tamanho da fonte) */}
      <button
        type="button"
        onClick={decreaseFontSize}
        title={`Diminuir tamanho do texto (atual: ${fontScale}%)`}
        className="px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded transition-colors"
      >
        A-
      </button>

      {/* 3. Botão A+ (Aumentar tamanho da fonte) */}
      <button
        type="button"
        onClick={increaseFontSize}
        title={`Aumentar tamanho do texto (atual: ${fontScale}%)`}
        className="px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded transition-colors"
      >
        A+
      </button>

      {/* 4. Botão Alto Contraste (Ícone Meio Círculo bipartido idêntico ao print) */}
      <button
        type="button"
        onClick={toggleHighContrast}
        title={isHighContrast ? 'Desativar Alto Contraste' : 'Ativar Alto Contraste'}
        aria-pressed={isHighContrast}
        className={`p-1 rounded-full transition-colors flex items-center justify-center ${
          isHighContrast
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18C7.03 21 3 16.97 3 12S7.03 3 12 3z" fill="currentColor" />
        </svg>
      </button>

      {/* 4.5. Botão de Iniciais de Meses (jan./out./etc.) */}
      <button
        type="button"
        onClick={toggleMonthInitials}
        title={showMonthInitials ? 'Formato de Data: Números (ex: 24/10/2026)' : 'Formato de Data: Iniciais (ex: 24/out./2026)'}
        aria-pressed={showMonthInitials}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
          showMonthInitials
            ? 'bg-[#e0ecff] text-[#204a75] dark:bg-blue-950/80 dark:text-blue-200 dark:border dark:border-blue-700/60 font-black shadow-2xs'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
        }`}
      >
        <span>out.</span>
      </button>

      {/* 5. Botão Modo Escuro / Claro (Ícone de sol como no print ou lua quando escuro) */}
      <button
        type="button"
        onClick={toggleDarkMode}
        title={isDarkMode ? 'Desativar modo escuro (Mudar para Claro)' : 'Ativar modo escuro'}
        aria-pressed={isDarkMode}
        className={`p-1 rounded-full transition-colors flex items-center justify-center ${
          isDarkMode
            ? 'text-amber-300 hover:bg-slate-700'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100'
        }`}
      >
        {isDarkMode ? (
          /* Ícone de Lua quando no modo escuro */
          <svg
            className="w-4 h-4 text-amber-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          /* Ícone de Sol com raios finos conforme print */
          <svg
            className="w-4 h-4 text-slate-700 dark:text-slate-200"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
        )}
      </button>
    </div>
  );
};
