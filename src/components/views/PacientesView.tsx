import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  FileCheck2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  CreditCard,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  X,
  MessageSquare,
} from 'lucide-react';

interface MultiSelectDateFilterProps {
  placeholder: string;
  opcoesDatas: string[];
  selectedDates: string[];
  onSelectionChange: (dates: string[]) => void;
  manualValue: string;
  onManualValueChange: (val: string) => void;
}

const MultiSelectDateFilter: React.FC<MultiSelectDateFilterProps> = ({
  placeholder,
  opcoesDatas,
  selectedDates,
  onSelectionChange,
  manualValue,
  onManualValueChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDate = (dt: string) => {
    if (selectedDates.includes(dt)) {
      onSelectionChange(selectedDates.filter((d) => d !== dt));
    } else {
      onSelectionChange([...selectedDates, dt]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDates.length === opcoesDatas.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...opcoesDatas]);
    }
  };

  const datasFiltradas = opcoesDatas.filter((dt) =>
    dt.toLowerCase().includes(busca.toLowerCase())
  );

  const hasSelection = selectedDates.length > 0;

  return (
    <div className="relative mt-1" ref={popoverRef}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-2 py-1 text-[11px] font-normal rounded text-left border flex items-center justify-between transition-all cursor-pointer ${
            hasSelection
              ? 'bg-blue-100 dark:bg-blue-950 border-blue-500 text-blue-900 dark:text-blue-100 font-bold'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
          }`}
          title="Clique para escolher várias datas existentes"
        >
          <span className="truncate mr-1">
            {hasSelection
              ? `${selectedDates.length} data(s) sel.`
              : manualValue || placeholder}
          </span>
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {(hasSelection || manualValue) && (
          <button
            type="button"
            onClick={() => {
              onSelectionChange([]);
              onManualValueChange('');
            }}
            title="Limpar este filtro"
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-60 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-2 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span>Escolher Datas ({opcoesDatas.length})</span>
            {hasSelection && (
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                className="text-red-600 dark:text-red-400 hover:underline text-[10px] cursor-pointer"
              >
                Limpar sel.
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="Digitar ou buscar data..."
            value={busca || manualValue}
            onChange={(e) => {
              setBusca(e.target.value);
              onManualValueChange(e.target.value);
            }}
            className="w-full px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-white focus:outline-blue-600"
          />

          <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-mono">
            {datasFiltradas.length === 0 ? (
              <div className="text-[10px] text-slate-400 py-1.5 text-center font-sans">
                Nenhuma data encontrada
              </div>
            ) : (
              datasFiltradas.map((dt) => {
                const checked = selectedDates.includes(dt);
                return (
                  <label
                    key={dt}
                    className={`flex items-center justify-between p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-[11px] transition-colors ${
                      checked
                        ? 'font-bold bg-blue-50 dark:bg-blue-950/60 text-[#002172] dark:text-blue-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDate(dt)}
                        className="rounded border-slate-300 text-[#002172] focus:ring-[#002172] cursor-pointer"
                      />
                      <span>{dt}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              {selectedDates.length === opcoesDatas.length ? 'Desmarcar Todas' : 'Marcar Todas'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-[#002172] text-white text-[10px] font-bold hover:bg-[#001752] transition-colors cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
import { Paciente, Usuario, StatusPaciente, FiltroPacientesUsuario } from '../../types/clinic';
import {
  PacientesService,
  mascararCpf,
  mascararCarteirinha,
  isFormularioVencido,
  isAutorizacaoAtrasada,
} from '../../services/pacientesService';
import { MOCK_CONVENIOS } from '../../data/mockClinicData';
import { NovoPacienteModal } from '../pacientes/NovoPacienteModal';
import { PacientePerfilDrawer } from '../pacientes/PacientePerfilDrawer';
import { useTheme } from '../../context/ThemeContext';
import { useSecretAchievements } from '../../context/SecretAchievementsContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import { formatarDataBr, normalizarDiaSemana, normalizarEDeduplicarDiasSemana } from '../../services/businessRules';
import { matchDateFilter, matchTextFilter } from '../../utils/filterUtils';

import { obterBadgeColorProcedimento, CLASS_TABELA_LISTRADA_ROW } from '../../utils/procedureStyles';

const obterBadgeProcedimento = (proc: string) => obterBadgeColorProcedimento(proc);

const OPCOES_DIAS_ATENDIMENTO = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

const parseDiasAtendimento = (raw?: string, rawArray?: string[]): string[] => {
  const { diasArray } = normalizarEDeduplicarDiasSemana(rawArray && rawArray.length > 0 ? rawArray : raw);
  return diasArray.length > 0 ? diasArray : ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
};

const isDiaAtivo = (dia: string, ativas: string[]): boolean => {
  const diaCanonico = normalizarDiaSemana(dia);
  return ativas.some((a) => normalizarDiaSemana(a) === diaCanonico);
};

interface PacientesViewProps {
  onOpenAudit: () => void;
  onOpenCalculator: () => void;
  onNavigate?: (key: any) => void;
  usuarioAtual?: Usuario;
}

export const PacientesView: React.FC<PacientesViewProps> = ({
  onOpenAudit,
  onOpenCalculator,
  onNavigate,
  usuarioAtual = {
    id: 'usr-2',
    nome: 'Maria Clara Fonseca',
    email: 'maria.fonseca@clinicamefisa.com.br',
    papel: 'FUNCIONARIO_ADMINISTRATIVO',
    departamento: 'Autorizações & Convênios',
    avatar: 'MF',
    ativo: true,
    ultimoAcesso: 'Hoje às 14:15',
  },
}) => {
  const { getThemeStrokeStyle, showMonthInitials } = useTheme();
  const { triggerSecretAction } = useSecretAchievements();

  // LGPD Achievement
  triggerSecretAction('guardiao_lgpd');

  // Pacientes em memória/storage
  const [pacientes, setPacientes] = useState<Paciente[]>(() =>
    PacientesService.obterPacientes()
  );

  // Opções dinâmicas extraídas da base completa de pacientes para datalists / seleções digitáveis
  const opcoesProcedimentos = useMemo(() => {
    const set = new Set<string>();
    pacientes.forEach((p) => {
      if (p.procedimentoPrincipal) set.add(p.procedimentoPrincipal.trim());
      if (p.procedimentos && Array.isArray(p.procedimentos)) {
        p.procedimentos.forEach((pr) => {
          if (pr && typeof pr === 'string') set.add(pr.trim());
        });
      }
    });
    return Array.from(set).filter(Boolean).sort();
  }, [pacientes]);

  const opcoesConvenios = useMemo(() => {
    const set = new Set<string>();
    pacientes.forEach((p) => {
      const conv = p.convenioPrincipalNome || p.convenioNome;
      if (conv) set.add(conv.trim());
    });
    MOCK_CONVENIOS.forEach((c) => {
      if (c.nome) set.add(c.nome.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [pacientes]);

  const opcoesPolos = useMemo(() => {
    const set = new Set<string>();
    pacientes.forEach((p) => {
      if (p.polo) set.add(p.polo.trim());
    });
    if (set.size === 0) {
      set.add('M1');
      set.add('M2');
    }
    return Array.from(set).filter(Boolean).sort();
  }, [pacientes]);

  const converterBrParaTimestamp = (dataBr: string): number => {
    if (!dataBr) return 0;
    const parts = dataBr.trim().split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10) || 1;
      let month = parseInt(parts[1], 10);
      if (isNaN(month)) {
        const mesesIniciais = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const idx = mesesIniciais.findIndex((m) => parts[1].toLowerCase().includes(m));
        month = idx !== -1 ? idx + 1 : 1;
      }
      const year = parseInt(parts[2], 10) || 2026;
      return new Date(year, month - 1, day).getTime();
    }
    return 0;
  };

  const ordenarDatasBrDescendente = (listaDatas: string[]): string[] => {
    const statusTexts: string[] = [];
    const datasValidas: string[] = [];

    listaDatas.forEach((d) => {
      if (d.includes('/')) {
        datasValidas.push(d);
      } else {
        statusTexts.push(d);
      }
    });

    datasValidas.sort((a, b) => converterBrParaTimestamp(b) - converterBrParaTimestamp(a));

    return [...statusTexts, ...datasValidas];
  };

  const carregarDataProximaAutorizacaoEfetiva = (pac: Paciente): string | undefined => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawAuts = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
        if (rawAuts) {
          const auts = JSON.parse(rawAuts);
          if (Array.isArray(auts)) {
            const normPacNome = (pac.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const normProcP = (pac.procedimentoPrincipal || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();

            const autCorrespondente = auts.find((a: any) => {
              if (!a) return false;
              const mesmoPac = a.pacienteId === pac.id || (a.pacienteNome && (a.pacienteNome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === normPacNome);
              if (!mesmoPac) return false;
              const normProcA = (a.procedimento || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
              if (!normProcP || !normProcA) return true;
              return normProcP.includes(normProcA) || normProcA.includes(normProcP);
            });

            if (autCorrespondente) {
              if (autCorrespondente.status === 'CONCLUIDO' && autCorrespondente.proximaAutorizacao) {
                return pac.proximaAutorizacaoData || autCorrespondente.proximaAutorizacao;
              }
              if (autCorrespondente.status !== 'CONCLUIDO') {
                return pac.proximaAutorizacaoData;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Erro ao verificar data da próxima autorização efetiva', e);
    }
    return pac.proximaAutorizacaoData;
  };

  const opcoesDatasProximaAut = useMemo(() => {
    const set = new Set<string>();
    set.add('AGUARDANDO DR.°(ª)');
    set.add('AUTORIZAÇÃO ATRASADA');
    pacientes.forEach((p) => {
      if (p.aguardandoDoutor || p.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || p.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR') {
        set.add('AGUARDANDO DR.°(ª)');
      } else if (p.autorizacaoAtrasada || p.proximaAutorizacaoData === 'AUTORIZAÇÃO ATRASADA') {
        set.add('AUTORIZAÇÃO ATRASADA');
      } else if (p.proximaAutorizacaoData) {
        set.add(formatarDataBr(p.proximaAutorizacaoData));
      }
    });
    if (set.size === 0) {
      set.add('29/10/2026');
      set.add('15/11/2026');
    }
    return ordenarDatasBrDescendente(Array.from(set).filter(Boolean));
  }, [pacientes]);

  const opcoesDatasUltimaAut = useMemo(() => {
    const set = new Set<string>();
    pacientes.forEach((p) => {
      if (p.ultimaAutorizacaoData) {
        set.add(formatarDataBr(p.ultimaAutorizacaoData));
      }
    });
    if (set.size === 0) {
      set.add('01/10/2026');
      set.add('15/09/2026');
    }
    return ordenarDatasBrDescendente(Array.from(set).filter(Boolean));
  }, [pacientes]);

  const opcoesDatasAtualizacao = useMemo(() => {
    const set = new Set<string>();
    pacientes.forEach((p) => {
      if (p.dataUltimaAtualizacao) {
        set.add(formatarDataBr(p.dataUltimaAtualizacao));
      }
    });
    if (set.size === 0) {
      set.add('24/10/2026');
    }
    return ordenarDatasBrDescendente(Array.from(set).filter(Boolean));
  }, [pacientes]);

  useEffect(() => {
    const limpos = PacientesService.limparTodasObservacoesPacientes();
    setPacientes(limpos);

    const handleStorage = () => {
      setPacientes(PacientesService.obterPacientes());
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleLimparObservacoes = () => {
    const limpos = PacientesService.limparTodasObservacoesPacientes();
    setPacientes(limpos);
    setNotificacaoSucesso('Todas as observações da lista de pacientes foram limpas com sucesso!');
    setTimeout(() => setNotificacaoSucesso(null), 4000);
  };

  // Filtros locais da sessão do usuário corrente (ISOLADOS POR USUÁRIO)
  const [filtros, setFiltros] = useState<FiltroPacientesUsuario>(() =>
    PacientesService.obterFiltroUsuario(usuarioAtual.id)
  );

  // Estados de seleção múltipla para datas de autorização
  const [datasProximaAutSel, setDatasProximaAutSel] = useState<string[]>([]);
  const [datasUltimaAutSel, setDatasUltimaAutSel] = useState<string[]>([]);
  const [datasAtualizacaoSel, setDatasAtualizacaoSel] = useState<string[]>([]);

  // Filtros programáveis por coluna
  const [filtrosColunas, setFiltrosColunas] = useState({
    nome: '',
    procedimento: '',
    carteirinha: '',
    polo: '',
    semanas: '',
    status: '',
    convenio: '',
    proximaAut: '',
    ultimaAut: '',
    pendencias: '',
    atualizacao: '',
  });

  // Modal de dias de atendimento em lote
  const [modalSemanasLoteAberto, setModalSemanasLoteAberto] = useState(false);
  const [semanasLoteSelecionadas, setSemanasLoteSelecionadas] = useState<string[]>(['seg.', 'ter.', 'qua.', 'qui.', 'sex.']);

  // Estado selecionado para visualização no Drawer de Perfil
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);

  // Seleção múltipla para exclusão em lote
  const [selecionadosIds, setSelecionadosIds] = useState<string[]>([]);

  // Modal de confirmação de exclusão (enviando para Lixeira)
  const [modalExclusao, setModalExclusao] = useState<{
    aberto: boolean;
    ids: string[];
    nomes: string[];
  }>({ aberto: false, ids: [], nomes: [] });

  // Modal de novo cadastro
  const [isNovoModalAberto, setIsNovoModalAberto] = useState(false);

  // Feedback de ações
  const [notificacaoSucesso, setNotificacaoSucesso] = useState<string | null>(null);

  // Alterna um dia de atendimento específico de um paciente em tempo real
  const handleToggleSemanaPaciente = (pacienteId: string, dia: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) return;

    const ativas = parseDiasAtendimento(paciente.diaDaSemana, paciente.diasDaSemana);
    let novosDias: string[];
    if (isDiaAtivo(dia, ativas)) {
      const diaNorm = dia.toLowerCase().replace('.', '');
      novosDias = ativas.filter((a) => a.toLowerCase().replace('.', '') !== diaNorm);
    } else {
      novosDias = [...ativas, dia];
    }

    const novaStr = novosDias.join(', ');
    const { paciente: pacAtualizado } = PacientesService.atualizarPaciente(
      pacienteId,
      { diaDaSemana: novaStr, diasDaSemana: novosDias },
      usuarioAtual,
      `Alteração de dias do atendimento para [${novaStr || 'Nenhum'}]`
    );

    setPacientes((prev) => prev.map((p) => (p.id === pacienteId ? pacAtualizado : p)));
    setNotificacaoSucesso(`Dias de atendimento de ${paciente.nome} atualizados: [${novaStr || 'Nenhum'}]`);
    setTimeout(() => setNotificacaoSucesso(null), 3000);
  };

  // Atribuição de dias em lote para pacientes selecionados
  const handleAplicarSemanasEmLote = () => {
    if (selecionadosIds.length === 0) return;
    const novaStr = semanasLoteSelecionadas.join(', ');

    selecionadosIds.forEach((id) => {
      PacientesService.atualizarPaciente(
        id,
        { diaDaSemana: novaStr, diasDaSemana: semanasLoteSelecionadas },
        usuarioAtual,
        `Atualização de dias de atendimento em lote ([${novaStr}])`
      );
    });

    setPacientes(PacientesService.obterPacientes());
    setModalSemanasLoteAberto(false);
    setNotificacaoSucesso(
      `✓ Dias de atendimento [${novaStr || 'Nenhum'}] atribuídos a ${selecionadosIds.length} paciente(s) com sucesso!`
    );
    setTimeout(() => setNotificacaoSucesso(null), 4000);
  };

  // Atualiza storage de filtros por usuário quando alterado na sessão
  const handleAtualizarFiltro = (novoFiltro: Partial<FiltroPacientesUsuario>) => {
    const atualizado: FiltroPacientesUsuario = { ...filtros, ...novoFiltro };
    setFiltros(atualizado);
    PacientesService.salvarFiltroUsuario(usuarioAtual.id, atualizado);
  };

  // Recarrega lista quando o usuário selecionado ou storage muda
  const recarregarPacientes = () => {
    setPacientes(PacientesService.obterPacientes());
  };

  // Filtra pacientes localmente
  const pacientesBase = PacientesService.filtrarPacientes(pacientes, filtros);
  const pacientesFiltrados = pacientesBase.filter(p => {
    if (filtrosColunas.nome) {
      const matchNome = matchTextFilter(p.nome, filtrosColunas.nome);
      const matchProntuario = matchTextFilter(p.codigoProntuario, filtrosColunas.nome);
      const matchResp = matchTextFilter(p.responsavelPrincipalNome || p.responsavelNome, filtrosColunas.nome);
      if (!matchNome && !matchProntuario && !matchResp) return false;
    }
    if (filtrosColunas.procedimento && !matchTextFilter(p.procedimentoPrincipal, filtrosColunas.procedimento)) {
      return false;
    }
    if (filtrosColunas.carteirinha && !matchTextFilter(p.carteirinhaAtual || p.carteirinha, filtrosColunas.carteirinha)) {
      return false;
    }
    if (filtrosColunas.polo && !matchTextFilter(p.polo || 'M1', filtrosColunas.polo)) {
      return false;
    }
    if (filtrosColunas.semanas) {
      const ativas = parseDiasAtendimento(p.diaDaSemana, p.diasDaSemana);
      if (!isDiaAtivo(filtrosColunas.semanas, ativas)) return false;
    }
    if (filtrosColunas.status && !matchTextFilter(p.status, filtrosColunas.status)) {
      return false;
    }
    if (filtrosColunas.convenio && !matchTextFilter(p.convenioPrincipalNome || p.convenioNome, filtrosColunas.convenio)) {
      return false;
    }
    if (datasProximaAutSel.length > 0) {
      const isDr = Boolean(p.aguardandoDoutor || p.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || p.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR');
      const isAtrasada = Boolean(p.autorizacaoAtrasada || p.proximaAutorizacaoData === 'AUTORIZAÇÃO ATRASADA');
      const pDataFormatted = isDr ? 'AGUARDANDO DR.°(ª)' : isAtrasada ? 'AUTORIZAÇÃO ATRASADA' : formatarDataBr(p.proximaAutorizacaoData || '2026-10-29');
      const match = datasProximaAutSel.some(
        (dt) => (isDr && dt === 'AGUARDANDO DR.°(ª)') || (isAtrasada && dt === 'AUTORIZAÇÃO ATRASADA') || matchDateFilter(p.proximaAutorizacaoData, dt) || pDataFormatted.includes(dt)
      );
      if (!match) return false;
    } else if (filtrosColunas.proximaAut) {
      const isDr = Boolean(p.aguardandoDoutor || p.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || p.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR');
      const isAtrasada = Boolean(p.autorizacaoAtrasada || p.proximaAutorizacaoData === 'AUTORIZAÇÃO ATRASADA');
      const term = filtrosColunas.proximaAut.toLowerCase();
      if (isDr) {
        if (!'aguardando dr.°(ª)'.includes(term) && !'doutora em falta'.includes(term)) return false;
      } else if (isAtrasada) {
        if (!'autorização atrasada'.includes(term) && !'autorizacao atrasada'.includes(term) && !'atrasada'.includes(term)) return false;
      } else if (!matchDateFilter(p.proximaAutorizacaoData || '2026-10-29', filtrosColunas.proximaAut)) {
        return false;
      }
    }

    if (datasUltimaAutSel.length > 0) {
      const pDataFormatted = formatarDataBr(p.ultimaAutorizacaoData || '2026-10-01');
      const match = datasUltimaAutSel.some(
        (dt) => matchDateFilter(p.ultimaAutorizacaoData, dt) || pDataFormatted.includes(dt)
      );
      if (!match) return false;
    } else if (filtrosColunas.ultimaAut && !matchDateFilter(p.ultimaAutorizacaoData || '2026-10-01', filtrosColunas.ultimaAut)) {
      return false;
    }

    if (filtrosColunas.pendencias) {
      const termoPend = filtrosColunas.pendencias.trim().toLowerCase();
      const qtdPend = String(p.pendenciasQuantidade || 0);
      const formVencido = isFormularioVencido(p);
      if (termoPend === '0' || termoPend.includes('reg') || termoPend.includes('sem')) {
        if (p.pendenciasQuantidade && p.pendenciasQuantidade > 0) return false;
        if (formVencido) return false;
      } else if (termoPend.includes('venc') || termoPend.includes('form')) {
        if (!formVencido) return false;
      } else {
        if (!qtdPend.includes(termoPend)) return false;
      }
    }

    if (datasAtualizacaoSel.length > 0) {
      const pDataFormatted = formatarDataBr(p.dataUltimaAtualizacao || '2026-10-24');
      const match = datasAtualizacaoSel.some(
        (dt) => matchDateFilter(p.dataUltimaAtualizacao, dt) || pDataFormatted.includes(dt)
      );
      if (!match) return false;
    } else if (filtrosColunas.atualizacao && !matchDateFilter(p.dataUltimaAtualizacao || '2026-10-24', filtrosColunas.atualizacao)) {
      return false;
    }
    return true;
  });

  const temFiltroColunaAtivo =
    Object.values(filtrosColunas).some((v) => Boolean(v && v.trim())) ||
    datasProximaAutSel.length > 0 ||
    datasUltimaAutSel.length > 0 ||
    datasAtualizacaoSel.length > 0;

  const limparFiltrosColunas = () => {
    setFiltrosColunas({
      nome: '',
      procedimento: '',
      carteirinha: '',
      polo: '',
      semanas: '',
      status: '',
      convenio: '',
      proximaAut: '',
      ultimaAut: '',
      pendencias: '',
      atualizacao: '',
    });
    setDatasProximaAutSel([]);
    setDatasUltimaAutSel([]);
    setDatasAtualizacaoSel([]);
  };

  // Regras de seleção de checkboxes
  const todosSelecionados =
    pacientesFiltrados.length > 0 &&
    pacientesFiltrados.every((p) => selecionadosIds.includes(p.id));

  const algunsSelecionados =
    selecionadosIds.length > 0 && !todosSelecionados;

  const handleToggleSelecao = (id: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setSelecionadosIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelecaoTodos = () => {
    if (todosSelecionados) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(pacientesFiltrados.map((p) => p.id));
    }
  };

  // Funções de Exclusão enviando para Registros Deletados (Lixeira)
  const handleSolicitarExclusao = (ids: string[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const selecionados = pacientes.filter((p) => ids.includes(p.id));
    setModalExclusao({
      aberto: true,
      ids,
      nomes: selecionados.map((p) => p.nome),
    });
  };

  const handleConfirmarExclusao = () => {
    const { ids } = modalExclusao;
    if (ids.length === 0) return;

    const { deletadosCount } = PacientesService.deletarPacientes(ids, {
      nome: usuarioAtual.nome,
      papel: usuarioAtual.papel,
    });

    setSelecionadosIds((prev) => prev.filter((id) => !ids.includes(id)));
    setPacientes(PacientesService.obterPacientes());
    setModalExclusao({ aberto: false, ids: [], nomes: [] });

    setNotificacaoSucesso(
      `${deletadosCount} paciente(s) movido(s) com sucesso para os Registros Deletados (Lixeira Anual).`
    );
    setTimeout(() => setNotificacaoSucesso(null), 5000);
  };

  // Verificação de formulários vencidos (Alerta de Urgência)
  const pacientesComFormularioVencido = pacientes.filter(isFormularioVencido);

  const getStatusBadge = (status: StatusPaciente | string) => {
    switch (status) {
      case 'ATIVO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'EM_ACOMPANHAMENTO':
      case 'EM_TRATAMENTO':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'INATIVO':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'ENCERRADO':
      case 'ALTA':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* NOTIFICAÇÃO NO TOPO DA PÁGINA: Pacientes com Formulário Vencido */}
      {pacientesComFormularioVencido.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/90 border-2 border-red-500 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-black text-red-900 dark:text-red-100 uppercase tracking-wide">
                  🚨 ATENÇÃO: FORMULÁRIO CADASTRAL VENCIDO DETECTADO
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow-2xs">
                  {pacientesComFormularioVencido.length} paciente(s) afetado(s)
                </span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-200 font-medium mt-0.5">
                Existe(m) paciente(s) nesta aba com formulário cadastral vencido (há mais de 180 dias).
                <strong> As barras dos pacientes com formulário vencido foram destacadas com um contorno vermelho na lista.</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => handleAtualizarFiltro({ formularioVencidoApenas: !filtros.formularioVencidoApenas })}
            className="shrink-0 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            {filtros.formularioVencidoApenas ? 'Mostrar Todos os Pacientes' : 'Filtrar Pacientes Afetados'}
          </button>
        </div>
      )}

      {/* Notificação Temporária de Sucesso */}
      {notificacaoSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">{notificacaoSucesso}</span>
          </div>
          <button
            onClick={() => setNotificacaoSucesso(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Pacientes & Prontuários
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              LGPD Blindada
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            Entidade mestre central única: autorizações, sessões e guias referenciam este cadastro sem duplicação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate && onNavigate('importacao')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors shadow-2xs"
            title="Importar planilha legada de pacientes"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={() => setIsNovoModalAberto(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#91CA0C]" />
            <span>+ Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros Locais (ISOLADOS NA SESSÃO) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, carteirinha, CPF ou responsável legal..."
              value={filtros.busca}
              onChange={(e) => handleAtualizarFiltro({ busca: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-[#002172] focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          {/* Filtro por Status */}
          <select
            value={filtros.status}
            onChange={(e) => handleAtualizarFiltro({ status: e.target.value })}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-white font-medium focus:outline-[#002172]"
          >
            <option value="TODOS">Status: Todos</option>
            <option value="ATIVO">🟢 Ativo</option>
            <option value="EM_ACOMPANHAMENTO">🟡 Em Acompanhamento</option>
            <option value="INATIVO">⚪ Inativo</option>
            <option value="ENCERRADO">🔴 Encerrado / Alta</option>
          </select>

          {/* Filtro por Convênio */}
          <select
            value={filtros.convenioId}
            onChange={(e) => handleAtualizarFiltro({ convenioId: e.target.value })}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-white font-medium focus:outline-[#002172]"
          >
            <option value="TODOS">Convênios: Todos</option>
            {MOCK_CONVENIOS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
            <option value="conv-particular">Particular / Outros</option>
          </select>
        </div>

        {/* Filtros Opcionais Adicionais */}
        <div className="flex flex-wrap items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filtros.autorizacoesAtrasadasApenas)}
                onChange={(e) =>
                  handleAtualizarFiltro({
                    autorizacoesAtrasadasApenas: e.target.checked,
                  })
                }
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className={filtros.autorizacoesAtrasadasApenas ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300 font-medium'}>
                Autorizações Atrasadas
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={filtros.formularioVencidoApenas}
                onChange={(e) => handleAtualizarFiltro({ formularioVencidoApenas: e.target.checked })}
                className="rounded text-red-600 focus:ring-red-600"
              />
              <span className={filtros.formularioVencidoApenas ? 'font-bold text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}>
                Apenas formulários vencidos (180 dias)
              </span>
            </label>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-400">
            Filtros salvos na sessão de <strong>{usuarioAtual.nome}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Ação de Seleção Múltipla */}
      {selecionadosIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#002172] text-white shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckSquare className="w-4 h-4 text-[#91CA0C]" />
            <span>
              <strong>{selecionadosIds.length}</strong> paciente(s) selecionado(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalSemanasLoteAberto(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#91CA0C]" />
              <span>Dias em Lote ({selecionadosIds.length})</span>
            </button>
            <button
              onClick={() => setSelecionadosIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
            >
              Desmarcar Seleção
            </button>
            <button
              onClick={(e) => handleSolicitarExclusao(selecionadosIds, e)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deletar Selecionados ({selecionadosIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* TABELA ADMINISTRATIVA PROFISSIONAL COM ROLL SUPERIOR */}
      <TopScrollTableWrapper tableTitle="Lista Geral de Pacientes">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/90 dark:bg-slate-950 text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              {/* Checkbox de Seleção Múltipla Geral */}
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  ref={(el) => {
                    if (el) el.indeterminate = algunsSelecionados;
                  }}
                  onChange={handleToggleSelecaoTodos}
                  className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4 cursor-pointer"
                  title={todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos os visíveis'}
                />
              </th>
              {/* 1. Nome */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                <div>Nome do Paciente</div>
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filtrosColunas.nome}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, nome: e.target.value })}
                  className="mt-1 w-full px-2 py-1 text-[11px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </th>
              {/* 2. Procedimento */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                <div>Procedimento</div>
                <input
                  type="text"
                  list="dl-pacientes-procedimento"
                  placeholder="Filtrar ou escolher proc..."
                  value={filtrosColunas.procedimento}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, procedimento: e.target.value })}
                  className="mt-1 w-full px-2 py-1 text-[11px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
                <datalist id="dl-pacientes-procedimento">
                  {opcoesProcedimentos.map((proc) => (
                    <option key={proc} value={proc} />
                  ))}
                </datalist>
              </th>
              {/* 3. Carteirinha Atual */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                <div>Carteirinha Atual</div>
                <input
                  type="text"
                  placeholder="Buscar por carteirinha..."
                  value={filtrosColunas.carteirinha}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, carteirinha: e.target.value })}
                  className="mt-1 w-full px-2 py-1 text-[11px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </th>
              {/* 4. M (M1 / M2) */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white text-center">
                <div>M</div>
                <input
                  type="text"
                  list="dl-pacientes-polo"
                  placeholder="Escolher ou digitar polo..."
                  value={filtrosColunas.polo}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, polo: e.target.value })}
                  className="mt-1 w-full px-1 py-1 text-[11px] font-normal text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
                <datalist id="dl-pacientes-polo">
                  {opcoesPolos.map((polo) => (
                    <option key={polo} value={polo} />
                  ))}
                </datalist>
              </th>
              {/* Dias do Atendimento (seg. ter. qua. qui. sex. sáb. - Seleção Múltipla ou Digitação) */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white min-w-[170px]">
                <div className="flex items-center gap-1">
                  <span>Dias do Atendimento</span>
                  <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-[#002172] dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                    Mult.
                  </span>
                </div>
                <input
                  type="text"
                  list="dl-pacientes-semanas"
                  placeholder="Escolher ou digitar dia..."
                  value={filtrosColunas.semanas}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, semanas: e.target.value })}
                  className="mt-1 w-full px-1 py-1 text-[11px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
                <datalist id="dl-pacientes-semanas">
                  <option value="seg.">seg. (Segunda-feira)</option>
                  <option value="ter.">ter. (Terça-feira)</option>
                  <option value="qua.">qua. (Quarta-feira)</option>
                  <option value="qui.">qui. (Quinta-feira)</option>
                  <option value="sex.">sex. (Sexta-feira)</option>
                  <option value="sáb.">sáb. (Sábado)</option>
                </datalist>
              </th>
              {/* 5. Status */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white text-center">
                <div>Status</div>
                <input
                  type="text"
                  list="dl-pacientes-status"
                  placeholder="Escolher ou digitar status..."
                  value={filtrosColunas.status}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, status: e.target.value })}
                  className="mt-1 w-full px-1 py-1 text-[11px] font-normal text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
                <datalist id="dl-pacientes-status">
                  <option value="ATIVO" />
                  <option value="EM_ACOMPANHAMENTO" />
                  <option value="INATIVO" />
                  <option value="ENCERRADO" />
                </datalist>
              </th>
              {/* 5. Convênio principal */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                <div>Convênio Principal</div>
                <input
                  type="text"
                  list="dl-pacientes-convenio"
                  placeholder="Filtrar ou escolher conv..."
                  value={filtrosColunas.convenio}
                  onChange={(e) => setFiltrosColunas({ ...filtrosColunas, convenio: e.target.value })}
                  className="mt-1 w-full px-2 py-1 text-[11px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                />
                <datalist id="dl-pacientes-convenio">
                  {opcoesConvenios.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </th>
              {/* 6. Próxima autorização */}
              <th className="py-3 px-4 font-bold text-[#002172] dark:text-blue-300 min-w-[150px]">
                <div className="flex items-center gap-1">
                  <span>Próxima Autorização</span>
                  <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-[#002172] dark:text-blue-300 px-1 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                    Mult.
                  </span>
                </div>
                <MultiSelectDateFilter
                  placeholder="Escolher datas..."
                  opcoesDatas={opcoesDatasProximaAut}
                  selectedDates={datasProximaAutSel}
                  onSelectionChange={setDatasProximaAutSel}
                  manualValue={filtrosColunas.proximaAut}
                  onManualValueChange={(val) => setFiltrosColunas({ ...filtrosColunas, proximaAut: val })}
                />
              </th>
              {/* 7. Última autorização */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white min-w-[150px]">
                <div className="flex items-center gap-1">
                  <span>Última Autorização</span>
                  <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-[#002172] dark:text-blue-300 px-1 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                    Mult.
                  </span>
                </div>
                <MultiSelectDateFilter
                  placeholder="Escolher datas..."
                  opcoesDatas={opcoesDatasUltimaAut}
                  selectedDates={datasUltimaAutSel}
                  onSelectionChange={setDatasUltimaAutSel}
                  manualValue={filtrosColunas.ultimaAut}
                  onManualValueChange={(val) => setFiltrosColunas({ ...filtrosColunas, ultimaAut: val })}
                />
              </th>
              {/* 9. Última atualização */}
              <th className="py-3 px-4 font-bold text-slate-900 dark:text-white min-w-[150px]">
                <div className="flex items-center gap-1">
                  <span>Última Atualização</span>
                  <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-[#002172] dark:text-blue-300 px-1 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                    Mult.
                  </span>
                </div>
                <MultiSelectDateFilter
                  placeholder="Escolher datas..."
                  opcoesDatas={opcoesDatasAtualizacao}
                  selectedDates={datasAtualizacaoSel}
                  onSelectionChange={setDatasAtualizacaoSel}
                  manualValue={filtrosColunas.atualizacao}
                  onManualValueChange={(val) => setFiltrosColunas({ ...filtrosColunas, atualizacao: val })}
                />
              </th>
              {/* Ação */}
              <th className="py-3 px-4 text-right">
                <div>Ação</div>
                <div className="mt-1 flex justify-end items-center h-6">
                  {temFiltroColunaAtivo && (
                    <button
                      onClick={limparFiltrosColunas}
                      title="Limpar todos os filtros de coluna"
                      className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {pacientesFiltrados.length > 0 ? (
                pacientesFiltrados.map((pac, index) => {
                  const carteirinhaExibicao =
                    pac.carteirinhaAtualMascarada ||
                    mascararCarteirinha(pac.carteirinhaAtual || pac.carteirinha || '');

                  const selecionado = selecionadosIds.includes(pac.id);
                  const temObs = Boolean(pac.observacoes && pac.observacoes.trim());
                  const ehFormVencido = isFormularioVencido(pac);
                  const isAguardandoDr = Boolean(
                    pac.aguardandoDoutor ||
                    pac.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' ||
                    pac.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR'
                  );
                  const ehAutorizacaoAtrasada = isAutorizacaoAtrasada(pac);

                  return (
                    <tr
                      key={`${pac.id}-${index}`}
                      onClick={() => setPacienteSelecionado(pac)}
                      title={
                        ehFormVencido
                          ? `🚨 ATENÇÃO: Formulário cadastral deste paciente está VENCIDO há mais de 180 dias!`
                          : isAguardandoDr
                          ? `⚪ ALERTA: Doutora/Médico em falta no sistema (Aguardando Dr.º(ª))`
                          : ehAutorizacaoAtrasada
                          ? `🟡 ALERTA: Autorização deste paciente está atrasada no sistema`
                          : temObs
                          ? `📝 OBSERVAÇÃO DO PACIENTE:\n"${pac.observacoes?.trim()}"`
                          : undefined
                      }
                      className={`cursor-pointer transition-all duration-150 group relative ${
                        ehFormVencido
                          ? 'bg-red-50/90 dark:bg-red-950/70 hover:bg-red-100 dark:hover:bg-red-900/80 border-2 border-red-500 ring-2 ring-red-500/80 shadow-xs font-medium'
                          : ehAutorizacaoAtrasada
                          ? 'bg-amber-100/90 dark:bg-amber-950/60 hover:bg-amber-200/90 dark:hover:bg-amber-900/80 border-l-4 border-l-amber-500 font-semibold text-amber-950 dark:text-amber-100'
                          : isAguardandoDr
                          ? 'bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 border-l-4 border-l-slate-400 dark:border-l-slate-600 font-medium'
                          : temObs
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-l-4 border-l-amber-500 font-medium'
                          : selecionado
                          ? 'bg-blue-100/70 dark:bg-blue-950/60'
                          : CLASS_TABELA_LISTRADA_ROW
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={(e) => handleToggleSelecao(pac.id, e)}
                          className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* 1. Nome & Prontuário */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs group-hover:text-[#002172] dark:group-hover:text-blue-300">
                              {pac.nome}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {pac.codigoProntuario}
                            </span>
                            {ehFormVencido && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white shadow-2xs uppercase tracking-tight animate-pulse" title="Formulário com mais de 180 dias">
                                <AlertTriangle className="w-3 h-3 text-white shrink-0" />
                                Formulário Vencido
                              </span>
                            )}
                             {isAguardandoDr && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs uppercase tracking-tight" title="Alerta: Doutora em falta no sistema">
                                <AlertTriangle className="w-3 h-3 text-slate-500 shrink-0" />
                                Aguardando Dr.º(ª)
                              </span>
                            )}
                            {ehAutorizacaoAtrasada && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs uppercase tracking-tight" title="Alerta: Autorização Atrasada">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                Autorização Atrasada
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {pac.idade ? `${pac.idade} anos • ` : ''}Resp: {pac.responsavelPrincipalNome || pac.responsavelNome || 'Não informado'}
                          </div>

                          {temObs && (
                            <div
                              className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-200/90 text-amber-950 dark:bg-amber-900/80 dark:text-amber-100 border border-amber-300 dark:border-amber-700 shadow-2xs group-hover:scale-[1.02] transition-transform max-w-full"
                              title={`📝 Observação do Paciente:\n"${pac.observacoes?.trim()}"`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300 shrink-0" />
                              <span className="truncate max-w-[260px]">Obs: {pac.observacoes?.trim()}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Procedimento */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs ${obterBadgeProcedimento(pac.procedimentoPrincipal)}`}>
                          {pac.procedimentoPrincipal || 'Fisioterapia Geral'}
                        </span>
                      </td>

                      {/* 3. Carteirinha Atual */}
                      <td className="py-3 px-4 font-mono text-slate-800 font-semibold">
                        {carteirinhaExibicao}
                      </td>

                      {/* 4. M (M1 / M2) */}
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const valP = (pac.polo || 'M1').toString().toUpperCase();
                          const isM2 = valP.includes('M2') || valP.includes('2');
                          return (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isM2
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800'
                                : 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800'
                            }`}>
                              {isM2 ? 'M2' : 'M1'}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Dias do Atendimento com Badges Selecionáveis em Tempo Real + Qtd/Semana */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            {OPCOES_DIAS_ATENDIMENTO.map((dia) => {
                              const ativas = parseDiasAtendimento(pac.diaDaSemana, pac.diasDaSemana);
                              const ativa = isDiaAtivo(dia, ativas);
                              return (
                                <button
                                  key={dia}
                                  type="button"
                                  onClick={(e) => handleToggleSemanaPaciente(pac.id, dia, e)}
                                  title={ativa ? `Desativar ${dia} para este paciente` : `Ativar ${dia} para este paciente`}
                                  className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                                    ativa
                                      ? 'bg-[#002172] text-white shadow-2xs border border-[#002172] hover:bg-rose-700 hover:border-rose-700'
                                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800'
                                  }`}
                                >
                                  {dia}
                                </button>
                              );
                            })}
                          </div>
                          {(() => {
                            const ativas = parseDiasAtendimento(pac.diaDaSemana, pac.diasDaSemana);
                            const qtd = pac.quantidadeSemana || pac.sessoesPorSemana || ativas.length;
                            return (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-blue-100 text-[#002172] dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800" title="Quantidade de sessões por semana">
                                {qtd}x/sem
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            pac.status
                          )}`}
                        >
                          {pac.status}
                        </span>
                      </td>

                      {/* 4. Convênio principal */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {pac.convenioPrincipalNome || pac.convenioNome}
                        </span>
                      </td>

                      {/* 5. Próxima autorização */}
                      <td className="py-3 px-4 font-bold text-[#002172]">
                        {(() => {
                          const dataEfetivaProc = carregarDataProximaAutorizacaoEfetiva(pac);
                          if (isAguardandoDr) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs font-mono" title="Alerta: Doutora em falta no sistema">
                                <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span>AGUARDANDO DR.°(ª)</span>
                              </span>
                            );
                          }
                          if (ehAutorizacaoAtrasada) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs font-mono" title="Alerta: Autorização Atrasada">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>AUTORIZAÇÃO ATRASADA</span>
                              </span>
                            );
                          }
                          if (pac.status === 'ENCERRADO' || pac.status === 'INATIVO' || !dataEfetivaProc) {
                            return <span className="text-slate-400 font-mono text-[11px]">—</span>;
                          }
                          return (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#91CA0C]" />
                              <span>{formatarDataBr(dataEfetivaProc, showMonthInitials)}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* 6. Última autorização */}
                      <td className="py-3 px-4 text-slate-600">
                        {formatarDataBr(pac.ultimaAutorizacaoData || '2026-10-01', showMonthInitials)}
                      </td>

                      {/* 8. Última atualização */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>{formatarDataBr(pac.dataUltimaAtualizacao || '2026-10-24', showMonthInitials)}</div>
                        <div className="text-[10px] text-slate-400">
                          {pac.atualizadoPor || 'Maria Clara'}
                        </div>
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPacienteSelecionado(pac);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#002172] dark:text-blue-300 hover:bg-[#002172] hover:text-white dark:hover:bg-blue-900 rounded-lg transition-colors border border-[#002172]/30 dark:border-blue-700"
                          >
                            Abrir Prontuário →
                          </button>
                          <button
                            onClick={(e) => handleSolicitarExclusao([pac.id], e)}
                            title="Deletar paciente (Mover para Registros Deletados)"
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* Estado Vazio */
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="p-3 bg-slate-100 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Nenhum paciente encontrado
                      </h4>
                      <p className="text-xs text-slate-500">
                        Nenhum registro corresponde aos filtros selecionados. Tente alterar o termo da busca ou os filtros de convênio.
                      </p>
                      <button
                        onClick={() =>
                          handleAtualizarFiltro({
                            busca: '',
                            status: 'TODOS',
                            convenioId: 'TODOS',
                            comPendenciasApenas: false,
                            formularioVencidoApenas: false,
                          })
                        }
                        className="mt-2 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </TopScrollTableWrapper>

      {/* Rodapé da Tabela */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 shadow-2xs">
        <span>
          Exibindo <strong className="text-slate-800 dark:text-white">{pacientesFiltrados.length}</strong> de <strong className="text-slate-800 dark:text-white">{pacientes.length}</strong> pacientes cadastrados
        </span>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Entidade Única: Chave Prontuário #MEF</span>
          <span>•</span>
          <button
            onClick={onOpenAudit}
            className="text-[#002172] dark:text-blue-400 hover:underline font-bold"
          >
            Ver Trilha Geral de Auditoria →
          </button>
        </div>
      </div>

      {/* Drawer de Perfil Completo do Paciente */}
      {pacienteSelecionado && (
        <PacientePerfilDrawer
          paciente={pacienteSelecionado}
          usuarioAtual={usuarioAtual}
          onFechar={() => setPacienteSelecionado(null)}
          onPacienteAtualizado={(pacAtualizado) => {
            setPacienteSelecionado(pacAtualizado);
            recarregarPacientes();
            setNotificacaoSucesso(
              `Prontuário de ${pacAtualizado.nome} atualizado com sucesso.`
            );
          }}
          onOpenAudit={onOpenAudit}
        />
      )}

      {/* Modal de Novo Paciente */}
      {isNovoModalAberto && (
        <NovoPacienteModal
          usuarioAtual={usuarioAtual}
          onFechar={() => setIsNovoModalAberto(false)}
          onPacienteCriado={(novoPac) => {
            recarregarPacientes();
            setNotificacaoSucesso(
              `✓ Paciente ${novoPac.nome} (${novoPac.codigoProntuario}) cadastrado com sucesso!`
            );
            setPacienteSelecionado(novoPac);
          }}
          onAbrirPacienteExistente={(pacExistente) => {
            setPacienteSelecionado(pacExistente);
          }}
        />
      )}

      {/* Modal de Atualização de Dias do Atendimento em Lote */}
      {modalSemanasLoteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Atribuir Dias do Atendimento em Lote
                </h3>
              </div>
              <button
                onClick={() => setModalSemanasLoteAberto(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecione os dias da semana em que os <strong>{selecionadosIds.length}</strong> paciente(s) selecionado(s) passam em atendimento:
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Dias Habilitados:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSemanasLoteSelecionadas([...OPCOES_DIAS_ATENDIMENTO])}
                    className="text-[10px] font-bold text-[#002172] hover:underline"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSemanasLoteSelecionadas([])}
                    className="text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {OPCOES_DIAS_ATENDIMENTO.map((dia) => {
                  const checked = isDiaAtivo(dia, semanasLoteSelecionadas);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => {
                        if (checked) {
                          setSemanasLoteSelecionadas(
                            semanasLoteSelecionadas.filter(
                              (s) => s.toLowerCase().replace('.', '') !== dia.toLowerCase().replace('.', '')
                            )
                          );
                        } else {
                          setSemanasLoteSelecionadas([...semanasLoteSelecionadas, dia]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                        checked
                          ? 'bg-[#002172] text-white border-[#002172] shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {checked ? `✓ ${dia}` : `+ ${dia}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalSemanasLoteAberto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAplicarSemanasEmLote}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white flex items-center gap-1.5 shadow-md transition-colors"
              >
                <span>Aplicar em Lote ({selecionadosIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Notificação de Sucesso */}
      {notificacaoSucesso && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{notificacaoSucesso}</span>
          <button
            onClick={() => setNotificacaoSucesso(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (Enviando para Registros Deletados) */}
      {modalExclusao.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmar Exclusão de Paciente(s)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Os itens deletados são enviados para os <strong>Registros Deletados (Lixeira Anual)</strong> e podem ser restaurados a qualquer momento por um Administrador.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Paciente(s) selecionado(s) ({modalExclusao.ids.length}):
              </span>
              {modalExclusao.nomes.map((nome, idx) => (
                <div key={idx} className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>{nome}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalExclusao({ aberto: false, ids: [], nomes: [] })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Mover para Lixeira</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
