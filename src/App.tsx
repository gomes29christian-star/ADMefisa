import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SecretAchievementsProvider } from './context/SecretAchievementsContext';
import { DateFormatProvider } from './context/DateFormatContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { SpreadsheetCentralView } from './components/central/SpreadsheetCentralView';
import { DashboardView } from './components/dashboard/DashboardView';
import { PacientesView } from './components/views/PacientesView';
import { AutorizacoesView } from './components/views/AutorizacoesView';
import { GuiasView } from './components/views/GuiasView';
import { AnalisesView } from './components/views/AnalisesView';
import { PrestadoresView } from './components/views/PrestadoresView';
import { PendenciasView } from './components/views/PendenciasView';
import { UsuariosConfigView } from './components/views/UsuariosConfigView';
import { ConfiguracoesRegrasView } from './components/views/ConfiguracoesRegrasView';
import { ImportacaoView } from './components/views/ImportacaoView';
import { AuditoriaView } from './components/views/AuditoriaView';
import { CalculationPreviewModal } from './components/common/CalculationPreviewModal';
import { AuditTrailDrawer } from './components/common/AuditTrailDrawer';
import { ArchitectureDocModal } from './components/documentation/ArchitectureDocModal';
import { SecretAchievementsModal } from './components/common/SecretAchievementsModal';
import { FeriadoVesperaModal } from './components/common/FeriadoVesperaModal';
import { BackupSyncModal } from './components/common/BackupSyncModal';
import { BackupDailyReminderModal } from './components/common/BackupDailyReminderModal';
import { CloudSyncService } from './services/cloudSyncService';
import { HolidayService } from './services/holidaysService';
import { MOCK_USUARIOS, MOCK_AUDITORIA, MOCK_PENDENCIAS } from './data/mockClinicData';
import { Usuario, FeriadoConfig } from './types/clinic';
import { carregarAutorizacoesIniciais, salvarAutorizacoesStorage } from './services/autorizacoesService';
import { AutorizacaoV2 } from './types/autorizacao';
import { LoginLockScreen } from './components/auth/LoginLockScreen';
import { carregarUsuariosIniciais } from './services/userService';

