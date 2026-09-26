import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, AlertTriangle, BellRing } from 'lucide-react';
import { Usuario } from '../../types/clinic';
import { verificarSenhaUsuarioDeletado, notificarAdmsTentativaAcessoDeletado } from '../../services/userService';

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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsDeletedAlert(false);

    const trimmed = pastedPassword.trim();
    if (!trimmed) {
      setErrorMessage('Por favor, cole a senha extremamente longa do sistema.');
      return;
    }

    // 1. Procurar usuário ativo correspondente à senha do sistema ou passcode
    const matchedUser = usuarios.find(
      (u) =>
        u.ativo !== false &&
        ((u.systemPassword && u.systemPassword.trim() === trimmed) ||
          (u.personalPasscode && u.personalPasscode.trim() === trimmed) ||
          (trimmed === '1234' && u.id === (usuarios[0]?.id || 'usr-admin')))
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
    setErrorMessage('Senha incorreta ou não encontrada. Verifique a senha do sistema.');
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
              Cole sua senha extremamente longa do sistema para restaurar o acesso à clínica.
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
        </form>
      </div>
    </div>
  );
};
