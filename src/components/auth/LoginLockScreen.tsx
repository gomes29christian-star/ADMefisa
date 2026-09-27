import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, AlertTriangle, BellRing, Database, Upload, CheckCircle2, X } from 'lucide-react';
import { Usuario } from '../../types/clinic';
import { verificarSenhaUsuarioDeletado, notificarAdmsTentativaAcessoDeletado } from '../../services/userService';
import { BackupSyncService } from '../../services/backupSyncService';

interface LoginLockScreenProps {
  usuarios: Usuario[];
  onUnlock: (usuario: Usuario) => void;
}

export const LoginLockScreen: React.FC<LoginLockScreenProps> = ({
  usuarios,
  onUnlock,
}) => {
  const [pastedPassword, setPastedPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeletedAlert, setIsDeletedAlert] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [backupFeedback, setBackupFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsDeletedAlert(false);

    const trimmed = pastedPassword.trim();
    if (!trimmed) {
      setErrorMessage('Por favor, cole a senha extremamente longa do sistema.');
      return;
    }

    // 1. Procurar usuário ativo correspondente EXCLUSIVAMENTE à senha do sistema
    const matchedUser = usuarios.find(
      (u) =>
        u.ativo !== false &&
        u.systemPassword &&
        u.systemPassword.trim() === trimmed
    );
    if (matchedUser) {
      sessionStorage.setItem('mefisa_session_active', 'true');
      localStorage.setItem('mefisa_trusted_browser', 'true');
      onUnlock(matchedUser);
      return;
    }

    // 2. Verificar se a senha pertence a um USUÁRIO DELETADO
    const deletedUser = verificarSenhaUsuarioDeletado(trimmed);
    if (deletedUser) {
      // REGRA SOLICITADA: Acesso negado + Notificar Administradores (ADMs)
      notificarAdmsTentativaAcessoDeletado(deletedUser);
      setIsDeletedAlert(true);
      setErrorMessage(
        `⛔ ACESSO NEGADO: A senha digitada pertence ao usuário DELETADO "${deletedUser.nome}" (${deletedUser.email}). O acesso a esta conta foi revogado. Os Administradores (ADMs) foram notificados imediatamente sobre esta tentativa não autorizada.`
      );
      return;
    }

    // 3. Senha comum incorreta
    setErrorMessage('Senha incorreta ou não encontrada. Verifique a senha do sistema ou restaure um arquivo de backup.');
  };

  const handleRestaurarArquivoJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      const res = BackupSyncService.restaurarBackup(content);
      if (res.sucesso) {
        setBackupFeedback({ tipo: 'sucesso', msg: 'Backup restaurado com sucesso neste computador! Recarregando...' });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setBackupFeedback({ tipo: 'erro', msg: res.mensagem });
      }
    };
    reader.readAsText(file);
  };

  const handleRestaurarTextoJson = () => {
    if (!backupText.trim()) return;
    const res = BackupSyncService.restaurarBackup(backupText.trim());
    if (res.sucesso) {
      setBackupFeedback({ tipo: 'sucesso', msg: 'Backup restaurado com sucesso neste computador! Recarregando...' });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setBackupFeedback({ tipo: 'erro', msg: res.mensagem });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-['Quicksand'] select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 text-center space-y-4 bg-gradient-to-b from-blue-50/80 to-transparent dark:from-blue-950/40">
          <div className="w-16 h-16 rounded-2xl bg-[#002172] text-white flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-8 h-8 text-[#91CA0C]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Sessão Bloqueada
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cole sua senha do sistema ou restaure o arquivo de backup para liberar este computador.
            </p>
          </div>
        </div>

        <form onSubmit={handleLoginSubmit} className="p-8 pt-0 space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Senha Extremamente Longa do Sistema
            </label>
            <textarea
              rows={3}
              required
              value={pastedPassword}
              onChange={(e) => {
                setPastedPassword(e.target.value);
                if (errorMessage) {
                  setErrorMessage('');
                  setIsDeletedAlert(false);
                }
              }}
              placeholder="Cole aqui a sua senha gerada pelo sistema (ex: mefisa_sys_sec_...)"
              className={`w-full px-3 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-2 resize-none ${
                isDeletedAlert
                  ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-[#002172]'
              }`}
            />
          </div>

          {errorMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium space-y-1.5 text-left transition-all ${
                isDeletedAlert
                  ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2 font-bold">
                {isDeletedAlert ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-tight">{errorMessage}</span>
              </div>
              {isDeletedAlert && (
                <div className="pt-2 border-t border-rose-200 dark:border-rose-800/80 text-[11px] text-rose-800 dark:text-rose-200 flex items-center gap-1.5 font-semibold">
                  <BellRing className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                  <span>Notificação enviada em tempo real para todos os Administradores.</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Desbloquear e Entrar</span>
            <ArrowRight className="w-4 h-4 text-[#91CA0C]" />
          </button>

          {/* Botão de Restauração de Backup no Novo Computador */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="text-xs text-blue-700 dark:text-blue-400 hover:underline font-bold flex items-center justify-center gap-1.5 mx-auto"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sincronizar / Restaurar Backup neste PC</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Restauração no Login */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Restaurar Backup neste Computador
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Importe o arquivo `.json` gerado no seu computador principal para atualizar instantaneamente todos os usuários e senhas neste navegador.
            </p>

            {backupFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  backupFeedback.tipo === 'sucesso'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
                }`}
              >
                {backupFeedback.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{backupFeedback.msg}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Opção 1: Upload do Arquivo .json */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Enviar Arquivo de Backup (.json)
                </label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/50 cursor-pointer text-xs font-bold text-blue-900 dark:text-blue-200 transition-colors">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Selecionar Arquivo .json</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestaurarArquivoJson}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Opção 2: Colar código JSON */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  2. Ou Cole o código do Backup (JSON)
                </label>
                <textarea
                  rows={3}
                  value={backupText}
                  onChange={(e) => setBackupText(e.target.value)}
                  placeholder="Cole o código do backup aqui..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#002172]"
                />
                <button
                  type="button"
                  onClick={handleRestaurarTextoJson}
                  className="w-full py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold transition-colors"
                >
                  Restaurar Texto de Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
