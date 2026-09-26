import React, { useState, useEffect } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
  Lock,
  Database,
  ArrowRight,
} from 'lucide-react';
import { Usuario } from '../../types/clinic';
import { AccessibilityBar } from '../common/AccessibilityBar';
import {
  carregarNotificacoesAdmAcessoDeletado,
  marcarNotificacaoComoLida,
  limparNotificacoesAdmAcessoDeletado,
  NotificacaoAcessoDeletado,
} from '../../services/userService';

interface HeaderProps {
  activeUsuario: Usuario;
  onSelectUsuario: (usuario: Usuario) => void;
  onOpenCalculator?: () => void;
  onOpenArchitectureDocs?: () => void;
  onOpenBackup?: () => void;
  onLockSession?: () => void;
}

const getInitials = (name: string) => {
  if (!name) return 'US';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const Header: React.FC<HeaderProps> = ({
  activeUsuario,
  onOpenBackup,
  onLockSession,
}) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoAcessoDeletado[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const isAdmin = activeUsuario?.papel === 'ADMINISTRADOR';

  // Data atual no formato brasileiro "dd/mm/aaaa"
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  const dataHojeBr = `${dia}/${mes}/${ano}`;

  const [ultimoBackupData, setUltimoBackupData] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('mefisa_data_ultimo_backup') : null;
  });

  const atualizarNotificacoes = () => {
    if (isAdmin) {
      setNotificacoes(carregarNotificacoesAdmAcessoDeletado());
      if (typeof window !== 'undefined') {
        setUltimoBackupData(localStorage.getItem('mefisa_data_ultimo_backup'));
      }
    }
  };

  useEffect(() => {
    atualizarNotificacoes();
    const interval = setInterval(atualizarNotificacoes, 3000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const backupPendenteHoje = isAdmin && ultimoBackupData !== dataHojeBr;
  const naoLidasCount = notificacoes.filter((n) => !n.lida).length + (backupPendenteHoje ? 1 : 0);

  const handleMarcarLida = (id: string) => {
    marcarNotificacaoComoLida(id);
    atualizarNotificacoes();
  };

  const handleLimparNotificacoes = () => {
    limparNotificacoesAdmAcessoDeletado();
    setNotificacoes([]);
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors">
      {/* Zone 1: Contextual Breadcrumb limpo */}
      <div className="hidden md:flex items-center gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-300 font-medium">
          <span className="text-slate-700 dark:text-slate-200">Unidade Central</span>
          <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-800 dark:text-white font-bold tracking-wide">
            Recepção & Gestão de Autorizações
          </span>
        </div>
      </div>

      {/* Zone 2: Área central livre para respiro visual */}
      <div className="flex-1 hidden md:block" />

      {/* Zone 3: Notificações de ADM + Acessibilidade + Usuário */}
      <div className="flex items-center gap-1.5 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
        {/* Notificação de Alerta de Segurança p/ ADM */}
        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center relative cursor-pointer ${
                naoLidasCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
              title="Alertas de Segurança dos Administradores"
            >
              <Bell className="w-4 h-4" />
              {naoLidasCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900">
                  {naoLidasCount}
                </span>
              )}
            </button>

            {/* Popover de Notificações ADM */}
            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-bold text-slate-900 dark:text-white">
                      Alertas de Segurança ADM ({notificacoes.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {/* Card de Lembrete Diário de Backup do Site para ADM */}
                  {backupPendenteHoje && (
                    <div className="p-3 rounded-xl border bg-blue-50/90 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 shadow-2xs text-left space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 text-xs">
                          <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          Lembrete Diário: Backup do Site
                        </span>
                        <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono font-bold bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                          {dataHojeBr}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-snug font-medium text-[11px]">
                        Lembrete diário para administradores: salve uma cópia física (.json) dos dados da clínica hoje.
                      </p>
                      <div className="flex items-center justify-end pt-1 border-t border-blue-200/80 dark:border-blue-900/40">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotifOpen(false);
                            onOpenBackup?.();
                          }}
                          className="text-blue-700 dark:text-blue-300 font-bold hover:underline cursor-pointer flex items-center gap-1 text-xs"
                        >
                          <span>Fazer Backup Agora</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {notificacoes.length === 0 && !backupPendenteHoje ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium space-y-1">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
                      <p>Nenhuma notificação ou alerta pendente.</p>
                    </div>
                  ) : (
                    notificacoes.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl border text-left space-y-1.5 transition-all ${
                          !notif.lida
                            ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Acesso Negado (Senha Deletada)
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {notif.dataHora}
                          </span>
                        </div>

                        <p className="text-slate-800 dark:text-slate-200 leading-snug font-medium">
                          Tentativa de login usando a senha do usuário deletado{' '}
                          <strong className="text-slate-900 dark:text-white font-bold">{notif.usuarioDeletadoNome}</strong> ({notif.usuarioDeletadoEmail}).
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
                          <span className="font-mono">{notif.ipTentativa}</span>
                          {!notif.lida ? (
                            <button
                              type="button"
                              onClick={() => handleMarcarLida(notif.id)}
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                            >
                              Marcar como Lida
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold">Lida</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notificacoes.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleLimparNotificacoes}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpar Alertas</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status de Sincronização em Nuvem (Firebase) */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 select-none"
          title="Sincronização em tempo real ativa na Nuvem (Firebase Firestore)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline">Nuvem Conectada</span>
        </div>

        {/* Botão de Backup e Exportação Manual — Exclusivo Administradores */}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenBackup}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-2xs"
            title="Backup & Exportação Manual (Acesso de Administrador)"
          >
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Backup & Dados (ADM)</span>
          </button>
        )}

        {/* Barra de Acessibilidade */}
        <AccessibilityBar />

        {/* Perfil do Usuário */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <div className="w-8 h-8 rounded-lg bg-[#002172] text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden shrink-0">
            {activeUsuario.avatar && (activeUsuario.avatar.startsWith('http') || activeUsuario.avatar.startsWith('data:')) ? (
              <img src={activeUsuario.avatar} alt={activeUsuario.nome} className="w-full h-full object-cover" />
            ) : (
              getInitials(activeUsuario.nome)
            )}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {activeUsuario.nome ? activeUsuario.nome.split(' ')[0] : ''}
            </div>
            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
              {activeUsuario.departamento || activeUsuario.papel}
            </div>
          </div>
        </div>

        {/* Botão para Bloquear Sessão Manualmente */}
        {onLockSession && (
          <button
            type="button"
            onClick={onLockSession}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer shadow-2xs"
            title="Bloquear Sessão / Sair do Sistema (Exige Senha para Entrar)"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
