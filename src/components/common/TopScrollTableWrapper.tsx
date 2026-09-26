import React, { useRef, useEffect, useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoveHorizontal } from 'lucide-react';

interface TopScrollTableWrapperProps {
  children: ReactNode;
  className?: string;
  id?: string;
  tableTitle?: string;
}

export const TopScrollTableWrapper: React.FC<TopScrollTableWrapperProps> = ({
  children,
  className = '',
  id,
  tableTitle,
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState<number>(0);
  const [clientWidth, setClientWidth] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [canScroll, setCanScroll] = useState<boolean>(false);

  const isSyncingTop = useRef(false);
  const isSyncingContent = useRef(false);

  const updateMeasurements = () => {
    if (contentScrollRef.current) {
      const { scrollWidth: sw, clientWidth: cw, scrollLeft: sl } = contentScrollRef.current;
      setScrollWidth(sw);
      setClientWidth(cw);
      setScrollLeft(sl);
      setCanScroll(sw > cw + 5);
    }
  };

  useEffect(() => {
    updateMeasurements();

    const resizeObserver = new ResizeObserver(() => {
      updateMeasurements();
    });

    if (contentScrollRef.current) {
      resizeObserver.observe(contentScrollRef.current);
    }

    window.addEventListener('resize', updateMeasurements);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, []);

  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (topScrollRef.current && contentScrollRef.current) {
      isSyncingContent.current = true;
      contentScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      setScrollLeft(topScrollRef.current.scrollLeft);
    }
  };

  const handleContentScroll = () => {
    if (isSyncingContent.current) {
      isSyncingContent.current = false;
      return;
    }
    if (topScrollRef.current && contentScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
      setScrollLeft(contentScrollRef.current.scrollLeft);
    }
  };

  const rollBy = (delta: number) => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const rollTo = (position: 'start' | 'end') => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({
        left: position === 'start' ? 0 : scrollWidth,
        behavior: 'smooth',
      });
    }
  };

  const maxScroll = Math.max(1, scrollWidth - clientWidth);
  const scrollPercent = Math.min(100, Math.max(0, Math.round((scrollLeft / maxScroll) * 100)));

  return (
    <div id={id} className={`w-full ${className}`}>
      {/* BARRA DE CONTROLE DE ROLL SUPERIOR (EXATAMENTE EM CIMA DA LISTA) */}
      <div className="bg-slate-100/90 dark:bg-slate-800/90 border-t border-x border-slate-200 dark:border-slate-700/80 rounded-t-2xl p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
        {/* Identificação e Status do Roll */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs">
            <MoveHorizontal className="w-3.5 h-3.5 text-[#002172] dark:text-blue-400" />
            <span>Roll da Lista (Mover para o Lado)</span>
          </div>

          {canScroll ? (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300">
              Posição: <strong className="font-mono text-slate-800 dark:text-white">{scrollPercent}%</strong>
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-300">
              (Todas as colunas visíveis)
            </span>
          )}
        </div>

        {/* Botões rápidos de navegação lateral (Roll) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => rollTo('start')}
            disabled={scrollLeft <= 5}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white transition-colors shadow-2xs"
            title="Mover lista totalmente para o Início (Esquerda)"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Início</span>
          </button>

          <button
            onClick={() => rollBy(-260)}
            disabled={scrollLeft <= 5}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white transition-colors shadow-2xs"
            title="Rolar lista para a Esquerda"
          >
            <ChevronLeft className="w-4 h-4 text-[#002172] dark:text-blue-400" />
            <span>← Mover Esquerda</span>
          </button>

          <button
            onClick={() => rollBy(260)}
            disabled={scrollLeft >= maxScroll - 5}
            className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white transition-colors shadow-2xs"
            title="Rolar lista para a Direita"
          >
            <span>Mover Direita →</span>
            <ChevronRight className="w-4 h-4 text-[#002172] dark:text-blue-400" />
          </button>

          <button
            onClick={() => rollTo('end')}
            disabled={scrollLeft >= maxScroll - 5}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white transition-colors shadow-2xs"
            title="Mover lista totalmente para o Fim (Direita)"
          >
            <span className="hidden md:inline">Fim</span>
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TRACK DE SCROLL NATIVO SINCRONIZADO NO TOPO (BARRA DE ROLAGEM HORIZONTAL SUPERIOR) */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="w-full overflow-x-auto bg-slate-200/90 dark:bg-slate-800/90 border-x border-b border-slate-300 dark:border-slate-700 py-0.5 custom-scrollbar-top"
        style={{
          height: '14px',
          display: canScroll ? 'block' : 'none',
        }}
        title="Arraste aqui para mover a lista para o lado"
      >
        <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
      </div>

      {/* CONTAINER PRINCIPAL DA TABELA / LISTA */}
      <div
        ref={contentScrollRef}
        onScroll={handleContentScroll}
        className="overflow-x-auto border-x border-b border-slate-200 dark:border-slate-800 rounded-b-2xl bg-white dark:bg-slate-900"
      >
        {children}
      </div>
    </div>
  );
};
