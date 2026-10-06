import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  FolderCheck,
  UserCheck,
  AlertTriangle,
  Plus,
  X,
  ShieldAlert,
  Tag,
  Lock,
  Copy,
  Check,
  Sparkles,
  Calendar,
  FileCheck2,
  Trash2,
  Edit3,
  RotateCcw,
  Save,
} from 'lucide-react';
import { MOCK_GUIAS, MOCK_PRESTADORES } from '../../data/mockClinicData';
import {
  validarDuplicidadeGuia,
  gerarChaveDuplicidade,
  registrarDuplicidadeExcepcional,
  formatarDataBr,
  calcularDatasSessoesAlinhadas,
  formatarContagemRepeticoesSessoes,
  calcularSessoesSemanaisJanela,
  sanitizarCbo,
} from '../../services/businessRules';
import { ValidacaoDuplicidadeGuiaSessao, DiaSemanaIndice, GuiaDigitacao, Usuario, Prestador, ModoAbatimentoFaltas } from '../../types/clinic';
import { carregarUsuariosIniciais } from '../../services/userService';
import { useTheme } from '../../context/ThemeContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import {
  ProcedimentosService,
  ProcedimentoCompleto,
} from '../../services/procedimentosService';
import { PacientesService } from '../../services/pacientesService';
import { GerenciarProcedimentosModal } from '../procedimentos/GerenciarProcedimentosModal';
import {
  carregarAutorizacoesIniciais,
  salvarAutorizacoesStorage,
  carregarGuiasIniciais,
  salvarGuiasStorage,
} from '../../services/autorizacoesService';
import { AutorizacaoV2 } from '../../types/autorizacao';
import { matchDateFilter, matchTextFilter } from '../../utils/filterUtils';
import { obterBadgeColorProcedimento, CLASS_TABELA_LISTRADA_ROW } from '../../utils/procedureStyles';

interface GuiasViewProps {
  onOpenAudit: () => void;
}

const GUIAS_PADRAO_INICIAIS: GuiaDigitacao[] = [
  {
    id: 'guia-demo-1',
    classificacao: 'ABA',
    numeroGuia: '#SUL-998822-D',
    numeroConta: 'CNT-8821',
    autorizacaoId: 'aut-v2-3',
    pacienteId: 'pac-3',
    pacienteNome: 'Matheus Henrique da Silva',
    procedimentoNome: 'Psicologia ABA',
    prestadorId: 'prest-1',
    prestadorNome: 'Dra. Ana Beatriz Albuquerque',
    convenioNome: 'SulAmérica Saúde',
    dataAutorizacao: '2026-09-12',
    dataColocacaoPasta: '2026-09-15',
    pastaDoutora: 'Pasta Dra. Ana Beatriz Albuquerque',
    duracaoHoras: 1,
    polo: 'M1',
    responsavelColocacaoPasta: 'Maria Clara Fonseca',
    dataRetorno: '2026-09-20',
    dataDigitacao: '2026-09-16',
    responsavelDigitacao: 'Christian Gomes',
    status: 'DIGITADA_FATURADA',
    duplicidadeDetectada: false,
    assinada: 'SIM',
    responsavelColherAssinatura: 'Ana Beatriz Silveira',
  },
  {
    id: 'guia-demo-2',
    classificacao: 'CONV.',
    numeroGuia: '#BRAD-773311-A',
    numeroConta: 'CNT-7740',
    autorizacaoId: 'aut-v2-1',
    pacienteId: 'pac-1',
    pacienteNome: 'Lucas Gabriel Mendes',
    procedimentoNome: 'Fonoaudiologia',
    prestadorId: 'prest-2',
    prestadorNome: 'Dr. Carlos Eduardo Neves',
    convenioNome: 'SulAmérica Saúde',
    dataAutorizacao: '2026-09-10',
    dataColocacaoPasta: '2026-09-12',
    pastaDoutora: 'Pasta Dr. Carlos Eduardo Neves',
    duracaoHoras: 2,
    polo: 'M2',
    responsavelColocacaoPasta: 'João Pedro Alves',
    dataRetorno: '2026-09-24',
    dataDigitacao: '2026-09-14',
    responsavelDigitacao: 'Ana Beatriz Silveira',
    status: 'DIGITADA_FATURADA',
    duplicidadeDetectada: false,
    assinada: 'PARCIAL',
    responsavelColherAssinatura: 'Christian Gomes',
  },
  {
    id: 'guia-demo-3',
    classificacao: 'ABA',
    numeroGuia: '#AMIL-445566-K',
    numeroConta: 'CNT-9912',
    autorizacaoId: 'aut-v2-5',
    pacienteId: 'pac-5',
    pacienteNome: 'Gabriel Costa Silva',
    procedimentoNome: 'Terapia Ocupacional ABA',
    prestadorId: 'prest-3',
    prestadorNome: 'Dra. Mariana Souza',
    convenioNome: 'Amil Assistência',
    dataAutorizacao: '2026-09-08',
    dataColocacaoPasta: '2026-09-09',
    pastaDoutora: 'Pasta Dra. Mariana Souza',
    duracaoHoras: 1,
    polo: 'M1',
    responsavelColocacaoPasta: 'Maria Clara Fonseca',
    dataRetorno: '',
    dataDigitacao: '2026-09-11',
    responsavelDigitacao: 'Maria Clara Fonseca',
    status: 'DIGITADA_FATURADA',
    duplicidadeDetectada: false,
    assinada: 'NAO',
    responsavelColherAssinatura: 'Ana Beatriz Silveira',
  },
];

