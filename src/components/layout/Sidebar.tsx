import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  FileSpreadsheet,
  Stethoscope,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
} from 'lucide-react';
import { MefisaLogo } from '../common/MefisaLogo';
import { SpecLogo } from '../common/SpecLogo';
import { Usuario } from '../../types/clinic';

export type NavItemKey =
  | 'dashboard'
  | 'central_dados'
  | 'pacientes'
  | 'autorizacoes'
  | 'sessoes'
  | 'guias'
  | 'analises'
  | 'prestadores'
  | 'pendencias'
  | 'auditoria'
  | 'usuarios'
  | 'configuracoes'
  | 'importacao';

interface SidebarProps {
  activeKey: NavItemKey;
  onNavigate: (key: NavItemKey) => void;
  pendingCounts: {
    pendencias: number;
    analisesAtraso: number;
    guiasAguardando: number;
  };
  usuarioAtual?: Usuario;
  onOpenArchitectureDocs?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeKey,
  onNavigate,
  pendingCounts,
  usuarioAtual,
  onOpenArchitectureDocs,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  // Encolhe a barra lateral automaticamente quando a tela diminui de tamanho (< 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdmin = usuarioAtual?.papel === 'ADMINISTRADOR';

  const navItems: {
    key: NavItemKey;
    label: string;
    icon: React.ElementType;
    badgeCount?: number;
    badgeColor?: string;
  }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'pacientes', label: 'Pacientes', icon: Users },
    { key: 'autorizacoes', label: 'Autorizações', icon: FileCheck2 },
    {
      key: 'guias',
      label: 'Faturamentos',
      icon: FileSpreadsheet,
      badgeCount: pendingCounts.guiasAguardando > 0 ? pendingCounts.guiasAguardando : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
    },
    { key: 'prestadores', label: 'Doutores', icon: Stethoscope },
    { key: 'auditoria', label: 'Histórico de Ações', icon: History },
    { key: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside
      className={`transition-all duration-200 ${
        isCollapsed ? 'w-24' : 'w-64'
      } bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col shrink-0 min-h-screen select-none`}
    >
      {/* Brand Header com Logotipo Oficial da Mefisa (Fundo externo escuro no Modo Escuro, fundo interno branco) */}
      <div className="p-3 border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-col items-center justify-center transition-colors relative">
        <MefisaLogo
          variant={isCollapsed ? 'compact' : 'auto'}
          className="w-full justify-center"
        />
        {/* Botão de alternância de encurtamento do layout */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors z-20 cursor-pointer"
          title={isCollapsed ? 'Expandir barra lateral' : 'Encurtar layout (Logo compacta)'}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Encurtar layout'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navegação Principal */}
      <div className="p-2 sm:p-3">
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-3 mb-2 font-['Quicksand']">
            Navegação Clínica
          </div>
        )}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                title={item.label}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                } rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/70 text-[#002172] dark:text-blue-300 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50/90 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#002172] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className={isActive ? 'font-bold text-[#002172] dark:text-white' : 'text-slate-700 dark:text-slate-200'}>
                      {item.label}
                    </span>
                  )}
                </div>

                {!isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
                {isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: Logotipo SPEC */}
      <div className={`mt-auto p-4 border-t border-slate-100 dark:border-slate-800 bg-transparent ${isCollapsed ? 'hidden' : 'block'}`}>
        <div className="flex items-center justify-start">
          <SpecLogo className="w-32 h-auto text-slate-900 dark:text-white" />
        </div>
      </div>
    </aside>
  );
};

