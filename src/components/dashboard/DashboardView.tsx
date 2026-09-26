import React from 'react';
import {
  CalendarClock,
  ClockAlert,
  FileCheck2,
  FileSpreadsheet,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Building,
  FileText,
  Activity,
  Layers,
  Calculator,
  Hourglass,
  Clock,
  CalendarDays,
} from 'lucide-react';
import {
  MOCK_AUTORIZACOES,
  MOCK_GUIAS,
  MOCK_ANALISES,
  MOCK_PENDENCIAS,
  MOCK_AUDITORIA,
} from '../../data/mockClinicData';
import { PacientesService, calcularVencimentoFormulario } from '../../services/pacientesService';
import { carregarAutorizacoesIniciais } from '../../services/autorizacoesService';
import { formatarDataBr, calcularDatasSessoesAlinhadas } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';
import { useSecretAchievements } from '../../context/SecretAchievementsContext';
import { Usuario } from '../../types/clinic';

interface DashboardViewProps {
  activeUsuario: Usuario;
  onNavigate: (key: any) => void;
  onOpenCalculator: () => void;
  onOpenAudit: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeUsuario,
  onNavigate,
  onOpenCalculator,
  onOpenAudit,
}) => {
  const { getThemeStrokeStyle, showMonthInitials } = useTheme();
  const { triggerSecretAction } = useSecretAchievements();

  const autorizacoesList = carregarAutorizacoesIniciais();
  const pacientesList = PacientesService.obterPacientes();
  const hojeStr = new Date().toISOString().split('T')[0];

  const pacientesAutorizacaoHoje = pacientesList.filter(
    (p) => p.proximaAutorizacaoData && p.proximaAutorizacaoData === hojeStr
  );

  // 1. Quantidade de Pacientes com Próxima Autorização na data atual do usuário ou antes dela, sem autorização em análise.
  const pacientesComDataVencidaOuHoje = pacientesList.filter((p) => {
    if (!p.proximaAutorizacaoData) return false;
    const estaVencidaOuHoje = p.proximaAutorizacaoData <= hojeStr;
    if (!estaVencidaOuHoje) return false;

    const temAutorizacaoEmAnalise = autorizacoesList.some(
      (a) =>
        (a.pacienteId === p.id ||
          (a.pacienteNome && a.pacienteNome.toLowerCase().trim() === (p.nome || '').toLowerCase().trim())) &&
        a.status === 'EM_ANALISE'
    );
    return !temAutorizacaoEmAnalise;
  });
  const card1Valor = pacientesComDataVencidaOuHoje.length;

  // 2. Quantidade de guias que têm a data da Próxima Autorização marcada para o próximo dia útil.
  const calcularProximoDiaUtil = (dataBaseIso: string): string => {
    const d = new Date(dataBaseIso + 'T12:00:00Z');
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  };
  const proximoDiaUtilStr = calcularProximoDiaUtil(hojeStr);

  const card2Valor = autorizacoesList.filter(
    (a) => a.proximaAutorizacao === proximoDiaUtilStr
  ).length;

  const converterBrParaIsoLocal = (dataBr: string): string => {
    if (!dataBr) return '';
    if (dataBr.includes('-') && dataBr.split('-')[0].length === 4) return dataBr;
    const parts = dataBr.split('/');
    if (parts.length === 3) {
      const dd = parts[0].padStart(2, '0');
      let mm = parts[1];
      const mesesIniciais = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const idxMes = mesesIniciais.findIndex((m) => mm.toLowerCase().includes(m));
      if (idxMes !== -1) {
        mm = String(idxMes + 1).padStart(2, '0');
      } else {
        mm = mm.padStart(2, '0');
      }
      const yyyy = parts[2];
      return `${yyyy}-${mm}-${dd}`;
    }
    return dataBr;
  };

  const verificarGuiaPodeSerFaturada = (a: any, dataHoje: string): boolean => {
    if (a.status !== 'CONCLUIDO' && a.status !== 'DIGITADA') return false;

    const dataInicio = a.dataAutorizacao || a.dataSolicitacao || dataHoje;
    let datasSessoes: string[] = [];

    if (a.datasSessoesCustomizadas && a.datasSessoesCustomizadas.length > 0) {
      datasSessoes = a.datasSessoesCustomizadas;
    } else if (a.datasSessoes && a.datasSessoes.length > 0) {
      datasSessoes = a.datasSessoes;
    } else {
      datasSessoes = calcularDatasSessoesAlinhadas({
        dataInicioStr: dataInicio,
        quantidade: a.quantidadeSolicitada || 1,
      });
    }

    if (!datasSessoes || datasSessoes.length === 0) return true;

    const ultimaSessaoBr = datasSessoes[datasSessoes.length - 1];
    const isoUltima = converterBrParaIsoLocal(ultimaSessaoBr) || dataInicio;

    // A guia só pode ser faturada se a data da última sessão for menor ou igual à data atual (todas as sessões concluídas)
    return isoUltima <= dataHoje;
  };

  // 3. Quantidade de guias que já podem ser faturadas (bloqueia se a última sessão for no futuro).
  const card3Valor = autorizacoesList.filter((a) =>
    verificarGuiaPodeSerFaturada(a, hojeStr)
  ).length;

  // 4. Quantidade de Autorizações em análise.
  const card4Valor = autorizacoesList.filter(
    (a) => a.status === 'EM_ANALISE'
  ).length;

  // 5. Quantidade de dias que fazem que a análise mais antiga ainda está sob análise.
  const analisesEmAndamento = autorizacoesList.filter((a) => a.status === 'EM_ANALISE');
  let maiorDiasEmAnalise = 0;
  analisesEmAndamento.forEach((a) => {
    if (typeof a.diasEmAnalise === 'number' && a.diasEmAnalise > maiorDiasEmAnalise) {
      maiorDiasEmAnalise = a.diasEmAnalise;
    }
    if (a.dataSolicitacao) {
      const diffMs = new Date(hojeStr + 'T12:00:00Z').getTime() - new Date(a.dataSolicitacao + 'T12:00:00Z').getTime();
      const dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      if (dias > maiorDiasEmAnalise) {
        maiorDiasEmAnalise = dias;
      }
    }
  });
  const card5Valor = `${maiorDiasEmAnalise} ${maiorDiasEmAnalise === 1 ? 'dia' : 'dias'}`;

  // 6. Quantidade de dias que o formulário mais antigo está atrasado e de qual paciente esse formulário é.
  let formularioMaisAtrasado: { pacienteNome: string; diasAtrasado: number } | null = null;
  pacientesList.forEach((p) => {
    if (p.formulario && (p.formulario.dataEmissao || (p.formulario as any).dataVencimento)) {
      const dataVenc = (p.formulario as any).dataVencimento ||
        calcularVencimentoFormulario(p.formulario.dataEmissao, hojeStr).dataVencimento;

      if (dataVenc < hojeStr) {
        const diffMs = new Date(hojeStr + 'T12:00:00Z').getTime() - new Date(dataVenc + 'T12:00:00Z').getTime();
        const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (dias > 0) {
          if (!formularioMaisAtrasado || dias > formularioMaisAtrasado.diasAtrasado) {
            formularioMaisAtrasado = {
              pacienteNome: p.nome || 'Paciente sem nome',
              diasAtrasado: dias,
            };
          }
        }
      }
    }
  });
  const card6Valor = formularioMaisAtrasado
    ? `${(formularioMaisAtrasado as { pacienteNome: string; diasAtrasado: number }).diasAtrasado} ${(formularioMaisAtrasado as { pacienteNome: string; diasAtrasado: number }).diasAtrasado === 1 ? 'dia' : 'dias'}`
    : '0 dias';
  const card6Subtexto = formularioMaisAtrasado
    ? `Paciente: ${(formularioMaisAtrasado as { pacienteNome: string; diasAtrasado: number }).pacienteNome}`
    : 'Nenhum formulário atrasado';

  // 7. Quantidade de dias que faltam até que o formulário mais próximo de vencer vença.
  let proximoVencimento: { pacienteNome: string; diasFaltantes: number } | null = null;
  pacientesList.forEach((p) => {
    if (p.formulario && (p.formulario.dataEmissao || (p.formulario as any).dataVencimento)) {
      const dataVenc = (p.formulario as any).dataVencimento ||
        calcularVencimentoFormulario(p.formulario.dataEmissao, hojeStr).dataVencimento;

      if (dataVenc >= hojeStr) {
        const diffMs = new Date(dataVenc + 'T12:00:00Z').getTime() - new Date(hojeStr + 'T12:00:00Z').getTime();
        const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (dias >= 0) {
          if (!proximoVencimento || dias < proximoVencimento.diasFaltantes) {
            proximoVencimento = {
              pacienteNome: p.nome || 'Paciente sem nome',
              diasFaltantes: dias,
            };
          }
        }
      }
    }
  });
  const card7Valor = proximoVencimento
    ? `${(proximoVencimento as { pacienteNome: string; diasFaltantes: number }).diasFaltantes} ${(proximoVencimento as { pacienteNome: string; diasFaltantes: number }).diasFaltantes === 1 ? 'dia' : 'dias'}`
    : '0 dias';
  const card7Subtexto = proximoVencimento
    ? `Formulário de: ${(proximoVencimento as { pacienteNome: string; diasFaltantes: number }).pacienteNome}`
    : 'Nenhum vencimento futuro';

  // Métricas do Dashboard formuladas conforme regras sem interatividade de clique
  const kpis = [
    {
      label: 'Autorizações a Serem Feitas Hoje',
      valor: card1Valor,
      subtexto: 'Pacientes s/ análise pendente',
      corCard: 'border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-900/80',
      badgeCor: 'bg-blue-100 dark:bg-blue-950/70 text-[#002172] dark:text-blue-300',
      icon: FileCheck2,
    },
    {
      label: 'Autorizações para o Próximo Dia Útil',
      valor: card2Valor,
      subtexto: `Em ${formatarDataBr(proximoDiaUtilStr, showMonthInitials)}`,
      corCard: 'border-indigo-200 dark:border-slate-800 bg-white dark:bg-slate-900/80',
      badgeCor: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300',
      icon: CalendarClock,
    },
    {
      label: 'Guias Faturáveis',
      valor: card3Valor,
      subtexto: 'Prontas para faturamento',
      corCard: 'border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-900/80',
      badgeCor: 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300',
      icon: FileSpreadsheet,
    },
    {
      label: 'Autorizações em Análise',
      valor: card4Valor,
      subtexto: 'Análises ativas nos convênios',
      corCard: 'border-yellow-400 dark:border-yellow-500/80 bg-yellow-50/20 dark:bg-yellow-950/20',
      badgeCor: 'bg-yellow-400 text-slate-950 font-black border border-yellow-500 shadow-xs',
      icon: Hourglass,
    },
    {
      label: 'Análise Mais Antiga',
      valor: card5Valor,
      subtexto: 'Análise em andamento mais longa',
      corCard: 'border-amber-300 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20',
      badgeCor: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300',
      icon: Clock,
    },
    {
      label: 'Formulário Mais Atrasado',
      valor: card6Valor,
      subtexto: card6Subtexto,
      corCard: 'border-red-300 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20',
      badgeCor: 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300',
      icon: ClockAlert,
    },
    {
      label: 'Próximo Formulário a Vencer',
      valor: card7Valor,
      subtexto: card7Subtexto,
      corCard: 'border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20',
      badgeCor: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300',
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#002172] via-[#0b2f77] to-[#2A657E] text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-['Quicksand'] text-white tracking-tight">
            Boas-vindas, {activeUsuario?.nome ? activeUsuario.nome.split(' ')[0] : 'Usuário'}. Tenha um bom trabalho!
          </h1>
          <p className="text-xs text-blue-100/90 mt-1 font-['Nunito_Sans']">
            Clínica Mefisa · Sistema Integrado de Gestão e Autorizações
          </p>
        </div>
      </div>

      {/* Grid de 7 KPIs Centrais sem ação de clique */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border flex flex-col justify-between ${kpi.corCard}`}
            >
              <div className="flex items-start justify-between gap-1.5 mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-snug break-words">
                  {kpi.label}
                </span>
                <div className={`p-1 rounded-lg shrink-0 ${kpi.badgeCor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-auto pt-1">
                <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tabular-nums leading-tight">
                  {kpi.valor}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-1 font-medium break-words">
                  {kpi.subtexto}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de 2 Colunas: O Que Precisa Ser Feito Hoje + Trilha de Auditoria Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: O Que Precisa Ser Feito Hoje? (Fila de Prioridades) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm font-['Quicksand']">
                  O que precisa ser feito hoje?
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">
                  Prioridades operacionais ordenadas por prazo e impacto clínico
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('pendencias')}
              className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline"
            >
              Ver todas ({MOCK_PENDENCIAS.length}) →
            </button>
          </div>

          <div className="space-y-2.5">
            {pacientesAutorizacaoHoje.map((pac) => (
              <div
                key={`aut-hoje-${pac.id}`}
                onClick={() => onNavigate('autorizacoes')}
                tabIndex={0}
                className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 transition-all cursor-pointer flex items-start justify-between gap-3 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      AUTORIZAÇÃO HOJE
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">Renovação de Guia / Autorização</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    O paciente <strong>{pac.nome}</strong> ({pac.procedimentoPrincipal}) possui autorização agendada para hoje.
                  </p>
                  <div className="text-[10px] text-slate-400">
                    Convênio: {pac.convenioPrincipalNome || pac.convenioNome} · Prontuário: {pac.codigoProntuario}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 block">
                    Hoje ({formatarDataBr(hojeStr, showMonthInitials)})
                  </span>
                  <span className="text-[10.5px] text-blue-700 dark:text-blue-400 font-semibold mt-1 inline-block">
                    Autorizar →
                  </span>
                </div>
              </div>
            ))}

            {MOCK_PENDENCIAS.slice(0, Math.max(0, 4 - pacientesAutorizacaoHoje.length)).map((pend) => (
              <div
                key={pend.id}
                onClick={() => onNavigate(pend.linkModulo)}
                tabIndex={0}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-slate-100/80 dark:focus:bg-slate-800/90 active:bg-slate-200/50 dark:active:bg-slate-700/60 transition-all cursor-pointer flex items-start justify-between gap-3 text-xs outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                        pend.prioridade === 'CRITICA'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : pend.prioridade === 'ALTA' || pend.linkModulo === 'analises'
                          ? 'badge-analise-amarelo bg-yellow-400 text-slate-950 font-black border border-yellow-500 shadow-xs'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {pend.linkModulo === 'analises' ? 'EM ANÁLISE' : pend.prioridade}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{pend.titulo}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {pend.descricao}
                  </p>
                  <div className="text-[10px] text-slate-400 dark:text-slate-400 pt-0.5">
                    Paciente: <strong className="text-slate-600 dark:text-slate-300">{pend.pacienteNome}</strong> · Responsável sugerido:{' '}
                    {pend.responsavelSugerido}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono font-bold text-red-700 dark:text-red-400 block">
                    {pend.prazoLimite}
                  </span>
                  <span className="text-[10.5px] text-blue-700 dark:text-blue-400 font-semibold mt-1 inline-block">
                    Resolver →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Últimas Ações Auditadas (Rastreabilidade Absoluta) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#002172] dark:text-blue-300 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm font-['Quicksand']">
                  Quem fez o quê? (Auditoria Recente)
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">
                  Rastreabilidade imutável de alterações de datas, quantidades e guias
                </p>
              </div>
            </div>
            <button
              onClick={onOpenAudit}
              className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline"
            >
              Auditoria Completa →
            </button>
          </div>

          <div className="space-y-2.5">
            {MOCK_AUDITORIA.map((log, idx) => (
              <div
                key={`${log.id || 'log'}-${idx}`}
                tabIndex={0}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 focus:bg-slate-100/80 dark:focus:bg-slate-800/90 active:bg-slate-200/50 dark:active:bg-slate-700/60 transition-all text-xs space-y-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                    <span>{log.usuarioNome}</span>
                    <span className="text-slate-500 dark:text-slate-300 font-normal">({log.papelUsuario})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-300 font-mono">
                    {log.dataHora}
                  </span>
                </div>

                <div className="text-[11.5px] text-slate-700 dark:text-slate-200 font-medium">
                  {log.acao} — <span className="text-slate-500 dark:text-slate-400">{log.descricaoRegistro}</span>
                </div>

                <div className="text-[11px] bg-white dark:bg-slate-900/90 p-2 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <span className="line-through text-red-700 dark:text-red-400 font-mono">{log.valorAnterior}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{log.valorNovo}</span>
                </div>

                {log.motivo && (
                  <div className="text-[10.5px] text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 px-2 py-1 rounded border border-transparent dark:border-amber-900/40">
                    <strong className="text-amber-950 dark:text-amber-100">Motivo:</strong> {log.motivo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
