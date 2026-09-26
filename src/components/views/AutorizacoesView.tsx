import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  Calculator,
  Plus,
  AlertTriangle,
  FileText,
  History,
  CheckCircle2,
  Edit3,
  Tag,
  Search,
  Filter,
  ShieldCheck,
  User,
  ArrowUpDown,
  Building,
  X,
  AlertCircle,
  Eye,
  Trash2,
  Check,
  ChevronDown,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { AutorizacaoV2, StatusAutorizacao, HistoricoStatusAutorizacao } from '../../types/autorizacao';
import { carregarAutorizacoesIniciais, salvarAutorizacoesStorage, calcularDiasCorridos, registrarAuditoriaAutorizacao } from '../../services/autorizacoesService';
import { MOCK_PACIENTES, MOCK_PRESTADORES, MOCK_CONVENIOS } from '../../data/mockClinicData';
import { DiaSemanaIndice, Prestador, Usuario } from '../../types/clinic';
import { formatarDataBr, calcularAlinhamentoProximaAutorizacao, sanitizarCbo } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import { PacientesService } from '../../services/pacientesService';
import { ProcedimentosService, ProcedimentoCompleto } from '../../services/procedimentosService';
import { matchDateFilter, matchTextFilter } from '../../utils/filterUtils';
import { obterBadgeColorProcedimento, CLASS_TABELA_LISTRADA_ROW } from '../../utils/procedureStyles';

function parseDiaSemanaNomeParaIndice(diaNome?: string): DiaSemanaIndice {
  if (!diaNome) return 1;
  const norm = diaNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('segunda')) return 1;
  if (norm.includes('terca')) return 2;
  if (norm.includes('quarta')) return 3;
  if (norm.includes('quinta')) return 4;
  if (norm.includes('sexta')) return 5;
  if (norm.includes('sabado')) return 6;
  if (norm.includes('domingo')) return 0;
  return 1;
}

interface AutorizacoesViewProps {
  onOpenCalculator: () => void;
  onOpenAudit: () => void;
  usuarioAtual: Usuario;
}

