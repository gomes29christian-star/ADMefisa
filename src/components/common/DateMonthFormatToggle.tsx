import React from 'react';
import { Calendar, ArrowLeftRight } from 'lucide-react';
import { useDateFormat } from '../../context/DateFormatContext';

interface DateMonthFormatToggleProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const DateMonthFormatToggle: React.FC<DateMonthFormatToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { modoMes, toggleModoMes } = useDateFormat();

  return (
    <button
      onClick={toggleModoMes}
      type="button"
      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer select-none ${
        modoMes === 'extenso'
          ? 'bg-blue-50/90 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-[#002172] dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
      } ${className}`}
      title={`Clique para alternar o formato de data: atualmente exibindo ${
        modoMes === 'extenso' ? 'iniciais do mês (ex: 24/out./2026)' : 'números do mês (ex: 24/10/2026)'
      }`}
      aria-label="Alternar formato do mês nas datas"
    >
      <Calendar className="w-3.5 h-3.5 text-[#002172] dark:text-blue-300 group-hover:scale-105 transition-transform" />
      
      {variant === 'full' && (
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Formato:
        </span>
      )}

      <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
        {modoMes === 'extenso' ? 'DD/mmm/AAAA' : 'DD/MM/AAAA'}
      </span>

      <span
        className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase flex items-center gap-1 ${
          modoMes === 'extenso'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
        }`}
      >
        <span>{modoMes === 'extenso' ? 'out.' : '10'}</span>
        <ArrowLeftRight className="w-2.5 h-2.5 opacity-70" />
      </span>
    </button>
  );
};
