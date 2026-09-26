import React from 'react';
import { Database, ShieldCheck, Download, X, Clock, Calendar } from 'lucide-react';

interface BackupDailyReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackupModal: () => void;
  usuarioNome?: string;
}

export const BackupDailyReminderModal: React.FC<BackupDailyReminderModalProps> = ({
  isOpen,
  onClose,
  onOpenBackupModal,
  usuarioNome,
}) => {
  if (!isOpen) return null;

  // Data atual no formato brasileiro estrito "dd/mm/aaaa"
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  const dataHojeBr = `${dia}/${mes}/${ano}`;

  const handleDismissToday = () => {
    try {
      localStorage.setItem('mefisa_lembrete_backup_ignorado_data', dataHojeBr);
    } catch {
      // Ignora erro de storage
    }
    onClose();
  };

  const handleGoToBackup = () => {
    try {
      localStorage.setItem('mefisa_lembrete_backup_ignorado_data', dataHojeBr);
    } catch {
      // Ignora erro de storage
    }
    onClose();
    onOpenBackupModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Quicksand'] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-200/90 dark:border-blue-800/80 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="relative p-6 sm:p-7 text-center bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-teal-500/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-teal-950/30 border-b border-blue-100 dark:border-blue-900/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar lembrete"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-3 animate-pulse">
            <Database className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-extrabold uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Rotina Diária do Administrador</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Lembrete de Backup do Site
          </h2>
          {usuarioNome && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Administrador(a): <strong className="text-slate-700 dark:text-slate-200">{usuarioNome}</strong>
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5 shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                Data do lembrete: {dataHojeBr}
              </p>
              <p className="leading-relaxed">
                Para manter a conformidade e proteção total dos dados clínicos e cadastrais,
                recomendamos salvar uma cópia física diária (<span className="font-mono font-semibold">.json</span>) da base de dados.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garante segurança máxima contra imprevistos ou falhas locais.</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>O arquivo pode ser restaurado a qualquer momento em qualquer máquina.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleGoToBackup}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Fazer Backup Agora</span>
            </button>
            <button
              type="button"
              onClick={handleDismissToday}
              className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer text-center"
            >
              Lembrar Amanhã
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
