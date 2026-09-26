import React from 'react';
import { useSecretAchievements } from '../../context/SecretAchievementsContext';

interface MefisaLogoProps {
  variant?: 'auto' | 'horizontal' | 'compact';
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Componente Oficial do Logotipo da Clínica Mefisa
 * Utiliza estritamente os arquivos vetoriais originais fornecidos:
 * - Forma 1 (Horizontal): /assets/logo-colorida-forma-1.svg
 * - Forma 2 (Compacta / Vertical): /assets/logo-colorida-forma-2.svg
 * 
 * Requisitos atendidos:
 * 1. Logotipo oficial da Clínica Mefisa exibido de forma uniforme em alta fidelidade vetorial.
 * 2. Alternância para formato compacto (Forma 2) se o layout for encurtado.
 * 3. Fundo da logo PERMANECE BRANCO mesmo quando o site estiver em MODO ESCURO (keep-white / logo-white-bg).
 * 4. Interação de duplo-clique para o compartimento secreto mantida.
 */
export const MefisaLogo: React.FC<MefisaLogoProps> = ({
  variant = 'auto',
  className = '',
}) => {
  const { unlockWithLogoDoubleClick } = useSecretAchievements();

  return (
    <div
      onDoubleClick={unlockWithLogoDoubleClick}
      className={`group select-none cursor-pointer inline-flex items-center justify-center transition-transform active:scale-[0.98] ${className}`}
      title="Clínica Mefisa — Clínica de Especialidades"
    >
      {/* 
        Container de Fundo Branco Oficial Garantido (Fundo interno branco com destaque):
        - Fundo 100% branco permanente (#ffffff)
        - Classes keep-white e logo-white-bg impedem qualquer inversão no Dark Mode
        - Borda suave e cantos arredondados modernos (rounded-2xl)
      */}
      <div className="logo-white-bg keep-white bg-white dark:bg-white text-slate-900 rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center transition-all w-full max-w-[240px]">
        {variant === 'horizontal' ? (
          /* FORMA 1: HORIZONTAL OFICIAL (Aumentado de modo uniforme) */
          <div className="flex items-center justify-center py-0.5">
            <img
              src="/assets/logo-colorida-forma-1.svg"
              alt="Clínica Mefisa - Especialidades Médicas"
              className="h-11 sm:h-12 w-auto max-w-[225px] object-contain select-none pointer-events-none drop-shadow-xs"
              loading="eager"
            />
          </div>
        ) : variant === 'compact' ? (
          /* FORMA 2: COMPACTA / VERTICAL OFICIAL (Aumentado de modo uniforme) */
          <div className="flex flex-col items-center justify-center py-0.5">
            <img
              src="/assets/logo-colorida-forma-2.svg"
              alt="Clínica Mefisa - Especialidades Médicas"
              className="h-14 sm:h-15 w-auto max-w-[78px] object-contain select-none pointer-events-none drop-shadow-xs"
              loading="eager"
            />
          </div>
        ) : (
          /* VARIANTE AUTO: Transição inteligente entre Forma 1 e Forma 2 se o layout for encurtado */
          <div className="relative flex items-center justify-center">
            {/* Forma 1: Visível por padrão em telas normais / layouts expandidos */}
            <div className="mefisa-forma-1 hidden sm:flex items-center justify-center py-0.5">
              <img
                src="/assets/logo-colorida-forma-1.svg"
                alt="Clínica Mefisa - Especialidades Médicas"
                className="h-11 sm:h-12 w-auto max-w-[225px] object-contain select-none pointer-events-none drop-shadow-xs"
                loading="eager"
              />
            </div>

            {/* Forma 2: Visível quando o layout for encurtado demais ou em telas muito pequenas */}
            <div className="mefisa-forma-2 flex sm:hidden flex-col items-center justify-center py-0.5">
              <img
                src="/assets/logo-colorida-forma-2.svg"
                alt="Clínica Mefisa - Especialidades Médicas"
                className="h-14 w-auto max-w-[72px] object-contain select-none pointer-events-none drop-shadow-xs"
                loading="eager"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
