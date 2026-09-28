import React from 'react';

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
 */
export const MefisaLogo: React.FC<MefisaLogoProps> = ({
  variant = 'auto',
  className = '',
}) => {
  // Garante que o caminho funcione no GitHub Pages (subdiretório ou raiz) e no Studio
  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const logoForma1Src = `${cleanBase}assets/logo-colorida-forma-1.svg`;
  const logoForma2Src = `${cleanBase}assets/logo-colorida-forma-2.svg`;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl: string) => {
    const img = e.currentTarget;
    if (img.src !== fallbackUrl && !img.dataset.hasRetried) {
      img.dataset.hasRetried = 'true';
      img.src = fallbackUrl;
    }
  };

  return (
    <div
      className={`group select-none inline-flex items-center justify-center transition-transform ${className}`}
      title="Clínica Mefisa — Clínica de Especialidades"
    >
      <div className="logo-white-bg keep-white bg-white dark:bg-white text-slate-900 rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center transition-all w-full max-w-[240px]">
        {variant === 'horizontal' ? (
          <div className="flex items-center justify-center py-0.5">
            <img
              src={logoForma1Src}
              onError={(e) => handleImgError(e, './assets/logo-colorida-forma-1.svg')}
              alt="Clínica Mefisa - Especialidades Médicas"
              className="h-11 sm:h-12 w-auto max-w-[225px] object-contain select-none pointer-events-none drop-shadow-xs"
              loading="eager"
            />
          </div>
        ) : variant === 'compact' ? (
          <div className="flex flex-col items-center justify-center py-0.5">
            <img
              src={logoForma2Src}
              onError={(e) => handleImgError(e, './assets/logo-colorida-forma-2.svg')}
              alt="Clínica Mefisa - Especialidades Médicas"
              className="h-14 sm:h-15 w-auto max-w-[78px] object-contain select-none pointer-events-none drop-shadow-xs"
              loading="eager"
            />
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <div className="mefisa-forma-1 hidden sm:flex items-center justify-center py-0.5">
              <img
                src={logoForma1Src}
                onError={(e) => handleImgError(e, './assets/logo-colorida-forma-1.svg')}
                alt="Clínica Mefisa - Especialidades Médicas"
                className="h-11 sm:h-12 w-auto max-w-[225px] object-contain select-none pointer-events-none drop-shadow-xs"
                loading="eager"
              />
            </div>
            <div className="mefisa-forma-2 flex sm:hidden flex-col items-center justify-center py-0.5">
              <img
                src={logoForma2Src}
                onError={(e) => handleImgError(e, './assets/logo-colorida-forma-2.svg')}
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