export const AutorizacoesView: React.FC<AutorizacoesViewProps> = ({
  onOpenCalculator,
  onOpenAudit,
  usuarioAtual,
}) => {
  const { getThemeStrokeStyle, showMonthInitials } = useTheme();
  const [autorizacoes, setAutorizacoes] = useState<AutorizacaoV2[]>(carregarAutorizacoesIniciais());
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);

  useEffect(() => {
    const handleStorage = () => {
      setAutorizacoes(carregarAutorizacoesIniciais());
    };
    window.addEventListener('storage', handleStorage);
    // Recarregar sempre que montar ou focar a aba
    setAutorizacoes(carregarAutorizacoesIniciais());
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Estados de Filtros Individuais
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('TODOS');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('TODOS');
  const [filtroTempo, setFiltroTempo] = useState<string>('TODOS');
  const [filtroAlerta, setFiltroAlerta] = useState<string>('TODOS');
  const [apenasMinhas, ApenasMinhas] = useState<boolean>(false);
  const [pesquisa, setPesquisa] = useState<string>('');
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');

  // Filtros programáveis por coluna
  const [filtrosColunas, setFiltrosColunas] = useState({
    paciente: '',
    procedimento: '',
    prestador: '',
    solicitacao: '',
    quantidade: '',
    status: '',
    responsavel: '',
  });

  const temFiltroColunaAtivo = Object.values(filtrosColunas).some(v => Boolean(v && v.trim())) || Boolean(filtroDataInicio) || Boolean(filtroDataFim);

  const limparFiltrosColunas = () => {
    setFiltrosColunas({
      paciente: '',
      procedimento: '',
      prestador: '',
      solicitacao: '',
      quantidade: '',
      status: '',
      responsavel: '',
    });
    setFiltroDataInicio('');
    setFiltroDataFim('');
  };

  // Modais
  const [isNovoModalAberto, setIsNovoModalAberto] = useState(false);
  const [autorizacaoDetalhe, setAutorizacaoDetalhe] = useState<AutorizacaoV2 | null>(null);
  const [autorizacaoParaResultado, setAutorizacaoParaResultado] = useState<AutorizacaoV2 | null>(null);
  
  // Form Resultado
  const [novoStatusRes, setNovoStatusRes] = useState<StatusAutorizacao>('CONCLUIDO');
  const [numAutorizacaoRes, setNumAutorizacaoRes] = useState('');
  const [dataAutRes, setDataAutRes] = useState(new Date().toISOString().split('T')[0]);
  const [senhaRes, setSenhaRes] = useState('');
  const [dataValidadeSenhaRes, setDataValidadeSenhaRes] = useState('');
  const [justificativaRes, setJustificativaRes] = useState('');
  const [erroRes, setErroRes] = useState('');

  const handleAbrirResultado = (aut: AutorizacaoV2) => {
    setAutorizacaoParaResultado(aut);
    setNumAutorizacaoRes(aut.numeroAutorizacao || '');
    setDataAutRes(aut.dataAutorizacao || new Date().toISOString().split('T')[0]);
    setSenhaRes(aut.senha || '');
    setDataValidadeSenhaRes(aut.dataValidadeSenha || '');
    setNovoStatusRes('CONCLUIDO');
    setJustificativaRes('');
    setErroRes('');
  };

  // Form Novo Registro — Deduplicação profunda e unificação de todas as fontes de pacientes por Nome
  const listaPacientes = useMemo(() => {
    const salvos = PacientesService.obterPacientes();
    const map = new Map<string, any>();
    const idsVistos = new Set<string>();

    const normalizarChaveNome = (nome: string) => {
      return (nome || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const adicionarPacienteUnico = (p: any, fallbackIdPrefix: string) => {
      if (!p || !p.nome || typeof p.nome !== 'string' || !p.nome.trim()) return;
      const cart = (p.carteirinhaAtual || p.carteirinha || '').trim();
      const key = normalizarChaveNome(p.nome);

      let existente = map.get(key);

      if (existente) {
        if (p.procedimentoPrincipal && !existente.procedimentos.includes(p.procedimentoPrincipal)) {
          existente.procedimentos.push(p.procedimentoPrincipal);
        }
        if (p.procedimento && !existente.procedimentos.includes(p.procedimento)) {
          existente.procedimentos.push(p.procedimento);
        }
        if (Array.isArray(p.procedimentos)) {
          p.procedimentos.forEach((proc: string) => {
            if (proc && !existente.procedimentos.includes(proc)) {
              existente.procedimentos.push(proc);
            }
          });
        }
        if (!existente.carteirinha && cart) {
          existente.carteirinha = cart;
          existente.carteirinhaAtual = cart;
        }
        if (!existente.prestadorNome && p.prestadorNome) {
          existente.prestadorNome = p.prestadorNome;
        }
        if (!existente.convenioPrincipalNome && (p.convenioPrincipalNome || p.convenioNome)) {
          existente.convenioPrincipalNome = p.convenioPrincipalNome || p.convenioNome;
          existente.convenioNome = p.convenioPrincipalNome || p.convenioNome;
        }
        return;
      }

      let pacId = p.id;
      if (!pacId || idsVistos.has(pacId)) {
        pacId = `${fallbackIdPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }
      idsVistos.add(pacId);

      const procs = new Set<string>();
      if (p.procedimentoPrincipal) procs.add(p.procedimentoPrincipal);
      if (p.procedimento) procs.add(p.procedimento);
      if (Array.isArray(p.procedimentos)) {
        p.procedimentos.forEach((proc: string) => {
          if (proc) procs.add(proc);
        });
      }

      map.set(key, {
        id: pacId,
        nome: p.nome.trim(),
        carteirinha: cart,
        carteirinhaAtual: cart,
        convenioNome: p.convenioPrincipalNome || p.convenioNome || '',
        convenioPrincipalNome: p.convenioPrincipalNome || p.convenioNome || '',
        procedimentoPrincipal: p.procedimentoPrincipal || p.procedimento || '',
        procedimentos: Array.from(procs),
        prestadorNome: p.prestadorNome || p.prestador || '',
        codigoProntuario: p.codigoProntuario || '',
        cpf: p.cpf || '',
        doutoresAtendentesNomes: p.doutoresAtendentesNomes || [],
        sessoesPorSemana: p.sessoesPorSemana || 3,
      });
    };

    // 1. Pacientes cadastrados no PacientesService
    salvos.forEach((p) => adicionarPacienteUnico(p, 'pac-cad'));

    // 2. Pacientes do histórico de autorizações (caso importados de planilhas)
    autorizacoes.forEach((a) => {
      if (a && a.pacienteNome) {
        adicionarPacienteUnico(
          {
            id: a.pacienteId,
            nome: a.pacienteNome,
            carteirinha: a.carteirinha,
            convenioNome: a.operadora,
            convenioPrincipalNome: a.operadora,
            procedimentoPrincipal: a.procedimento,
            prestadorNome: a.prestador,
          },
          'pac-aut'
        );
      }
    });

    // 3. Mocks de pacientes
    MOCK_PACIENTES.forEach((p) => adicionarPacienteUnico(p, 'pac-mock'));

    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [autorizacoes, isNovoModalAberto]);

  const [novoPacienteId, setNovoPacienteId] = useState('');
  const [novoPacienteNomePersonalizado, setNovoPacienteNomePersonalizado] = useState('');
  const [termoBuscaPaciente, setTermoBuscaPaciente] = useState('');
  const [pacienteDropdownAberto, setPacienteDropdownAberto] = useState(false);
  const [novoOperadora, setNovoOperadora] = useState(MOCK_CONVENIOS[0]?.nome || 'SulAmérica Saúde');
  const [novoProcedimento, setNovoProcedimento] = useState('Psicologia ABA');
  const [pesquisaProcedimento, setPesquisaProcedimento] = useState('Psicologia ABA');
  const [procedimentoDropdownAberto, setProcedimentoDropdownAberto] = useState(false);
  const [mostrarTodosProcedimentos, setMostrarTodosProcedimentos] = useState(false);
  const [novoPrestador, setNovoPrestador] = useState(MOCK_PRESTADORES[0]?.nome || 'Dra. Ana Beatriz');
  const [pesquisaPrestador, setPesquisaPrestador] = useState(MOCK_PRESTADORES[0]?.nome || 'Dra. Ana Beatriz');
  const [prestadorDropdownAberto, setPrestadorDropdownAberto] = useState(false);
  const [novoSessoesPorSemana, setNovoSessoesPorSemana] = useState(3);
  const [novoStatusCriacao, setNovoStatusCriacao] = useState<StatusAutorizacao>('EM_ANALISE');
  const [novaDataEmAnaliseDesde, setNovaDataEmAnaliseDesde] = useState(() => new Date().toISOString().split('T')[0]);
  const [novoNumeroGuiaCriacao, setNovoNumeroGuiaCriacao] = useState('');
  const [novaDataAutorizacaoCriacao, setNovaDataAutorizacaoCriacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [novaSenhaCriacao, setNovaSenhaCriacao] = useState('');
  const [novaValidadeSenhaCriacao, setNovaValidadeSenhaCriacao] = useState('');
  const [novoMotivoRecusaCriacao, setNovoMotivoRecusaCriacao] = useState('');
  const [novaObservacoes, setNovaObservacoes] = useState('');

  // Paciente atualmente selecionado no modal
  const pacienteSelecionadoObj = useMemo(() => {
    return listaPacientes.find(p => p.id === novoPacienteId) || null;
  }, [listaPacientes, novoPacienteId]);

  // Busca e consolidação universal de dados por NOME DO PACIENTE em todas as fontes
  const obterDadosConsolidadosDoPaciente = (nomePac: string, idPac?: string) => {
    if (!nomePac && !idPac) return { procedimentos: [], operadora: '', prestador: '', sessoesPorSemana: 3 };

    const procsSet = new Set<string>();
    let operadoraEncontrada = '';
    let prestadorEncontrado = '';
    let sessoesEncontradas = 3;

    const nomesCoincidem = (n1: string, n2: string) => {
      if (!n1 || !n2) return false;
      const s1 = n1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const s2 = n2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return s1 === s2 || s1.includes(s2) || s2.includes(s1);
    };

    // 1. Procurar no PacientesService
    const cadastrados = PacientesService.obterPacientes();
    cadastrados.forEach((p) => {
      if ((idPac && p.id === idPac) || nomesCoincidem(p.nome, nomePac)) {
        if (p.procedimentoPrincipal) procsSet.add(p.procedimentoPrincipal.trim());
        if (Array.isArray(p.procedimentos)) {
          p.procedimentos.forEach((proc: string) => {
            if (proc && typeof proc === 'string') procsSet.add(proc.trim());
          });
        }
        if (!operadoraEncontrada) operadoraEncontrada = p.convenioPrincipalNome || p.convenioNome || '';
        if (!prestadorEncontrado) prestadorEncontrado = p.prestadorNome || '';
        const sQtd = p.sessoesPorSemana || p.quantidadeSemana || (Array.isArray(p.diasDaSemana) && p.diasDaSemana.length > 0 ? p.diasDaSemana.length : undefined);
        if (sQtd) sessoesEncontradas = sQtd;
      }
    });

    // 2. Procurar em MOCK_PACIENTES
    MOCK_PACIENTES.forEach((p) => {
      if ((idPac && p.id === idPac) || nomesCoincidem(p.nome, nomePac)) {
        if (p.procedimentoPrincipal) procsSet.add(p.procedimentoPrincipal.trim());
        if (Array.isArray(p.procedimentos)) {
          p.procedimentos.forEach((proc: string) => {
            if (proc && typeof proc === 'string') procsSet.add(proc.trim());
          });
        }
        if (!operadoraEncontrada) operadoraEncontrada = p.convenioPrincipalNome || p.convenioNome || '';
        if (!prestadorEncontrado) prestadorEncontrado = p.prestadorNome || '';
        const sQtd = p.sessoesPorSemana || p.quantidadeSemana || (Array.isArray(p.diasDaSemana) && p.diasDaSemana.length > 0 ? p.diasDaSemana.length : undefined);
        if (sQtd) sessoesEncontradas = sQtd;
      }
    });

    // 3. Procurar em autorizacoes
    autorizacoes.forEach((a) => {
      if ((idPac && a.pacienteId === idPac) || nomesCoincidem(a.pacienteNome, nomePac)) {
        if (a.procedimento) procsSet.add(a.procedimento.trim());
        if (!operadoraEncontrada && a.operadora) operadoraEncontrada = a.operadora;
        if (!prestadorEncontrado && a.prestador) prestadorEncontrado = a.prestador;
        if (!sessoesEncontradas && a.sessoesPorSemana) sessoesEncontradas = a.sessoesPorSemana;
      }
    });

    return {
      procedimentos: Array.from(procsSet),
      operadora: operadoraEncontrada,
      prestador: prestadorEncontrado,
      sessoesPorSemana: sessoesEncontradas,
    };
  };

  // Lista de procedimentos do paciente selecionado (unificada por nome)
  const procedimentosDoPacienteSelecionado = useMemo(() => {
    if (!pacienteSelecionadoObj) return [];
    const dados = obterDadosConsolidadosDoPaciente(pacienteSelecionadoObj.nome, pacienteSelecionadoObj.id);
    return dados.procedimentos;
  }, [pacienteSelecionadoObj, autorizacoes, isNovoModalAberto]);

  // Auto-preenchimento de operadora, prestador e sessões por semana cadastrados para o paciente e procedimento
  const autoPreencherDadosDoPacienteEProcedimento = (pac: any, procNome: string) => {
    if (!pac) return;
    const dados = obterDadosConsolidadosDoPaciente(pac.nome, pac.id);

    const autAnteriorProc = autorizacoes.find((a) => {
      const mesmoPac = a.pacienteId === pac.id || (a.pacienteNome && a.pacienteNome.toLowerCase().includes(pac.nome.toLowerCase()));
      const mesmoProc = !procNome || a.procedimento.toLowerCase().includes(procNome.toLowerCase());
      return mesmoPac && mesmoProc;
    });

    const convNome = autAnteriorProc?.operadora || dados.operadora || pac.convenioPrincipalNome || pac.convenioNome;
    if (convNome) {
      const convMatch = MOCK_CONVENIOS.find((c) =>
        c.nome.toLowerCase().includes(convNome.toLowerCase()) ||
        convNome.toLowerCase().includes(c.nome.toLowerCase())
      );
      setNovoOperadora(convMatch ? convMatch.nome : convNome);
    }

    const prestadorNome = autAnteriorProc?.prestador || dados.prestador || pac.prestadorNome;
    if (prestadorNome) {
      setNovoPrestador(prestadorNome);
      setPesquisaPrestador(prestadorNome);
    }

    // Prioridade máxima para a frequência cadastrada no perfil do paciente
    const sessoes =
      (pac.sessoesPorSemana && pac.sessoesPorSemana > 0 ? pac.sessoesPorSemana : undefined) ||
      (pac.quantidadeSemana && pac.quantidadeSemana > 0 ? pac.quantidadeSemana : undefined) ||
      (Array.isArray(pac.diasDaSemana) && pac.diasDaSemana.length > 0 ? pac.diasDaSemana.length : undefined) ||
      (dados.sessoesPorSemana && dados.sessoesPorSemana > 0 ? dados.sessoesPorSemana : undefined) ||
      (autAnteriorProc?.sessoesPorSemana && autAnteriorProc.sessoesPorSemana > 0 ? autAnteriorProc.sessoesPorSemana : undefined) ||
      1;

    setNovoSessoesPorSemana(sessoes);
  };

  // Semanas calculadas até o fim do mês com base no mês corrente
  const semanasAteFimDoMes = useMemo(() => {
    try {
      const dataBase = new Date();
      const ano = dataBase.getFullYear();
      const mes = dataBase.getMonth();
      const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
      const diaReferencia = Math.min(dataBase.getDate(), ultimoDiaMes);
      const diasRestantes = Math.max(1, ultimoDiaMes - diaReferencia + 1);
      const semanas = Math.max(1, Math.ceil(diasRestantes / 7));
      return semanas || 4;
    } catch {
      return 4;
    }
  }, []);

  // Quantidade total de sessões multiplicada automaticamente pela quantidade de semanas até o fim do mês
  const novoQuantidade = useMemo(() => {
    return Math.max(1, (novoSessoesPorSemana || 1) * (semanasAteFimDoMes || 4));
  }, [novoSessoesPorSemana, semanasAteFimDoMes]);

  // Lista de Procedimentos registrados (excluindo Avaliações e Reavaliações)
  const listaProcedimentos = useMemo(() => {
    const permitidos = ProcedimentosService.obterPermitidosParaAutorizacao();
    return permitidos.filter((proc) => {
      if (proc.categoria === 'AVALIACAO_ABA' || proc.categoria === 'REAVALIACAO_ABA') return false;
      const descNorm = (proc.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (descNorm.includes('avaliacao') || descNorm.includes('reavaliacao')) return false;
      return true;
    });
  }, [isNovoModalAberto]);

  useEffect(() => {
    if (isNovoModalAberto) {
      setNovaDataEmAnaliseDesde(new Date().toISOString().split('T')[0]);
    }
  }, [isNovoModalAberto]);

  // Filtro de procedimentos restrito exclusivamente aos procedimentos que o paciente selecionado passa
  const listaProcedimentosFiltrados = useMemo(() => {
    let baseList = listaProcedimentos;

    // Se o paciente possui procedimentos vinculados e o usuário não clicou para exibir todos
    if (
      pacienteSelecionadoObj &&
      procedimentosDoPacienteSelecionado.length > 0 &&
      !mostrarTodosProcedimentos
    ) {
      const filtradosDoPaciente = listaProcedimentos.filter((p) => {
        return procedimentosDoPacienteSelecionado.some((pNome) => {
          const pNorm = pNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const descNorm = (p.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return descNorm.includes(pNorm) || pNorm.includes(descNorm);
        });
      });

      // Adiciona sinteticamente procedimentos específicos que o paciente possua e que não estejam no catálogo TUSS padrão
      procedimentosDoPacienteSelecionado.forEach((pNome, idx) => {
        const pNorm = pNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const jaExiste = filtradosDoPaciente.some((p) => {
          const descNorm = (p.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return descNorm.includes(pNorm) || pNorm.includes(descNorm);
        });

        if (!jaExiste) {
          filtradosDoPaciente.push({
            id: `proc-pac-${idx}`,
            codigo: `PROC-${100 + idx}`,
            descricao: pNome,
            categoria: 'ABA_REGULAR',
            especialidade: 'Sessão Terapêutica Regular',
            preco: 91.4,
            permiteAutorizacao: true,
            sessoesPorSemanaPadrao: 3,
            duracaoHoras: 1,
            permiteDigitacao: true,
          });
        }
      });

      baseList = filtradosDoPaciente;
    }

    const query = pesquisaProcedimento
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const activeProcNorm = novoProcedimento
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Se a pesquisa estiver vazia ou for idêntica ao procedimento ativo selecionado, não filtra para que todos os procedimentos do paciente continuem visíveis no dropdown
    if (!query || query === activeProcNorm) {
      return baseList;
    }

    return baseList.filter((p) => {
      const descNorm = (p.descricao || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const codNorm = (p.codigo || '').toLowerCase();
      const cidNorm = (p.cid || '').toLowerCase();
      const espNorm = (p.especialidade || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      return descNorm.includes(query) || codNorm.includes(query) || cidNorm.includes(query) || espNorm.includes(query);
    });
  }, [
    listaProcedimentos,
    pesquisaProcedimento,
    novoProcedimento,
    pacienteSelecionadoObj,
    procedimentosDoPacienteSelecionado,
    mostrarTodosProcedimentos,
  ]);

  const procedimentoSelecionadoObj = useMemo(() => {
    return (
      listaProcedimentos.find(
        (p) =>
          p.descricao.toLowerCase() === novoProcedimento.toLowerCase() ||
          p.codigo === novoProcedimento
      ) || null
    );
  }, [listaProcedimentos, novoProcedimento]);

  const handleSelecionarProcedimento = (proc: ProcedimentoCompleto) => {
    setNovoProcedimento(proc.descricao);
    setPesquisaProcedimento(proc.descricao);
    setProcedimentoDropdownAberto(false);

    if (pacienteSelecionadoObj) {
      autoPreencherDadosDoPacienteEProcedimento(pacienteSelecionadoObj, proc.descricao);
    } else if (proc.sessoesPorSemanaPadrao) {
      setNovoSessoesPorSemana(proc.sessoesPorSemanaPadrao);
    }
  };

  // Lista de Prestadores e Filtragem Inteligente
  const listaPrestadoresFiltrados = useMemo(() => {
    if (!pesquisaPrestador.trim()) return MOCK_PRESTADORES;
    return MOCK_PRESTADORES.filter((p) => {
      const textoCompleto = [
        p.nome,
        p.cpf,
        p.titulo,
        p.cbo,
        p.crmOuCrp,
        p.orgaoClasse,
        `${p.orgaoClasse} ${p.crmOuCrp}`,
        p.uf,
        p.especialidade,
        p.pastaAtribuida,
        ...(p.procedimentos || []),
      ]
        .filter(Boolean)
        .join(' ');

      return matchTextFilter(textoCompleto, pesquisaPrestador);
    });
  }, [pesquisaPrestador]);

  const prestadorSelecionadoObj = useMemo(() => {
    return (
      MOCK_PRESTADORES.find(
        (p) =>
          p.nome.toLowerCase() === novoPrestador.toLowerCase() ||
          p.id === novoPrestador
      ) || null
    );
  }, [novoPrestador]);

  const handleSelecionarPrestador = (pres: Prestador) => {
    setNovoPrestador(pres.nome);
    setPesquisaPrestador(pres.nome);
    setPrestadorDropdownAberto(false);
  };

  // Ao abrir o modal, se não houver paciente selecionado, seleciona o primeiro e preenche automaticamente
  useEffect(() => {
    if (isNovoModalAberto && listaPacientes.length > 0) {
      let pacAtual = pacienteSelecionadoObj;
      if (!novoPacienteId || !listaPacientes.some(p => p.id === novoPacienteId)) {
        pacAtual = listaPacientes[0];
        setNovoPacienteId(pacAtual.id);
        setNovoPacienteNomePersonalizado('');
      }

      if (pacAtual) {
        const procsDoPaciente = Array.from(new Set([
          pacAtual.procedimentoPrincipal,
          ...(Array.isArray(pacAtual.procedimentos) ? pacAtual.procedimentos : []),
          ...autorizacoes
            .filter((a) => a.pacienteId === pacAtual.id || (a.pacienteNome && a.pacienteNome.toLowerCase() === pacAtual.nome.toLowerCase()))
            .map((a) => a.procedimento)
        ].filter(Boolean)));

        const procInicial = procsDoPaciente[0] || pacAtual.procedimentoPrincipal || 'Psicologia ABA';
        setNovoProcedimento(procInicial);
        setPesquisaProcedimento(procInicial);

        autoPreencherDadosDoPacienteEProcedimento(pacAtual, procInicial);
      }
      setTermoBuscaPaciente('');
      setMostrarTodosProcedimentos(false);
    }
  }, [isNovoModalAberto]);

  // Filtro instantâneo, inteligente e estrito por Paciente (Nome, Carteirinha, Prontuário, CPF)
  const listaPacientesFiltrados = useMemo(() => {
    if (!termoBuscaPaciente.trim()) return listaPacientes;

    const rawQuery = termoBuscaPaciente.trim();
    const queryNorm = rawQuery
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const tokens = queryNorm.split(/\s+/).filter(Boolean);
    const queryDigitos = rawQuery.replace(/\D/g, '');

    const avaliados = listaPacientes.map((p) => {
      const nomeNorm = (p.nome || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cartLimpa = (p.carteirinhaAtual || p.carteirinha || '').replace(/\D/g, '');
      const cartRaw = (p.carteirinhaAtual || p.carteirinha || '').toLowerCase();
      const prontNorm = (p.codigoProntuario || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cpfLimpo = (p.cpf || '').replace(/\D/g, '');

      // 1. Busca por Nome: TODOS os tokens digitados devem estar presentes no nome do paciente
      const matchNome = tokens.length > 0 && tokens.every((token) => nomeNorm.includes(token));

      // 2. Busca por Carteirinha ou Prontuário ou CPF (apenas se digitados caracteres correspondentes)
      const matchCart = cartRaw.includes(queryNorm) || (queryDigitos.length >= 3 && cartLimpa.includes(queryDigitos));
      const matchPront = prontNorm.includes(queryNorm);
      const matchCpf = queryDigitos.length >= 3 && cpfLimpo.includes(queryDigitos);

      // Cálculo de relevância para ordenar os mais prováveis no topo
      let pontuacao = 0;
      if (nomeNorm.startsWith(queryNorm)) {
        pontuacao = 100;
      } else if (nomeNorm.includes(` ${queryNorm}`)) {
        pontuacao = 80;
      } else if (matchNome) {
        pontuacao = 60;
      } else if (matchPront) {
        pontuacao = 40;
      } else if (matchCart) {
        pontuacao = 30;
      } else if (matchCpf) {
        pontuacao = 20;
      }

      return {
        paciente: p,
        valido: matchNome || matchCart || matchPront || matchCpf,
        pontuacao,
      };
    });

    return avaliados
      .filter((item) => item.valido)
      .sort((a, b) => b.pontuacao - a.pontuacao || a.paciente.nome.localeCompare(b.paciente.nome, 'pt-BR'))
      .map((item) => item.paciente);
  }, [listaPacientes, termoBuscaPaciente]);

  // Função para destacar os termos encontrados no nome do paciente
  const destacarTermosBusca = (texto: string, busca: string) => {
    if (!busca || !busca.trim() || !texto) return texto;
    const tokens = busca
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) return texto;

    try {
      const regexPattern = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`(${regexPattern})`, 'gi');
      const partes = texto.split(regex);

      return (
        <span>
          {partes.map((parte, i) => {
            const parteNorm = parte
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');
            const isMatch = tokens.some((t) => parteNorm === t);

            return isMatch ? (
              <mark
                key={i}
                className="bg-yellow-300 dark:bg-amber-400 text-slate-950 font-black px-0.5 rounded-xs"
              >
                {parte}
              </mark>
            ) : (
              <span key={i}>{parte}</span>
            );
          })}
        </span>
      );
    } catch {
      return texto;
    }
  };

  const handleSelecionarPaciente = (pac: any) => {
    setNovoPacienteId(pac.id);
    setNovoPacienteNomePersonalizado('');
    setTermoBuscaPaciente('');
    setPacienteDropdownAberto(false);
    setMostrarTodosProcedimentos(false);

    // Identifica procedimentos cadastrados/histórico do paciente
    const procsDoPaciente = Array.from(new Set([
      pac.procedimentoPrincipal,
      ...(Array.isArray(pac.procedimentos) ? pac.procedimentos : []),
      ...autorizacoes
        .filter((a) => a.pacienteId === pac.id || (a.pacienteNome && a.pacienteNome.toLowerCase() === pac.nome.toLowerCase()))
        .map((a) => a.procedimento)
    ].filter(Boolean)));

    const procInicial = procsDoPaciente[0] || pac.procedimentoPrincipal || 'Psicologia ABA';
    setNovoProcedimento(procInicial);
    setPesquisaProcedimento(procInicial);

    autoPreencherDadosDoPacienteEProcedimento(pac, procInicial);
  };

  const hasObservacaoValida = (obs?: string) => {
    if (!obs) return false;
    const trimmed = obs.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    if (lower === 'nenhuma observação registrada.' || lower === 'nenhuma observação registrada' || lower === 'sem observações' || lower === 'sem observacoes') return false;
    return true;
  };

  // Filtragem combinada e individual
  const autorizacoesFiltradas = useMemo(() => {
    return autorizacoes.filter((aut) => {
      // Filtro Status
      if (filtroStatus !== 'TODOS' && aut.status !== filtroStatus) return false;

      // Filtro Responsável
      if (filtroResponsavel !== 'TODOS' && aut.responsavel !== filtroResponsavel) return false;

      // Filtro Apenas Minhas
      if (apenasMinhas && aut.responsavel !== usuarioAtual.nome) return false;

      // Filtro Tempo em Análise
      if (filtroTempo === 'MENOS_7' && (aut.status !== 'EM_ANALISE' || aut.diasEmAnalise >= 7)) return false;
      if (filtroTempo === 'MAIOR_OU_IGUAL_7' && (aut.status !== 'EM_ANALISE' || aut.diasEmAnalise < 7)) return false;

      // Filtro Alertas (> 7 dias)
      if (filtroAlerta === 'COM_ALERTA' && !(aut.status === 'EM_ANALISE' && aut.diasEmAnalise > 7)) return false;
      if (filtroAlerta === 'SEM_ALERTA' && aut.status === 'EM_ANALISE' && aut.diasEmAnalise > 7) return false;

      // Filtro Data Início / Fim (Período)
      if (filtroDataInicio && aut.dataSolicitacao < filtroDataInicio) return false;
      if (filtroDataFim && aut.dataSolicitacao > filtroDataFim) return false;

      // Pesquisa Global Rápida
      if (pesquisa.trim()) {
        const termo = pesquisa.trim();
        const matchPaciente = matchTextFilter(aut.pacienteNome, termo);
        const matchCart = matchTextFilter(aut.carteirinha, termo);
        const matchProc = matchTextFilter(aut.procedimento, termo);
        const matchOp = matchTextFilter(aut.operadora, termo);
        const matchPrest = matchTextFilter(aut.prestador, termo);
        const matchNum = matchTextFilter(aut.numeroAutorizacao, termo);
        const matchResp = matchTextFilter(aut.responsavel, termo);
        const matchData = matchDateFilter(aut.dataSolicitacao, termo) || matchDateFilter(aut.dataAutorizacao, termo);

        if (!matchPaciente && !matchCart && !matchProc && !matchOp && !matchPrest && !matchNum && !matchResp && !matchData) {
          return false;
        }
      }

      // Filtros por Colunas Individuais
      if (filtrosColunas.paciente) {
        const matchPac = matchTextFilter(aut.pacienteNome, filtrosColunas.paciente);
        const matchCart = matchTextFilter(aut.carteirinha, filtrosColunas.paciente);
        if (!matchPac && !matchCart) return false;
      }

      if (filtrosColunas.procedimento) {
        const matchProc = matchTextFilter(aut.procedimento, filtrosColunas.procedimento);
        const matchOp = matchTextFilter(aut.operadora, filtrosColunas.procedimento);
        if (!matchProc && !matchOp) return false;
      }

      if (filtrosColunas.prestador && !matchTextFilter(aut.prestador, filtrosColunas.prestador)) {
        return false;
      }

      if (filtrosColunas.solicitacao && !matchDateFilter(aut.dataSolicitacao, filtrosColunas.solicitacao)) {
        return false;
      }

      if (filtrosColunas.quantidade && String(aut.quantidadeSolicitada) !== filtrosColunas.quantidade.trim()) {
        return false;
      }

      if (filtrosColunas.status && aut.status !== filtrosColunas.status) {
        return false;
      }

      if (filtrosColunas.responsavel && !matchTextFilter(aut.responsavel, filtrosColunas.responsavel)) {
        return false;
      }

      return true;
    });
  }, [autorizacoes, filtroStatus, filtroResponsavel, apenasMinhas, filtroTempo, filtroAlerta, pesquisa, filtroDataInicio, filtroDataFim, filtrosColunas, usuarioAtual.nome]);

  // Indicadores para o Dashboard/Resumo
  const hojeStr = new Date().toISOString().split('T')[0];
  const totalConcluido = autorizacoes.filter(a => {
    if (a.status !== 'CONCLUIDO') return false;
    // Compara com a data da Próxima Autorização (proximaAutorizacao)
    return a.proximaAutorizacao === hojeStr || !a.proximaAutorizacao;
  }).length;
  const totalRecusado = autorizacoes.filter(a => a.status === 'RECUSADO').length;
  const totalEmAnalise = autorizacoes.filter(a => a.status === 'EM_ANALISE').length;
  const totalAtrasado = autorizacoes.filter(a => a.status === 'EM_ANALISE' && a.diasEmAnalise > 7).length;

  // Criar nova autorização
  const handleCriarAutorizacao = (e: React.FormEvent) => {
    e.preventDefault();
    const pacienteObj = listaPacientes.find(p => p.id === novoPacienteId);
    const pacNome = pacienteObj ? pacienteObj.nome : (novoPacienteNomePersonalizado || termoBuscaPaciente.trim() || 'Paciente Principal');
    const cart = pacienteObj ? (pacienteObj.carteirinhaAtual || pacienteObj.carteirinha || '00000000') : '00000000';
    const pacId = pacienteObj ? pacienteObj.id : (novoPacienteId || `pac-avulso-${Date.now()}`);

    const prestadorObj = MOCK_PRESTADORES.find(
      (p) => p.nome.toLowerCase() === novoPrestador.toLowerCase() || p.id === novoPrestador
    );

    const crmFormatado = prestadorObj
      ? `${prestadorObj.orgaoClasse} ${prestadorObj.crmOuCrp}`
      : '';

    const isConcluido = novoStatusCriacao === 'CONCLUIDO';
    const isRecusado = novoStatusCriacao === 'RECUSADO';

    // Data de início da análise / solicitação ou autorização
    const dataSol = (novoStatusCriacao === 'EM_ANALISE' && novaDataEmAnaliseDesde)
      ? novaDataEmAnaliseDesde
      : new Date().toISOString().split('T')[0];

    const dataAutEfetiva = isConcluido
      ? (novaDataAutorizacaoCriacao || new Date().toISOString().split('T')[0])
      : undefined;

    const diaIndice = pacienteObj?.diasSemanaHabituais && pacienteObj.diasSemanaHabituais.length > 0
      ? pacienteObj.diasSemanaHabituais
      : parseDiaSemanaNomeParaIndice(pacienteObj?.diaDaSemana);

    const proximaAutCalculada = calcularAlinhamentoProximaAutorizacao({
      diaSemanaHabitual: diaIndice,
      dataInicioCicloStr: isConcluido && dataAutEfetiva ? dataAutEfetiva : dataSol,
      sessoesPorSemana: novoSessoesPorSemana || 3,
    }).dataProximaAutorizacaoCalculada;

    // Se criada já como Concluída (Autorizada), atualiza a última data de autorização no perfil do paciente sem sobrescrever os outros procedimentos
    if (isConcluido && pacienteObj) {
      const normProcNew = (novoProcedimento || pacienteObj.procedimentoPrincipal || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
      const todosPacientes = PacientesService.obterPacientes();
      const pacientesAtualizados = todosPacientes.map((p) => {
        const mesmoPac = p.id === pacienteObj.id || p.nome.toLowerCase().trim() === pacienteObj.nome.toLowerCase().trim();
        const normProcP = (p.procedimentoPrincipal || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
        const mesmoProc = !normProcP || !normProcNew || normProcP.includes(normProcNew) || normProcNew.includes(normProcP);
        if (mesmoPac && mesmoProc) {
          return {
            ...p,
            proximaAutorizacaoData: proximaAutCalculada,
            ultimaAutorizacaoData: dataAutEfetiva || new Date().toISOString().split('T')[0],
            dataUltimaAtualizacao: new Date().toISOString(),
            atualizadoPor: usuarioAtual.nome,
          };
        }
        return p;
      });
      PacientesService.persistirPacientes(pacientesAtualizados);
    }

    const diasCalculados = novoStatusCriacao === 'EM_ANALISE'
      ? calcularDiasCorridos(dataSol)
      : 0;

    const numGuiaFormatado = novoNumeroGuiaCriacao.trim()
      ? novoNumeroGuiaCriacao.trim()
      : `AUT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const novaAut: AutorizacaoV2 = {
      id: `aut-v2-${Date.now()}`,
      numeroAutorizacao: numGuiaFormatado,
      pacienteId: pacId,
      pacienteNome: pacNome,
      carteirinha: cart,
      operadora: novoOperadora,
      procedimento: novoProcedimento,
      prestador: prestadorObj?.nome || novoPrestador,
      cbo: sanitizarCbo(prestadorObj?.cbo) || '251510',
      crm: crmFormatado,
      uf: prestadorObj?.uf || 'SP',
      dataSolicitacao: dataSol,
      dataAutorizacao: dataAutEfetiva,
      senha: isConcluido ? (novaSenhaCriacao.trim() || `AUT-${Math.floor(100000 + Math.random() * 900000)}`) : undefined,
      dataValidadeSenha: isConcluido ? (novaValidadeSenhaCriacao || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) : undefined,
      quantidadeSolicitada: novoQuantidade,
      sessoesPorSemana: novoSessoesPorSemana,
      competencia: new Date().toISOString().slice(0, 7),
      proximaAutorizacao: proximaAutCalculada,
      status: novoStatusCriacao,
      responsavel: usuarioAtual.nome,
      ultimaAtualizacao: new Date().toISOString(),
      diasEmAnalise: diasCalculados,
      historico: [
        {
          id: `hist-${Date.now()}`,
          statusAnterior: novoStatusCriacao,
          novoStatus: novoStatusCriacao,
          usuarioNome: usuarioAtual.nome,
          dataHora: new Date().toLocaleString('pt-BR'),
          justificativa: isRecusado
            ? (novoMotivoRecusaCriacao.trim() || 'Autorização cadastrada diretamente com status Recusado.')
            : isConcluido
            ? 'Autorização cadastrada diretamente como Concluída (Autorizada).'
            : `Autorização cadastrada em análise e vinculada ao prestador ${prestadorObj?.nome || novoPrestador}${
                prestadorObj ? ` (${prestadorObj.orgaoClasse} ${prestadorObj.crmOuCrp}, CBO: ${sanitizarCbo(prestadorObj.cbo)}, UF: ${prestadorObj.uf})` : ''
              }.`,
        },
      ],
      observacoes: novaObservacoes || (isRecusado && novoMotivoRecusaCriacao ? `Motivo recusa: ${novoMotivoRecusaCriacao}` : 'Nenhuma observação registrada.'),
    };

    const atualizadas = [novaAut, ...autorizacoes];
    setAutorizacoes(atualizadas);
    salvarAutorizacoesStorage(atualizadas);

    registrarAuditoriaAutorizacao(
      'AUTHORIZATION_CREATED',
      `Nova autorização para ${pacNome} (${novoProcedimento}) criada com status ${novoStatusCriacao}.`,
      usuarioAtual.nome,
      novaAut.id
    );

    setSucessoMsg(`Autorização para ${pacNome} criada com sucesso (${novoStatusCriacao})!`);
    setIsNovoModalAberto(false);
    setNovaObservacoes('');
    setTermoBuscaPaciente('');
    setNovoPacienteNomePersonalizado('');
    setNovoStatusCriacao('EM_ANALISE');
    setNovoNumeroGuiaCriacao('');
    setNovaDataAutorizacaoCriacao(new Date().toISOString().split('T')[0]);
    setNovaSenhaCriacao('');
    setNovaValidadeSenhaCriacao('');
    setNovoMotivoRecusaCriacao('');
  };

  // Registrar Resultado
  const handleSalvarResultado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!autorizacaoParaResultado) return;

    if (novoStatusRes === 'RECUSADO' && !justificativaRes.trim()) {
      setErroRes('O motivo/justificativa da recusa é obrigatório para conformidade de auditoria.');
      return;
    }

    if (novoStatusRes === 'CONCLUIDO') {
      if (!numAutorizacaoRes.trim()) {
        setErroRes('O N° da Guia / Autorização é obrigatório para concluir.');
        return;
      }
      if (!dataAutRes.trim()) {
        setErroRes('A Data da Autorização é obrigatória para concluir.');
        return;
      }
      if (!senhaRes.trim()) {
        setErroRes('A Senha da Autorização é obrigatória para concluir.');
        return;
      }
      if (!dataValidadeSenhaRes.trim()) {
        setErroRes('A Data de Validade da Senha é obrigatória para concluir.');
        return;
      }
    }

    // Quando CONFIRMADA (CONCLUIDO), a data da próxima autorização é marcada para o mês seguinte no dia da semana em que o paciente passa
    let proximaDataAlinhada = autorizacaoParaResultado.proximaAutorizacao;
    if (novoStatusRes === 'CONCLUIDO') {
      const pacEncontrado = listaPacientes.find(
        (p) => p.id === autorizacaoParaResultado.pacienteId || p.nome.toLowerCase() === autorizacaoParaResultado.pacienteNome.toLowerCase()
      );
      const diaIndice = pacEncontrado?.diasSemanaHabituais && pacEncontrado.diasSemanaHabituais.length > 0
        ? pacEncontrado.diasSemanaHabituais
        : parseDiaSemanaNomeParaIndice(pacEncontrado?.diaDaSemana);
      const alinhamento = calcularAlinhamentoProximaAutorizacao({
        diaSemanaHabitual: diaIndice,
        dataInicioCicloStr: dataAutRes || new Date().toISOString().split('T')[0],
        sessoesPorSemana: autorizacaoParaResultado.sessoesPorSemana || 3,
      });
      proximaDataAlinhada = alinhamento.dataProximaAutorizacaoCalculada;
    }

    const statusAnterior = autorizacaoParaResultado.status;
    const historicoAtualizado: HistoricoStatusAutorizacao[] = [
      ...autorizacaoParaResultado.historico,
      {
        id: `hist-${Date.now()}`,
        statusAnterior,
        novoStatus: novoStatusRes,
        usuarioNome: usuarioAtual.nome,
        dataHora: new Date().toLocaleString('pt-BR'),
        justificativa: justificativaRes || `Status alterado de ${statusAnterior} para ${novoStatusRes}.`,
      },
    ];

    const atualizadas = autorizacoes.map((a) => {
      if (a.id === autorizacaoParaResultado.id) {
        return {
          ...a,
          status: novoStatusRes,
          numeroAutorizacao: numAutorizacaoRes.trim() || a.numeroAutorizacao,
          dataAutorizacao: novoStatusRes === 'CONCLUIDO' ? dataAutRes : a.dataAutorizacao,
          proximaAutorizacao: novoStatusRes === 'CONCLUIDO' ? proximaDataAlinhada : a.proximaAutorizacao,
          senha: novoStatusRes === 'CONCLUIDO' ? senhaRes.trim() : a.senha,
          dataValidadeSenha: novoStatusRes === 'CONCLUIDO' ? dataValidadeSenhaRes : a.dataValidadeSenha,
          responsavel: usuarioAtual.nome,
          ultimaAtualizacao: new Date().toISOString(),
          diasEmAnalise: novoStatusRes === 'EM_ANALISE' ? a.diasEmAnalise : 0,
          historico: historicoAtualizado,
          observacoes: justificativaRes ? `${a.observacoes} | ${justificativaRes}` : a.observacoes,
        };
      }
      return a;
    });

    // Sincroniza a data no perfil do paciente sem afetar a individualidade de cada autorização/procedimento
    if (novoStatusRes === 'CONCLUIDO') {
      const pacEncontrado = listaPacientes.find(
        (p) => p.id === autorizacaoParaResultado.pacienteId || p.nome.toLowerCase().trim() === autorizacaoParaResultado.pacienteNome.toLowerCase().trim()
      );
      if (pacEncontrado) {
        const normProcAut = (autorizacaoParaResultado.procedimento || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
        const todosPacientes = PacientesService.obterPacientes();
        const pacientesAtualizados = todosPacientes.map((p) => {
          const mesmoPac = p.id === pacEncontrado.id || p.nome.toLowerCase().trim() === pacEncontrado.nome.toLowerCase().trim();
          const normProcP = (p.procedimentoPrincipal || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
          const mesmoProc = !normProcP || !normProcAut || normProcP.includes(normProcAut) || normProcAut.includes(normProcP);
          if (mesmoPac && mesmoProc) {
            return {
              ...p,
              proximaAutorizacaoData: proximaDataAlinhada,
              ultimaAutorizacaoData: dataAutRes,
              dataUltimaAtualizacao: new Date().toISOString(),
              atualizadoPor: usuarioAtual.nome,
            };
          }
          return p;
        });
        PacientesService.persistirPacientes(pacientesAtualizados);
      }
    }

    setAutorizacoes(atualizadas);
    salvarAutorizacoesStorage(atualizadas);

    const acaoAudit =
      novoStatusRes === 'CONCLUIDO'
        ? 'AUTHORIZATION_COMPLETED'
        : novoStatusRes === 'RECUSADO'
        ? 'AUTHORIZATION_REFUSED'
        : 'AUTHORIZATION_STATUS_CHANGED';

    registrarAuditoriaAutorizacao(
      acaoAudit,
      `Autorização ${autorizacaoParaResultado.numeroAutorizacao} atualizada para ${novoStatusRes}.`,
      usuarioAtual.nome,
      autorizacaoParaResultado.id
    );

    setSucessoMsg(`Resultado registrado com sucesso como ${novoStatusRes}!`);
    setAutorizacaoParaResultado(null);
    setJustificativaRes('');
    setNumAutorizacaoRes('');
    setErroRes('');
  };

  const handleDeletarSelecionadas = () => {
    if (idsSelecionados.length === 0) return;
    const atualizadas = autorizacoes.filter(a => !idsSelecionados.includes(a.id));
    setAutorizacoes(atualizadas);
    salvarAutorizacoesStorage(atualizadas);
    setIdsSelecionados([]);
    setSucessoMsg(`${idsSelecionados.length} autorização(ões) deletada(s) com sucesso.`);
  };

  const handleDeletarUnica = (id: string, numero: string) => {
    const atualizadas = autorizacoes.filter(a => a.id !== id);
    setAutorizacoes(atualizadas);
    salvarAutorizacoesStorage(atualizadas);
    setSucessoMsg(`Autorização ${numero} deletada com sucesso.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Centro de Controle & Rastreamento de Autorizações
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              V2 · Operação Externa com Registro de Resultado
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe o andamento das autorizações realizadas nos portais das operadoras, controle prazos e registre conclusões ou recusas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>Calculadora de Período & Vencimento</span>
          </button>

          <button
            onClick={() => setIsNovoModalAberto(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#91CA0C]" />
            <span>+ Nova Autorização p/ Acompanhar</span>
          </button>

          {idsSelecionados.length > 0 && (
            <button
              onClick={handleDeletarSelecionadas}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs animate-in fade-in"
            >
              <X className="w-4 h-4" />
              <span>Deletar Selecionadas ({idsSelecionados.length})</span>
            </button>
          )}
        </div>
      </div>

      {sucessoMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">{sucessoMsg}</span>
          </div>
          <button onClick={() => setSucessoMsg(null)} className="font-bold text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* DASHBOARD RESUMO SUPERIOR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">🟢 Concluídas</span>
          <div className="text-2xl font-bold font-['Quicksand'] text-emerald-700 dark:text-emerald-400">{totalConcluido}</div>
          <p className="text-[10px] text-slate-500">Autorizadas com sucesso</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">🟡 Em Análise</span>
          <div className="text-2xl font-bold font-['Quicksand'] text-amber-600 dark:text-amber-400">{totalEmAnalise}</div>
          <p className="text-[10px] text-slate-500">Aguardando portal externo</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">🔴 Atrasadas (&gt; 7 dias)</span>
          <div className="text-2xl font-bold font-['Quicksand'] text-red-600 dark:text-red-400">{totalAtrasado}</div>
          <p className="text-[10px] text-slate-500">Exigem atenção da chefia</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">🔴 Recusadas</span>
          <div className="text-2xl font-bold font-['Quicksand'] text-slate-700 dark:text-slate-300">{totalRecusado}</div>
          <p className="text-[10px] text-slate-500">Com justificativa registrada</p>
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA RÁPIDA (INDIVIDUAIS POR USUÁRIO) */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por paciente, carteirinha, procedimento, prestador, nº guia..."
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-[#002172]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => ApenasMinhas(!apenasMinhas)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                apenasMinhas
                  ? 'bg-[#002172] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Minhas Autorizações</span>
            </button>
          </div>
        </div>

        {/* Filtros Combináveis Avançados */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="CONCLUIDO">🟢 Concluído</option>
              <option value="EM_ANALISE">🟡 Em Análise</option>
              <option value="RECUSADO">🔴 Recusado</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tempo em Análise</label>
            <select
              value={filtroTempo}
              onChange={(e) => setFiltroTempo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium"
            >
              <option value="TODOS">Qualquer tempo</option>
              <option value="MENOS_7">Menos de 7 dias</option>
              <option value="MAIOR_OU_IGUAL_7">7 dias ou mais</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alertas</label>
            <select
              value={filtroAlerta}
              onChange={(e) => setFiltroAlerta(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium"
            >
              <option value="TODOS">Todos</option>
              <option value="COM_ALERTA">🔴 Com Alerta (&gt; 7 dias)</option>
              <option value="SEM_ALERTA">Sem Alerta</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Responsável</label>
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium"
            >
              <option value="TODOS">Todos os Responsáveis</option>
              <option value="Ana Beatriz">Ana Beatriz</option>
              <option value="Christian Gomes">Christian Gomes</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white text-xs font-medium"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroStatus('TODOS');
                setFiltroResponsavel('TODOS');
                setFiltroTempo('TODOS');
                setFiltroAlerta('TODOS');
                ApenasMinhas(false);
                setPesquisa('');
                limparFiltrosColunas();
              }}
              className="w-full px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* TABELA OPERACIONAL DE AUTORIZAÇÕES */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <TopScrollTableWrapper>
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider">
              <tr>
                <th className="p-3 w-10 align-top">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-[#002172] focus:ring-[#002172] cursor-pointer mt-1"
                    checked={autorizacoesFiltradas.length > 0 && idsSelecionados.length === autorizacoesFiltradas.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIdsSelecionados(autorizacoesFiltradas.map(a => a.id));
                      } else {
                        setIdsSelecionados([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3">
                  <div>Paciente / Carteirinha</div>
                  <input
                    type="text"
                    placeholder="Filtrar pac/cart..."
                    value={filtrosColunas.paciente}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, paciente: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>
                <th className="p-3">
                  <div>Procedimento / Operadora</div>
                  <input
                    type="text"
                    placeholder="Filtrar proc/conv..."
                    value={filtrosColunas.procedimento}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, procedimento: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>
                <th className="p-3">
                  <div>Prestador</div>
                  <input
                    type="text"
                    placeholder="Filtrar prestador..."
                    value={filtrosColunas.prestador}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, prestador: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>
                <th className="p-3">
                  <div>Solicitação</div>
                  <input
                    type="text"
                    placeholder="Data..."
                    value={filtrosColunas.solicitacao}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, solicitacao: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[11px] font-normal normal-case bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>
                <th className="p-3">
                  <div>Qtde</div>
                  <input
                    type="text"
                    placeholder="Qtd..."
                    value={filtrosColunas.quantidade}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, quantidade: e.target.value })}
                    className="mt-1 w-full px-1 py-1 text-[11px] font-normal normal-case bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>
                <th className="p-3">
                  <div>Status & Tempo</div>
                  <select
                    value={filtrosColunas.status}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, status: e.target.value })}
                    className="mt-1 w-full px-1 py-1 text-[11px] font-normal normal-case bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  >
                    <option value="">Todos</option>
                    <option value="CONCLUIDO">Concluído</option>
                    <option value="EM_ANALISE">Em Análise</option>
                    <option value="RECUSADO">Recusado</option>
                    <option value="DIGITADA">Digitada</option>
                  </select>
                </th>
                <th className="p-3">
                  <div>Responsável</div>
                  <input
                    type="text"
                    placeholder="Filtrar resp..."
                    value={filtrosColunas.responsavel}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, responsavel: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>
                <th className="p-3 text-right">
                  <div>Ações</div>
                  <div className="mt-1 flex justify-end items-center h-6">
                    {temFiltroColunaAtivo && (
                      <button
                        onClick={limparFiltrosColunas}
                        title="Limpar filtros"
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
              {autorizacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    Nenhuma autorização encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                autorizacoesFiltradas.map((aut) => {
                  const diasCalc = aut.status === 'EM_ANALISE' ? calcularDiasCorridos(aut.dataSolicitacao) : aut.diasEmAnalise;
                  const emAtraso = aut.status === 'EM_ANALISE' && diasCalc > 7;
                  const temObs = hasObservacaoValida(aut.observacoes);

                  return (
                    <tr
                      key={aut.id}
                      title={temObs ? `📝 OBSERVAÇÃO DA AUTORIZAÇÃO:\n"${aut.observacoes?.trim()}"` : undefined}
                      className={`transition-all duration-150 group ${
                        temObs
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-l-4 border-l-amber-500 font-medium'
                          : CLASS_TABELA_LISTRADA_ROW
                      }`}
                    >
                      <td className="p-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-[#002172] focus:ring-[#002172] cursor-pointer"
                          checked={idsSelecionados.includes(aut.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setIdsSelecionados([...idsSelecionados, aut.id]);
                            } else {
                              setIdsSelecionados(idsSelecionados.filter(id => id !== aut.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{aut.pacienteNome}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Cart: {aut.carteirinha}</div>

                        {temObs && (
                          <div
                            className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-200/90 text-amber-950 dark:bg-amber-900/80 dark:text-amber-100 border border-amber-300 dark:border-amber-700 shadow-2xs group-hover:scale-[1.02] transition-transform max-w-full"
                            title={`📝 Observação da Autorização:\n"${aut.observacoes?.trim()}"`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300 shrink-0" />
                            <span className="truncate max-w-[240px]">Obs: {aut.observacoes?.trim()}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${obterBadgeColorProcedimento(aut.procedimento)}`}>
                          {aut.procedimento}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-1">{aut.operadora}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{aut.prestador}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{aut.crm}</div>
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        {formatarDataBr(aut.dataSolicitacao, showMonthInitials)}
                        <div className="text-[10px] text-slate-400">Próx: {formatarDataBr(aut.proximaAutorizacao, showMonthInitials)}</div>
                      </td>

                      <td className="p-3 font-mono font-bold text-center">
                        {aut.quantidadeSolicitada} sessões
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {aut.status === 'CONCLUIDO' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 w-fit">
                              🟢 Concluído
                            </span>
                          )}
                          {aut.status === 'RECUSADO' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 w-fit">
                              🔴 Recusado
                            </span>
                          )}
                          {aut.status === 'EM_ANALISE' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 w-fit">
                              🟡 Em Análise ({diasCalc} dias)
                            </span>
                          )}

                          {emAtraso && (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Atrasado &gt; 7 dias</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{aut.responsavel}</div>
                        <div className="text-[10px] text-slate-400">Última alt: {new Date(aut.ultimaAtualizacao).toLocaleDateString('pt-BR')}</div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirResultado(aut)}
                            title="Registrar Resultado da Operadora"
                            className="px-2.5 py-1.5 rounded-lg bg-[#002172] hover:bg-[#001752] text-white text-[11px] font-bold transition-colors shadow-xs"
                          >
                            Registrar Resultado
                          </button>

                          <button
                            onClick={() => setAutorizacaoDetalhe(aut)}
                            title="Ver Detalhes e Histórico"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletarUnica(aut.id, aut.numeroAutorizacao || 'AUT')}
                            title="Deletar Autorização"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TopScrollTableWrapper>
      </div>

      {/* MODAL: REGISTRAR RESULTADO */}
      {autorizacaoParaResultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-['Quicksand']">Registrar Resultado da Operadora</h3>
                <p className="text-xs text-blue-100">
                  {autorizacaoParaResultado.pacienteNome} · {autorizacaoParaResultado.procedimento}
                </p>
              </div>
              <button onClick={() => setAutorizacaoParaResultado(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarResultado} className="p-6 space-y-4">
              {erroRes && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erroRes}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Novo Status da Autorização Externa *
                </label>
                <select
                  value={novoStatusRes}
                  onChange={(e) => setNovoStatusRes(e.target.value as StatusAutorizacao)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                >
                  <option value="CONCLUIDO">🟢 CONCLUÍDO (Autorizado)</option>
                  <option value="EM_ANALISE">🟡 EM ANÁLISE (Aguardando)</option>
                  <option value="RECUSADO">🔴 RECUSADO (Negado pela operadora)</option>
                </select>
              </div>

              {novoStatusRes === 'CONCLUIDO' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        N° da Guia / Autorização *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: OP-9882104"
                        value={numAutorizacaoRes}
                        onChange={(e) => setNumAutorizacaoRes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white"
                        required={novoStatusRes === 'CONCLUIDO'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Data da Autorização *
                      </label>
                      <input
                        type="date"
                        value={dataAutRes}
                        onChange={(e) => setDataAutRes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white"
                        required={novoStatusRes === 'CONCLUIDO'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Senha da Autorização *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: SENHA-9988"
                        value={senhaRes}
                        onChange={(e) => setSenhaRes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white"
                        required={novoStatusRes === 'CONCLUIDO'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Data de Validade da Senha *
                      </label>
                      <input
                        type="date"
                        value={dataValidadeSenhaRes}
                        onChange={(e) => setDataValidadeSenhaRes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white"
                        required={novoStatusRes === 'CONCLUIDO'}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {novoStatusRes === 'RECUSADO' ? 'Motivo/Justificativa da Recusa *' : 'Observações / Justificativa'}
                </label>
                <textarea
                  rows={3}
                  placeholder={novoStatusRes === 'RECUSADO' ? 'Informe o motivo exato informado pela operadora...' : 'Anotações sobre a conclusão ou andamento...'}
                  value={justificativaRes}
                  onChange={(e) => setJustificativaRes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  required={novoStatusRes === 'RECUSADO'}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAutorizacaoParaResultado(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs"
                >
                  Salvar e Registrar na Auditoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES E HISTÓRICO */}
      {autorizacaoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base font-['Quicksand']">Detalhes & Histórico da Autorização</h3>
                <p className="text-xs text-blue-100 font-mono">Solicitação: {autorizacaoDetalhe.numeroAutorizacao}</p>
              </div>
              <button onClick={() => setAutorizacaoDetalhe(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Paciente</span>
                  <strong className="text-slate-900 dark:text-white">{autorizacaoDetalhe.pacienteNome}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Carteirinha</span>
                  <strong className="font-mono">{autorizacaoDetalhe.carteirinha}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Operadora</span>
                  <strong>{autorizacaoDetalhe.operadora}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Procedimento</span>
                  <strong className="text-[#002172] dark:text-blue-400">{autorizacaoDetalhe.procedimento}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Prestador</span>
                  <strong>{autorizacaoDetalhe.prestador}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantidade</span>
                  <strong className="font-mono">{autorizacaoDetalhe.quantidadeSolicitada} sessões</strong>
                </div>
              </div>

              {/* Acompanhamento */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">Acompanhamento Operacional</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Data Solicitação</span>
                    <span className="font-mono font-bold">{formatarDataBr(autorizacaoDetalhe.dataSolicitacao, showMonthInitials)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Responsável Atual</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{autorizacaoDetalhe.responsavel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tempo em Análise</span>
                    <span className="font-mono font-bold text-amber-600">{autorizacaoDetalhe.diasEmAnalise} dias corridos</span>
                  </div>
                </div>
              </div>

              {/* Histórico Imutável de Status */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#002172]" />
                  <span>Histórico Imutável & Linha do Tempo</span>
                </h4>
                <div className="space-y-2">
                  {autorizacaoDetalhe.historico.map((h, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {h.novoStatus === 'CONCLUIDO' && '🟢 Concluído'}
                          {h.novoStatus === 'RECUSADO' && '🔴 Recusado'}
                          {h.novoStatus === 'EM_ANALISE' && '🟡 Em Análise'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{h.dataHora}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        Responsável: <strong className="text-slate-800 dark:text-slate-200">{h.usuarioNome}</strong>
                      </div>
                      {h.justificativa && (
                        <div className="mt-1 text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
                          {h.justificativa}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
              <button
                onClick={() => setAutorizacaoDetalhe(null)}
                className="px-5 py-2 bg-[#002172] text-white rounded-xl font-bold text-xs hover:bg-[#001752]"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA AUTORIZAÇÃO */}
      {isNovoModalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-['Quicksand']">Criar Nova Autorização para Acompanhamento</h3>
                <p className="text-xs text-blue-100">Registre os dados para controle da solicitação externa</p>
              </div>
              <button onClick={() => setIsNovoModalAberto(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarAutorizacao} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {/* Seleção e Pesquisa Otimizada de Paciente */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Paciente *</span>
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {listaPacientesFiltrados.length} {listaPacientesFiltrados.length === 1 ? 'paciente' : 'pacientes'}
                  </span>
                </div>

                {/* Campo de Busca Rápida com Ícones */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <input
                    type="text"
                    value={termoBuscaPaciente}
                    onChange={(e) => {
                      setTermoBuscaPaciente(e.target.value);
                      if (!pacienteDropdownAberto) setPacienteDropdownAberto(true);
                    }}
                    onFocus={() => setPacienteDropdownAberto(true)}
                    placeholder="Pesquise por nome, carteirinha ou convênio..."
                    className="w-full pl-9 pr-16 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                    {termoBuscaPaciente && (
                      <button
                        type="button"
                        onClick={() => setTermoBuscaPaciente('')}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                        title="Limpar pesquisa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPacienteDropdownAberto(!pacienteDropdownAberto)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                      title={pacienteDropdownAberto ? "Ocultar lista" : "Exibir lista"}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${pacienteDropdownAberto ? 'rotate-180 text-blue-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Dropdown / Lista Expandida de Resultados */}
                {pacienteDropdownAberto && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-md max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-100">
                    {listaPacientesFiltrados.length === 0 ? (
                      <div className="p-3 text-center space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Nenhum paciente encontrado para "<strong className="text-slate-700 dark:text-slate-200">{termoBuscaPaciente}</strong>"
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNovoPacienteNomePersonalizado(termoBuscaPaciente.trim());
                            setNovoPacienteId(`pac-avulso-${Date.now()}`);
                            setPacienteDropdownAberto(false);
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-[#002172] dark:text-blue-300 rounded-lg text-xs font-bold transition-colors"
                        >
                          + Usar "{termoBuscaPaciente.trim()}" como paciente avulso
                        </button>
                      </div>
                    ) : (
                      listaPacientesFiltrados.map((pac, idx) => {
                        const isSelected = novoPacienteId === pac.id && !novoPacienteNomePersonalizado;
                        const cart = pac.carteirinhaAtual || pac.carteirinha;
                        const conv = pac.convenioPrincipalNome || pac.convenioNome;
                        const initials = pac.nome
                          ? pac.nome.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                          : 'PA';

                        return (
                          <div
                            key={`${pac.id}-${idx}`}
                            onClick={() => handleSelecionarPaciente(pac)}
                            className={`p-2.5 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/30 font-bold border-l-3 border-[#002172] dark:border-blue-400' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                isSelected ? 'bg-[#002172] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}>
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs truncate ${isSelected ? 'text-[#002172] dark:text-blue-300 font-bold' : 'text-slate-800 dark:text-white font-medium'}`}>
                                    {destacarTermosBusca(pac.nome, termoBuscaPaciente)}
                                  </span>
                                  {pac.codigoProntuario && (
                                    <span className="text-[9px] px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono">
                                      {pac.codigoProntuario}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                  {cart && (
                                    <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded">
                                      <CreditCard className="w-2.5 h-2.5 text-slate-400" />
                                      {cart}
                                    </span>
                                  )}
                                  {conv && (
                                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px]">
                                      {conv}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Cartão Informativo do Paciente Selecionado */}
                {(pacienteSelecionadoObj || novoPacienteNomePersonalizado) && (
                  <div className="p-2.5 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-full bg-[#002172] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-[#91CA0C]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                          {novoPacienteNomePersonalizado || pacienteSelecionadoObj?.nome}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-300 flex items-center gap-2 truncate">
                          {pacienteSelecionadoObj?.carteirinha ? (
                            <span className="font-mono">Cart: {pacienteSelecionadoObj.carteirinha}</span>
                          ) : null}
                          {pacienteSelecionadoObj?.convenioPrincipalNome || pacienteSelecionadoObj?.convenioNome ? (
                            <span className="text-blue-700 dark:text-blue-300 font-medium">
                              • {pacienteSelecionadoObj?.convenioPrincipalNome || pacienteSelecionadoObj?.convenioNome}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTermoBuscaPaciente('');
                        setPacienteDropdownAberto(true);
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#002172] dark:text-blue-300 font-bold text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
                    >
                      Alterar
                    </button>
                  </div>
                )}
              </div>

              {/* Operadora e Procedimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operadora / Convênio *
                  </label>
                  <select
                    value={novoOperadora}
                    onChange={(e) => setNovoOperadora(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white"
                  >
                    {MOCK_CONVENIOS.map((conv) => (
                      <option key={conv.id} value={conv.nome}>
                        {conv.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Procedimento Selecionável com Códigos, CIDs e Preços */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Procedimento *
                    </label>
                    {procedimentoSelecionadoObj && (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        R$ {procedimentoSelecionadoObj.preco.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={pesquisaProcedimento}
                      onChange={(e) => {
                        setPesquisaProcedimento(e.target.value);
                        setNovoProcedimento(e.target.value);
                        setProcedimentoDropdownAberto(true);
                      }}
                      onFocus={() => setProcedimentoDropdownAberto(true)}
                      placeholder="Selecione ou busque código, CID ou nome..."
                      className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setProcedimentoDropdownAberto(!procedimentoDropdownAberto)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          procedimentoDropdownAberto ? 'rotate-180 text-blue-600' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dropdown com Lista de Procedimentos Registrados */}
                  {procedimentoDropdownAberto && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProcedimentoDropdownAberto(false)}
                      />
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-100">
                        {pacienteSelecionadoObj && procedimentosDoPacienteSelecionado.length > 0 && (
                          <div className="p-2 bg-blue-50/90 dark:bg-blue-950/80 border-b border-blue-100 dark:border-blue-900 sticky top-0 z-10 flex items-center justify-between text-[11px] font-bold text-[#002172] dark:text-blue-300">
                            <span>🎯 Procedimentos do Paciente ({pacienteSelecionadoObj.nome.split(' ')[0]})</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarTodosProcedimentos(!mostrarTodosProcedimentos);
                              }}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                            >
                              {mostrarTodosProcedimentos ? 'Filtrar apenas do paciente' : 'Ver todos'}
                            </button>
                          </div>
                        )}

                        {listaProcedimentosFiltrados.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Nenhum procedimento cadastrado encontrado
                          </div>
                        ) : (
                          listaProcedimentosFiltrados.map((proc, idx) => {
                            const isSelected =
                              novoProcedimento.toLowerCase() === proc.descricao.toLowerCase() ||
                              novoProcedimento === proc.codigo;
                            const isAvaliacao = proc.categoria === 'AVALIACAO_ABA';
                            const isReavaliacao = proc.categoria === 'REAVALIACAO_ABA';
                            const isDoPaciente = procedimentosDoPacienteSelecionado.some((pNome) => {
                              const pNorm = pNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                              const descNorm = (proc.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                              return descNorm.includes(pNorm) || pNorm.includes(descNorm);
                            });

                            return (
                              <div
                                key={`${proc.id || proc.codigo}-${idx}`}
                                onClick={() => handleSelecionarProcedimento(proc)}
                                className={`p-2.5 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-3 border-[#002172] dark:border-blue-400'
                                    : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded">
                                        {proc.codigo}
                                      </span>
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                                        {proc.descricao}
                                      </span>
                                      {isDoPaciente && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                          ✓ Do Paciente
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                      {proc.cid && (
                                        <span className="font-mono bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded">
                                          CID: {proc.cid}
                                        </span>
                                      )}
                                      <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                        R$ {proc.preco.toFixed(2).replace('.', ',')}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                          isAvaliacao
                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                            : isReavaliacao
                                            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                      >
                                        {isAvaliacao
                                          ? 'Avaliação'
                                          : isReavaliacao
                                          ? 'Reavaliação'
                                          : 'Sessão Regular'}
                                      </span>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                      <Check className="w-2.5 h-2.5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}

                  {/* Alternador de visualização e informações do procedimento ativo */}
                  {procedimentosDoPacienteSelecionado.length > 0 && (
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {mostrarTodosProcedimentos ? 'Exibindo todos os procedimentos da clínica' : 'Procedimentos do paciente'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarTodosProcedimentos(!mostrarTodosProcedimentos)}
                        className="text-[#002172] dark:text-blue-300 font-bold hover:underline"
                      >
                        {mostrarTodosProcedimentos ? 'Filtrar do paciente' : 'Ver todos os procedimentos (+)'}
                      </button>
                    </div>
                  )}

                  {/* Informações resumidas do procedimento ativo */}
                  {procedimentoSelecionadoObj && (
                    <div className="mt-1.5 px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          [{procedimentoSelecionadoObj.codigo}]
                        </span>
                        {procedimentoSelecionadoObj.cid && (
                          <span className="text-purple-700 dark:text-purple-300 font-mono text-[10px]">
                            CID: {procedimentoSelecionadoObj.cid}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono shrink-0 ml-2">
                        R$ {procedimentoSelecionadoObj.preco.toFixed(2).replace('.', ',')} / sessão
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prestador Selecionável com Todos os Dados Profissionais */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Prestadores *
                  </label>
                  {prestadorSelecionadoObj && (
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                      {prestadorSelecionadoObj.orgaoClasse} {prestadorSelecionadoObj.crmOuCrp} • {prestadorSelecionadoObj.uf}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={pesquisaPrestador}
                    onChange={(e) => {
                      setPesquisaPrestador(e.target.value);
                      setNovoPrestador(e.target.value);
                      setPrestadorDropdownAberto(true);
                    }}
                    onFocus={() => setPrestadorDropdownAberto(true)}
                    placeholder="Pesquise por nome, CBO, CRM/CRP ou especialidade do Prestador..."
                    className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPrestadorDropdownAberto(!prestadorDropdownAberto)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        prestadorDropdownAberto ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                </div>

                {prestadorDropdownAberto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setPrestadorDropdownAberto(false)}
                    />
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in duration-100">
                      {listaPrestadoresFiltrados.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          Nenhum prestador encontrado
                        </div>
                      ) : (
                        listaPrestadoresFiltrados.map((pres, idx) => {
                          const isSelected =
                            novoPrestador.toLowerCase() === pres.nome.toLowerCase() ||
                            novoPrestador === pres.id;

                          return (
                            <div
                              key={`${pres.id}-${idx}`}
                              onClick={() => handleSelecionarPrestador(pres)}
                              className={`p-2.5 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border-l-3 border-[#002172] dark:border-blue-400'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      {pres.nome}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                                      {pres.orgaoClasse} {pres.crmOuCrp}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                      CBO: {sanitizarCbo(pres.cbo)}
                                    </span>
                                    <span className="font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                      UF: {pres.uf}
                                    </span>
                                    {pres.especialidade && (
                                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        {pres.especialidade}
                                      </span>
                                    )}
                                    {pres.pastaAtribuida && (
                                      <span className="text-slate-400 dark:text-slate-500">
                                        • Pasta: {pres.pastaAtribuida}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-2.5 h-2.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {/* Informações detalhadas do Prestador Selecionado */}
                {prestadorSelecionadoObj && (
                  <div className="mt-1.5 p-2.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/70 rounded-xl text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {prestadorSelecionadoObj.nome}
                      </span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                        {prestadorSelecionadoObj.orgaoClasse} {prestadorSelecionadoObj.crmOuCrp} ({prestadorSelecionadoObj.uf})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300 flex-wrap">
                      <span>CBO: <strong className="font-mono">{sanitizarCbo(prestadorSelecionadoObj.cbo)}</strong></span>
                      <span>• Especialidade: <strong>{prestadorSelecionadoObj.especialidade || prestadorSelecionadoObj.titulo}</strong></span>
                      {prestadorSelecionadoObj.pastaAtribuida && (
                        <span>• Pasta: <strong>{prestadorSelecionadoObj.pastaAtribuida}</strong></span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo Automático de Sessões do Paciente (Card Organizado e Claro com ajuste editável) */}
              <div className="p-3.5 bg-blue-50/60 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Frequência Semanal do Paciente
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={novoSessoesPorSemana || ''}
                        onChange={(e) => setNovoSessoesPorSemana(e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10)))}
                        className="w-12 text-center font-mono font-black text-blue-700 dark:text-blue-400 text-sm bg-transparent border-0 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {novoSessoesPorSemana === 1 ? 'sessão/sem' : 'sessões/sem'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      • {semanasAteFimDoMes} {semanasAteFimDoMes === 1 ? 'semana' : 'semanas'} no ciclo
                    </span>
                  </div>
                </div>

                <div className="self-stretch sm:self-auto flex items-center justify-between sm:justify-end gap-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-4 py-2 rounded-xl shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Total Automático
                  </span>
                  <span className="text-sm font-mono font-black text-emerald-800 dark:text-emerald-300">
                    {novoQuantidade} {novoQuantidade === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </div>
                {/* Status da Autorização */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Inicial *
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNovoStatusCriacao('EM_ANALISE')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        novoStatusCriacao === 'EM_ANALISE'
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                      <span className="truncate">Em Análise</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNovoStatusCriacao('CONCLUIDO')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        novoStatusCriacao === 'CONCLUIDO'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">Concluído</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNovoStatusCriacao('RECUSADO')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        novoStatusCriacao === 'RECUSADO'
                          ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-700 dark:text-red-300 ring-2 ring-red-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                      <span className="truncate">Recusado</span>
                    </button>
                  </div>
                </div>

              {/* Opção para Em Análise: Desde que dia? */}
              {novoStatusCriacao === 'EM_ANALISE' && (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300">
                      Desde que dia? *
                    </label>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-medium">
                      {calcularDiasCorridos(novaDataEmAnaliseDesde)} {calcularDiasCorridos(novaDataEmAnaliseDesde) === 1 ? 'dia corrido em análise' : 'dias corridos em análise'}
                    </span>
                  </div>
                  <input
                    type="date"
                    value={novaDataEmAnaliseDesde}
                    onChange={(e) => setNovaDataEmAnaliseDesde(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg font-mono text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                    required={novoStatusCriacao === 'EM_ANALISE'}
                  />
                </div>
              )}

              {/* Campos condicionais para Concluído (N° Guia, Data Aut, Senha, Validade) */}
              {novoStatusCriacao === 'CONCLUIDO' && (
                <div className="space-y-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                        N° da Guia / Autorização *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: OP-9882104"
                        value={novoNumeroGuiaCriacao}
                        onChange={(e) => setNovoNumeroGuiaCriacao(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg font-mono text-slate-800 dark:text-white"
                        required={novoStatusCriacao === 'CONCLUIDO'}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                        Data da Autorização *
                      </label>
                      <input
                        type="date"
                        value={novaDataAutorizacaoCriacao}
                        onChange={(e) => setNovaDataAutorizacaoCriacao(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg font-mono text-slate-800 dark:text-white"
                        required={novoStatusCriacao === 'CONCLUIDO'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                        Senha da Autorização *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: SENHA-83921"
                        value={novaSenhaCriacao}
                        onChange={(e) => setNovaSenhaCriacao(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg font-mono text-slate-800 dark:text-white"
                        required={novoStatusCriacao === 'CONCLUIDO'}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                        Validade da Senha *
                      </label>
                      <input
                        type="date"
                        value={novaValidadeSenhaCriacao}
                        onChange={(e) => setNovaValidadeSenhaCriacao(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg font-mono text-slate-800 dark:text-white"
                        required={novoStatusCriacao === 'CONCLUIDO'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Campos condicionais para Recusado (Motivo da Recusa) */}
              {novoStatusCriacao === 'RECUSADO' && (
                <div className="p-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl">
                  <label className="block text-[11px] font-bold text-red-900 dark:text-red-300 mb-1">
                    Motivo / Justificativa da Recusa
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carência contratual ou limite de sessões atingido"
                    value={novoMotivoRecusaCriacao}
                    onChange={(e) => setNovoMotivoRecusaCriacao(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Iniciais
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações relevantes para o acompanhamento..."
                  value={novaObservacoes}
                  onChange={(e) => setNovaObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNovoModalAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs"
                >
                  Cadastrar para Acompanhamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
