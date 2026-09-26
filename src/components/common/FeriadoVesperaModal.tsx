import React from 'react';
import { X, Sparkles, Calendar, HeartHandshake, PartyPopper } from 'lucide-react';
import { FeriadoConfig } from '../../types/clinic';

interface FeriadoVesperaModalProps {
  isOpen: boolean;
  onClose: () => void;
  feriado: FeriadoConfig | null;
  usuarioNome?: string;
  dataAmanhaStr?: string;
}

export const FeriadoVesperaModal: React.FC<FeriadoVesperaModalProps> = ({
  isOpen,
  onClose,
  feriado,
  usuarioNome,
  dataAmanhaStr,
}) => {
  if (!isOpen) return null;

  const formatarDataBr = (str?: string) => {
    if (!str) return '';
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return str;
  };

  const dataFormatadaBr = formatarDataBr(feriado?.data || dataAmanhaStr);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Quicksand'] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200/80 dark:border-amber-800/80 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="relative p-6 sm:p-8 text-center bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-blue-500/10 dark:from-amber-950/40 dark:via-emerald-950/30 dark:to-blue-950/40 border-b border-amber-100 dark:border-amber-900/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 mb-3 animate-bounce">
            <PartyPopper className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Aviso de Véspera de Feriado</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Amanhã é Feriado!
          </h2>
          {usuarioNome && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Olá, <strong className="text-slate-700 dark:text-slate-200">{usuarioNome}</strong>!
            </p>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* MENSAGEM PRINCIPAL SOLICITADA */}
          <div className="p-5 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 dark:from-emerald-950/60 dark:via-amber-950/40 dark:to-emerald-950/60 border-2 border-emerald-400/80 dark:border-emerald-600/80 rounded-2xl text-center shadow-sm">
            <p className="text-lg sm:text-xl font-black font-['Quicksand'] text-emerald-900 dark:text-emerald-100 leading-snug">
              "Seu descanso chegará mais cedo! Amanhã é feriado! 🥳"
            </p>
          </div>

          {/* Informações detalhadas do Feriado */}
          {feriado && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Feriado Registrado
                </span>
                <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                  {dataFormatadaBr}
                </span>
              </div>

              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {feriado.nome}
              </div>

              {feriado.regraDeterminante && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <strong className="text-slate-700 dark:text-slate-300">Base Regulamentar:</strong> {feriado.regraDeterminante}
                </div>
              )}
            </div>
          )}

          {/* Botão de confirmação */}
          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#002172] to-blue-800 hover:from-[#001752] hover:to-blue-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <HeartHandshake className="w-4 h-4 text-[#91CA0C]" />
            <span>Excelente, entendi! Bom descanso 🥳</span>
          </button>
        </div>
      </div>
    </div>
  );
};
