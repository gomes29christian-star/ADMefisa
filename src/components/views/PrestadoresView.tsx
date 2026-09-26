import React, { useState } from 'react';
import {
  Stethoscope,
  FolderCheck,
  Building,
  UserCheck,
  Plus,
  Shield,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  Sparkles,
  Check,
  HelpCircle,
  Pencil,
  Trash2,
  Zap,
  AlertTriangle,
  Award,
  Search,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { MOCK_PRESTADORES, salvarPrestadoresStorage, deduplicarPrestadores } from '../../data/mockClinicData';
import { LISTA_CBOS_OPCOES, obterDescricaoCbo } from '../../data/cbosData';
import { Prestador } from '../../types/clinic';
import { sanitizarCbo } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import { matchTextFilter } from '../../utils/filterUtils';
import { obterBadgeColorProcedimento, CLASS_TABELA_LISTRADA_ROW } from '../../utils/procedureStyles';

const LISTA_PROCEDIMENTOS_OPCOES = [
  'Musicoterapia',
  'Psicomotricidade',
  'Psicologia',
  'Fonoaudiologia',
  'Terapia ocupacional',
];

const CSV_EXEMPLO_PRESTADORES = `Nome Doutor;CPF;Conselho;Registro;UF;Especialidade;Procedimentos Atendidos
Dra. Ana Beatriz Albuquerque;123.456.789-01;CRP;06/12345;SP;Psicologia ABA;Fono, Psico, Terapia Ocupacional
Dr. Carlos Eduardo Neves;234.567.890-12;CRFa;2-4567;SP;Fonoaudiologia Clínica;Fonoaudiologia | Musicoterapia
Dra. Mariana Souza;345.678.901-23;CREFITO;15892;SP;Psicomotricidade;Psicomotricidade / T.O.`;

export const PrestadoresView: React.FC = () => {
  const { getThemeStrokeStyle } = useTheme();
  const [prestadores, setPrestadores] = useState<Prestador[]>(() => deduplicarPrestadores(MOCK_PRESTADORES));
  
  // Divisória de abas: 'mefisa' | 'prestadores' | 'importacao'
  const [abaAtiva, setAbaAtiva] = useState<'mefisa' | 'prestadores' | 'importacao'>('mefisa');

  const [isModalAberto, setIsModalAberto] = useState(false);
  const [prestadorEmEdicao, setPrestadorEmEdicao] = useState<Prestador | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Modal de Confirmação de Exclusão
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [tipoExclusao, setTipoExclusao] = useState<'individual' | 'lote'>('individual');
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);

  // Seleção múltipla
  const [selecionadosIds, setSelecionadosIds] = useState<string[]>([]);

  // Form state para novo/editar prestador
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [orgaoClasse, setOrgaoClasse] = useState<'CRM' | 'CRP' | 'CREFITO' | 'CRFa' | 'Outro'>('CRM');
  const [crmOuCrp, setCrmOuCrp] = useState('');
  const [uf, setUf] = useState('SP');
  const [especialidade, setEspecialidade] = useState('Médico Clínico');
  const [tipoCadastro, setTipoCadastro] = useState<'MEFISA' | 'PRESTADOR'>('MEFISA');
  const [cbo, setCbo] = useState('225125');
  const [pesquisaCboModal, setPesquisaCboModal] = useState('');
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<string[]>(['Psicologia']);
  const [erro, setErro] = useState('');

  // Filtro de CBOs no Modal com base no termo digitado
  const cbosFiltradosModal = React.useMemo(() => {
    if (!pesquisaCboModal.trim()) return LISTA_CBOS_OPCOES;
    const term = pesquisaCboModal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return LISTA_CBOS_OPCOES.filter((item) => {
      const codNorm = item.codigo.toLowerCase();
      const labelNorm = item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return codNorm.includes(term) || labelNorm.includes(term);
    });
  }, [pesquisaCboModal]);

  // Detector em tempo real de duplicidade ao cadastrar ou editar prestador
  const resultadoDuplicidade = React.useMemo(() => {
    if (!nome.trim() && !cpf.trim() && !crmOuCrp.trim()) return null;

    const cpfLimpo = cpf.replace(/\D/g, '').trim();
    const regLimpo = crmOuCrp.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const nomeNorm = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const idAtual = prestadorEmEdicao?.id;

    const encontrado = prestadores.find((p) => {
      if (idAtual && p.id === idAtual) return false;

      const pCpf = (p.cpf || '').replace(/\D/g, '').trim();
      const pReg = (p.crmOuCrp || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const pOrgao = (p.orgaoClasse || '').toLowerCase().trim();
      const pNome = (p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      if (cpfLimpo && pCpf && cpfLimpo === pCpf) return true;
      if (regLimpo && pReg && regLimpo === pReg && pOrgao === orgaoClasse.toLowerCase()) return true;
      if (nomeNorm && pNome && nomeNorm === pNome) return true;

      return false;
    });

    if (!encontrado) return null;

    let motivo = 'Registro Similar';
    if (cpfLimpo && (encontrado.cpf || '').replace(/\D/g, '').trim() === cpfLimpo) {
      motivo = 'CPF Idêntico';
    } else if (regLimpo && (encontrado.crmOuCrp || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim() === regLimpo) {
      motivo = 'Registro Profissional Idêntico (Conselho/Número)';
    } else if (nomeNorm) {
      motivo = 'Nome e Sobrenome Coincidentes';
    }

    return {
      motivo,
      prestadorExistente: encontrado,
    };
  }, [nome, cpf, crmOuCrp, orgaoClasse, prestadores, prestadorEmEdicao]);

  // Verificação e limpeza de duplicidades na base inteira
  const duplicidadesDetectadasBase = React.useMemo(() => {
    const unicos = deduplicarPrestadores(prestadores);
    const qtdDuplicados = prestadores.length - unicos.length;
    return { unicos, qtdDuplicados };
  }, [prestadores]);

  const handleRemoverDuplicidadesBase = () => {
    const limpos = deduplicarPrestadores(prestadores);
    setPrestadores(limpos);
    salvarPrestadoresStorage(limpos);
    setSucessoMsg('Base de Doutores Mefisa e Prestadores desduplicada e unificada com sucesso!');
  };

  // Estados do Importador de Planilhas de Doutores
  const [etapaImportacao, setEtapaImportacao] = useState<1 | 2 | 3 | 4>(1);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [linhasBrutas, setLinhasBrutas] = useState<Record<string, string>[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [linhasPreviasImport, setLinhasPreviasImport] = useState<any[]>([]);
  const [tipoImportacaoLote, setTipoImportacaoLote] = useState<'MEFISA' | 'PRESTADOR'>('PRESTADOR');

  // Estados de Filtros e Busca para Doutores/Prestadores
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [filtroConselho, setFiltroConselho] = useState('TODOS');
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('TODOS');
  const [filtroProcedimento, setFiltroProcedimento] = useState('TODOS');
  const [modoExibicao, setModoExibicao] = useState<'cards' | 'tabela'>('cards');

  const [filtrosColunas, setFiltrosColunas] = useState({
    nome: '',
    registro: '',
    cbo: '',
    procedimentos: '',
    pasta: '',
  });

  const temFiltrosAtivos = Boolean(buscaGlobal.trim()) || filtroConselho !== 'TODOS' || filtroEspecialidade !== 'TODOS' || filtroProcedimento !== 'TODOS' || Object.values(filtrosColunas).some(v => Boolean(v && v.trim()));

  const limparFiltros = () => {
    setBuscaGlobal('');
    setFiltroConselho('TODOS');
    setFiltroEspecialidade('TODOS');
    setFiltroProcedimento('TODOS');
    setFiltrosColunas({
      nome: '',
      registro: '',
      cbo: '',
      procedimentos: '',
      pasta: '',
    });
  };

  // Filtragem conforme a aba ativa e filtros aplicados
  const prestadoresFiltrados = prestadores.filter((p) => {
    if (abaAtiva === 'mefisa') {
      if (!(p.tipo === 'MEFISA' || (!p.tipo && p.pastaAtribuida?.includes('Mefisa')))) return false;
    } else if (abaAtiva === 'prestadores') {
      if (!(p.tipo === 'PRESTADOR' || (p.pastaAtribuida && !p.pastaAtribuida.includes('Mefisa')))) return false;
    }

    // Filtro Conselho
    if (filtroConselho !== 'TODOS' && p.orgaoClasse !== filtroConselho) return false;

    // Filtro Procedimento
    if (filtroProcedimento !== 'TODOS') {
      const matchProc = (p.procedimentos || []).some(proc => matchTextFilter(proc, filtroProcedimento));
      if (!matchProc) return false;
    }

    // Busca Global
    if (buscaGlobal.trim()) {
      const textoCompleto = [
        p.nome,
        p.cpf,
        p.titulo,
        p.cbo,
        obterDescricaoCbo(p.cbo),
        p.crmOuCrp,
        p.orgaoClasse,
        `${p.orgaoClasse} ${p.crmOuCrp}`,
        `${p.orgaoClasse} ${p.crmOuCrp} ${p.uf}`,
        p.uf,
        p.especialidade,
        p.pastaAtribuida,
        ...(p.procedimentos || []),
      ]
        .filter(Boolean)
        .join(' ');

      if (!matchTextFilter(textoCompleto, buscaGlobal)) return false;
    }

    // Filtros de Coluna
    if (filtrosColunas.nome) {
      const matchNome = matchTextFilter(p.nome, filtrosColunas.nome);
      const matchCpf = matchTextFilter(p.cpf, filtrosColunas.nome);
      if (!matchNome && !matchCpf) return false;
    }

    if (filtrosColunas.registro && !matchTextFilter(`${p.orgaoClasse} ${p.crmOuCrp} ${p.uf}`, filtrosColunas.registro)) {
      return false;
    }

    if (filtrosColunas.cbo) {
      const cboDesc = obterDescricaoCbo(p.cbo);
      const matchCboCod = matchTextFilter(p.cbo, filtrosColunas.cbo);
      const matchCboDesc = matchTextFilter(cboDesc, filtrosColunas.cbo);
      if (!matchCboCod && !matchCboDesc) return false;
    }

    if (filtrosColunas.procedimentos) {
      const matchProc = (p.procedimentos || []).some(proc => matchTextFilter(proc, filtrosColunas.procedimentos));
      if (!matchProc) return false;
    }

    if (filtrosColunas.pasta && !matchTextFilter(p.pastaAtribuida, filtrosColunas.pasta)) {
      return false;
    }

    return true;
  });

  const handleToggleProcedimento = (proc: string) => {
    if (procedimentosSelecionados.includes(proc)) {
      setProcedimentosSelecionados(procedimentosSelecionados.filter((p) => p !== proc));
    } else {
      setProcedimentosSelecionados([...procedimentosSelecionados, proc]);
    }
  };

  const abrirModalNovo = () => {
    setPrestadorEmEdicao(null);
    setNome('');
    setCpf('');
    setOrgaoClasse('CRM');
    setCrmOuCrp('');
    setUf('SP');
    setCbo('225125');
    setPesquisaCboModal('');
    setEspecialidade('Médico Clínico');
    setTipoCadastro(abaAtiva === 'prestadores' ? 'PRESTADOR' : 'MEFISA');
    setProcedimentosSelecionados(['Psicologia']);
    setErro('');
    setIsModalAberto(true);
  };

  const abrirModalEdicao = (pres: Prestador) => {
    setPrestadorEmEdicao(pres);
    setNome(pres.nome);
    setCpf(pres.cpf || '');
    setOrgaoClasse(pres.orgaoClasse);
    setCrmOuCrp(pres.crmOuCrp);
    setUf(pres.uf || 'SP');
    setCbo(sanitizarCbo(pres.cbo) || '225125');
    setPesquisaCboModal('');
    setEspecialidade(pres.especialidade || 'Médico Clínico');
    setTipoCadastro(pres.tipo || (pres.pastaAtribuida?.includes('Mefisa') ? 'MEFISA' : 'PRESTADOR'));
    setProcedimentosSelecionados(pres.procedimentos || ['Psicologia']);
    setErro('');
    setIsModalAberto(true);
  };

  const handleSalvarPrestador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('O nome é obrigatório.');
      return;
    }
    if (!crmOuCrp.trim()) {
      setErro('O registro profissional é obrigatório.');
      return;
    }
    if (procedimentosSelecionados.length === 0) {
      setErro('Selecione pelo menos um procedimento atendido.');
      return;
    }

    let novosDados = [...prestadores];

    if (prestadorEmEdicao) {
      const index = novosDados.findIndex((p) => p.id === prestadorEmEdicao.id);
      if (index !== -1) {
        novosDados[index] = {
          ...prestadorEmEdicao,
          nome: nome.trim(),
          cpf: cpf.trim() || undefined,
          titulo: `${orgaoClasse} ${crmOuCrp} - ${tipoCadastro === 'MEFISA' ? 'Especialista Mefisa' : 'Credenciado Externo'}`,
          cbo: sanitizarCbo(cbo) || '251510',
          crmOuCrp: crmOuCrp.trim(),
          orgaoClasse,
          uf,
          especialidade: especialidade.trim() || 'Especialista Clínico',
          procedimentos: procedimentosSelecionados,
          tipo: tipoCadastro,
          pastaAtribuida: tipoCadastro === 'MEFISA' ? 'Pasta Corpo Clínico — Mefisa' : 'Pasta Credenciados Externos',
        };
      }
      setSucessoMsg(`Registro de ${nome.trim()} atualizado com sucesso!`);
    } else {
      const novoPrestador: Prestador = {
        id: `prest-${Date.now()}`,
        nome: nome.trim(),
        cpf: cpf.trim() || undefined,
        titulo: `${orgaoClasse} ${crmOuCrp} - ${tipoCadastro === 'MEFISA' ? 'Especialista Mefisa' : 'Credenciado Externo'}`,
        cbo: sanitizarCbo(cbo) || '251510',
        crmOuCrp: crmOuCrp.trim(),
        orgaoClasse,
        uf,
        especialidade: especialidade.trim() || 'Especialista Clínico',
        procedimentos: procedimentosSelecionados,
        pastaAtribuida: tipoCadastro === 'MEFISA' ? 'Pasta Corpo Clínico — Mefisa' : 'Pasta Credenciados Externos',
        ativo: true,
        tipo: tipoCadastro,
      };

      novosDados.push(novoPrestador);
      setSucessoMsg(`Registro de ${novoPrestador.nome} cadastrado com sucesso!`);
    }

    setPrestadores(novosDados);
    salvarPrestadoresStorage(novosDados);
    MOCK_PRESTADORES.length = 0;
    MOCK_PRESTADORES.push(...novosDados);

    setIsModalAberto(false);
    setPrestadorEmEdicao(null);
    setNome('');
    setCpf('');
    setCrmOuCrp('');
    setProcedimentosSelecionados(['Psicologia']);
    setErro('');
  };

  const solicitarExclusaoIndividual = (id: string) => {
    setIdParaExcluir(id);
    setTipoExclusao('individual');
    setModalConfirmacaoAberto(true);
  };

  const solicitarExclusaoLote = () => {
    if (selecionadosIds.length === 0) return;
    setTipoExclusao('lote');
    setModalConfirmacaoAberto(true);
  };

  const confirmarExclusao = () => {
    if (tipoExclusao === 'individual' && idParaExcluir) {
      const novosDados = prestadores.filter(p => p.id !== idParaExcluir);
      setPrestadores(novosDados);
      salvarPrestadoresStorage(novosDados);
      MOCK_PRESTADORES.length = 0;
      MOCK_PRESTADORES.push(...novosDados);

      setSelecionadosIds(selecionadosIds.filter(item => item !== idParaExcluir));
      setSucessoMsg('Registro excluído com sucesso.');
    } else if (tipoExclusao === 'lote') {
      const qtd = selecionadosIds.length;
      const novosDados = prestadores.filter(p => !selecionadosIds.includes(p.id));
      setPrestadores(novosDados);
      salvarPrestadoresStorage(novosDados);
      MOCK_PRESTADORES.length = 0;
      MOCK_PRESTADORES.push(...novosDados);

      setSucessoMsg(`${qtd} registro(s) excluído(s) com sucesso.`);
      setSelecionadosIds([]);
    }

    setModalConfirmacaoAberto(false);
    setIdParaExcluir(null);
  };

  const handleToggleSelecionarTodos = () => {
    if (selecionadosIds.length === prestadoresFiltrados.length) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(prestadoresFiltrados.map(p => p.id));
    }
  };

  const handleToggleSelecao = (id: string) => {
    if (selecionadosIds.includes(id)) {
      setSelecionadosIds(selecionadosIds.filter(i => i !== id));
    } else {
      setSelecionadosIds([...selecionadosIds, id]);
    }
  };

  // Importação Inteligente
  const normalizarProcedimentosInteligente = (texto: string): string[] => {
    if (!texto) return ['Psicologia'];
    const pedacos = texto.split(/[,;\/|]+/).map(s => s.trim()).filter(Boolean);
    const resultado: string[] = [];

    pedacos.forEach(p => {
      const pNorm = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (pNorm.includes('fono')) {
        if (!resultado.includes('Fonoaudiologia')) resultado.push('Fonoaudiologia');
      } else if (pNorm.includes('psicolog') || pNorm.includes('aba')) {
        if (!resultado.includes('Psicologia')) resultado.push('Psicologia');
      } else if (pNorm.includes('ocupacional') || pNorm.includes('t.o.')) {
        if (!resultado.includes('Terapia ocupacional')) resultado.push('Terapia ocupacional');
      } else if (pNorm.includes('psicomotricid')) {
        if (!resultado.includes('Psicomotricidade')) resultado.push('Psicomotricidade');
      } else if (pNorm.includes('musicoterap') || pNorm.includes('musica')) {
        if (!resultado.includes('Musicoterapia')) resultado.push('Musicoterapia');
      } else {
        const capitalizado = p.charAt(0).toUpperCase() + p.slice(1);
        if (!resultado.includes(capitalizado)) resultado.push(capitalizado);
      }
    });

    return resultado.length > 0 ? resultado : ['Psicologia'];
  };

  const handleCarregarFixturePrestadores = () => {
    setNomeArquivo('prestadores_lote_mefisa.csv');
    const parsed = parseCsvPrestadores(CSV_EXEMPLO_PRESTADORES);
    setCabecalho(parsed.cabecalho);
    setLinhasBrutas(parsed.linhas);
    
    const novoMapeamento: Record<string, string> = {};
    parsed.cabecalho.forEach(col => {
      const norm = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm.includes('nome')) novoMapeamento[col] = 'nome';
      else if (norm.includes('cpf')) novoMapeamento[col] = 'cpf';
      else if (norm.includes('conselho')) novoMapeamento[col] = 'conselho';
      else if (norm.includes('registro')) novoMapeamento[col] = 'registro';
      else if (norm.includes('uf')) novoMapeamento[col] = 'uf';
      else if (norm.includes('especialid')) novoMapeamento[col] = 'especialidade';
      else if (norm.includes('proc') || norm.includes('atend') || norm.includes('servi')) novoMapeamento[col] = 'procedimentos';
    });

    setMapeamento(novoMapeamento);
    setEtapaImportacao(2);
  };

  const parseCsvPrestadores = (texto: string) => {
    const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (linhas.length === 0) return { cabecalho: [], linhas: [] };
    const sep = linhas[0].includes(';') ? ';' : ',';
    const cabecalho = linhas[0].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    const res: Record<string, string>[] = [];
    for (let i = 1; i < linhas.length; i++) {
      const vals = linhas[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, string> = {};
      cabecalho.forEach((c, idx) => {
        obj[c] = vals[idx] || '';
      });
      res.push(obj);
    }
    return { cabecalho, linhas: res };
  };

  const handleFileUploadPrestadores = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        const parsed = parseCsvPrestadores(text);
        setCabecalho(parsed.cabecalho);
        setLinhasBrutas(parsed.linhas);

        const autoMap: Record<string, string> = {};
        parsed.cabecalho.forEach(col => {
          const norm = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (norm.includes('nome')) autoMap[col] = 'nome';
          else if (norm.includes('cpf')) autoMap[col] = 'cpf';
          else if (norm.includes('conselho')) autoMap[col] = 'conselho';
          else if (norm.includes('registro') || norm.includes('crm') || norm.includes('crp')) autoMap[col] = 'registro';
          else if (norm.includes('cbo')) autoMap[col] = 'cbo';
          else if (norm.includes('uf')) autoMap[col] = 'uf';
          else if (norm.includes('especialid')) autoMap[col] = 'especialidade';
          else if (norm.includes('proc') || norm.includes('atend') || norm.includes('servi')) autoMap[col] = 'procedimentos';
        });

        setMapeamento(autoMap);
        setEtapaImportacao(2);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleAvancarPreviaPrestadores = () => {
    const previas = linhasBrutas.map((linha, idx) => {
      let nomeVal = '';
      let cpfVal = '';
      let conselhoVal = 'CRP';
      let registroVal = '';
      let cboVal = '251510';
      let ufVal = 'SP';
      let espVal = 'Clínico Geral';
      let procsVal = ['Psicologia'];

      Object.entries(mapeamento).forEach(([colunaCsv, campoSys]) => {
        const val = linha[colunaCsv] || '';
        if (campoSys === 'nome') nomeVal = val;
        if (campoSys === 'cpf') cpfVal = val;
        if (campoSys === 'conselho') conselhoVal = val;
        if (campoSys === 'registro') registroVal = val;
        if (campoSys === 'cbo') cboVal = sanitizarCbo(val);
        if (campoSys === 'uf') ufVal = val;
        if (campoSys === 'especialidade') espVal = val;
        if (campoSys === 'procedimentos') {
          procsVal = normalizarProcedimentosInteligente(val);
        }
      });

      return {
        id: `import-${idx}-${Date.now()}`,
        nome: nomeVal || `Doutor(a) ${idx + 1}`,
        cpf: cpfVal,
        orgaoClasse: (['CRM', 'CRP', 'CREFITO', 'CRFa', 'Outro'].includes(conselhoVal) ? conselhoVal : 'CRP') as any,
        crmOuCrp: registroVal || `000${idx}`,
        cbo: cboVal || '251510',
        uf: ufVal || 'SP',
        especialidade: espVal || 'Especialista',
        procedimentos: procsVal,
        valido: Boolean(nomeVal && registroVal),
      };
    });

    setLinhasPreviasImport(previas);
    setEtapaImportacao(3);
  };

  const handleConfirmarImportacaoPrestadores = () => {
    const isMefisa = tipoImportacaoLote === 'MEFISA';
    const novos: Prestador[] = linhasPreviasImport.map((p, idx) => ({
      id: `prest-imp-${Date.now()}-${idx}`,
      nome: p.nome,
      cpf: p.cpf || undefined,
      titulo: `${p.orgaoClasse} ${p.crmOuCrp} - ${isMefisa ? 'Especialista Mefisa' : 'Credenciado Externo'}`,
      cbo: sanitizarCbo(p.cbo) || '251510',
      crmOuCrp: p.crmOuCrp,
      orgaoClasse: p.orgaoClasse,
      uf: p.uf,
      especialidade: p.especialidade,
      procedimentos: p.procedimentos,
      pastaAtribuida: isMefisa ? 'Pasta Corpo Clínico — Mefisa' : 'Pasta Credenciados Externos',
      ativo: true,
      tipo: tipoImportacaoLote,
    }));

    const novosDados = [...prestadores, ...novos];
    setPrestadores(novosDados);
    salvarPrestadoresStorage(novosDados);
    MOCK_PRESTADORES.length = 0;
    MOCK_PRESTADORES.push(...novosDados);

    setSucessoMsg(`${novos.length} ${isMefisa ? 'Doutores Mefisa' : 'Prestadores'} importados com sucesso!`);
    setEtapaImportacao(4);
  };

  const qtdMefisa = prestadores.filter(p => p.tipo === 'MEFISA' || (!p.tipo && p.pastaAtribuida?.includes('Mefisa'))).length;
  const qtdPrestadores = prestadores.filter(p => p.tipo === 'PRESTADOR' || (p.pastaAtribuida && !p.pastaAtribuida.includes('Mefisa'))).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Corpo Clínico & Prestadores
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-600" />
              <span>Gestão Separada</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie separadamente os Doutores Mefisa (equipe interna) e os Prestadores / Credenciados externos.
          </p>
        </div>

        {abaAtiva !== 'importacao' && (
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#91CA0C]" />
            <span>{abaAtiva === 'mefisa' ? '+ Novo Doutor Mefisa' : '+ Novo Prestador Externo'}</span>
          </button>
        )}
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

      {/* Banner Detector de Duplicidades na Lista Principal */}
      {duplicidadesDetectadasBase.qtdDuplicados > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Detector de Duplicidades Ativo:</strong> Identificamos {duplicidadesDetectadasBase.qtdDuplicados} membro(s) duplicado(s) na base de Doutores Mefisa e Prestadores.
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoverDuplicidadesBase}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Unificar & Limpar Duplicados</span>
          </button>
        </div>
      )}

      {/* DIVISÓRIA DE ABAS (Doutores Mefisa / Prestadores / Importador) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => { setAbaAtiva('mefisa'); setSelecionadosIds([]); }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
            abaAtiva === 'mefisa'
              ? 'text-[#002172] dark:text-blue-400 border-b-2 border-[#002172] dark:border-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-[#002172] dark:text-blue-400" />
          <span>Doutores Mefisa ({qtdMefisa})</span>
        </button>

        <button
          onClick={() => { setAbaAtiva('prestadores'); setSelecionadosIds([]); }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
            abaAtiva === 'prestadores'
              ? 'text-[#002172] dark:text-blue-400 border-b-2 border-[#002172] dark:border-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Building className="w-4 h-4 text-cyan-600" />
          <span>Prestadores & Credenciados Externos ({qtdPrestadores})</span>
        </button>

        <button
          onClick={() => { setAbaAtiva('importacao'); setSelecionadosIds([]); }}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            abaAtiva === 'importacao'
              ? 'text-[#002172] dark:text-blue-400 border-b-2 border-[#002172] dark:border-blue-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Importar Planilha</span>
        </button>
      </div>

      {/* ABAS 1 & 2: LISTA DE DOUTORES MEFISA OU PRESTADORES */}
      {(abaAtiva === 'mefisa' || abaAtiva === 'prestadores') && (
        <div className="space-y-4">
          {/* BARRA DE PESQUISA E FILTROS */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF, CRM/CRP, conselho ou especialidade..."
                  value={buscaGlobal}
                  onChange={(e) => setBuscaGlobal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-[#002172]"
                />
              </div>

              <select
                value={filtroConselho}
                onChange={(e) => setFiltroConselho(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-white font-medium focus:outline-[#002172]"
              >
                <option value="TODOS">Conselho: Todos</option>
                <option value="CRM">CRM (Medicina)</option>
                <option value="CRP">CRP (Psicologia)</option>
                <option value="CREFITO">CREFITO (Fisio/T.O.)</option>
                <option value="CRFa">CRFa (Fono)</option>
                <option value="Outro">Outro</option>
              </select>

              <select
                value={filtroProcedimento}
                onChange={(e) => setFiltroProcedimento(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-white font-medium focus:outline-[#002172]"
              >
                <option value="TODOS">Procedimento: Todos</option>
                {LISTA_PROCEDIMENTOS_OPCOES.map((proc) => (
                  <option key={proc} value={proc}>{proc}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModoExibicao('cards')}
                  title="Exibição em Cards"
                  className={`p-1.5 rounded-lg transition-colors ${
                    modoExibicao === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-[#002172] dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setModoExibicao('tabela')}
                  title="Exibição em Tabela com Filtros de Coluna"
                  className={`p-1.5 rounded-lg transition-colors ${
                    modoExibicao === 'tabela'
                      ? 'bg-white dark:bg-slate-900 text-[#002172] dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {temFiltrosAtivos && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="px-3 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {prestadoresFiltrados.length > 0 && (
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selecionadosIds.length === prestadoresFiltrados.length && prestadoresFiltrados.length > 0}
                  onChange={handleToggleSelecionarTodos}
                  className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4"
                />
                <span>Selecionar Todos ({prestadoresFiltrados.length})</span>
              </label>

              {selecionadosIds.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#002172] dark:text-blue-400">
                    {selecionadosIds.length} selecionado(s)
                  </span>
                  <button
                    onClick={solicitarExclusaoLote}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Selecionados</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {prestadoresFiltrados.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#002172] flex items-center justify-center mx-auto">
                {abaAtiva === 'mefisa' ? <Stethoscope className="w-6 h-6" /> : <Building className="w-6 h-6" />}
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                Nenhum registro encontrado com os filtros aplicados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar seus termos de busca ou clique em &quot;Limpar&quot; para redefinir os filtros.
              </p>
            </div>
          ) : modoExibicao === 'tabela' ? (
            /* VISUALIZAÇÃO EM TABELA ADMINISTRATIVA COM FILTROS DE COLUNA */
            <TopScrollTableWrapper tableTitle={abaAtiva === 'mefisa' ? 'Tabela de Doutores Mefisa' : 'Tabela de Prestadores Externos'}>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/90 dark:bg-slate-950 text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-10 align-top">
                      <input
                        type="checkbox"
                        checked={selecionadosIds.length === prestadoresFiltrados.length && prestadoresFiltrados.length > 0}
                        onChange={handleToggleSelecionarTodos}
                        className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4 cursor-pointer mt-1"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>Nome / CPF</div>
                      <input
                        type="text"
                        placeholder="Filtrar nome/cpf..."
                        value={filtrosColunas.nome}
                        onChange={(e) => setFiltrosColunas({ ...filtrosColunas, nome: e.target.value })}
                        className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>Conselho & Registro</div>
                      <input
                        type="text"
                        placeholder="CRM/CRP..."
                        value={filtrosColunas.registro}
                        onChange={(e) => setFiltrosColunas({ ...filtrosColunas, registro: e.target.value })}
                        className="mt-1 w-full px-2 py-1 text-[11px] font-normal uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>CBO & Ocupação</div>
                      <input
                        type="text"
                        placeholder="Filtrar CBO/médico..."
                        value={filtrosColunas.cbo}
                        onChange={(e) => setFiltrosColunas({ ...filtrosColunas, cbo: e.target.value })}
                        className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div>Procedimentos Atendidos</div>
                      <input
                        type="text"
                        placeholder="Filtrar proc..."
                        value={filtrosColunas.procedimentos}
                        onChange={(e) => setFiltrosColunas({ ...filtrosColunas, procedimentos: e.target.value })}
                        className="mt-1 w-full px-2 py-1 text-[11px] font-normal lowercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-blue-600"
                      />
                    </th>
                    <th className="py-3 px-4 text-right">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {prestadoresFiltrados.map((pres, index) => {
                    const selecionado = selecionadosIds.includes(pres.id);
                    const isMefisa = pres.tipo === 'MEFISA' || (!pres.tipo && pres.pastaAtribuida?.includes('Mefisa'));

                    return (
                      <tr key={`${pres.id}-${index}`} className={CLASS_TABELA_LISTRADA_ROW}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => handleToggleSelecao(pres.id)}
                            className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{pres.nome}</div>
                          {pres.cpf && <div className="text-[10px] font-mono text-slate-400">{pres.cpf}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            isMefisa ? 'bg-blue-50 text-[#002172] dark:bg-blue-950 dark:text-blue-300' : 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          }`}>
                            {pres.orgaoClasse} {pres.crmOuCrp} ({pres.uf})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded font-mono text-[10px] text-blue-900 dark:text-blue-300 font-bold">
                              CBO {sanitizarCbo(pres.cbo) || '225125'}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[210px]" title={obterDescricaoCbo(pres.cbo)}>
                              {obterDescricaoCbo(pres.cbo).replace(/^\d+\s*-\s*/, '')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {pres.procedimentos && pres.procedimentos.length > 0 ? (
                              pres.procedimentos.map((proc, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${obterBadgeColorProcedimento(proc)}`}
                                >
                                  {proc}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">Geral</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => abrirModalEdicao(pres)}
                              title="Editar Registro"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#002172] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => solicitarExclusaoIndividual(pres.id)}
                              title="Excluir Registro"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TopScrollTableWrapper>
          ) : (
            /* VISUALIZAÇÃO EM CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prestadoresFiltrados.map((pres, index) => {
                const selecionado = selecionadosIds.includes(pres.id);
                const isMefisa = pres.tipo === 'MEFISA' || (!pres.tipo && pres.pastaAtribuida?.includes('Mefisa'));
                return (
                  <div
                    key={`${pres.id}-${index}`}
                    className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                      selecionado ? 'border-[#002172] dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-950' : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => handleToggleSelecao(pres.id)}
                            className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4 cursor-pointer"
                          />
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            isMefisa ? 'bg-blue-50 text-[#002172] dark:bg-blue-950 dark:text-blue-300' : 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                          }`}>
                            {pres.orgaoClasse} {pres.crmOuCrp} ({pres.uf})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => abrirModalEdicao(pres)}
                            title="Editar Registro"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#002172] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => solicitarExclusaoIndividual(pres.id)}
                            title="Excluir Registro"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{pres.nome}</h3>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded font-mono text-[10px] text-blue-900 dark:text-blue-300 font-bold">
                            CBO {sanitizarCbo(pres.cbo) || '225125'}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {obterDescricaoCbo(pres.cbo).replace(/^\d+\s*-\s*/, '')}
                          </span>
                        </div>
                      </div>

                      {isMefisa && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                            Procedimentos Atendidos:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {pres.procedimentos && pres.procedimentos.length > 0 ? (
                              pres.procedimentos.map((proc, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                >
                                  {proc}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">Nenhum especificado</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isMefisa ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {isMefisa ? 'Doutor Mefisa' : 'Credenciado Externo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: IMPORTADOR DE PLANILHA */}
      {abaAtiva === 'importacao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-2">
            <div className={`p-3 rounded-xl border text-center text-xs transition-all ${etapaImportacao === 1 ? 'bg-blue-50 border-[#002172] text-[#002172] font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
              1. Seleção de Arquivo
            </div>
            <div className={`p-3 rounded-xl border text-center text-xs transition-all ${etapaImportacao === 2 ? 'bg-blue-50 border-[#002172] text-[#002172] font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
              2. Mapeamento Inteligente
            </div>
            <div className={`p-3 rounded-xl border text-center text-xs transition-all ${etapaImportacao === 3 ? 'bg-blue-50 border-[#002172] text-[#002172] font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
              3. Pré-visualização
            </div>
            <div className={`p-3 rounded-xl border text-center text-xs transition-all ${etapaImportacao === 4 ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
              4. Importado com Sucesso
            </div>
          </div>

          {etapaImportacao === 1 && (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#002172] flex items-center justify-center mx-auto shadow-inner">
                <Zap className="w-8 h-8 text-[#91CA0C]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Importação de Prestadores e Credenciados Externos
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Envie sua planilha CSV para cadastrar prestadores externos em lote com detecção inteligente de procedimentos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs">
                  <Upload className="w-4 h-4 text-[#91CA0C]" />
                  <span>Selecionar Planilha CSV</span>
                  <input type="file" accept=".csv" onChange={handleFileUploadPrestadores} className="hidden" />
                </label>

                <button
                  onClick={handleCarregarFixturePrestadores}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Carregar Planilha Exemplo (Fixture)</span>
                </button>
              </div>
            </div>
          )}

          {etapaImportacao === 2 && (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Mapeamento Inteligente ({nomeArquivo})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">Auto-detectado</span>
                </h3>
                <p className="text-xs text-slate-500">O sistema mapeou automaticamente as colunas principais e de procedimentos.</p>
              </div>

              {/* Seletor de Tipo / Destino da Importação */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">
                  Destino da Importação (Doutores Mefisa ou Prestadores) *
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="tipoImportacaoLote"
                      checked={tipoImportacaoLote === 'MEFISA'}
                      onChange={() => setTipoImportacaoLote('MEFISA')}
                      className="text-[#002172] focus:ring-[#002172]"
                    />
                    <span>Doutores Mefisa (Corpo Clínico Interno)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="tipoImportacaoLote"
                      checked={tipoImportacaoLote === 'PRESTADOR'}
                      onChange={() => setTipoImportacaoLote('PRESTADOR')}
                      className="text-[#002172] focus:ring-[#002172]"
                    />
                    <span>Prestadores / Credenciados Externos</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cabecalho.map((col) => (
                  <div key={col} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{col}</span>
                      <select
                        value={mapeamento[col] || 'ignorar'}
                        onChange={(e) => setMapeamento({ ...mapeamento, [col]: e.target.value })}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-800 dark:text-white"
                      >
                        <option value="ignorar">-- Ignorar Coluna --</option>
                        <option value="nome">Nome *</option>
                        <option value="cpf">CPF</option>
                        <option value="conselho">Conselho</option>
                        <option value="registro">Número de Registro</option>
                        <option value="cbo">CBO</option>
                        <option value="uf">UF</option>
                        <option value="especialidade">Especialidade</option>
                      </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleAvancarPreviaPrestadores}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#002172] text-white text-xs font-bold hover:bg-[#001752] transition-colors"
                >
                  <span>Avançar para Pré-visualização</span>
                  <ArrowRight className="w-4 h-4 text-[#91CA0C]" />
                </button>
              </div>
            </div>
          )}

          {etapaImportacao === 3 && (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pré-visualização ({linhasPreviasImport.length} Prestadores)</h3>
                <p className="text-xs text-slate-500">Confira a normalização dos dados antes de confirmar a importação como Credenciados Externos.</p>
              </div>

              <div className="max-h-[320px] overflow-y-auto">
                <TopScrollTableWrapper>
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Nome</th>
                        <th className="p-3">Registro</th>
                        <th className="p-3">Procedimentos Normalizados</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {linhasPreviasImport.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{p.nome}</td>
                          <td className="p-3 font-mono">{p.orgaoClasse} {p.crmOuCrp} ({p.uf})</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {p.procedimentos.map((proc: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                  {proc}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TopScrollTableWrapper>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  onClick={() => setEtapaImportacao(2)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Voltar ao Mapeamento
                </button>
                <button
                  onClick={handleConfirmarImportacaoPrestadores}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Importação como Prestadores Externos</span>
                </button>
              </div>
            </div>
          )}

          {etapaImportacao === 4 && (
            <div className="p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Importação Concluída!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Os prestadores foram importados para a aba de "Prestadores & Credenciados Externos".
              </p>
              <button
                onClick={() => setAbaAtiva('prestadores')}
                className="px-5 py-2.5 bg-[#002172] text-white text-xs font-bold rounded-xl hover:bg-[#001752] transition-colors"
              >
                Ver Prestadores Externos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalConfirmacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Confirmar Exclusão</h3>
              <p className="text-xs text-slate-500">
                {tipoExclusao === 'lote'
                  ? `Deseja realmente excluir os ${selecionadosIds.length} registros selecionados?`
                  : 'Deseja realmente excluir este registro?'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmacaoAberto(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      {isModalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-900/60 rounded-xl">
                  {tipoCadastro === 'MEFISA' ? <Stethoscope className="w-5 h-5 text-[#91CA0C]" /> : <Building className="w-5 h-5 text-[#91CA0C]" />}
                </div>
                <div>
                  <h3 className="font-bold text-base font-['Quicksand']">
                    {prestadorEmEdicao ? 'Editar Registro' : (tipoCadastro === 'MEFISA' ? 'Novo Doutor Mefisa' : 'Novo Prestador / Credenciado')}
                  </h3>
                  <p className="text-xs text-blue-100">
                    {tipoCadastro === 'MEFISA' ? 'Membro do corpo clínico interno Mefisa' : 'Parceiro ou credenciado externo'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalAberto(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPrestador} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {erro && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {resultadoDuplicidade && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-xl text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span>Possível Duplicidade Detectada ({resultadoDuplicidade.motivo})</span>
                      <p className="text-[11px] font-normal text-amber-800 dark:text-amber-300 mt-0.5">
                        Já existe um doutor/prestador cadastrado com estes dados: <strong>{resultadoDuplicidade.prestadorExistente.nome}</strong> ({resultadoDuplicidade.prestadorExistente.orgaoClasse} {resultadoDuplicidade.prestadorExistente.crmOuCrp}).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => abrirModalEdicao(resultadoDuplicidade.prestadorExistente)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                    >
                      Editar Registro Existente
                    </button>
                  </div>
                </div>
              )}

              {/* Seletor de Categoria (Doutor Mefisa vs Prestador Externo) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria do Registro *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoCadastro('MEFISA')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      tipoCadastro === 'MEFISA'
                        ? 'bg-blue-50 border-[#002172] text-[#002172] dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Doutor Mefisa (Interno)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoCadastro('PRESTADOR')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      tipoCadastro === 'PRESTADOR'
                        ? 'bg-cyan-50 border-cyan-700 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Prestador Externo</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dra. Juliana Silveira"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-[#002172]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CPF (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white focus:outline-[#002172]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Conselho Profissional
                  </label>
                  <select
                    value={orgaoClasse}
                    onChange={(e) => setOrgaoClasse(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:outline-[#002172]"
                  >
                    <option value="CRP">CRP (Psicologia)</option>
                    <option value="CRM">CRM (Medicina)</option>
                    <option value="CRFa">CRFª (Fonoaudiologia)</option>
                    <option value="CREFITO">CREFITO (T.O. / Fisioterapia)</option>
                    <option value="Outro">Outro Conselho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Registro *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 0698765"
                    value={crmOuCrp}
                    onChange={(e) => {
                      const limpo = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                      setCrmOuCrp(limpo);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white focus:outline-[#002172]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UF do Conselho
                  </label>
                  <input
                    type="text"
                    placeholder="SP"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white focus:outline-[#002172]"
                  />
                </div>

                {/* Seleção de CBO com Sistema de Pesquisa */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      <span>CBO & Especialidade Médica/Ocupação *</span>
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold">
                      {cbosFiltradosModal.length} CBO(s) disponível(is)
                    </span>
                  </label>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar CBO por código ou especialidade (ex: 225124, Pediatra, Neurologista)..."
                        value={pesquisaCboModal}
                        onChange={(e) => setPesquisaCboModal(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:outline-[#002172]"
                      />
                      {pesquisaCboModal && (
                        <button
                          type="button"
                          onClick={() => setPesquisaCboModal('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <select
                      value={cbo}
                      onChange={(e) => setCbo(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:outline-[#002172]"
                      required
                    >
                      {cbosFiltradosModal.map((option) => (
                        <option key={option.codigo} value={option.codigo}>
                          {option.label}
                        </option>
                      ))}
                      {cbosFiltradosModal.length === 0 && (
                        <option value={cbo}>
                          CBO {cbo} - (Nenhum CBO encontrado para "{pesquisaCboModal}")
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              </div>



              {/* Procedimentos (Múltiplos) - Apenas para Doutor Mefisa */}
              {tipoCadastro === 'MEFISA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Procedimentos Atendidos *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    {LISTA_PROCEDIMENTOS_OPCOES.map((proc) => {
                      const marcado = procedimentosSelecionados.includes(proc);
                      return (
                        <label
                          key={proc}
                          className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium"
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => handleToggleProcedimento(proc)}
                            className="rounded text-[#002172] focus:ring-[#002172] w-3.5 h-3.5"
                          />
                          <span>{proc}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalAberto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs"
                >
                  {prestadorEmEdicao ? 'Salvar Alterações' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