export const GuiasView: React.FC<GuiasViewProps> = ({ onOpenAudit }) => {
  const { showMonthInitials } = useTheme();
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('TODOS');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Filtros programáveis por coluna para as colunas do Faturamento
  const [filtrosColunas, setFiltrosColunas] = useState({
    classificacao: '',
    numeroGuia: '',
    paciente: '',
    dataAutorizacao: '',
    dataColocacaoPasta: '',
    pastaDoutora: '',
    polo: '',
    responsavelColocacaoPasta: '',
    dataRetorno: '',
    dataDigitacao: '',
    responsavelDigitacao: '',
    assinada: '',
    responsavelColherAssinatura: '',
  });

  // Filtro de Guias Incompletas (Campos em branco)
  const [apenasIncompletas, setApenasIncompletas] = useState(false);

  const isEmBranco = (val: any) => !val || String(val).trim() === '';

  const temCampoEmBranco = (guia: GuiaDigitacao): boolean => {
    return (
      isEmBranco(guia.numeroGuia) ||
      isEmBranco(guia.numeroConta) ||
      isEmBranco(guia.dataAutorizacao) ||
      isEmBranco(guia.dataColocacaoPasta) ||
      isEmBranco(guia.pastaDoutora) ||
      isEmBranco(guia.prestadorNome) ||
      isEmBranco(guia.polo) ||
      isEmBranco(guia.responsavelColocacaoPasta) ||
      isEmBranco(guia.dataRetorno) ||
      isEmBranco(guia.dataDigitacao) ||
      isEmBranco(guia.responsavelDigitacao) ||
      isEmBranco(guia.assinada) ||
      (isEmBranco(guia.responsavelColherAssinatura) && isEmBranco(guia.responsavelColherGuia))
    );
  };

  const temFiltrosAtivos =
    Boolean(busca.trim()) ||
    statusFiltro !== 'TODOS' ||
    Boolean(filtroDataInicio) ||
    Boolean(filtroDataFim) ||
    apenasIncompletas ||
    Object.values(filtrosColunas).some((v) => Boolean(v && v.trim()));

  const limparFiltros = () => {
    setBusca('');
    setStatusFiltro('TODOS');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setApenasIncompletas(false);
    setFiltrosColunas({
      classificacao: '',
      numeroGuia: '',
      paciente: '',
      dataAutorizacao: '',
      dataColocacaoPasta: '',
      pastaDoutora: '',
      polo: '',
      responsavelColocacaoPasta: '',
      dataRetorno: '',
      dataDigitacao: '',
      responsavelDigitacao: '',
      assinada: '',
      responsavelColherAssinatura: '',
    });
  };

  // Estado das guias (Faturamentos) com persistência e auto-salvamento
  const [guias, setGuias] = useState<GuiaDigitacao[]>(() =>
    carregarGuiasIniciais(GUIAS_PADRAO_INICIAIS)
  );
  const [idsGuiasSelecionadas, setIdsGuiasSelecionadas] = useState<string[]>([]);

  // Sincronização em tempo real das guias salvas no localStorage
  useEffect(() => {
    const atualizarGuias = () => {
      const gs = carregarGuiasIniciais(GUIAS_PADRAO_INICIAIS);
      setGuias(gs);
    };
    window.addEventListener('storage', atualizarGuias);
    return () => {
      window.removeEventListener('storage', atualizarGuias);
    };
  }, []);

  // Funcionários registrados do sistema
  const [funcionarios, setFuncionarios] = useState<Usuario[]>([]);

  useEffect(() => {
    const usrs = carregarUsuariosIniciais();
    setFuncionarios(usrs.filter((u) => u.ativo));
  }, []);

  // Autorizações concluídas vindas do Centro de Controle com sincronização automática
  const [autorizacoesConcluidas, setAutorizacoesConcluidas] = useState<AutorizacaoV2[]>([]);

  useEffect(() => {
    const atualizarAutorizacoes = () => {
      const auts = carregarAutorizacoesIniciais();
      setAutorizacoesConcluidas(auts.filter((a) => a.status === 'CONCLUIDO' || a.status === 'DIGITADA'));
    };
    atualizarAutorizacoes();
    window.addEventListener('storage', atualizarAutorizacoes);
    return () => {
      window.removeEventListener('storage', atualizarAutorizacoes);
    };
  }, []);

  // Guia / Autorização Concluída selecionada para abrir a Aba Lateral (Drawer)
  const [guiaSelecionadaDrawer, setGuiaSelecionadaDrawer] = useState<AutorizacaoV2 | null>(null);
  const [guiaPrincipalGerada, setGuiaPrincipalGerada] = useState<string>('');
  const [copiadoChave, setCopiadoChave] = useState<string | null>(null);

  // Campos de entrada para o Faturamento/Digitação no Drawer
  const [numeroContaInput, setNumeroContaInput] = useState<string>('');
  const [erroNumeroConta, setErroNumeroConta] = useState<string | null>(null);
  const [pastaDoutoraInput, setPastaDoutoraInput] = useState<string>(MOCK_PRESTADORES[0]?.nome || 'Dra. Ana Beatriz');
  const [poloInput, setPoloInput] = useState<'M1' | 'M2' | 'ON' | 'Polo 1' | 'Polo 2' | 'Polo ON'>('M1');
  const [responsavelColocacaoPastaInput, setResponsavelColocacaoPastaInput] = useState<string>('Maria Clara Fonseca');
  const [dataColocacaoPastaInput, setDataColocacaoPastaInput] = useState<string>('');
  const [dataRetornoInput, setDataRetornoInput] = useState<string>('');
  const [assinadaInput, setAssinadaInput] = useState<'SIM' | 'PARCIAL' | 'NAO'>('NAO');
  const [responsavelColherAssinaturaInput, setResponsavelColherAssinaturaInput] = useState<string>('Ana Beatriz Silveira');
  const [responsavelDigitacaoInput, setResponsavelDigitacaoInput] = useState<string>('Christian Gomes');

  // Modal de Procedimentos & Preços ABA
  const [modalProcedimentosAberto, setModalProcedimentosAberto] = useState(false);

  // Modal de Nova Guia / Digitação Completa
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novaClassificacao, setNovaClassificacao] = useState<'ABA' | 'CONV.'>('ABA');
  const [novoNumeroGuia, setNovoNumeroGuia] = useState('');
  const [novoNumeroConta, setNovoNumeroConta] = useState('');
  const [novoPaciente, setNovoPaciente] = useState('');
  const [novoConvenio, setNovoConvenio] = useState('SulAmérica Saúde');
  const [codigoProcedimentoSelecionado, setCodigoProcedimentoSelecionado] = useState('66600480');
  const [novoProcedimento, setNovoProcedimento] = useState('Psicologia ABA');
  const [novoPrestador, setNovoPrestador] = useState('Dra. Ana Beatriz Albuquerque');
  const [novaPastaDoutora, setNovaPastaDoutora] = useState('Pasta Dra. Ana Beatriz Albuquerque');
  const [novoPolo, setNovoPolo] = useState<'M1' | 'M2' | 'ON' | 'Polo 1' | 'Polo 2' | 'Polo ON'>('M1');
  const [novaDataAutorizacao, setNovaDataAutorizacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [novaDataColocacaoPasta, setNovaDataColocacaoPasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [novoResponsavelColocacaoPasta, setNovoResponsavelColocacaoPasta] = useState('Maria Clara Fonseca');
  const [novaDataRetorno, setNovaDataRetorno] = useState('');
  const [novaDataDigitacao, setNovaDataDigitacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [novoResponsavelDigitacao, setNovoResponsavelDigitacao] = useState('Christian Gomes');
  const [novaAssinada, setNovaAssinada] = useState<'SIM' | 'PARCIAL' | 'NAO'>('SIM');
  const [novoResponsavelColherAssinatura, setNovoResponsavelColherAssinatura] = useState('Ana Beatriz Silveira');
  const [novoStatus, setNovoStatus] = useState<'DIGITADA_FATURADA' | 'AGUARDANDO_RETORNO' | 'AGUARDANDO_DIGITACAO'>('DIGITADA_FATURADA');
  const [novasObservacoes, setNovasObservacoes] = useState('');
  const [resultadoDuplicidade, setResultadoDuplicidade] = useState<ValidacaoDuplicidadeGuiaSessao | null>(null);
  const [justificativaDuplicidade, setJustificativaDuplicidade] = useState('');
  const [erroBloqueioProcedimento, setErroBloqueioProcedimento] = useState<string | null>(null);

  // Estados para edição das datas das sessões no Faturamento (Drawer)
  const [datasSessoesDrawer, setDatasSessoesDrawer] = useState<string[]>([]);
  const [modoEdicaoSessoesDrawer, setModoEdicaoSessoesDrawer] = useState<boolean>(false);
  const [automacaoDesativadaDrawer, setAutomacaoDesativadaDrawer] = useState<boolean>(false);
  const [modalEdicaoLoteAberto, setModalEdicaoLoteAberto] = useState<boolean>(false);
  const [textoLoteInput, setTextoLoteInput] = useState<string>('');
  const [erroEdicaoLote, setErroEdicaoLote] = useState<string | null>(null);

  // Estados de Faltas Justificadas no Faturamento (Drawer)
  const [temFaltasJustificadasDrawer, setTemFaltasJustificadasDrawer] = useState<boolean>(false);
  const [datasFaltasDrawer, setDatasFaltasDrawer] = useState<string[]>([]);
  const [inputDataFaltaDrawer, setInputDataFaltaDrawer] = useState<string>('');
  const [modoFaltasDrawer, setModoFaltasDrawer] = useState<ModoAbatimentoFaltas>('DESCONTAR_PROXIMA_AUTORIZACAO');
  const [motivoFaltasDrawer, setMotivoFaltasDrawer] = useState<string>('Atestado médico da criança');

  // Estados para visualização e edição de sessões de guia já faturada (Tabela)
  const [guiaParaEditarSessoes, setGuiaParaEditarSessoes] = useState<GuiaDigitacao | null>(null);
  const [datasSessoesModalGuia, setDatasSessoesModalGuia] = useState<string[]>([]);
  const [automacaoDesativadaModalGuia, setAutomacaoDesativadaModalGuia] = useState<boolean>(false);
  const [modalEdicaoLoteGuiaAberto, setModalEdicaoLoteGuiaAberto] = useState<boolean>(false);
  const [textoLoteGuiaInput, setTextoLoteGuiaInput] = useState<string>('');
  const [erroEdicaoLoteGuia, setErroEdicaoLoteGuia] = useState<string | null>(null);

  const todosProcedimentos = ProcedimentosService.obterTodos();
  const procedimentoAtual = todosProcedimentos.find((p) => p.codigo === codigoProcedimentoSelecionado);

  // Atualização em lote ou individual da Assinatura e Responsável em Autorizações Concluídas
  const handleUpdateAutorizacaoSignature = (
    autId: string,
    field: 'assinada' | 'responsavelColherAssinatura',
    value: string
  ) => {
    const todasAuts = carregarAutorizacoesIniciais();
    const autsAtualizadas = todasAuts.map((a) => {
      if (a.id === autId) {
        return { ...a, [field]: value };
      }
      return a;
    });
    salvarAutorizacoesStorage(autsAtualizadas);
    setAutorizacoesConcluidas(autsAtualizadas.filter((a) => a.status === 'CONCLUIDO' || a.status === 'DIGITADA'));
  };

  // Atualização direta e salvamento automático de campos da Guia no Faturamento
  const handleUpdateGuiaField = (guiaId: string, field: keyof GuiaDigitacao, value: any) => {
    setGuias((prev) => {
      const novas = prev.map((g) => {
        if (g.id === guiaId) {
          return { ...g, [field]: value };
        }
        return g;
      });
      salvarGuiasStorage(novas);
      return novas;
    });
  };

  const handleAbrirDrawerGuiaConcluida = (aut: AutorizacaoV2) => {
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, '0');
    const mm = String(agora.getMinutes()).padStart(2, '0');
    const dd = String(agora.getDate()).padStart(2, '0');
    const MM = String(agora.getMonth() + 1).padStart(2, '0');
    const yyyy = agora.getFullYear();
    const numeroGerado = `${hh}${mm}${dd}${MM}${yyyy}`;

    const todosPacientes = PacientesService.obterPacientes();
    const pacienteEncontrado = todosPacientes.find(
      (p) =>
        p.id === aut.pacienteId ||
        (p.nome && p.nome.toLowerCase().trim() === (aut.pacienteNome || '').toLowerCase().trim())
    );
    const pastaDefinida =
      aut.pastaDoutora ||
      pacienteEncontrado?.pastaDoutoraMefisa ||
      (aut.prestador ? `Pasta ${aut.prestador}` : 'Pasta Corpo Clínico — Mefisa');

    setGuiaPrincipalGerada(numeroGerado);
    setGuiaSelecionadaDrawer(aut);
    const temCustom = !!(aut.datasSessoesCustomizadas && aut.datasSessoesCustomizadas.length > 0);
    const sessoesPorSemanaAut = obterSessoesPorSemanaPaciente(aut);
    const datasIniciais = temCustom
      ? [...aut.datasSessoesCustomizadas!]
      : calcularDatasSessoes(
          aut.dataAutorizacao || aut.dataSolicitacao,
          aut.quantidadeSolicitada || 1,
          aut.pacienteNome || aut.pacienteId,
          sessoesPorSemanaAut
        );
    setDatasSessoesDrawer(datasIniciais);
    setAutomacaoDesativadaDrawer(temCustom);
    setModoEdicaoSessoesDrawer(false);
    setNumeroContaInput('');
    setPastaDoutoraInput(pastaDefinida);
    setPoloInput(aut.polo || pacienteEncontrado?.polo || 'M1');
    setResponsavelColocacaoPastaInput(aut.responsavelColocacaoPasta || 'Maria Clara Fonseca');
    setDataColocacaoPastaInput(aut.dataColocacaoPasta || new Date().toISOString().split('T')[0]);
    setDataRetornoInput(aut.dataRetorno || '');
    setAssinadaInput(aut.assinada || 'NAO');
    setResponsavelColherAssinaturaInput(aut.responsavelColherAssinatura || 'Ana Beatriz Silveira');
    setResponsavelDigitacaoInput(aut.responsavelDigitacao || aut.responsavel || 'Christian Gomes');
    setErroNumeroConta(null);
  };

  const handleMarcarComoDigitada = () => {
    if (!guiaSelecionadaDrawer) return;
    if (!numeroContaInput.trim()) {
      setErroNumeroConta('Por favor, digite o Número da Conta para faturar e registrar.');
      return;
    }

    const novaGuia: GuiaDigitacao = {
      id: `guia-aut-${Date.now()}`,
      numeroGuia: guiaSelecionadaDrawer.numeroAutorizacao || `#GUIA-${Math.floor(1000 + Math.random() * 9000)}`,
      numeroConta: numeroContaInput.trim(),
      autorizacaoId: guiaSelecionadaDrawer.id,
      pacienteId: guiaSelecionadaDrawer.pacienteId,
      pacienteNome: guiaSelecionadaDrawer.pacienteNome,
      prestadorId: 'prest-1',
      prestadorNome: guiaSelecionadaDrawer.prestador,
      convenioNome: guiaSelecionadaDrawer.operadora,
      dataAutorizacao: guiaSelecionadaDrawer.dataAutorizacao || new Date().toISOString().split('T')[0],
      dataColocacaoPasta: dataColocacaoPastaInput || new Date().toISOString().split('T')[0],
      pastaDoutora: pastaDoutoraInput,
      duracaoHoras: 1,
      polo: poloInput,
      responsavelColocacaoPasta: responsavelColocacaoPastaInput,
      dataRetorno: dataRetornoInput,
      responsavelColherGuia: responsavelColherAssinaturaInput,
      responsavelColherAssinatura: responsavelColherAssinaturaInput,
      dataDigitacao: new Date().toISOString().split('T')[0],
      responsavelDigitacao: responsavelDigitacaoInput,
      status: 'DIGITADA_FATURADA',
      duplicidadeDetectada: false,
      senha: guiaSelecionadaDrawer.senha,
      dataValidadeSenha: guiaSelecionadaDrawer.dataValidadeSenha,
      assinada: assinadaInput,
      datasSessoes: datasSessoesDrawer,
    };

    const listaGuiasAtualizada = [novaGuia, ...guias];
    setGuias(listaGuiasAtualizada);
    salvarGuiasStorage(listaGuiasAtualizada);

    // Atualiza autorizações no localStorage preservando assinada e dados de faturamento
    const todasAuts = carregarAutorizacoesIniciais();
    const autsAtualizadas = todasAuts.map((a) =>
      a.id === guiaSelecionadaDrawer.id
        ? {
            ...a,
            status: 'DIGITADA' as const,
            assinada: assinadaInput,
            responsavelColherAssinatura: responsavelColherAssinaturaInput,
            polo: poloInput,
            pastaDoutora: pastaDoutoraInput,
            dataRetorno: dataRetornoInput,
            datasSessoesCustomizadas: datasSessoesDrawer,
          }
        : a
    );
    salvarAutorizacoesStorage(autsAtualizadas);
    setAutorizacoesConcluidas(autsAtualizadas.filter((a) => a.status === 'CONCLUIDO'));

    setGuiaSelecionadaDrawer(null);
    setNumeroContaInput('');
    setErroNumeroConta(null);
    alert(`Guia vinculada à Conta ${novaGuia.numeroConta} registrada e enviada para Faturamentos!`);
  };

  const handleCopiar1Clique = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoChave(chave);
    setTimeout(() => setCopiadoChave(null), 2000);
  };

  const parseDiaSemanaNomeParaIndice = (diaNome?: string): DiaSemanaIndice => {
    if (!diaNome) return 1;
    const norm = diaNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('segunda') || norm.includes('seg')) return 1;
    if (norm.includes('terca') || norm.includes('ter')) return 2;
    if (norm.includes('quarta') || norm.includes('qua')) return 3;
    if (norm.includes('quinta') || norm.includes('qui')) return 4;
    if (norm.includes('sexta') || norm.includes('sex')) return 5;
    if (norm.includes('sabado') || norm.includes('sab')) return 6;
    if (norm.includes('domingo') || norm.includes('dom')) return 0;
    return 1;
  };

  const calcularDatasSessoes = (
    dataInicioStr: string,
    quantidade: number,
    pacienteNomeOuId?: string,
    sessoesPorSemanaOverride?: number,
    datasFaltasParam?: string[],
    modoFaltasParam?: ModoAbatimentoFaltas
  ): string[] => {
    if (!dataInicioStr) return [];

    let diaAlvo: DiaSemanaIndice = 1; // Padrão: Segunda-feira
    let diasHabituaisPac: DiaSemanaIndice[] | undefined = undefined;
    let sessoesSemanaPac = sessoesPorSemanaOverride || 1;
    if (pacienteNomeOuId) {
      const termoNorm = pacienteNomeOuId.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const todosPacientes = PacientesService.obterPacientes();
      const pac = todosPacientes.find((p) => {
        const nomeNorm = p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return (
          p.id === pacienteNomeOuId ||
          nomeNorm === termoNorm ||
          nomeNorm.includes(termoNorm) ||
          termoNorm.includes(nomeNorm)
        );
      });
      if (pac?.diaDaSemana) {
        diaAlvo = parseDiaSemanaNomeParaIndice(pac.diaDaSemana);
      }
      if (pac?.diasDaSemana && pac.diasDaSemana.length > 0) {
        diasHabituaisPac = pac.diasDaSemana.map((dName) => parseDiaSemanaNomeParaIndice(dName));
      }
      if (!sessoesPorSemanaOverride && pac?.sessoesPorSemana) {
        sessoesSemanaPac = pac.sessoesPorSemana;
      }
    }

    return calcularDatasSessoesAlinhadas({
      dataInicioStr,
      quantidade,
      diaSemanaHabitual: diaAlvo,
      diasSemanaHabituais: diasHabituaisPac,
      sessoesPorSemana: sessoesSemanaPac,
      showMonthInitials,
      datasFaltas: datasFaltasParam,
      modoFaltas: modoFaltasParam,
    });
  };

  // Converte dd/mm/aaaa para aaaa-mm-dd para uso em input type="date"
  const converterBrParaIso = (dataBr: string): string => {
    if (!dataBr) return '';
    const limpo = dataBr.trim();
    if (limpo.includes('-')) {
      const parts = limpo.split('-');
      if (parts[0].length === 4) return limpo;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const partes = limpo.split('/');
    if (partes.length === 3) {
      const dd = partes[0].padStart(2, '0');
      let mm = partes[1];
      const mesesIniciais = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const idxMes = mesesIniciais.findIndex((m) => mm.toLowerCase().includes(m));
      if (idxMes !== -1) {
        mm = String(idxMes + 1).padStart(2, '0');
      } else {
        mm = mm.padStart(2, '0');
      }
      const yyyy = partes[2];
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  // Converte aaaa-mm-dd para formato estritamente brasileiro dd/mm/aaaa
  const converterIsoParaBr = (dataIso: string): string => {
    if (!dataIso) return '';
    const limpo = dataIso.trim();
    if (limpo.includes('/')) return limpo;
    const partes = limpo.split('-');
    if (partes.length === 3) {
      const ano = partes[0];
      const mes = partes[1].padStart(2, '0');
      const dia = partes[2].padStart(2, '0');
      return `${dia}/${mes}/${ano}`;
    }
    return dataIso;
  };

  // Valida e sanitiza qualquer entrada para o padrão brasileiro dd/mm/aaaa
  const sanitizarEntradaDataBr = (texto: string): string | null => {
    if (!texto) return null;
    const t = texto.trim();
    if (t.includes('/')) {
      const parts = t.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const a = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(a) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && a >= 1900 && a <= 2100) {
          return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
        }
      }
    } else if (t.includes('-')) {
      const parts = t.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const a = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(a) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
          return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
        }
      }
    }
    return null;
  };

  const obterDatasSessoesGuia = (guia: GuiaDigitacao): string[] => {
    if (guia.datasSessoes && guia.datasSessoes.length > 0) {
      return guia.datasSessoes;
    }
    const autCorrespondente = autorizacoesConcluidas.find((a) => a.id === guia.autorizacaoId);
    if (autCorrespondente?.datasSessoesCustomizadas && autCorrespondente.datasSessoesCustomizadas.length > 0) {
      return autCorrespondente.datasSessoesCustomizadas;
    }
    const qtd = autCorrespondente?.quantidadeSolicitada || 8;
    const sessoesSemana = autCorrespondente ? obterSessoesPorSemanaPaciente(autCorrespondente) : 1;
    return calcularDatasSessoes(guia.dataAutorizacao, qtd, guia.pacienteNome || guia.pacienteId, sessoesSemana);
  };

  const obterStatusDigitabilidadeGuia = (aut: AutorizacaoV2) => {
    const dataInicio = aut.dataAutorizacao || aut.dataSolicitacao;
    const sessoesSemana = obterSessoesPorSemanaPaciente(aut);
    const sessoes = aut.datasSessoesCustomizadas && aut.datasSessoesCustomizadas.length > 0
      ? aut.datasSessoesCustomizadas
      : calcularDatasSessoes(dataInicio, aut.quantidadeSolicitada || 1, aut.pacienteNome || aut.pacienteId, sessoesSemana);

    if (!sessoes || sessoes.length === 0) {
      return {
        podeDigitar: true,
        dataUltimaSessaoBr: formatarDataBr(dataInicio, showMonthInitials),
        dataUltimaSessaoIso: dataInicio,
        diasAteUltimaSessao: 0,
      };
    }

    const ultimaSessaoBr = sessoes[sessoes.length - 1];

    let isoUltima = '';
    if (ultimaSessaoBr.includes('/')) {
      const parts = ultimaSessaoBr.split('/');
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
        isoUltima = `${yyyy}-${mm}-${dd}`;
      }
    } else if (ultimaSessaoBr.includes('-')) {
      const parts = ultimaSessaoBr.split('-');
      if (parts[0].length === 4) {
        isoUltima = ultimaSessaoBr;
      } else {
        isoUltima = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    if (!isoUltima) {
      isoUltima = dataInicio;
    }

    const hojeDate = new Date();
    const hojeYear = hojeDate.getFullYear();
    const hojeMonth = String(hojeDate.getMonth() + 1).padStart(2, '0');
    const hojeDay = String(hojeDate.getDate()).padStart(2, '0');
    const hojeIso = `${hojeYear}-${hojeMonth}-${hojeDay}`;

    const podeDigitar = isoUltima <= hojeIso;

    const dtUltima = new Date(isoUltima + 'T00:00:00');
    const dtHoje = new Date(hojeIso + 'T00:00:00');
    const diffTime = dtUltima.getTime() - dtHoje.getTime();
    const diasFaltando = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      podeDigitar,
      dataUltimaSessaoBr: formatarDataBr(isoUltima, showMonthInitials),
      dataUltimaSessaoIso: isoUltima,
      diasAteUltimaSessao: Math.max(0, diasFaltando),
    };
  };

  const obterSessoesPorSemanaPaciente = (aut: AutorizacaoV2): number => {
    if (aut.sessoesPorSemana && aut.sessoesPorSemana > 0) {
      return aut.sessoesPorSemana;
    }
    const todosPacientes = PacientesService.obterPacientes();
    const termoNorm = (aut.pacienteNome || aut.pacienteId || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const pacienteEncontrado = todosPacientes.find((p) => {
      const nomeNorm = p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return (
        p.id === aut.pacienteId ||
        nomeNorm === termoNorm ||
        nomeNorm.includes(termoNorm) ||
        termoNorm.includes(nomeNorm)
      );
    });

    if (pacienteEncontrado?.diasDaSemana && pacienteEncontrado.diasDaSemana.length > 0) {
      return pacienteEncontrado.diasDaSemana.length;
    }
    if (pacienteEncontrado?.sessoesPorSemana && pacienteEncontrado.sessoesPorSemana > 0) {
      return pacienteEncontrado.sessoesPorSemana;
    }
    if (pacienteEncontrado?.quantidadeSemana && pacienteEncontrado.quantidadeSemana > 0) {
      return pacienteEncontrado.quantidadeSemana;
    }

    const sessoesSemana = 1;
    const datasSessoes = (aut.datasSessoesCustomizadas && aut.datasSessoesCustomizadas.length > 0)
      ? aut.datasSessoesCustomizadas
      : calcularDatasSessoes(
          aut.dataAutorizacao || aut.dataSolicitacao,
          aut.quantidadeSolicitada || 1,
          aut.pacienteNome || aut.pacienteId,
          sessoesSemana
        );
    const sessoesCalculadas = calcularSessoesSemanaisJanela(datasSessoes);
    return sessoesCalculadas || 1;
  };

  const aplicarDatasLoteDrawer = () => {
    if (!textoLoteInput.trim()) {
      setErroEdicaoLote('Por favor, informe ao menos uma data.');
      return;
    }
    const separadores = /[,;\n\r\t]+/;
    const partes = textoLoteInput
      .split(separadores)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const datasValidas: string[] = [];
    const erros: string[] = [];

    partes.forEach((p) => {
      const br = sanitizarEntradaDataBr(p);
      if (br) {
        datasValidas.push(br);
      } else {
        erros.push(`"${p}"`);
      }
    });

    if (erros.length > 0) {
      setErroEdicaoLote(`As seguintes datas não estão no padrão brasileiro dd/mm/aaaa: ${erros.join(', ')}`);
      return;
    }

    if (datasValidas.length === 0) {
      setErroEdicaoLote('Nenhuma data válida encontrada no formato dd/mm/aaaa.');
      return;
    }

    setDatasSessoesDrawer(datasValidas);
    setAutomacaoDesativadaDrawer(true);
    setModalEdicaoLoteAberto(false);
    setTextoLoteInput('');
    setErroEdicaoLote(null);
  };

  const handleRestaurarCalculoDrawer = () => {
    if (!guiaSelecionadaDrawer) return;
    const sessoesSemana = obterSessoesPorSemanaPaciente(guiaSelecionadaDrawer);
    const datasAuto = calcularDatasSessoes(
      guiaSelecionadaDrawer.dataAutorizacao || guiaSelecionadaDrawer.dataSolicitacao,
      guiaSelecionadaDrawer.quantidadeSolicitada || 1,
      guiaSelecionadaDrawer.pacienteNome || guiaSelecionadaDrawer.pacienteId,
      sessoesSemana
    );
    setDatasSessoesDrawer(datasAuto);
    setAutomacaoDesativadaDrawer(false);
  };

  const handleAbrirModalSessoesGuia = (guia: GuiaDigitacao) => {
    setGuiaParaEditarSessoes(guia);
    const sessoes = obterDatasSessoesGuia(guia);
    setDatasSessoesModalGuia([...sessoes]);
    setAutomacaoDesativadaModalGuia(!!guia.datasSessoes && guia.datasSessoes.length > 0);
    setErroEdicaoLoteGuia(null);
  };

  const handleRestaurarCalculoModalGuia = () => {
    if (!guiaParaEditarSessoes) return;
    const autCorrespondente = autorizacoesConcluidas.find((a) => a.id === guiaParaEditarSessoes.autorizacaoId);
    const qtd = autCorrespondente?.quantidadeSolicitada || 8;
    const sessoesSemana = autCorrespondente ? obterSessoesPorSemanaPaciente(autCorrespondente) : 1;
    const padrao = calcularDatasSessoes(
      guiaParaEditarSessoes.dataAutorizacao,
      qtd,
      guiaParaEditarSessoes.pacienteNome || guiaParaEditarSessoes.pacienteId,
      sessoesSemana
    );
    setDatasSessoesModalGuia(padrao);
    setAutomacaoDesativadaModalGuia(false);
  };

  const handleSalvarSessoesGuia = () => {
    if (!guiaParaEditarSessoes) return;
    const guiaId = guiaParaEditarSessoes.id;
    const novasSessoes = datasSessoesModalGuia;

    setGuias((prev) => {
      const atualizadas = prev.map((g) => {
        if (g.id === guiaId) {
          return { ...g, datasSessoes: novasSessoes };
        }
        return g;
      });
      salvarGuiasStorage(atualizadas);
      return atualizadas;
    });

    // Sincroniza também com a autorização se existir
    if (guiaParaEditarSessoes.autorizacaoId) {
      const todasAuts = carregarAutorizacoesIniciais();
      const autsAtualizadas = todasAuts.map((a) => {
        if (a.id === guiaParaEditarSessoes.autorizacaoId) {
          return { ...a, datasSessoesCustomizadas: novasSessoes };
        }
        return a;
      });
      salvarAutorizacoesStorage(autsAtualizadas);
    }

    setGuiaParaEditarSessoes(null);
    alert('Datas das sessões do faturamento atualizadas com sucesso!');
  };

  const aplicarDatasLoteGuia = () => {
    if (!textoLoteGuiaInput.trim()) {
      setErroEdicaoLoteGuia('Por favor, informe ao menos uma data.');
      return;
    }
    const separadores = /[,;\n\r\t]+/;
    const partes = textoLoteGuiaInput
      .split(separadores)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const datasValidas: string[] = [];
    const erros: string[] = [];

    partes.forEach((p) => {
      const br = sanitizarEntradaDataBr(p);
      if (br) {
        datasValidas.push(br);
      } else {
        erros.push(`"${p}"`);
      }
    });

    if (erros.length > 0) {
      setErroEdicaoLoteGuia(`As seguintes datas não estão no padrão brasileiro dd/mm/aaaa: ${erros.join(', ')}`);
      return;
    }

    if (datasValidas.length === 0) {
      setErroEdicaoLoteGuia('Nenhuma data válida encontrada no formato dd/mm/aaaa.');
      return;
    }

    setDatasSessoesModalGuia(datasValidas);
    setAutomacaoDesativadaModalGuia(true);
    setModalEdicaoLoteGuiaAberto(false);
    setTextoLoteGuiaInput('');
    setErroEdicaoLoteGuia(null);
  };

  const guiasFiltradas = guias.filter((guia) => {
    if (statusFiltro !== 'TODOS' && guia.status !== statusFiltro) return false;

    // Filtro rápido para mostrar apenas guias com campos em branco
    if (apenasIncompletas && !temCampoEmBranco(guia)) return false;

    // Filtro por Data Início / Fim (Período)
    if (filtroDataInicio && (guia.dataColocacaoPasta < filtroDataInicio && (guia.dataDigitacao || '') < filtroDataInicio)) {
      return false;
    }
    if (filtroDataFim && (guia.dataColocacaoPasta > filtroDataFim && (guia.dataDigitacao || '') > filtroDataFim)) {
      return false;
    }

    // Busca Global
    if (busca.trim()) {
      const matchNum = matchTextFilter(guia.numeroGuia, busca);
      const matchConta = matchTextFilter(guia.numeroConta, busca);
      const matchPac = matchTextFilter(guia.pacienteNome, busca);
      const matchPrest = matchTextFilter(guia.prestadorNome, busca);
      const matchPasta = matchTextFilter(guia.pastaDoutora, busca);
      const matchRespPasta = matchTextFilter(guia.responsavelColocacaoPasta, busca);
      const matchRespDig = matchTextFilter(guia.responsavelDigitacao, busca);
      const matchRespAss = matchTextFilter(guia.responsavelColherAssinatura || guia.responsavelColherGuia, busca);
      const matchPolo = matchTextFilter(guia.polo, busca);
      const matchDataAut = matchDateFilter(guia.dataAutorizacao, busca);
      const matchDataPasta = matchDateFilter(guia.dataColocacaoPasta, busca);
      const matchDataDig = matchDateFilter(guia.dataDigitacao, busca);
      const matchDataRet = matchDateFilter(guia.dataRetorno, busca);

      const buscaIncompleto = busca.toLowerCase().includes('branco') || busca.toLowerCase().includes('incomplet');
      const matchBranco = buscaIncompleto && temCampoEmBranco(guia);

      if (
        !matchNum &&
        !matchConta &&
        !matchPac &&
        !matchPrest &&
        !matchPasta &&
        !matchRespPasta &&
        !matchRespDig &&
        !matchRespAss &&
        !matchPolo &&
        !matchDataAut &&
        !matchDataPasta &&
        !matchDataDig &&
        !matchDataRet &&
        !matchBranco
      ) {
        return false;
      }
    }

    // Filtros de Coluna Individuais
    if (filtrosColunas.classificacao) {
      if (filtrosColunas.classificacao === 'EM_BRANCO') {
        if (!isEmBranco(guia.classificacao)) return false;
      } else if ((guia.classificacao || 'ABA') !== filtrosColunas.classificacao) {
        return false;
      }
    }

    if (filtrosColunas.numeroGuia) {
      if (filtrosColunas.numeroGuia === 'EM_BRANCO' || filtrosColunas.numeroGuia.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.numeroGuia) && !isEmBranco(guia.numeroConta)) return false;
      } else {
        const matchNum = matchTextFilter(guia.numeroGuia, filtrosColunas.numeroGuia);
        const matchConta = matchTextFilter(guia.numeroConta, filtrosColunas.numeroGuia);
        if (!matchNum && !matchConta) return false;
      }
    }

    if (filtrosColunas.paciente && !matchTextFilter(guia.pacienteNome, filtrosColunas.paciente)) {
      return false;
    }

    if (filtrosColunas.dataAutorizacao) {
      if (filtrosColunas.dataAutorizacao === 'EM_BRANCO' || filtrosColunas.dataAutorizacao.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.dataAutorizacao)) return false;
      } else if (!matchDateFilter(guia.dataAutorizacao, filtrosColunas.dataAutorizacao)) {
        return false;
      }
    }

    if (filtrosColunas.dataColocacaoPasta) {
      if (filtrosColunas.dataColocacaoPasta === 'EM_BRANCO' || filtrosColunas.dataColocacaoPasta.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.dataColocacaoPasta)) return false;
      } else if (!matchDateFilter(guia.dataColocacaoPasta, filtrosColunas.dataColocacaoPasta)) {
        return false;
      }
    }

    if (filtrosColunas.pastaDoutora) {
      if (filtrosColunas.pastaDoutora === 'EM_BRANCO' || filtrosColunas.pastaDoutora.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.pastaDoutora) && !isEmBranco(guia.prestadorNome)) return false;
      } else if (!matchTextFilter(guia.pastaDoutora, filtrosColunas.pastaDoutora)) {
        return false;
      }
    }

    if (filtrosColunas.polo) {
      if (filtrosColunas.polo === 'EM_BRANCO') {
        if (!isEmBranco(guia.polo)) return false;
      } else if (!matchTextFilter(guia.polo, filtrosColunas.polo)) {
        return false;
      }
    }

    if (filtrosColunas.responsavelColocacaoPasta) {
      if (filtrosColunas.responsavelColocacaoPasta === 'EM_BRANCO' || filtrosColunas.responsavelColocacaoPasta.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.responsavelColocacaoPasta)) return false;
      } else if (!matchTextFilter(guia.responsavelColocacaoPasta, filtrosColunas.responsavelColocacaoPasta)) {
        return false;
      }
    }

    if (filtrosColunas.dataRetorno) {
      if (filtrosColunas.dataRetorno === 'EM_BRANCO' || filtrosColunas.dataRetorno.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.dataRetorno)) return false;
      } else if (!matchDateFilter(guia.dataRetorno, filtrosColunas.dataRetorno)) {
        return false;
      }
    }

    if (filtrosColunas.dataDigitacao) {
      if (filtrosColunas.dataDigitacao === 'EM_BRANCO' || filtrosColunas.dataDigitacao.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.dataDigitacao)) return false;
      } else if (!matchDateFilter(guia.dataDigitacao, filtrosColunas.dataDigitacao)) {
        return false;
      }
    }

    if (filtrosColunas.responsavelDigitacao) {
      if (filtrosColunas.responsavelDigitacao === 'EM_BRANCO' || filtrosColunas.responsavelDigitacao.toLowerCase().includes('branco')) {
        if (!isEmBranco(guia.responsavelDigitacao)) return false;
      } else if (!matchTextFilter(guia.responsavelDigitacao, filtrosColunas.responsavelDigitacao)) {
        return false;
      }
    }

    if (filtrosColunas.assinada) {
      if (filtrosColunas.assinada === 'EM_BRANCO') {
        if (!isEmBranco(guia.assinada)) return false;
      } else if (guia.assinada !== filtrosColunas.assinada) {
        return false;
      }
    }

    if (filtrosColunas.responsavelColherAssinatura) {
      if (filtrosColunas.responsavelColherAssinatura === 'EM_BRANCO') {
        if (!isEmBranco(guia.responsavelColherAssinatura) && !isEmBranco(guia.responsavelColherGuia)) return false;
      } else if (
        !matchTextFilter(
          guia.responsavelColherAssinatura || guia.responsavelColherGuia,
          filtrosColunas.responsavelColherAssinatura
        )
      ) {
        return false;
      }
    }

    return true;
  });

  const autorizacoesConcluidasFiltradas = autorizacoesConcluidas.filter((aut) => {
    if (!busca) return true;
    const t = busca.toLowerCase();
    return (
      aut.pacienteNome.toLowerCase().includes(t) ||
      aut.procedimento.toLowerCase().includes(t) ||
      aut.prestador.toLowerCase().includes(t) ||
      aut.responsavel.toLowerCase().includes(t)
    );
  });

  const handleSelecionarProcedimento = (codigo: string) => {
    setCodigoProcedimentoSelecionado(codigo);
    const proc = todosProcedimentos.find((p) => p.codigo === codigo);
    if (proc) {
      setNovoProcedimento(proc.descricao);
      if (!proc.permiteDigitacao) {
        setErroBloqueioProcedimento(
          `REGRA CLÍNICA MEFISA: "${proc.descricao}" (cód. ${proc.codigo}) é uma Avaliação/Reavaliação e NÃO PODE ser colocada em Digitações operacionais.`
        );
      } else {
        setErroBloqueioProcedimento(null);
      }
    }
  };

  const handleAbrirModalNovo = () => {
    const hojeIso = new Date().toISOString().split('T')[0];
    setNovaClassificacao('ABA');
    setNovoNumeroGuia('');
    setNovoNumeroConta('');
    setNovoPaciente(''); // VAZIO: Único campo de texto obrigatório!
    setNovoConvenio('');
    setCodigoProcedimentoSelecionado('');
    setNovoProcedimento('');
    setNovoPrestador('');
    setNovaPastaDoutora('');
    setNovoPolo('' as any);
    setNovaDataAutorizacao('');
    setNovaDataColocacaoPasta('');
    setNovoResponsavelColocacaoPasta('');
    setNovaDataRetorno('');
    setNovaDataDigitacao(hojeIso); // Data do Faturamento é o ÚNICO campo pré-preenchido por padrão!
    setNovoResponsavelDigitacao('');
    setNovaAssinada('' as any);
    setNovoResponsavelColherAssinatura('');
    setNovoStatus('DIGITADA_FATURADA');
    setNovasObservacoes('');
    setResultadoDuplicidade(null);
    setErroBloqueioProcedimento(null);
    setJustificativaDuplicidade('');
    setModalNovoAberto(true);
  };

  const handleValidarERegistrarGuia = () => {
    if (!novoPaciente.trim()) {
      alert('Por favor, digite o Nome do Paciente manualmente. Este campo é obrigatório.');
      return;
    }

    if (codigoProcedimentoSelecionado) {
      const validacaoProc = ProcedimentosService.validarInclusaoEmDigitacao(codigoProcedimentoSelecionado);
      if (!validacaoProc.permitido) {
        setErroBloqueioProcedimento(
          validacaoProc.motivoBloqueio || 'Este procedimento é exclusivo de Autorização prévia e está BLOQUEADO para digitação de guias.'
        );
        return;
      }
    }

    if (novoNumeroGuia.trim()) {
      const baseVerificacao = guias.map((g) => ({
        id: g.id,
        pacienteNome: g.pacienteNome,
        procedimentoNome: g.procedimentoNome || novoProcedimento,
        dataSessao: g.dataDigitacao || g.dataAutorizacao || '',
        numeroGuia: g.numeroGuia,
        status: g.status,
      }));

      const validacao = validarDuplicidadeGuia(
        {
          pacienteNome: novoPaciente,
          procedimentoNome: novoProcedimento,
          dataSessao: novaDataDigitacao || novaDataAutorizacao || '',
          numeroGuia: novoNumeroGuia,
        },
        baseVerificacao
      );

      setResultadoDuplicidade(validacao);

      if (validacao.duplicada && !justificativaDuplicidade.trim()) {
        return;
      }
    }

    concluirCadastroGuia();
  };

  const concluirCadastroGuia = () => {
    if (!novoPaciente.trim()) {
      alert('Por favor, informe o Nome do Paciente manualmente.');
      return;
    }

    const novaGuia: GuiaDigitacao = {
      id: `guia-manual-${Date.now()}`,
      classificacao: novaClassificacao || 'ABA',
      numeroGuia: novoNumeroGuia.trim(),
      numeroConta: novoNumeroConta.trim() || undefined,
      autorizacaoId: `aut-manual-${Date.now()}`,
      pacienteId: `pac-manual-${Date.now()}`,
      pacienteNome: novoPaciente.trim(),
      procedimentoNome: novoProcedimento.trim() || undefined,
      prestadorId: 'prest-1',
      prestadorNome: novoPrestador.trim(),
      convenioNome: novoConvenio.trim(),
      dataAutorizacao: novaDataAutorizacao.trim(),
      dataColocacaoPasta: novaDataColocacaoPasta.trim(),
      pastaDoutora: novaPastaDoutora.trim(),
      duracaoHoras: 1 as const,
      polo: novoPolo || undefined,
      responsavelColocacaoPasta: novoResponsavelColocacaoPasta.trim(),
      dataRetorno: novaDataRetorno.trim() || undefined,
      responsavelColherGuia: novoResponsavelColherAssinatura.trim() || undefined,
      responsavelColherAssinatura: novoResponsavelColherAssinatura.trim() || undefined,
      dataDigitacao: novaDataDigitacao.trim() || undefined,
      responsavelDigitacao: novoResponsavelDigitacao.trim() || undefined,
      status: novoStatus || 'DIGITADA_FATURADA',
      duplicidadeDetectada: false,
      assinada: novaAssinada || undefined,
      observacoes: novasObservacoes.trim() || undefined,
    };

    const listaNova = [novaGuia, ...guias];
    setGuias(listaNova);
    salvarGuiasStorage(listaNova);
    setModalNovoAberto(false);
    setResultadoDuplicidade(null);
    setErroBloqueioProcedimento(null);
    alert(`Guia ${novaGuia.numeroGuia} (${novaGuia.classificacao}) registrada em Faturamentos com sucesso!`);
  };

  const handleDeletarGuiasSelecionadas = () => {
    if (idsGuiasSelecionadas.length === 0) return;
    const novasGuias = guias.filter((g) => !idsGuiasSelecionadas.includes(g.id));
    setGuias(novasGuias);
    salvarGuiasStorage(novasGuias);
    setIdsGuiasSelecionadas([]);
  };

  const handleDeletarGuiaUnica = (id: string, numero: string) => {
    const novas = guias.filter((g) => g.id !== id);
    setGuias(novas);
    salvarGuiasStorage(novas);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Faturamentos & Rastreabilidade
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
              Sincronizado com Autorizações Concluídas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            Autorizações concluídas aparecem automaticamente aqui com dados prontos para cópia em 1 clique.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalProcedimentosAberto(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors shadow-2xs"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Procedimentos & Preços ABA</span>
          </button>

          <button
            onClick={handleAbrirModalNovo}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002172] hover:bg-[#001752] text-white rounded-xl font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4 text-[#91CA0C]" />
            <span>+ Nova Guia / Digitação</span>
          </button>

          {idsGuiasSelecionadas.length > 0 && (
            <button
              onClick={handleDeletarGuiasSelecionadas}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs animate-in fade-in"
            >
              <X className="w-4 h-4" />
              <span>Deletar Selecionadas ({idsGuiasSelecionadas.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO 1: AUTORIZAÇÕES CONCLUÍDAS (SEPARADAS POR DATA DA ÚLTIMA SESSÃO) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4.5 h-4.5 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white font-['Quicksand']">
              Autorizações Concluídas ({autorizacoesConcluidas.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Regra Mefisa: Apenas guias cujas sessões já foram totalmente concluídas até hoje ({formatarDataBr(new Date().toISOString().split('T')[0], showMonthInitials)}) podem ser digitadas.
          </span>
        </div>

        {(() => {
          const autorizacoesComDigitabilidade = autorizacoesConcluidasFiltradas.map((aut) => ({
            aut,
            info: obterStatusDigitabilidadeGuia(aut),
          }));

          const autorizacoesLiberadas = autorizacoesComDigitabilidade.filter((item) => item.info.podeDigitar);
          const autorizacoesAguardandoFuturo = autorizacoesComDigitabilidade.filter((item) => !item.info.podeDigitar);

          if (autorizacoesConcluidasFiltradas.length === 0) {
            return (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                Nenhuma autorização concluída encontrada até o momento.
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {/* GRUPO 1: LIBERADAS PARA DIGITAÇÃO AGORA ✨ (COM BRILHO ESMERALDA) */}
              {autorizacoesLiberadas.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-800 dark:text-emerald-300 font-['Quicksand']">
                    <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>
                      Liberadas para Digitação Agora ({autorizacoesLiberadas.length}) — Todas as sessões concluídas até hoje
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {autorizacoesLiberadas.map(({ aut, info }) => {
                      const isAssinadaSim = aut.assinada === 'SIM';
                      return (
                        <div
                          key={aut.id}
                          onClick={() => handleAbrirDrawerGuiaConcluida(aut)}
                          className={`p-4 rounded-2xl border shadow-sm transition-all space-y-3 group relative overflow-hidden cursor-pointer ${
                            isAssinadaSim
                              ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700/80 hover:border-emerald-500 shadow-emerald-500/10'
                              : 'bg-white dark:bg-slate-900 border-red-300 dark:border-red-800/80 hover:border-red-500 shadow-red-500/10'
                          }`}
                        >
                          {/* Cabeçalho Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                              Guia Pronta
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                isAssinadaSim
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30'
                              }`}
                            >
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>{isAssinadaSim ? 'Liberada' : 'Pend. Assinatura'}</span>
                            </span>
                          </div>

                          {/* Paciente e Procedimento */}
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1" title={aut.pacienteNome}>
                              {aut.pacienteNome}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-slate-600 dark:text-slate-300 truncate" title={aut.procedimento}>
                                {aut.procedimento}
                              </span>
                              <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
                                {obterSessoesPorSemanaPaciente(aut)} sessões/sem
                              </span>
                            </div>
                          </div>

                          {/* Banner de Sessão Concluída */}
                          <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl text-xs font-semibold text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Última Sessão:</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100 text-xs">{info.dataUltimaSessaoBr}</span>
                          </div>

                          {/* Mini Grid com Autorizado em e Por Quem */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-medium">Autorizado em</span>
                              <strong className="block text-slate-800 dark:text-slate-200 font-mono font-bold mt-0.5">
                                {formatarDataBr(aut.dataAutorizacao || aut.dataSolicitacao, showMonthInitials)}
                              </strong>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-medium">Por quem</span>
                              <strong className="block text-slate-800 dark:text-slate-200 font-semibold truncate mt-0.5" title={aut.responsavel}>
                                {aut.responsavel}
                              </strong>
                            </div>
                          </div>

                          {/* Controles da Assinatura no próprio Card */}
                          <div
                            className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Guia Assinada?</span>
                              <select
                                value={aut.assinada || 'NAO'}
                                onChange={(e) => handleUpdateAutorizacaoSignature(aut.id, 'assinada', e.target.value)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                                  aut.assinada === 'SIM'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                                }`}
                              >
                                <option value="SIM">Sim</option>
                                <option value="PARCIAL">Parcial</option>
                                <option value="NAO">Não</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs shrink-0">Resp. Colher</span>
                              <select
                                value={aut.responsavelColherAssinatura || ''}
                                onChange={(e) =>
                                  handleUpdateAutorizacaoSignature(aut.id, 'responsavelColherAssinatura', e.target.value)
                                }
                                className="w-full text-[11px] px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Selecione funcionário...</option>
                                {funcionarios.map((f) => (
                                  <option key={f.id} value={f.nome}>
                                    {f.nome} ({f.departamento || f.papel})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GRUPO 2: AGUARDANDO CONCLUSÃO DE SESSÕES FUTURAS ⏳ (BLOQUEADAS PARA DIGITAÇÃO) */}
              {autorizacoesAguardandoFuturo.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300 font-['Quicksand']">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>
                      Aguardando Conclusão de Sessões Futuras ({autorizacoesAguardandoFuturo.length}) — Digitação Bloqueada até a última sessão
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {autorizacoesAguardandoFuturo.map(({ aut, info }) => {
                      return (
                        <div
                          key={aut.id}
                          onClick={() => handleAbrirDrawerGuiaConcluida(aut)}
                          className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 shadow-sm hover:border-amber-400 transition-all space-y-3 group relative overflow-hidden cursor-pointer"
                        >
                          {/* Cabeçalho Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                              Sessões em Andamento
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                              <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Aguardando</span>
                            </span>
                          </div>

                          {/* Paciente e Procedimento */}
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1" title={aut.pacienteNome}>
                              {aut.pacienteNome}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-slate-600 dark:text-slate-300 truncate" title={aut.procedimento}>
                                {aut.procedimento}
                              </span>
                              <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                                {obterSessoesPorSemanaPaciente(aut)} sessões/sem
                              </span>
                            </div>
                          </div>

                          {/* Banner de Bloqueio por Sessão Futura */}
                          <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Última Sessão:</span>
                            </span>
                            <span className="font-mono font-bold text-amber-950 dark:text-amber-100 text-xs">{info.dataUltimaSessaoBr}</span>
                          </div>

                          {/* Mini Grid com Autorizado em e Faltam */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-medium">Autorizado em</span>
                              <strong className="block text-slate-800 dark:text-slate-200 font-mono font-bold mt-0.5">
                                {formatarDataBr(aut.dataAutorizacao || aut.dataSolicitacao, showMonthInitials)}
                              </strong>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/50">
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">Faltam</span>
                              <strong className="block text-amber-800 dark:text-amber-300 font-mono font-bold mt-0.5">
                                {info.diasAteUltimaSessao} dia(s)
                              </strong>
                            </div>
                          </div>

                          {/* Controles da Assinatura */}
                          <div
                            className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs">Guia Assinada?</span>
                              <select
                                value={aut.assinada || 'NAO'}
                                onChange={(e) => handleUpdateAutorizacaoSignature(aut.id, 'assinada', e.target.value)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                                  aut.assinada === 'SIM'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                                }`}
                              >
                                <option value="SIM">Sim</option>
                                <option value="PARCIAL">Parcial</option>
                                <option value="NAO">Não</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-600 dark:text-slate-400 text-xs shrink-0">Resp. Colher</span>
                              <select
                                value={aut.responsavelColherAssinatura || ''}
                                onChange={(e) =>
                                  handleUpdateAutorizacaoSignature(aut.id, 'responsavelColherAssinatura', e.target.value)
                                }
                                className="w-full text-[11px] px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Selecione funcionário...</option>
                                {funcionarios.map((f) => (
                                  <option key={f.id} value={f.nome}>
                                    {f.nome} ({f.departamento || f.papel})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* SEÇÃO 2: TABELA PADRÃO DE DIGITAÇÃO DE GUIAS */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        {/* Banner Alerta de Guias Incompletas (Campos em Branco) */}
        {(() => {
          const guiasIncompletasCount = guias.filter(temCampoEmBranco).length;
          if (guiasIncompletasCount === 0) return null;
          return (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900 dark:text-red-200 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/80 border border-red-300 dark:border-red-700 flex items-center justify-center text-red-600 dark:text-red-300 shrink-0 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-red-900 dark:text-red-100 flex items-center gap-1.5">
                    <span>Aviso de Inconsistência Operacional</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700">
                      {guiasIncompletasCount} guia(s) com dados em branco
                    </span>
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                    Campos pendentes estão destacados em células vermelhas na lista abaixo. Clique no campo para preencher.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApenasIncompletas(!apenasIncompletas)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  apenasIncompletas
                    ? 'bg-red-700 hover:bg-red-800 text-white shadow-xs ring-2 ring-red-400'
                    : 'bg-red-100 dark:bg-red-900/90 text-red-900 dark:text-red-100 hover:bg-red-200 border border-red-300 dark:border-red-700'
                }`}
              >
                {apenasIncompletas ? '✓ Mostrando Apenas Incompletas' : '🔍 Filtrar Apenas Guias Incompletas'}
              </button>
            </div>
          );
        })()}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white font-['Quicksand'] flex items-center gap-2">
            <span>Histórico Operacional de Guias Digitadas & Faturamento ({guiasFiltradas.length})</span>
            {apenasIncompletas && (
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white">
                Filtro Incompletas Ativo
              </span>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Buscar guias..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
              />
            </div>

            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              title="Data Início"
              className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
            />
            <span className="text-slate-400 text-xs">até</span>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              title="Data Fim"
              className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
            />

            {temFiltrosAtivos && (
              <button
                onClick={limparFiltros}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <TopScrollTableWrapper tableTitle="Lista de Guias & Faturamentos">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px]">
                <th className="p-3 w-10 align-top">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-[#002172] focus:ring-[#002172] cursor-pointer mt-1"
                    checked={guiasFiltradas.length > 0 && idsGuiasSelecionadas.length === guiasFiltradas.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIdsGuiasSelecionadas(guiasFiltradas.map((g) => g.id));
                      } else {
                        setIdsGuiasSelecionadas([]);
                      }
                    }}
                  />
                </th>

                {/* Coluna 1: Classificação (ABA / CONV.) */}
                <th className="p-3">
                  <div>1. Classificação</div>
                  <select
                    value={filtrosColunas.classificacao}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, classificacao: e.target.value })}
                    className="mt-1 w-full px-1 py-1 text-[10px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600 cursor-pointer"
                  >
                    <option value="">Todas</option>
                    <option value="ABA">ABA</option>
                    <option value="CONV.">CONV.</option>
                  </select>
                </th>

                {/* Coluna 2: Nº da Guia / Conta */}
                <th className="p-3">
                  <div>2. Nº Guia / Conta</div>
                  <input
                    type="text"
                    placeholder="Guia ou conta..."
                    value={filtrosColunas.numeroGuia}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, numeroGuia: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 3: Paciente */}
                <th className="p-3">
                  <div>3. Paciente</div>
                  <input
                    type="text"
                    placeholder="Filtrar paciente..."
                    value={filtrosColunas.paciente}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, paciente: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 4: Data da Autorização */}
                <th className="p-3">
                  <div>4. Data Autorização</div>
                  <input
                    type="text"
                    placeholder="Data aut..."
                    value={filtrosColunas.dataAutorizacao}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, dataAutorizacao: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 5: Data de quando subiu na pasta */}
                <th className="p-3">
                  <div>5. Subiu na Pasta</div>
                  <input
                    type="text"
                    placeholder="Data pasta..."
                    value={filtrosColunas.dataColocacaoPasta}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, dataColocacaoPasta: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 6: Doutora Mefisa dona da pasta */}
                <th className="p-3">
                  <div>6. Doutora Mefisa (Pasta)</div>
                  <input
                    type="text"
                    placeholder="Doutora dona..."
                    value={filtrosColunas.pastaDoutora}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, pastaDoutora: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 7: Polo */}
                <th className="p-3">
                  <div>7. Polo</div>
                  <select
                    value={filtrosColunas.polo}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, polo: e.target.value })}
                    className="mt-1 w-full px-1 py-1 text-[10px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  >
                    <option value="">Todos</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                    <option value="ON">ON</option>
                  </select>
                </th>

                {/* Coluna 8: O Responsável por colocar na pasta */}
                <th className="p-3">
                  <div>8. Resp. Colocar Pasta</div>
                  <input
                    type="text"
                    placeholder="Resp. pasta..."
                    value={filtrosColunas.responsavelColocacaoPasta}
                    onChange={(e) =>
                      setFiltrosColunas({ ...filtrosColunas, responsavelColocacaoPasta: e.target.value })
                    }
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 9: A data do retorno da guia */}
                <th className="p-3">
                  <div>9. Data Retorno Guia</div>
                  <input
                    type="text"
                    placeholder="Data retorno..."
                    value={filtrosColunas.dataRetorno}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, dataRetorno: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 10: Data do Faturamento */}
                <th className="p-3">
                  <div>10. Data Faturamento</div>
                  <input
                    type="text"
                    placeholder="Data faturamento..."
                    value={filtrosColunas.dataDigitacao}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, dataDigitacao: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 11: O Responsável pelo Faturamento */}
                <th className="p-3">
                  <div>11. Resp. Faturamento</div>
                  <input
                    type="text"
                    placeholder="Resp. faturamento..."
                    value={filtrosColunas.responsavelDigitacao}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, responsavelDigitacao: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-[10px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                </th>

                {/* Coluna 12: Se a guia foi assinada pelo responsável */}
                <th className="p-3">
                  <div>12. Guia Assinada?</div>
                  <select
                    value={filtrosColunas.assinada}
                    onChange={(e) => setFiltrosColunas({ ...filtrosColunas, assinada: e.target.value })}
                    className="mt-1 w-full px-1 py-1 text-[10px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                  >
                    <option value="">Todas</option>
                    <option value="SIM">Sim</option>
                    <option value="PARCIAL">Parcial</option>
                    <option value="NAO">Não</option>
                  </select>
                </th>

                {/* Coluna 13: O responsável por colher a assinatura */}
                <th className="p-3">
                  <div>13. Resp. Colher Assinatura</div>
                  <select
                    value={filtrosColunas.responsavelColherAssinatura}
                    onChange={(e) =>
                      setFiltrosColunas({ ...filtrosColunas, responsavelColherAssinatura: e.target.value })
                    }
                    className="mt-1 w-full px-1 py-1 text-[10px] font-normal bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600 cursor-pointer"
                  >
                    <option value="">Todos</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.nome}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </th>

                <th className="p-3 text-right">
                  <div>Ações</div>
                  <div className="mt-1 flex justify-end items-center h-6">
                    {temFiltrosAtivos && (
                      <button
                        onClick={limparFiltros}
                        title="Limpar todos os filtros"
                        className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {guiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400">
                    Nenhuma guia faturada encontrada.
                  </td>
                </tr>
              ) : (
                guiasFiltradas.map((guia) => {
                  const isAssinadaSim = guia.assinada === 'SIM';
                  return (
                    <tr
                      key={guia.id}
                      className={`transition-colors border-b border-slate-200 dark:border-slate-800 ${
                        isAssinadaSim
                          ? CLASS_TABELA_LISTRADA_ROW
                          : 'bg-red-50/90 dark:bg-red-950/40 hover:bg-red-100/80 dark:hover:bg-red-900/60 border-l-4 border-l-red-500 font-medium text-red-950 dark:text-red-100'
                      }`}
                    >
                      <td className="p-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-[#002172] focus:ring-[#002172] cursor-pointer"
                          checked={idsGuiasSelecionadas.includes(guia.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setIdsGuiasSelecionadas([...idsGuiasSelecionadas, guia.id]);
                            } else {
                              setIdsGuiasSelecionadas(idsGuiasSelecionadas.filter((id) => id !== guia.id));
                            }
                          }}
                        />
                      </td>

                      {/* 1. Classificação (ABA / CONV.) */}
                      <td className="p-3">
                        <select
                          value={guia.classificacao || 'ABA'}
                          onChange={(e) => handleUpdateGuiaField(guia.id, 'classificacao', e.target.value)}
                          className={`font-bold text-[10px] px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                            (guia.classificacao || 'ABA') === 'ABA'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border-indigo-300'
                          }`}
                        >
                          <option value="ABA">ABA</option>
                          <option value="CONV.">CONV.</option>
                        </select>
                      </td>

                      {/* 2. N° da Guia / Conta */}
                      <td className="p-3 font-mono">
                        {isEmBranco(guia.numeroGuia) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 text-[10px] font-bold inline-flex items-center gap-1">
                            ⚠️ Guia em branco
                          </span>
                        ) : (
                          <div className="font-bold text-[#002172] dark:text-blue-400">{guia.numeroGuia}</div>
                        )}
                        {isEmBranco(guia.numeroConta) ? (
                          <div className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-0.5">
                            ⚠️ Conta em branco
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                            Conta: {guia.numeroConta}
                          </div>
                        )}
                      </td>

                      {/* 3. Paciente */}
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        <div>{guia.pacienteNome}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {isEmBranco(guia.procedimentoNome) ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">⚠️ Proc. em branco</span>
                          ) : (
                            guia.procedimentoNome
                          )}{' '}
                          ·{' '}
                          {isEmBranco(guia.convenioNome) ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">⚠️ Convênio em branco</span>
                          ) : (
                            guia.convenioNome
                          )}
                        </div>
                      </td>

                      {/* 4. Data da Autorização */}
                      <td className="p-3 font-mono text-[11px]">
                        {isEmBranco(guia.dataAutorizacao) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            ⚠️ Em branco
                          </span>
                        ) : (
                          formatarDataBr(guia.dataAutorizacao, showMonthInitials)
                        )}
                      </td>

                      {/* 5. Data de quando subiu na pasta */}
                      <td className="p-3 font-mono text-[11px]">
                        {isEmBranco(guia.dataColocacaoPasta) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            ⚠️ Em branco
                          </span>
                        ) : (
                          formatarDataBr(guia.dataColocacaoPasta, showMonthInitials)
                        )}
                      </td>

                      {/* 6. Doutora Mefisa dona da pasta */}
                      <td className="p-3">
                        {isEmBranco(guia.pastaDoutora) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px] block w-max mb-0.5">
                            ⚠️ Pasta em branco
                          </span>
                        ) : (
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{guia.pastaDoutora}</div>
                        )}
                        {isEmBranco(guia.prestadorNome) ? (
                          <div className="text-[10px] text-red-600 dark:text-red-400 font-bold">⚠️ Prestador em branco</div>
                        ) : (
                          <div className="text-[10px] text-slate-400">{guia.prestadorNome}</div>
                        )}
                      </td>

                      {/* 7. Polo */}
                      <td className="p-3 font-bold">
                        {isEmBranco(guia.polo) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            ⚠️ Em branco
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {guia.polo}
                          </span>
                        )}
                      </td>

                      {/* 8. O Responsável por colocar na pasta */}
                      <td className="p-3">
                        {isEmBranco(guia.responsavelColocacaoPasta) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            ⚠️ Em branco
                          </span>
                        ) : (
                          guia.responsavelColocacaoPasta
                        )}
                      </td>

                      {/* 9. A data do retorno da guia (editável manualmente pós faturamento) */}
                      <td className="p-3 font-mono">
                        <input
                          type="date"
                          value={guia.dataRetorno || ''}
                          onChange={(e) => handleUpdateGuiaField(guia.id, 'dataRetorno', e.target.value)}
                          title="Data do retorno da guia (colocada manualmente)"
                          className={`px-1.5 py-0.5 text-[11px] rounded font-mono border ${
                            isEmBranco(guia.dataRetorno)
                              ? 'bg-red-50 dark:bg-red-950/80 border-red-400 text-red-800 dark:text-red-200 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white'
                          }`}
                        />
                        {isEmBranco(guia.dataRetorno) && (
                          <div className="text-[9px] text-red-600 dark:text-red-400 font-bold mt-0.5">⚠️ Em branco</div>
                        )}
                      </td>

                      {/* 10. Data do Faturamento */}
                      <td className="p-3 font-mono text-[11px]">
                        {isEmBranco(guia.dataDigitacao) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            ⚠️ Em branco
                          </span>
                        ) : (
                          formatarDataBr(guia.dataDigitacao, showMonthInitials)
                        )}
                      </td>

                      {/* 11. O Responsável pelo Faturamento */}
                      <td className="p-3">
                        {isEmBranco(guia.responsavelDigitacao) ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            ⚠️ Em branco
                          </span>
                        ) : (
                          guia.responsavelDigitacao
                        )}
                      </td>

                      {/* 12. Se a guia foi assinada pelo responsável */}
                      <td className="p-3">
                        <select
                          value={guia.assinada || ''}
                          onChange={(e) => handleUpdateGuiaField(guia.id, 'assinada', e.target.value)}
                          className={`font-bold text-[10px] px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                            isEmBranco(guia.assinada)
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200 border-red-400 font-black'
                              : guia.assinada === 'SIM'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300'
                          }`}
                        >
                          <option value="">⚠️ Em branco</option>
                          <option value="SIM">Sim</option>
                          <option value="PARCIAL">Parcial</option>
                          <option value="NAO">Não</option>
                        </select>
                      </td>

                      {/* 13. O responsável por colher a assinatura */}
                      <td className="p-3">
                        <select
                          value={guia.responsavelColherAssinatura || guia.responsavelColherGuia || ''}
                          onChange={(e) =>
                            handleUpdateGuiaField(guia.id, 'responsavelColherAssinatura', e.target.value)
                          }
                          className={`w-36 text-[11px] px-2 py-1 rounded-lg border font-medium cursor-pointer ${
                            isEmBranco(guia.responsavelColherAssinatura) && isEmBranco(guia.responsavelColherGuia)
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200 border-red-400 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white'
                          }`}
                        >
                          <option value="">⚠️ Em branco</option>
                          {funcionarios.map((f) => (
                            <option key={f.id} value={f.nome}>
                              {f.nome}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAbrirModalSessoesGuia(guia)}
                            title="Visualizar e Editar Datas das Sessões desta Guia Faturada"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#002172] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#002172] dark:text-blue-300" />
                            <span className="font-mono text-[11px] font-bold">
                              {obterDatasSessoesGuia(guia).length} {obterDatasSessoesGuia(guia).length === 1 ? 'sessão' : 'sessões'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeletarGuiaUnica(guia.id, guia.numeroGuia)}
                            title="Deletar Guia do Faturamento"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300 transition-colors cursor-pointer"
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

      {/* ABA LATERAL (DRAWER) COM OS 12 ITENS E CÓPIA EM 1 CLIQUE */}
      {guiaSelecionadaDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Header Drawer */}
            <div className="bg-[#002172] text-white p-5 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-200 font-mono">
                  Guia Autorizada Concluída
                </span>
                <h3 className="font-bold text-lg font-['Quicksand']">{guiaSelecionadaDrawer.pacienteNome}</h3>
                <p className="text-xs text-blue-100">
                  {guiaSelecionadaDrawer.procedimento} · Autorizado em {formatarDataBr(guiaSelecionadaDrawer.dataAutorizacao || guiaSelecionadaDrawer.dataSolicitacao, showMonthInitials)} · {obterSessoesPorSemanaPaciente(guiaSelecionadaDrawer)} {obterSessoesPorSemanaPaciente(guiaSelecionadaDrawer) === 1 ? 'sessão/sem' : 'sessões/sem'}
                </p>
              </div>
              <button
                onClick={() => setGuiaSelecionadaDrawer(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com os 12 Itens e Cópia em 1 Clique */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-[11px] text-blue-900 dark:text-blue-200">
                ✨ Clique no botão <strong>Copiar</strong> ao lado de cada item para copiar instantaneamente para a área de transferência.
              </div>

              <div className="space-y-3">
                {/* 1. Carteirinha */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">1. Carteirinha do Paciente</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{guiaSelecionadaDrawer.carteirinha}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(guiaSelecionadaDrawer.carteirinha, 'cart')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'cart' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'cart' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 2. Número da Guia */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">2. Número da Guia</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{guiaSelecionadaDrawer.numeroAutorizacao || 'N/A'}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(guiaSelecionadaDrawer.numeroAutorizacao || 'N/A', 'numeroGuia')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'numeroGuia' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'numeroGuia' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 3. Senha */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">3. Senha da Autorização</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{guiaSelecionadaDrawer.senha || 'SENHA-EXEMPLO-99'}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(guiaSelecionadaDrawer.senha || 'SENHA-EXEMPLO-99', 'senha')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'senha' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'senha' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 4. Data da Autorização */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">4. Data da Autorização</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{formatarDataBr(guiaSelecionadaDrawer.dataAutorizacao || guiaSelecionadaDrawer.dataSolicitacao, showMonthInitials)}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(formatarDataBr(guiaSelecionadaDrawer.dataAutorizacao || guiaSelecionadaDrawer.dataSolicitacao, showMonthInitials), 'dataAut')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'dataAut' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'dataAut' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 5. Data da Validade da Senha */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">5. Data da Validade da Senha</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{formatarDataBr(guiaSelecionadaDrawer.dataValidadeSenha || '2026-11-28', showMonthInitials)}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(formatarDataBr(guiaSelecionadaDrawer.dataValidadeSenha || '2026-11-28', showMonthInitials), 'valSenha')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'valSenha' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'valSenha' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 6. Nome do Prestador */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">6. Nome do Prestador</span>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{guiaSelecionadaDrawer.prestador}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(guiaSelecionadaDrawer.prestador, 'prestador')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'prestador' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'prestador' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 7. UF do Prestador */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">7. UF do Prestador</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">SP</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique('SP', 'uf')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'uf' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'uf' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 8. CRM do Prestador */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">8. Número do CRM / Registro</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{guiaSelecionadaDrawer.crm || '06/12345'}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(guiaSelecionadaDrawer.crm || '06/12345', 'crm')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'crm' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'crm' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 9. CBO do Prestador */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">9. CBO do Prestador</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{sanitizarCbo(guiaSelecionadaDrawer.cbo) || '251510'}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(sanitizarCbo(guiaSelecionadaDrawer.cbo) || '251510', 'cbo')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'cbo' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'cbo' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 10. Data da Solicitação */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">10. Data da Solicitação</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{formatarDataBr(guiaSelecionadaDrawer.dataSolicitacao, showMonthInitials)}</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique(formatarDataBr(guiaSelecionadaDrawer.dataSolicitacao, showMonthInitials), 'dataSol')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'dataSol' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'dataSol' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 11. Indicação Clínica */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">11. Indicação Clínica</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">F84</div>
                  </div>
                  <button
                    onClick={() => handleCopiar1Clique('F84', 'indicacao')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0"
                  >
                    {copiadoChave === 'indicacao' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoChave === 'indicacao' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* 12. Datas das Sessões Calculadas e Editáveis */}
                {(() => {
                  const sessoesPorSemanaDrawer = obterSessoesPorSemanaPaciente(guiaSelecionadaDrawer);
                  const datasPadraoOriginais = calcularDatasSessoes(
                    guiaSelecionadaDrawer.dataAutorizacao || guiaSelecionadaDrawer.dataSolicitacao,
                    guiaSelecionadaDrawer.quantidadeSolicitada,
                    guiaSelecionadaDrawer.pacienteNome || guiaSelecionadaDrawer.pacienteId,
                    sessoesPorSemanaDrawer,
                    temFaltasJustificadasDrawer ? datasFaltasDrawer : undefined,
                    modoFaltasDrawer
                  );
                  const datasSessoes = automacaoDesativadaDrawer
                    ? datasSessoesDrawer
                    : (datasSessoesDrawer.length > 0 ? datasSessoesDrawer : datasPadraoOriginais);

                  return (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      {/* Bloco de Faltas Justificadas no Faturamento */}
                      <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 font-bold text-xs text-purple-950 dark:text-purple-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={temFaltasJustificadasDrawer}
                              onChange={(e) => setTemFaltasJustificadasDrawer(e.target.checked)}
                              className="w-4 h-4 rounded text-purple-700 focus:ring-purple-500 cursor-pointer"
                            />
                            <span>Considerar Faltas Justificadas no Ciclo Atual (Faturamento)</span>
                          </label>
                          <span className="text-[10px] bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 font-bold px-2 py-0.5 rounded-md">
                            Decisão do Usuário
                          </span>
                        </div>

                        {temFaltasJustificadasDrawer && (
                          <div className="space-y-3 pt-2 border-t border-purple-200/60 dark:border-purple-800/60 animate-fadeIn">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                                  Data da(s) sessão(ões) faltantes:
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={inputDataFaltaDrawer}
                                    onChange={(e) => setInputDataFaltaDrawer(e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-950 dark:text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (inputDataFaltaDrawer && !datasFaltasDrawer.includes(inputDataFaltaDrawer)) {
                                        setDatasFaltasDrawer([...datasFaltasDrawer, inputDataFaltaDrawer].sort());
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                                  >
                                    + Adicionar
                                  </button>
                                </div>

                                {/* Lista de Datas de Faltas Selecionadas no Drawer */}
                                {datasFaltasDrawer.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {datasFaltasDrawer.map((dtIso) => (
                                      <span
                                        key={dtIso}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 text-xs font-bold"
                                      >
                                        <span>📅 {formatarDataBr(dtIso, showMonthInitials)}</span>
                                        <button
                                          type="button"
                                          onClick={() => setDatasFaltasDrawer(datasFaltasDrawer.filter((d) => d !== dtIso))}
                                          className="text-purple-700 dark:text-purple-300 hover:text-red-600 font-extrabold text-xs ml-0.5 cursor-pointer"
                                          title="Remover esta data de falta"
                                        >
                                          ✕
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-purple-800/80 dark:text-purple-300/80 mt-1 italic">
                                    Nenhuma data de falta selecionada. Escolha a data acima.
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                                  Motivo da(s) Falta(s):
                                </label>
                                <input
                                  type="text"
                                  value={motivoFaltasDrawer}
                                  onChange={(e) => setMotivoFaltasDrawer(e.target.value)}
                                  placeholder="Ex: Atestado médico de saúde da criança"
                                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs text-slate-800 dark:text-white"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1.5">
                                Como o sistema deve processar estas faltas no faturamento?
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setModoFaltasDrawer('DESCONTAR_PROXIMA_AUTORIZACAO')}
                                  className={`p-2 rounded-xl border text-left transition-all ${
                                    modoFaltasDrawer === 'DESCONTAR_PROXIMA_AUTORIZACAO'
                                      ? 'bg-purple-900 dark:bg-purple-800 text-white border-purple-900 shadow-xs'
                                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                                  }`}
                                >
                                  <div className="font-bold text-[11px]">
                                    1. Descontar do Faturamento
                                  </div>
                                  <div className={`text-[10px] mt-0.5 ${modoFaltasDrawer === 'DESCONTAR_PROXIMA_AUTORIZACAO' ? 'text-purple-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Pula as {datasFaltasDrawer.length} falta(s) nas datas selecionadas da conta de faturamento.
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModoFaltasDrawer('MANTER_INTEGRAL_REPOSICAO_PRONTUARIO')}
                                  className={`p-2 rounded-xl border text-left transition-all ${
                                    modoFaltasDrawer === 'MANTER_INTEGRAL_REPOSICAO_PRONTUARIO'
                                      ? 'bg-purple-900 dark:bg-purple-800 text-white border-purple-900 shadow-xs'
                                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                                  }`}
                                >
                                  <div className="font-bold text-[11px]">
                                    2. Manter Quantidade Integral
                                  </div>
                                  <div className={`text-[10px] mt-0.5 ${modoFaltasDrawer === 'MANTER_INTEGRAL_REPOSICAO_PRONTUARIO' ? 'text-purple-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                    Solicita faturamento integral. Reposição clínica controlada em prontuário.
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            12. Datas das Sessões ({datasSessoes.length} {datasSessoes.length === 1 ? 'sessão' : 'sessões'})
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-100 text-[#002172] dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs"
                            title="Quantidade de sessões por semana que o paciente passa"
                          >
                            <Calendar className="w-3 h-3 text-[#002172] dark:text-blue-400" />
                            <span>
                              {sessoesPorSemanaDrawer} {sessoesPorSemanaDrawer === 1 ? 'sessão por semana' : 'sessões por semana'}
                            </span>
                          </span>
                          {automacaoDesativadaDrawer ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs"
                              title="Automação desativada. As datas das sessões estão em modo manual/personalizado."
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Automação Desativada</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                              title="Cálculo automático ativo com base no histórico do paciente."
                            >
                              <span>Cálculo Automático</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const novoModo = !modoEdicaoSessoesDrawer;
                              setModoEdicaoSessoesDrawer(novoModo);
                              if (novoModo) {
                                setAutomacaoDesativadaDrawer(true);
                              }
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer ${
                              modoEdicaoSessoesDrawer
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-[#002172] dark:text-blue-200 border border-slate-300 dark:border-slate-600'
                            }`}
                            title="Editar ou personalizar as datas das sessões"
                          >
                            {modoEdicaoSessoesDrawer ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>Concluir</span>
                              </>
                            ) : (
                              <>
                                <Edit3 className="w-3.5 h-3.5 text-[#002172] dark:text-blue-300" />
                                <span>Editar Datas</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(datasSessoes.join(', '), 'sessoes')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#002172] text-white font-bold text-[11px] hover:bg-[#001752] transition-colors shrink-0 shadow-2xs cursor-pointer"
                          >
                            {copiadoChave === 'sessoes' ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'sessoes' ? 'Copiado!' : 'Copiar Todas'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Modo Visualização */}
                      {!modoEdicaoSessoesDrawer ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                            {datasSessoes.map((dt, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 shadow-2xs hover:border-[#002172] transition-colors flex items-center gap-1.5"
                                title={`Sessão #${i + 1} em formato brasileiro dd/mm/aaaa`}
                              >
                                <span className="text-[10px] text-slate-400 font-normal">#{i + 1}</span>
                                <span>{dt}</span>
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            <span>Formato brasileiro: dd/mm/aaaa.</span>
                            {automacaoDesativadaDrawer && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Deseja reativar a automação e restaurar o cálculo automático de datas das sessões?')) {
                                    handleRestaurarCalculoDrawer();
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-[#002172] dark:text-blue-300 hover:bg-blue-100 font-semibold cursor-pointer border border-blue-200 dark:border-blue-800 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restaurar cálculo automático</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Modo Edição Interativo */
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-[#002172] dark:text-blue-300 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              Edição Individual (Automação Desativada)
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setTextoLoteInput(datasSessoes.join(', '));
                                  setModalEdicaoLoteAberto(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                                title="Digitar ou colar várias datas separadas por vírgula"
                              >
                                Colar em Lote
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAutomacaoDesativadaDrawer(true);
                                  const ultimaData = datasSessoes[datasSessoes.length - 1];
                                  let proximaIso = new Date().toISOString().split('T')[0];
                                  if (ultimaData) {
                                    const iso = converterBrParaIso(ultimaData);
                                    if (iso) {
                                      const d = new Date(iso + 'T12:00:00Z');
                                      d.setDate(d.getDate() + 7);
                                      proximaIso = d.toISOString().split('T')[0];
                                    }
                                  }
                                  const proximaBr = converterIsoParaBr(proximaIso);
                                  setDatasSessoesDrawer([...datasSessoes, proximaBr]);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded bg-[#002172] hover:bg-[#001752] text-white transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Adicionar Sessão</span>
                              </button>
                            </div>
                          </div>

                          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                            {datasSessoes.map((dt, idx) => {
                              const isoVal = converterBrParaIso(dt);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono w-16 shrink-0">
                                    Sessão {idx + 1}:
                                  </span>

                                  {/* Date picker nativo */}
                                  <input
                                    type="date"
                                    value={isoVal}
                                    onChange={(e) => {
                                      const novoIso = e.target.value;
                                      if (novoIso) {
                                        const novoBr = converterIsoParaBr(novoIso);
                                        const novas = [...datasSessoes];
                                        novas[idx] = novoBr;
                                        setDatasSessoesDrawer(novas);
                                        setAutomacaoDesativadaDrawer(true);
                                      }
                                    }}
                                    title="Selecione no calendário"
                                    className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002172] cursor-pointer"
                                  />

                                  {/* Input de texto direto dd/mm/aaaa */}
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={dt}
                                      placeholder="dd/mm/aaaa"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const novas = [...datasSessoes];
                                        novas[idx] = val;
                                        setDatasSessoesDrawer(novas);
                                        setAutomacaoDesativadaDrawer(true);
                                      }}
                                      className="w-28 px-2 py-1 text-xs text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002172]"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const novas = datasSessoes.filter((_, i) => i !== idx);
                                        setDatasSessoesDrawer(novas);
                                        setAutomacaoDesativadaDrawer(true);
                                      }}
                                      title="Excluir esta sessão"
                                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Deseja reativar a automação e restaurar o cálculo automático de datas das sessões?')) {
                                  handleRestaurarCalculoDrawer();
                                  setModoEdicaoSessoesDrawer(false);
                                }
                              }}
                              className="flex items-center gap-1 text-[11px] text-[#002172] dark:text-blue-300 hover:underline font-semibold cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar cálculo automático</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setModoEdicaoSessoesDrawer(false)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Concluir Edição</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bloco de Observações Obrigatórias do Rodapé */}
                {(() => {
                  const sessoesPorSemanaDrawer = obterSessoesPorSemanaPaciente(guiaSelecionadaDrawer);
                  const datasSessoesDrawerEfetivas = datasSessoesDrawer.length > 0
                    ? datasSessoesDrawer
                    : calcularDatasSessoes(
                        guiaSelecionadaDrawer.dataAutorizacao || guiaSelecionadaDrawer.dataSolicitacao,
                        guiaSelecionadaDrawer.quantidadeSolicitada,
                        guiaSelecionadaDrawer.pacienteNome || guiaSelecionadaDrawer.pacienteId,
                        sessoesPorSemanaDrawer
                      );
                  const textoRepeticoes = formatarContagemRepeticoesSessoes(datasSessoesDrawerEfetivas);
                  const temMesmoDia = !!textoRepeticoes;
                  const sessoesSemanaisCalc = calcularSessoesSemanaisJanela(datasSessoesDrawerEfetivas);

                  const doutorMefisaFormatado = (() => {
                    const todosPacientes = PacientesService.obterPacientes();
                    const pacEncontrado = todosPacientes.find(
                      (p) =>
                        p.id === guiaSelecionadaDrawer.pacienteId ||
                        (p.nome && p.nome.toLowerCase().trim() === (guiaSelecionadaDrawer.pacienteNome || '').toLowerCase().trim())
                    );

                    const todosPrestadores: Prestador[] = typeof window !== 'undefined' && localStorage.getItem('clinica_mefisa_prestadores_v2')
                      ? JSON.parse(localStorage.getItem('clinica_mefisa_prestadores_v2') || '[]')
                      : MOCK_PRESTADORES;

                    // 1. Tenta obter dos doutores atendentes Mefisa do paciente
                    if (pacEncontrado?.doutoresAtendentesNomes && pacEncontrado.doutoresAtendentesNomes.length > 0) {
                      const primeiroDoc = pacEncontrado.doutoresAtendentesNomes[0];
                      if (primeiroDoc) {
                        if (primeiroDoc.includes('(') && primeiroDoc.includes(')')) {
                          return primeiroDoc;
                        }
                        const pEncontrado = todosPrestadores.find((p) => p.nome.toLowerCase().includes(primeiroDoc.toLowerCase()) || primeiroDoc.toLowerCase().includes(p.nome.toLowerCase()));
                        if (pEncontrado) {
                          return `${pEncontrado.nome} (${pEncontrado.orgaoClasse || 'CRM'} ${pEncontrado.crmOuCrp || ''})`.trim();
                        }
                        return primeiroDoc;
                      }
                    }

                    // 2. Tenta obter pela Pasta do Doutor Mefisa
                    const pastaStr = guiaSelecionadaDrawer.pastaDoutora || pacEncontrado?.pastaDoutoraMefisa;
                    if (pastaStr) {
                      const nomeLimpo = pastaStr.replace(/^Pasta\s+/i, '').trim();
                      if (nomeLimpo && !nomeLimpo.toLowerCase().includes('credenciado') && !nomeLimpo.toLowerCase().includes('externo')) {
                        const pEncontrado = todosPrestadores.find((p) => {
                          const normP = (p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                          const normBusca = nomeLimpo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                          return (p.tipo === 'MEFISA' || !p.tipo) && (normP.includes(normBusca) || normBusca.includes(normP));
                        });
                        if (pEncontrado) {
                          return `${pEncontrado.nome} (${pEncontrado.orgaoClasse || 'CRM'} ${pEncontrado.crmOuCrp || ''})`.trim();
                        }
                        return nomeLimpo;
                      }
                    }

                    // 3. Fallback: Primeiro Doutor Mefisa do sistema
                    const mefisaPadrao = todosPrestadores.find((p) => p.tipo === 'MEFISA');
                    if (mefisaPadrao) {
                      return `${mefisaPadrao.nome} (${mefisaPadrao.orgaoClasse || 'CRM'} ${mefisaPadrao.crmOuCrp || ''})`.trim();
                    }

                    return `${guiaSelecionadaDrawer.prestador} (${guiaSelecionadaDrawer.crm || 'CRM 123456'})`;
                  })();

                  const textoObs1 = `O paciente realizou, na mesma data em horarios diferentes, ${textoRepeticoes} sessoes pelo metodo ABA na clinica, conforme orientacao do formulario medico anexo a autorizacao.`;
                  const textoObs2 = `Observacao: Paciente realiza ${sessoesSemanaisCalc} sessoes semanais de acordo com avaliacao tecnica. Profissional: ${doutorMefisaFormatado}.`;

                  return (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl space-y-3">
                      <span className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase block">Observações Recomendadas para Colagem:</span>
                      
                      {temMesmoDia && (
                        <div className="space-y-1 text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Colar nas observações (Sessões no mesmo dia):</span>
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800 font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                            <span>"{textoObs1}"</span>
                            <button
                              onClick={() => handleCopiar1Clique(textoObs1, 'obs1')}
                              className="p-1 rounded bg-[#002172] text-white shrink-0"
                            >
                              {copiadoChave === 'obs1' ? <Check className="w-3 h-3 text-[#91CA0C]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1 text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Observação Profissional:</span>
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-amber-200 dark:border-amber-800 font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                          <span>"{textoObs2}"</span>
                          <button
                            onClick={() => handleCopiar1Clique(textoObs2, 'obs2')}
                            className="p-1 rounded bg-[#002172] text-white shrink-0"
                          >
                            {copiadoChave === 'obs2' ? <Check className="w-3 h-3 text-[#91CA0C]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3 shrink-0">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Marcar como Digitada</span>
                </div>
                {erroNumeroConta && (
                  <div className="p-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] font-bold">
                    {erroNumeroConta}
                  </div>
                )}

                {/* Dados de Faturamento e Assinatura no Drawer */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Guia Assinada? *
                    </label>
                    <select
                      value={assinadaInput}
                      onChange={(e) => setAssinadaInput(e.target.value as any)}
                      className={`w-full px-2.5 py-1.5 font-bold rounded-xl text-xs border ${
                        assinadaInput === 'SIM'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                          : 'bg-red-100 text-red-900 border-red-400'
                      }`}
                    >
                      <option value="SIM">Sim</option>
                      <option value="PARCIAL">Parcial</option>
                      <option value="NAO">Não</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Data Retorno Guia
                    </label>
                    <input
                      type="date"
                      value={dataRetornoInput}
                      onChange={(e) => setDataRetornoInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resp. Colher Assinatura *
                  </label>
                  <select
                    value={responsavelColherAssinaturaInput}
                    onChange={(e) => setResponsavelColherAssinaturaInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="">Selecione o funcionário...</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.nome}>
                        {f.nome} ({f.departamento || f.papel})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Pasta do Doutor Mefisa na Etapa de Digitação */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pasta do Doutor Mefisa (Definição na Digitação) *</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                      Etapa de Digitação
                    </span>
                  </label>
                  <select
                    value={pastaDoutoraInput}
                    onChange={(e) => setPastaDoutoraInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-emerald-600"
                  >
                    {MOCK_PRESTADORES.map((p) => (
                      <option key={p.id} value={`Pasta ${p.nome}`}>
                        Pasta {p.nome} ({p.orgaoClasse} {p.crmOuCrp})
                      </option>
                    ))}
                    <option value="Pasta Corpo Clínico — Mefisa">Pasta Corpo Clínico — Mefisa</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Número da Conta *
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o Número da Conta (Ex: CTA-9988)"
                    value={numeroContaInput}
                    onChange={(e) => {
                      setNumeroContaInput(e.target.value);
                      if (erroNumeroConta) setErroNumeroConta(null);
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white"
                  />
                </div>

                {(() => {
                  const infoDrawer = obterStatusDigitabilidadeGuia(guiaSelecionadaDrawer);
                  return (
                    <div className="space-y-3 pt-1">
                      {!infoDrawer.podeDigitar && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-400 dark:border-amber-800 text-amber-950 dark:text-amber-100 rounded-2xl font-bold text-xs space-y-1 shadow-xs">
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold uppercase text-[11px]">
                            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>DIGITAÇÃO BLOQUEADA — SESSÃO FUTURA</span>
                          </div>
                          <p className="text-[11px] font-normal leading-relaxed text-slate-800 dark:text-slate-200">
                            A <strong>última sessão</strong> desta guia está agendada para o dia <strong>{infoDrawer.dataUltimaSessaoBr}</strong> (faltam {infoDrawer.diasAteUltimaSessao} dia(s)). Apenas guias com sessões totalmente concluídas até hoje podem ser faturadas.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleMarcarComoDigitada}
                        disabled={!infoDrawer.podeDigitar}
                        className={`w-full py-2.5 font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 ${
                          infoDrawer.podeDigitar
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                            : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {infoDrawer.podeDigitar
                            ? 'Marcar como Digitada'
                            : `Bloqueada (Última sessão em ${infoDrawer.dataUltimaSessaoBr})`}
                        </span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setGuiaSelecionadaDrawer(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs"
                >
                  Fechar Aba Lateral
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Guia / Digitação Completa */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-all">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#002172] via-[#001752] to-[#000d33] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-white/10 border border-white/20 flex items-center justify-center text-[#91CA0C] shadow-inner shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base font-['Quicksand'] tracking-tight">
                      + Nova Guia / Digitação Completa
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#91CA0C]/20 text-[#91CA0C] border border-[#91CA0C]/30">
                      Módulo Faturamento
                    </span>
                  </div>
                  <p className="text-xs text-blue-100/80 mt-0.5">
                    Preencha as informações operacionais completas das colunas de faturamento
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar formulário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs flex-1 bg-slate-50/50 dark:bg-slate-950/40">
              {erroBloqueioProcedimento && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 rounded-xl font-bold flex items-center gap-2.5 shadow-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{erroBloqueioProcedimento}</span>
                </div>
              )}

              {/* Bloco 1: Classificação & Dados da Guia */}
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs">
                    <Tag className="w-4 h-4 text-[#002172] dark:text-blue-400" />
                    <span>1. Classificação & Identificação Principal</span>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">Campos Obrigatórios *</span>
                </div>

                {/* Classificação (ABA vs CONVENCIONAL) em Botoes Segmentados */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Classificação da Guia *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNovaClassificacao('ABA')}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        novaClassificacao === 'ABA'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${novaClassificacao === 'ABA' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span>Pacientes ABA</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                        ABA
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNovaClassificacao('CONV.')}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        novaClassificacao === 'CONV.'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${novaClassificacao === 'CONV.' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span>Convencional</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200">
                        CONV.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Nome do Paciente (Digitado Manualmente) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                    2. Nome do Paciente (Digitação Manual Estrita) *
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome do paciente manualmente sem puxar do cadastro..."
                    value={novoPaciente}
                    onChange={(e) => setNovoPaciente(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 focus:border-[#002172] dark:focus:border-blue-500 rounded-xl text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-[#002172]/20 dark:focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-300 mt-1 font-medium flex items-center gap-1">
                    <span>💡</span> Entrada manual direta. Esta guia não altera as datas de autorização da lista de pacientes.
                  </p>
                </div>

                {/* Nº Guia & Nº Conta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nº da Guia *
                    </label>
                    <input
                      type="text"
                      value={novoNumeroGuia}
                      onChange={(e) => setNovoNumeroGuia(e.target.value)}
                      placeholder="Ex: #SUL-998822-D"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nº da Conta / Lote
                    </label>
                    <input
                      type="text"
                      value={novoNumeroConta}
                      onChange={(e) => setNovoNumeroConta(e.target.value)}
                      placeholder="Ex: CNT-8821"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white font-bold focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Convênio, Procedimento & Prestadores */}
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <UserCheck className="w-4 h-4 text-[#002172] dark:text-blue-400" />
                  <span>2. Convênio, Procedimento & Corpo Clínico</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Convênio / Plano
                    </label>
                    <input
                      type="text"
                      value={novoConvenio}
                      onChange={(e) => setNovoConvenio(e.target.value)}
                      placeholder="Ex: SulAmérica Saúde"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Procedimento
                    </label>
                    <select
                      value={codigoProcedimentoSelecionado}
                      onChange={(e) => handleSelecionarProcedimento(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="">(Deixar em branco / Pendente)</option>
                      {todosProcedimentos.map((p) => (
                        <option key={p.codigo} value={p.codigo}>
                          {p.codigo} - {p.descricao} ({p.categoria})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Prestador Solicitante
                    </label>
                    <input
                      type="text"
                      value={novoPrestador}
                      onChange={(e) => setNovoPrestador(e.target.value)}
                      placeholder="Ex: Dra. Ana Beatriz Albuquerque"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Doutora Mefisa (Pasta)
                    </label>
                    <input
                      type="text"
                      value={novaPastaDoutora}
                      onChange={(e) => setNovaPastaDoutora(e.target.value)}
                      placeholder="Ex: Pasta Dra. Ana Beatriz Albuquerque"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Polo Mefisa
                    </label>
                    <select
                      value={novoPolo}
                      onChange={(e) => setNovoPolo(e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="">(Deixar em branco / Pendente)</option>
                      <option value="M1">M1</option>
                      <option value="M2">M2</option>
                      <option value="ON">ON</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Status da Guia
                    </label>
                    <select
                      value={novoStatus}
                      onChange={(e) => setNovoStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="DIGITADA_FATURADA">Digitada / Faturada</option>
                      <option value="AGUARDANDO_RETORNO">Aguardando Retorno</option>
                      <option value="AGUARDANDO_DIGITACAO">Aguardando Digitação</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Histórico de Datas */}
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Calendar className="w-4 h-4 text-[#002172] dark:text-blue-400" />
                  <span>3. Cronograma & Rastreabilidade de Datas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data da Autorização
                    </label>
                    <input
                      type="date"
                      value={novaDataAutorizacao}
                      onChange={(e) => setNovaDataAutorizacao(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subiu na Pasta
                    </label>
                    <input
                      type="date"
                      value={novaDataColocacaoPasta}
                      onChange={(e) => setNovaDataColocacaoPasta(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data Retorno Guia
                    </label>
                    <input
                      type="date"
                      value={novaDataRetorno}
                      onChange={(e) => setNovaDataRetorno(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Data do Faturamento * (Pré-preenchida)
                    </label>
                    <input
                      type="date"
                      value={novaDataDigitacao}
                      onChange={(e) => setNovaDataDigitacao(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 4: Responsáveis & Assinaturas */}
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <FolderCheck className="w-4 h-4 text-[#002172] dark:text-blue-400" />
                  <span>4. Responsáveis Operacionais & Assinaturas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resp. Colocar Pasta
                    </label>
                    <select
                      value={novoResponsavelColocacaoPasta}
                      onChange={(e) => setNovoResponsavelColocacaoPasta(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="">(Deixar em branco / Pendente)</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.nome}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resp. Faturamento
                    </label>
                    <select
                      value={novoResponsavelDigitacao}
                      onChange={(e) => setNovoResponsavelDigitacao(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="">(Deixar em branco / Pendente)</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.nome}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Guia Assinada?
                    </label>
                    <select
                      value={novaAssinada}
                      onChange={(e) => setNovaAssinada(e.target.value as any)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="">(Deixar em branco / Pendente)</option>
                      <option value="SIM">Sim</option>
                      <option value="PARCIAL">Parcial</option>
                      <option value="NAO">Não</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Resp. Colher Assinatura
                    </label>
                    <select
                      value={novoResponsavelColherAssinatura}
                      onChange={(e) => setNovoResponsavelColherAssinatura(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:border-[#002172] dark:focus:border-blue-500 outline-none"
                    >
                      <option value="">(Deixar em branco / Pendente)</option>
                      {funcionarios.map((f) => (
                        <option key={f.id} value={f.nome}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Observações */}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observações Gerais da Guia
                  </label>
                  <textarea
                    rows={2}
                    value={novasObservacoes}
                    onChange={(e) => setNovasObservacoes(e.target.value)}
                    placeholder="Observações ou anotações operacionais..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-normal focus:border-[#002172] dark:focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {resultadoDuplicidade?.duplicada && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 shadow-xs">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>POSSÍVEL DUPLICIDADE DETECTADA</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Já existe uma guia cadastrada para <strong>{novoPaciente}</strong> no procedimento <strong>{novoProcedimento}</strong>.
                  </p>
                  <input
                    type="text"
                    value={justificativaDuplicidade}
                    onChange={(e) => setJustificativaDuplicidade(e.target.value)}
                    placeholder="Justificativa operacional obrigatória para salvar duplicidade..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium hidden sm:inline">
                Todos os dados faturados são validados pelo protocolo Mefisa.
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleValidarERegistrarGuia}
                  disabled={Boolean(procedimentoAtual && !procedimentoAtual.permiteDigitacao)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#002172] hover:bg-[#001752] active:scale-[0.98] disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-[#91CA0C]" />
                  <span>Validar e Salvar Guia</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição em Lote das Sessões do Drawer */}
      {modalEdicaoLoteAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white font-['Quicksand']">
                  Digitar / Colar Datas das Sessões em Lote
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalEdicaoLoteAberto(false);
                  setErroEdicaoLote(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Cole ou digite as datas no padrão brasileiro <strong>dd/mm/aaaa</strong> separadas por vírgula, ponto e vírgula ou quebra de linha:
              </p>
              <textarea
                rows={5}
                value={textoLoteInput}
                onChange={(e) => {
                  setTextoLoteInput(e.target.value);
                  setErroEdicaoLote(null);
                }}
                placeholder="Exemplo: 02/10/2026, 09/10/2026, 16/10/2026, 23/10/2026"
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002172] text-slate-900 dark:text-white"
              />
              {erroEdicaoLote && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
                  {erroEdicaoLote}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setModalEdicaoLoteAberto(false);
                  setErroEdicaoLote(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aplicarDatasLoteDrawer}
                className="px-4 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Aplicar Datas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Visualizar e Editar Datas das Sessões de Guia Faturada na Tabela */}
      {guiaParaEditarSessoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white font-['Quicksand']">
                    Datas das Sessões no Faturamento
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Paciente: <strong className="text-slate-800 dark:text-slate-200">{guiaParaEditarSessoes.pacienteNome}</strong> · Conta: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{guiaParaEditarSessoes.numeroConta || guiaParaEditarSessoes.numeroGuia}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuiaParaEditarSessoes(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total: <span className="font-mono text-[#002172] dark:text-blue-400">{datasSessoesModalGuia.length}</span> {datasSessoesModalGuia.length === 1 ? 'sessão' : 'sessões'}
                </span>
                {automacaoDesativadaModalGuia ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    Automação Desativada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Cálculo Automático
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setTextoLoteGuiaInput(datasSessoesModalGuia.join(', '));
                    setModalEdicaoLoteGuiaAberto(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
                >
                  Colar em Lote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutomacaoDesativadaModalGuia(true);
                    const ultimaData = datasSessoesModalGuia[datasSessoesModalGuia.length - 1];
                    let proximaIso = new Date().toISOString().split('T')[0];
                    if (ultimaData) {
                      const iso = converterBrParaIso(ultimaData);
                      if (iso) {
                        const d = new Date(iso + 'T12:00:00Z');
                        d.setDate(d.getDate() + 7);
                        proximaIso = d.toISOString().split('T')[0];
                      }
                    }
                    const proximaBr = converterIsoParaBr(proximaIso);
                    setDatasSessoesModalGuia([...datasSessoesModalGuia, proximaBr]);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#002172] hover:bg-[#001752] text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar Sessão</span>
                </button>
              </div>
            </div>

            {/* Lista com scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[340px]">
              {datasSessoesModalGuia.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma sessão registrada. Clique em "Adicionar Sessão" acima.
                </div>
              ) : (
                datasSessoesModalGuia.map((dt, idx) => {
                  const isoVal = converterBrParaIso(dt);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono w-20 shrink-0">
                        Sessão #{idx + 1}:
                      </span>

                      <input
                        type="date"
                        value={isoVal}
                        onChange={(e) => {
                          const novoIso = e.target.value;
                          if (novoIso) {
                            const novoBr = converterIsoParaBr(novoIso);
                            const novas = [...datasSessoesModalGuia];
                            novas[idx] = novoBr;
                            setDatasSessoesModalGuia(novas);
                            setAutomacaoDesativadaModalGuia(true);
                          }
                        }}
                        title="Selecione no calendário"
                        className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-white cursor-pointer"
                      />

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={dt}
                          placeholder="dd/mm/aaaa"
                          onChange={(e) => {
                            const val = e.target.value;
                            const novas = [...datasSessoesModalGuia];
                            novas[idx] = val;
                            setDatasSessoesModalGuia(novas);
                            setAutomacaoDesativadaModalGuia(true);
                          }}
                          className="w-28 px-2 py-1 text-xs text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-white"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const novas = datasSessoesModalGuia.filter((_, i) => i !== idx);
                            setDatasSessoesModalGuia(novas);
                            setAutomacaoDesativadaModalGuia(true);
                          }}
                          title="Remover sessão"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Formato brasileiro: dd/mm/aaaa.
                </span>
                {automacaoDesativadaModalGuia && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja reativar a automação e restaurar o cálculo automático?')) {
                        handleRestaurarCalculoModalGuia();
                      }
                    }}
                    className="flex items-center gap-1 text-[11px] text-[#002172] dark:text-blue-300 hover:underline font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar cálculo automático</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGuiaParaEditarSessoes(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarSessoesGuia}
                  className="px-5 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Sessões</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lote para Guia da Tabela */}
      {modalEdicaoLoteGuiaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white font-['Quicksand']">
                  Digitar / Colar Datas em Lote
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalEdicaoLoteGuiaAberto(false);
                  setErroEdicaoLoteGuia(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Informe as datas no padrão brasileiro <strong>dd/mm/aaaa</strong> separadas por vírgula ou quebra de linha:
              </p>
              <textarea
                rows={5}
                value={textoLoteGuiaInput}
                onChange={(e) => {
                  setTextoLoteGuiaInput(e.target.value);
                  setErroEdicaoLoteGuia(null);
                }}
                placeholder="Exemplo: 02/10/2026, 09/10/2026, 16/10/2026, 23/10/2026"
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002172] text-slate-900 dark:text-white"
              />
              {erroEdicaoLoteGuia && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
                  {erroEdicaoLoteGuia}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setModalEdicaoLoteGuiaAberto(false);
                  setErroEdicaoLoteGuia(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aplicarDatasLoteGuia}
                className="px-4 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs cursor-pointer"
              >
                Aplicar Datas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Procedimentos & Preços ABA */}
      <GerenciarProcedimentosModal
        isOpen={modalProcedimentosAberto}
        onClose={() => setModalProcedimentosAberto(false)}
      />
    </div>
  );
};