function MainApp() {
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => {
    try {
      // ESTE NAVEGADOR entra direto sem precisar de senha por padrão
      const isTrusted = localStorage.getItem('mefisa_trusted_browser');
      if (isTrusted === null || isTrusted === 'true') {
        localStorage.setItem('mefisa_trusted_browser', 'true');
        return true;
      }
      return false;
    } catch {
      return true;
    }
  });
  const [allUsers, setAllUsers] = useState<Usuario[]>(() => carregarUsuariosIniciais());
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  const [activeUsuario, setActiveUsuario] = useState<Usuario>(() => {
    try {
      const savedUsers = carregarUsuariosIniciais();
      if (savedUsers.length > 0) {
        const savedActiveId = localStorage.getItem('clinica_mefisa_active_usuario_id_v1');
        const found = savedUsers.find((u: Usuario) => u.id === savedActiveId);
        if (found) return found;
        return savedUsers[0];
      }
    } catch (e) {
      console.error(e);
    }
    return MOCK_USUARIOS[0] || {
      id: 'usr-admin',
      nome: 'Administrador do Sistema',
      email: 'admin@clinicamefisa.com.br',
      papel: 'ADMINISTRADOR',
      departamento: 'Direção Geral',
      avatar: 'ADM',
      ativo: true,
      ultimoAcesso: 'Hoje',
    };
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('clinica_mefisa_active_usuario_id_v1', activeUsuario.id);
    } catch (e) {}
  }, [activeUsuario]);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isArchDocOpen, setIsArchDocOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isBackupDailyReminderOpen, setIsBackupDailyReminderOpen] = useState(false);

  const [isFeriadoVesperaOpen, setIsFeriadoVesperaOpen] = useState(false);
  const [feriadoVesperaAtual, setFeriadoVesperaAtual] = useState<FeriadoConfig | null>(null);
  const [feriadoVesperaDataAmanha, setFeriadoVesperaDataAmanha] = useState<string>('');

  // Sincronização em Nuvem em Tempo Real (Firebase Firestore)
  React.useEffect(() => {
    // Garante que o histórico de ações inicial fique zerado e novo em folha
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (!localStorage.getItem('mefisa_auditoria_reset_v3')) {
          localStorage.setItem('mefisa_auditoria_geral_v2', JSON.stringify([]));
          localStorage.setItem('mefisa_auditoria_pacientes_v1', JSON.stringify([]));
          localStorage.setItem('mefisa_auditoria_reset_v3', 'true');
        }
      }
    } catch {}

    CloudSyncService.initRealtimeSync();
    const unsubscribe = CloudSyncService.subscribe(() => {
      setAutorizacoesApp(carregarAutorizacoesIniciais());
    });
    return () => unsubscribe();
  }, []);

  // Lembrete Diário de Backup do Site — Exclusivo para Administradores (ADMs)
  React.useEffect(() => {
    if (!isSessionUnlocked) return;
    if (activeUsuario?.papel !== 'ADMINISTRADOR') return;

    // Data no formato brasileiro "dd/mm/aaaa"
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const hojeBr = `${dia}/${mes}/${ano}`;

    try {
      const ignoradoHoje = localStorage.getItem('mefisa_lembrete_backup_ignorado_data');
      const backupFeitoHoje = localStorage.getItem('mefisa_data_ultimo_backup');

      // Se já fez backup hoje ou já dispensou o lembrete hoje, não reabre
      if (ignoradoHoje === hojeBr || backupFeitoHoje === hojeBr) {
        return;
      }

      // Abre suavemente após 1 segundo da sessão ativa
      const timer = setTimeout(() => {
        setIsBackupDailyReminderOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    } catch {
      // Ignora erro de storage
    }
  }, [isSessionUnlocked, activeUsuario?.id, activeUsuario?.papel]);

  // Notificação de Véspera de Feriado no Login / Desbloqueio da Sessão
  React.useEffect(() => {
    if (!isSessionUnlocked) return;

    // Verificar se amanhã é feriado que cai em dia útil (segunda a sexta)
    const checagem = HolidayService.verificarVesperaFeriadoUtil();
    if (checagem.isVespera) {
      setFeriadoVesperaAtual(checagem.feriado);
      setFeriadoVesperaDataAmanha(checagem.dataAmanhaIso);
      setIsFeriadoVesperaOpen(true);
    }
  }, [isSessionUnlocked, activeUsuario?.id]);

  const [autorizacoesApp, setAutorizacoesApp] = useState<AutorizacaoV2[]>(() => carregarAutorizacoesIniciais());

  React.useEffect(() => {
    setAutorizacoesApp(carregarAutorizacoesIniciais());
  }, [activeTab]);

  const guiasAguardandoCount = autorizacoesApp.filter((a) => a.status === 'CONCLUIDO').length;

  const pendingCounts = {
    pendencias: MOCK_PENDENCIAS.length,
    analisesAtraso: 0,
    guiasAguardando: guiasAguardandoCount,
  };

  const handleNavigate = (tab: NavItemKey) => {
    setActiveTab(tab);
  };

  return (
    <>
      {!isSessionUnlocked && (
        <LoginLockScreen
          usuarios={allUsers}
          onUnlock={(usr) => {
            setActiveUsuario(usr);
            setIsSessionUnlocked(true);
          }}
        />
      )}

      <div className="min-h-screen flex bg-slate-50 dark:bg-[#0a0f1d] font-['Nunito_Sans'] text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#002172] transition-colors">
      {/* Sidebar de Navegação */}
      <Sidebar
        activeKey={activeTab}
        onNavigate={handleNavigate}
        pendingCounts={pendingCounts}
        usuarioAtual={activeUsuario}
        onOpenArchitectureDocs={() => setIsArchDocOpen(true)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          activeUsuario={activeUsuario}
          onSelectUsuario={(usr) => setActiveUsuario(usr)}
          onOpenBackup={() => setIsBackupOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1920px] mx-auto transition-all">
          {activeTab === 'central_dados' && (
            <SpreadsheetCentralView
              onOpenAudit={() => setIsAuditOpen(true)}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              usuarioAtualNome={activeUsuario.nome}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              activeUsuario={activeUsuario}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onOpenAudit={() => setIsAuditOpen(true)}
            />
          )}

          {activeTab === 'pacientes' && (
            <PacientesView
              onOpenAudit={() => setIsAuditOpen(true)}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onNavigate={(tab) => setActiveTab(tab)}
              usuarioAtual={activeUsuario}
            />
          )}

          {activeTab === 'autorizacoes' && (
            <AutorizacoesView
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onOpenAudit={() => setIsAuditOpen(true)}
              usuarioAtual={activeUsuario}
            />
          )}

          {activeTab === 'guias' && (
            <GuiasView onOpenAudit={() => setIsAuditOpen(true)} />
          )}

          {activeTab === 'analises' && (
            <AnalisesView onOpenAudit={() => setIsAuditOpen(true)} />
          )}

          {activeTab === 'prestadores' && <PrestadoresView />}

          {activeTab === 'pendencias' && (
            <PendenciasView
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
            />
          )}

          {activeTab === 'auditoria' && (
            <AuditoriaView usuarioAtual={activeUsuario} />
          )}

          {activeTab === 'configuracoes' && (
            <ConfiguracoesRegrasView
              activeUsuario={activeUsuario}
              onSelectUsuario={(usr) => setActiveUsuario(usr)}
              onTestarNotificacaoFeriado={(f, dataIso) => {
                setFeriadoVesperaAtual(f);
                setFeriadoVesperaDataAmanha(dataIso);
                setIsFeriadoVesperaOpen(true);
              }}
            />
          )}

          {activeTab === 'importacao' && (
            <ImportacaoView
              onOpenAudit={() => setIsAuditOpen(true)}
              usuarioAtualNome={activeUsuario.nome}
              usuarioAtual={activeUsuario}
            />
          )}

          {activeTab === 'sessoes' && (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-['Quicksand'] text-slate-900">
                    Cronograma de Sessões Autorizadas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Garantia da regra Mefisa: existe exatamente 1 sessão antes da data de renovação da autorização.
                  </p>
                </div>
                <button
                  onClick={() => setIsCalculatorOpen(true)}
                  className="px-4 py-2 bg-[#002172] text-white rounded-xl text-xs font-bold"
                >
                  Calcular Novo Cronograma Proporcional
                </button>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
                <div className="font-bold">Regra de Proporcionalidade Aplicada:</div>
                <p>
                  Quando a última sessão de um ciclo for realizada, o sistema libera automaticamente o status da guia para "AGUARDANDO DIGITAÇÃO", alertando a funcionária para digitação no portal SulAmérica.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modais e Gavetas Interativas */}
      <CalculationPreviewModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        usuarioAtualNome={activeUsuario.nome}
        usuarioAtualPapel={activeUsuario.papel}
        onConfirmCalculation={(resultado) => {
          const novasAuts = carregarAutorizacoesIniciais();
          const novaAut: AutorizacaoV2 = {
            id: `aut-v2-${Date.now()}`,
            numeroAutorizacao: `AUT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            pacienteId: 'pac-1',
            pacienteNome: resultado.pacienteNome || 'Maurício Rezende Filho',
            carteirinha: '00624689123',
            operadora: 'SulAmérica Saúde',
            procedimento: resultado.procedimentoNome || 'Psicologia ABA',
            prestador: 'Dra. Ana Beatriz Albuquerque',
            cbo: '251510',
            crm: 'CRP 06/12345',
            dataSolicitacao: new Date().toISOString().split('T')[0],
            dataAutorizacao: new Date().toISOString().split('T')[0],
            quantidadeSolicitada: resultado.quantidadeConfirmada || 12,
            competencia: resultado.alinhamento?.mesCompetenciaReferencia || '2026-10',
            proximaAutorizacao: resultado.alinhamento?.dataProximaAutorizacaoCalculada || '2026-10-28',
            status: 'CONCLUIDO',
            responsavel: activeUsuario.nome,
            ultimaAtualizacao: new Date().toISOString(),
            diasEmAnalise: 0,
            senha: resultado.senha || 'SENHA-EXEMPLO-99',
            dataValidadeSenha: resultado.dataValidadeSenha || '2026-11-28',
            observacoes: 'Gerado via Motor de Regras com senha e validade registradas.',
            historico: [
              {
                id: `hist-${Date.now()}`,
                statusAnterior: 'EM_ANALISE',
                novoStatus: 'CONCLUIDO',
                usuarioNome: activeUsuario.nome,
                dataHora: new Date().toLocaleString('pt-BR'),
                justificativa: 'Autorização calculada com senha e validade registradas para a aba lateral.',
              }
            ]
          };
          novasAuts.unshift(novaAut);
          salvarAutorizacoesStorage(novasAuts);
          setActiveTab('guias');
        }}
      />

      <AuditTrailDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        logs={MOCK_AUDITORIA}
      />

      <ArchitectureDocModal
        isOpen={isArchDocOpen}
        onClose={() => setIsArchDocOpen(false)}
      />

      <FeriadoVesperaModal
        isOpen={isFeriadoVesperaOpen}
        onClose={() => setIsFeriadoVesperaOpen(false)}
        feriado={feriadoVesperaAtual}
        usuarioNome={activeUsuario?.nome || 'Usuário'}
        dataAmanhaStr={feriadoVesperaDataAmanha}
      />

      <SecretAchievementsModal />

      <BackupSyncModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataRestored={() => {
          setAllUsers(carregarUsuariosIniciais());
          setAutorizacoesApp(carregarAutorizacoesIniciais());
        }}
      />

      <BackupDailyReminderModal
        isOpen={isBackupDailyReminderOpen}
        onClose={() => setIsBackupDailyReminderOpen(false)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        usuarioNome={activeUsuario?.nome}
      />
    </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SecretAchievementsProvider>
        <DateFormatProvider>
          <MainApp />
        </DateFormatProvider>
      </SecretAchievementsProvider>
    </ThemeProvider>
  );
}
