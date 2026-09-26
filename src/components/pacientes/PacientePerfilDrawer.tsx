import React, { useState, useRef } from 'react';
import {
  User,
  Calendar,
  CreditCard,
  Users,
  Shield,
  FileText,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  History,
  CheckCircle2,
  ExternalLink,
  Edit3,
  X,
  Eye,
  EyeOff,
  Plus,
  ArrowRight,
  FileCheck2,
  Upload,
  FileType,
  Image as ImageIcon,
  Copy,
  Check,
  Zap,
  RefreshCw,
  Stethoscope,
  CalendarDays,
  Hash,
  Calculator,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { Paciente, PapelUsuario, EventoAuditoria, FormularioCadastroPaciente, Prestador } from '../../types/clinic';
import {
  PacientesService,
  mascararCpf,
  mascararCarteirinha,
  calcularVencimentoFormulario,
} from '../../services/pacientesService';
import { EditarPacienteModal } from './EditarPacienteModal';
import { TrocarCarteirinhaModal } from './TrocarCarteirinhaModal';
import { GerenciarResponsaveisModal } from './GerenciarResponsaveisModal';
import { MOCK_AUTORIZACOES, MOCK_GUIAS, MOCK_ANALISES, obterPrestadoresStorage, MOCK_PRESTADORES } from '../../data/mockClinicData';
import { useTheme } from '../../context/ThemeContext';
import {
  formatarDataBr,
  calcularAlinhamentoProximaAutorizacao,
  calcularSessoesPeriodo,
  parseIsoDateLocal,
  identificarDiaSemana,
  formatarDiaSemanaPt,
} from '../../services/businessRules';
import { ProcedimentosService } from '../../services/procedimentosService';
import { VisualizadorFormularioModal } from './VisualizadorFormularioModal';
import { FormularioStorageService } from '../../services/formularioStorageService';
import { converterArquivoParaImagens } from '../../services/pdfConverterService';

interface PacientePerfilDrawerProps {
  paciente: Paciente;
  usuarioAtual: { nome: string; papel: PapelUsuario };
  onFechar: () => void;
  onPacienteAtualizado: (pacienteAtualizado: Paciente) => void;
  onOpenAudit: () => void;
}

export const PacientePerfilDrawer: React.FC<PacientePerfilDrawerProps> = ({
  paciente: pacienteProp,
  usuarioAtual,
  onFechar,
  onPacienteAtualizado,
  onOpenAudit,
}) => {
  const [paciente, setPaciente] = useState<Paciente>(pacienteProp);
  const { showMonthInitials } = useTheme();
  const [cpfRevelado, setCpfRevelado] = useState(false);
  const [carteirinhaRevelada, setCarteirinhaRevelada] = useState(false);
  const [feedbackSalvo, setFeedbackSalvo] = useState<{ mensagem: string; operador: string; dataHora: string } | null>(null);

  // Sub-modais
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalTrocarCartAberto, setModalTrocarCartAberto] = useState(false);
  const [modalResponsaveisAberto, setModalResponsaveisAberto] = useState(false);
  const [modalVisualizarFormAberto, setModalVisualizarFormAberto] = useState(false);

  // Modo de visualização: Prontuário Geral ou Modo de Autorização
  const [modoVisualizacao, setModoVisualizacao] = useState<'prontuario' | 'autorizacao'>('prontuario');
  const [subAbaAutorizacao, setSubAbaAutorizacao] = useState<'sulamerica' | 'tivita'>('sulamerica');
  const [copiadoChave, setCopiadoChave] = useState<string | null>(null);
  const [dataHoraGuia, setDataHoraGuia] = useState<Date>(new Date());

  const handleCopiar1Clique = (texto: string, chave: string) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoChave(chave);
    setTimeout(() => {
      setCopiadoChave((prev) => (prev === chave ? null : prev));
    }, 2500);
  };

  const handleAtualizarHoraGuia = () => {
    setDataHoraGuia(new Date());
  };

  // Aba ativa de histórico futuro
  const [abaHistorico, setAbaHistorico] = useState<'autorizacoes' | 'sessoes' | 'guias' | 'analises' | 'auditoria'>('autorizacoes');

  const [fileInputDrawerRefState, setFileInputDrawerRefState] = useState<any>(null);
  const [dataEmissaoDrawer, setDataEmissaoDrawer] = useState<string>(
    paciente.formulario?.dataEmissao || new Date().toISOString().slice(0, 10)
  );

  const fileInputDrawerRef = useRef<HTMLInputElement>(null);

  const handleImportarArquivo = async (file: File) => {
    const nome = file.name;
    const extensao = nome.split('.').pop()?.toLowerCase();
    const isImg =
      extensao === 'jpeg' ||
      extensao === 'jpg' ||
      extensao === 'png' ||
      extensao === 'webp' ||
      file.type.startsWith('image/');

    const tipoIdentificado: 'pdf' | 'jpeg' = isImg ? 'jpeg' : 'pdf';
    const tamanhoKb = Math.round(file.size / 1024) || 350;
    const dataEmissaoUsada = dataEmissaoDrawer || new Date().toISOString().slice(0, 10);
    const vencimentoInfo = calcularVencimentoFormulario(dataEmissaoUsada);

    try {
      // Converte páginas para visualização de alta definição se for PDF ou lê imagem direta
      const imagens = await converterArquivoParaImagens(file);
      // Salva o arquivo real original intacto no IndexedDB para este paciente e todos os homônimos
      const todosPacientes = PacientesService.obterPacientes();
      const homonimos = todosPacientes.filter(
        (p) => p.nome.trim().toLowerCase() === paciente.nome.trim().toLowerCase()
      );
      for (const hom of homonimos) {
        await FormularioStorageService.salvarArquivoOriginal(hom.id, file, file.name, imagens);
      }
      if (!homonimos.some((h) => h.id === paciente.id)) {
        await FormularioStorageService.salvarArquivoOriginal(paciente.id, file, file.name, imagens);
      }

      const novoFormulario: FormularioCadastroPaciente = {
        nomeArquivo: nome,
        tipoArquivo: tipoIdentificado,
        tamanhoKb,
        dataEmissao: dataEmissaoUsada,
        dataVencimento: vencimentoInfo.dataVencimento,
        statusVencimento: vencimentoInfo.status,
        diasRestantes: vencimentoInfo.diasRestantes,
      };

      const { paciente: atualizado } = PacientesService.atualizarPaciente(
        paciente.id,
        {
          formulario: novoFormulario,
          pendenciasQuantidade: vencimentoInfo.status === 'VENCIDO' ? 1 : 0,
        },
        usuarioAtual,
        `Importação do formulário cadastral (${nome}) com identificação de formato ${tipoIdentificado.toUpperCase()}`
      );

      notificarAlteracao(
        atualizado,
        `Arquivo original "${nome}" importado com sucesso! Clique em Visualizar para abri-lo exatamente como ele é.`
      );
    } catch (err) {
      console.error('Erro ao importar arquivo do formulário:', err);
    }
  };

  const handleAtualizarDataEmissao = (novaData: string) => {
    setDataEmissaoDrawer(novaData);
    if (!paciente.formulario) return;

    const vencimentoInfo = calcularVencimentoFormulario(novaData);
    const formularioAtualizado: FormularioCadastroPaciente = {
      ...paciente.formulario,
      dataEmissao: novaData,
      dataVencimento: vencimentoInfo.dataVencimento,
      statusVencimento: vencimentoInfo.status,
      diasRestantes: vencimentoInfo.diasRestantes,
    };

    const { paciente: atualizado } = PacientesService.atualizarPaciente(
      paciente.id,
      {
        formulario: formularioAtualizado,
        pendenciasQuantidade: vencimentoInfo.status === 'VENCIDO' ? 1 : 0,
      },
      usuarioAtual,
      `Atualização da data de emissão do formulário para ${novaData}`
    );

    notificarAlteracao(atualizado, `Data de emissão atualizada para ${formatarDataBr(novaData, showMonthInitials)} (Vencimento recalculado para ${formatarDataBr(vencimentoInfo.dataVencimento, showMonthInitials)}).`);
  };

  const handleSimularImportacaoDrawer = async (tipo: 'pdf' | 'jpeg') => {
    const nomeArquivo =
      tipo === 'pdf'
        ? `FORMULARIO-ABA-${paciente.nome.toUpperCase().replace(/\s+/g, '_')}.pdf`
        : `FORMULARIO-ABA-${paciente.nome.toUpperCase().replace(/\s+/g, '_')}.jpeg`;

    const dataEmissaoUsada = dataEmissaoDrawer || paciente.formulario?.dataEmissao || new Date().toISOString().slice(0, 10);
    const vencimentoInfo = calcularVencimentoFormulario(dataEmissaoUsada);

    const novoFormulario: FormularioCadastroPaciente = {
      nomeArquivo,
      tipoArquivo: tipo,
      tamanhoKb: 8048,
      dataEmissao: dataEmissaoUsada,
      dataVencimento: vencimentoInfo.dataVencimento,
      statusVencimento: vencimentoInfo.status,
      diasRestantes: vencimentoInfo.diasRestantes,
    };

    const { paciente: atualizado } = PacientesService.atualizarPaciente(
      paciente.id,
      {
        formulario: novoFormulario,
        pendenciasQuantidade: vencimentoInfo.status === 'VENCIDO' ? 1 : 0,
      },
      usuarioAtual,
      `Registro do formulário cadastral (${nomeArquivo})`
    );

    notificarAlteracao(
      atualizado,
      `Formulário cadastrado (${nomeArquivo}). Você pode selecionar o arquivo do seu computador a qualquer momento para visualização.`
    );
  };

  const handleBaixarArquivo = async () => {
    if (!paciente.formulario) return;
    try {
      const arq = await FormularioStorageService.obterArquivoOriginal(paciente.id);
      if (arq && arq.blob) {
        const url = URL.createObjectURL(arq.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = arq.nomeArquivo || paciente.formulario.nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Erro ao obter arquivo original para download:', e);
    }
    if (paciente.formulario.baixarUrl) {
      const a = document.createElement('a');
      a.href = paciente.formulario.baixarUrl;
      a.download = paciente.formulario.nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`O arquivo original "${paciente.formulario.nomeArquivo}" pode ser selecionado no seu computador para download.`);
    }
  };

  const handleImprimirArquivo = () => {
    if (!paciente.formulario) return;
    window.print();
  };

  // Dados relacionados fictícios do paciente para o histórico futuro
  const autorizacoesPaciente = MOCK_AUTORIZACOES.filter(
    (a) => a.pacienteId === paciente.id || a.pacienteNome === paciente.nome
  );
  const guiasPaciente = MOCK_GUIAS.filter(
    (g) => g.pacienteId === paciente.id || g.pacienteNome === paciente.nome
  );
  const analisesPaciente = MOCK_ANALISES.filter(
    (an) => an.pacienteNome === paciente.nome
  );

  // Eventos de auditoria cadastral específicos deste paciente
  const auditoriaLocal = PacientesService.obterAuditoriaPacientes().filter(
    (ev) => ev.registroId === paciente.id
  );

  const notificarAlteracao = (pacAtualizado: Paciente, resumo: string) => {
    setPaciente(pacAtualizado);
    onPacienteAtualizado(pacAtualizado);

    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} — ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    setFeedbackSalvo({
      mensagem: resumo,
      operador: usuarioAtual.nome,
      dataHora: dataHoraStr,
    });

    setTimeout(() => {
      setFeedbackSalvo(null);
    }, 6000);
  };

  const getStatusBadge = (status: string) => {
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

  // ==========================================
  // CÁLCULOS E DADOS PARA O MODO DE AUTORIZAÇÃO
  // ==========================================
  // 1. Carteirinha do paciente (completa, sem máscara para cópia)
  const carteirinhaCompleta = paciente.carteirinhaAtual || paciente.carteirinha || '';

  // 2. Número da guia do Prestador (HHMMDDMMAAAA)
  const hh = String(dataHoraGuia.getHours()).padStart(2, '0');
  const mm = String(dataHoraGuia.getMinutes()).padStart(2, '0');
  const dd = String(dataHoraGuia.getDate()).padStart(2, '0');
  const mes = String(dataHoraGuia.getMonth() + 1).padStart(2, '0');
  const aaaa = String(dataHoraGuia.getFullYear());
  const numeroGuiaPrestador = `${hh}${mm}${dd}${mes}${aaaa}`;

  // 3, 4, 5, 6: Dados do Prestador
  const todosPrestadores: Prestador[] = typeof window !== 'undefined' && localStorage.getItem('clinica_mefisa_prestadores_v2')
    ? JSON.parse(localStorage.getItem('clinica_mefisa_prestadores_v2') || '[]')
    : (obterPrestadoresStorage() || MOCK_PRESTADORES);

  const prestadorEncontrado = todosPrestadores.find(
    (p) =>
      p.id === paciente.prestadorId ||
      (p.nome && p.nome.toLowerCase().trim() === (paciente.prestadorNome || '').toLowerCase().trim())
  ) || todosPrestadores[0];

  const prestadorNome = prestadorEncontrado?.nome || paciente.prestadorNome || 'Dra. Beatriz Albuquerque';
  const prestadorUf = prestadorEncontrado?.uf || 'SP';
  const prestadorCrm = (prestadorEncontrado?.crmOuCrp || '123456').replace(/\D/g, '') || prestadorEncontrado?.crmOuCrp || '123456';
  const prestadorCbo = prestadorEncontrado?.cbo || '225125';

  // 7. Data do Atendimento (Data atual do usuário autorizando: DD/MM/AAAA e formato ISO)
  const agoraHoje = new Date();
  const anoHoje = agoraHoje.getFullYear();
  const mesHoje = String(agoraHoje.getMonth() + 1).padStart(2, '0');
  const diaHoje = String(agoraHoje.getDate()).padStart(2, '0');
  const dataAtendimentoIso = `${anoHoje}-${mesHoje}-${diaHoje}`;
  const dataAtendimentoHojeBr = `${diaHoje}/${mesHoje}/${anoHoje}`;

  // 8. Procedimento e Número de Sessões (e relatório de cálculo)
  const todosProcedimentos = ProcedimentosService.obterTodos();
  const procDescOuCod = paciente.procedimentoPrincipal || 'Psicologia ABA';
  const procEncontrado = todosProcedimentos.find(
    (p) =>
      p.descricao.toLowerCase().trim() === procDescOuCod.toLowerCase().trim() ||
      p.codigo === procDescOuCod ||
      procDescOuCod.toLowerCase().includes(p.descricao.toLowerCase()) ||
      p.descricao.toLowerCase().includes(procDescOuCod.toLowerCase())
  ) || todosProcedimentos[0];

  const codigoProcedimentoApenasNumeros = (procEncontrado?.codigo || '66600480').replace(/\D/g, '');
  const sessoesPorSemana =
    (paciente.sessoesPorSemana && paciente.sessoesPorSemana > 0)
      ? paciente.sessoesPorSemana
      : (paciente.quantidadeSemana && paciente.quantidadeSemana > 0)
      ? paciente.quantidadeSemana
      : (paciente.diasDaSemana && paciente.diasDaSemana.length > 0)
      ? paciente.diasDaSemana.length
      : (procEncontrado?.sessoesPorSemanaPadrao || 1);

  const converterDiaNomeParaIndice = (nome: string): number => {
    const n = (nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes('dom')) return 0;
    if (n.includes('seg')) return 1;
    if (n.includes('ter')) return 2;
    if (n.includes('qua')) return 3;
    if (n.includes('qui')) return 4;
    if (n.includes('sex')) return 5;
    if (n.includes('sab') || n.includes('sáb')) return 6;
    return 1;
  };

  const diasArrayNomes = paciente.diasDaSemana && paciente.diasDaSemana.length > 0
    ? paciente.diasDaSemana
    : [paciente.diaDaSemana || 'Segunda-feira'];
  const diasIndices = diasArrayNomes.map(converterDiaNomeParaIndice);

  // A data de início do ciclo é exatamente a data do dia do atendimento
  const dataInicioCiclo = dataAtendimentoIso;

  const alinhamentoCalc = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: diasIndices as any,
    dataInicioCicloStr: dataInicioCiclo,
    sessoesPorSemana,
  });

  const resultadoSessoesPeriodo = calcularSessoesPeriodo(
    sessoesPorSemana,
    dataInicioCiclo,
    alinhamentoCalc.dataProximaAutorizacaoCalculada
  );

  const numeroSessoesCalculadas = resultadoSessoesPeriodo.quantidadeTotalSugerida || alinhamentoCalc.totalSessoesSugeridas || (sessoesPorSemana * 4);

  // Justificativa Sem Acentos (Exigência estrita: "sem letras especiais como com acentos, um tiu [~] ou ç")
  const justificativaSemAcentos = `Sabemos que a quantidade do formulario e ${sessoesPorSemana} por semana, porem foi solicitado ${numeroSessoesCalculadas}, que sera para o mes inteiro.`;

  // Dados para o modo TIVITA
  const amanhaObj = new Date(agoraHoje);
  amanhaObj.setDate(amanhaObj.getDate() + 1);
  const diaAmanha = String(amanhaObj.getDate()).padStart(2, '0');
  const mesAmanha = String(amanhaObj.getMonth() + 1).padStart(2, '0');
  const anoAmanha = amanhaObj.getFullYear();
  const dataExecucaoAmanhaBr = `${diaAmanha}/${mesAmanha}/${anoAmanha}`;

  const dataEmissaoFormularioBr = paciente.formulario?.dataEmissao
    ? formatarDataBr(paciente.formulario.dataEmissao, showMonthInitials)
    : dataAtendimentoHojeBr;

  const doutorMefisaPacienteNome = paciente.pastaDoutoraMefisa || 'Dra. Gabriela Lopes dos Santos Conegero';

  // Variações do procedimento (Avaliações e Reavaliações com menos destaque)
  const variacoesProcedimento = todosProcedimentos.filter(
    (p) =>
      p.especialidade.toLowerCase().trim() === procEncontrado.especialidade.toLowerCase().trim() &&
      p.codigo !== procEncontrado.codigo &&
      (p.categoria === 'AVALIACAO_ABA' || p.categoria === 'REAVALIACAO_ABA')
  );

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
        <div className="w-full max-w-3xl bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
          {/* Header do Perfil */}
          <div className="bg-slate-900 text-white p-6 pb-4 flex items-start justify-between shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Prontuário Mestre {paciente.codigoProntuario}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                    paciente.status
                  )}`}
                >
                  {paciente.status}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    (paciente.polo || 'M1').includes('2')
                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                      : 'bg-teal-100 text-teal-900 border-teal-300'
                  }`}
                >
                  {(paciente.polo || 'M1').includes('2') ? 'M2' : 'M1'}
                </span>
              </div>
              <h2 className="text-2xl font-bold font-['Quicksand'] text-white">
                {paciente.nome}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                {paciente.idade !== undefined && paciente.idade !== null && (
                  <>
                    <span>{paciente.idade} anos</span>
                    <span>•</span>
                  </>
                )}
                {paciente.dataNascimento && (
                  <>
                    <span>Nascimento: {formatarDataBr(paciente.dataNascimento, showMonthInitials)}</span>
                    <span>•</span>
                  </>
                )}
                <span>Convênio: {paciente.convenioNome}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalEditarAberto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                title="Editar dados gerais do paciente"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#91CA0C]" />
                <span>Editar Paciente</span>
              </button>
              <button
                onClick={onFechar}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BOTÃO / ALTERNADOR DE MODO NO TOPO */}
          <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setModoVisualizacao('prontuario')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modoVisualizacao === 'prontuario'
                    ? 'bg-[#002172] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Prontuário Geral</span>
              </button>

              <button
                type="button"
                onClick={() => setModoVisualizacao('autorizacao')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modoVisualizacao === 'autorizacao'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-[#91CA0C]" />
                <span>⚡ Modo de Autorização</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
              {modoVisualizacao === 'autorizacao' ? (
                <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#91CA0C] animate-pulse"></span>
                  <span>Cópia rápida com 1 clique para portal do convênio</span>
                </span>
              ) : (
                <span className="text-slate-400">Visão cadastral completa</span>
              )}
            </div>
          </div>

          {/* Feedback Imediato Pós-Salvamento (Requisito 12) */}
          {feedbackSalvo && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">✓ {feedbackSalvo.mensagem}</span>
              </div>
              <div className="text-[11px] text-emerald-700">
                Responsável: <strong>{feedbackSalvo.operador}</strong> • {feedbackSalvo.dataHora}
              </div>
            </div>
          )}

          {/* Banner de Urgência de Formulário Vencido */}
          {paciente.formulario?.statusVencimento === 'VENCIDO' && (
            <div className="bg-red-500 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold animate-pulse shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>
                  ⚠️ URGÊNCIA ADMINISTRATIVA: Formulário cadastral vencido há mais de 180 dias!
                </span>
              </div>
              <span className="text-[11px] underline">
                Orientação: avisar aos responsáveis para renovação imediata.
              </span>
            </div>
          )}

          {/* Conteúdo com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {modoVisualizacao === 'autorizacao' ? (
              /* ========================================================================= */
              /* MODO DE AUTORIZAÇÃO (CÓPIA 1-CLIQUE - DADOS FORMATADOS PARA O PORTAL)     */
              /* ========================================================================= */
              <div className="space-y-4 animate-in fade-in">
                {/* Seletor de Sub-Abas do Modo de Autorização: SulAmérica vs Tivita */}
                <div className="flex items-center justify-between gap-3 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSubAbaAutorizacao('sulamerica')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        subAbaAutorizacao === 'sulamerica'
                          ? 'bg-[#002172] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span>SULAMÉRICA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubAbaAutorizacao('tivita')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        subAbaAutorizacao === 'tivita'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-300" />
                      <span>TIVITA</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-block pr-2">
                    {subAbaAutorizacao === 'sulamerica'
                      ? 'Guia e Ciclo SulAmérica'
                      : 'Execução e Autorização Tivita'}
                  </span>
                </div>

                {subAbaAutorizacao === 'sulamerica' ? (
                  /* ========================================================================= */
                  /* SUB-ABA 1: SULAMÉRICA                                                     */
                  /* ========================================================================= */
                  <>
                    {/* Banner Informativo SulAmérica */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-emerald-500/10 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Modo de Autorização — SULAMÉRICA</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-bold">
                              1-Clique para Copiar
                            </span>
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Informações estruturadas para preenchimento ágil no portal do convênio SulAmérica.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAtualizarHoraGuia}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        title="Atualizar carimbo da guia para o minuto atual"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                        <span>Atualizar Horário da Guia</span>
                      </button>
                    </div>

                    {/* Grid Superior: Carteirinha e Número da Guia do Prestador */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Carteirinha do Paciente */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-[#002172] dark:hover:border-blue-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-[#002172] dark:text-blue-300" />
                            <span>1. Carteirinha do Paciente</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(carteirinhaCompleta, 'carteirinha')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'carteirinha'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#002172] hover:bg-[#001752] text-white'
                            }`}
                          >
                            {copiadoChave === 'carteirinha' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'carteirinha' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-base font-extrabold text-slate-900 dark:text-white tracking-wide flex items-center justify-between">
                          <span>{carteirinhaCompleta || 'Não informada'}</span>
                          <span className="text-[11px] font-sans font-normal text-slate-400">{paciente.convenioNome}</span>
                        </div>
                      </div>

                      {/* 2. Número da Guia do Prestador (HHMMDDMMAAAA) */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-[#002172] dark:hover:border-blue-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-blue-600" />
                            <span>2. Número da Guia do Prestador</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(numeroGuiaPrestador, 'guia_prestador')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'guia_prestador'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#002172] hover:bg-[#001752] text-white'
                            }`}
                          >
                            {copiadoChave === 'guia_prestador' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'guia_prestador' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-base font-extrabold text-[#002172] dark:text-blue-200 tracking-wider flex items-center justify-between">
                          <span>{numeroGuiaPrestador}</span>
                          <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            HHMMDDMMAAAA
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bloco do Prestador (Itens 3, 4, 5, 6) */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-[#002172] dark:text-blue-300" />
                          <span>Informações do Prestador do Paciente</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleCopiar1Clique(`${prestadorNome} | CRM/CRP: ${prestadorCrm} | UF: ${prestadorUf} | CBO: ${prestadorCbo}`, 'todos_prestador')}
                          className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiadoChave === 'todos_prestador' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiadoChave === 'todos_prestador' ? 'Copiado Tudo!' : 'Copiar Tudo do Prestador'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 3. Nome do Prestador */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">3. Nome do Prestador</span>
                            <button
                              type="button"
                              onClick={() => handleCopiar1Clique(prestadorNome, 'prestador_nome')}
                              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                            >
                              {copiadoChave === 'prestador_nome' ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={prestadorNome}>
                            {prestadorNome}
                          </div>
                        </div>

                        {/* 4. UF do Prestador */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">4. UF do Prestador</span>
                            <button
                              type="button"
                              onClick={() => handleCopiar1Clique(prestadorUf, 'prestador_uf')}
                              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                            >
                              {copiadoChave === 'prestador_uf' ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                            {prestadorUf}
                          </div>
                        </div>

                        {/* 5. Número do CRM do Prestador */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">5. CRM / Registro</span>
                            <button
                              type="button"
                              onClick={() => handleCopiar1Clique(prestadorCrm, 'prestador_crm')}
                              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                            >
                              {copiadoChave === 'prestador_crm' ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                            {prestadorCrm}
                          </div>
                        </div>

                        {/* 6. CBO do Prestador */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">6. CBO</span>
                            <button
                              type="button"
                              onClick={() => handleCopiar1Clique(prestadorCbo, 'prestador_cbo')}
                              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                            >
                              {copiadoChave === 'prestador_cbo' ? '✓ Copiado' : 'Copiar'}
                            </button>
                          </div>
                          <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                            {prestadorCbo}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 7. Data do Atendimento */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                          <span>7. Data do Atendimento (Data Atual de Autorização)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopiar1Clique(dataAtendimentoHojeBr, 'data_atendimento')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            copiadoChave === 'data_atendimento'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#002172] hover:bg-[#001752] text-white'
                          }`}
                        >
                          {copiadoChave === 'data_atendimento' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiadoChave === 'data_atendimento' ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-base font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <span>{dataAtendimentoHojeBr}</span>
                        <span className="text-[11px] font-sans font-normal text-slate-500 dark:text-slate-400">
                          Formato brasileiro dd/mm/aaaa
                        </span>
                      </div>
                    </div>

                    {/* 8. Código do Procedimento & Número de Sessões (com Relatório) */}
                    <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#002172] dark:text-blue-300 flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-[#002172] dark:text-blue-300" />
                          <span>8. Código do Procedimento e Quantidade de Sessões</span>
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-[#002172] dark:bg-blue-900 text-white px-2.5 py-0.5 rounded-full">
                          {sessoesPorSemana} {sessoesPorSemana === 1 ? 'sessão/semana' : 'sessões/semana'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Código do Procedimento (Apenas Números) */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              Código TUSS (Apenas Números)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopiar1Clique(codigoProcedimentoApenasNumeros, 'cod_proc')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                copiadoChave === 'cod_proc'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-50 dark:bg-blue-950 text-[#002172] dark:text-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              {copiadoChave === 'cod_proc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiadoChave === 'cod_proc' ? 'Copiado!' : 'Copiar Código'}</span>
                            </button>
                          </div>
                          <div className="font-mono text-base font-extrabold text-[#002172] dark:text-blue-300">
                            {codigoProcedimentoApenasNumeros}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {procEncontrado?.descricao || paciente.procedimentoPrincipal}
                          </div>
                        </div>

                        {/* Número de Sessões Solicitadas */}
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              Número de Sessões Autorizadas
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopiar1Clique(String(numeroSessoesCalculadas), 'qtd_sessoes')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                copiadoChave === 'qtd_sessoes'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-50 dark:bg-blue-950 text-[#002172] dark:text-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              {copiadoChave === 'qtd_sessoes' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiadoChave === 'qtd_sessoes' ? 'Copiado!' : 'Copiar Quantidade'}</span>
                            </button>
                          </div>
                          <div className="font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <span>{numeroSessoesCalculadas}</span>
                            <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">sessões no ciclo</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Ciclo até próximo mês ({alinhamentoCalc.semanasCicloCalculadas} semanas)
                          </div>
                        </div>
                      </div>

                      {/* Variações do Procedimento em SulAmérica (Menos Destaque) */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                          Variações do Procedimento (Avaliações / Reavaliações):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {variacoesProcedimento.length > 0 ? (
                            variacoesProcedimento.map((vp) => {
                              const codLimpo = vp.codigo.replace(/\D/g, '');
                              const chaveVp = `sul_var_${vp.id}`;
                              return (
                                <div
                                  key={vp.id}
                                  className="p-2.5 bg-white/80 dark:bg-slate-950/60 rounded-xl border border-blue-100 dark:border-slate-800 flex items-center justify-between text-xs hover:border-blue-300 dark:hover:border-slate-700 transition-colors"
                                >
                                  <div className="space-y-0.5 truncate pr-2">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">
                                      {codLimpo}
                                    </span>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {vp.descricao}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopiar1Clique(codLimpo, chaveVp)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                                      copiadoChave === chaveVp
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    {copiadoChave === chaveVp ? '✓ Copiado' : 'Copiar'}
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-2 p-2.5 bg-slate-100/60 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                              Sem variações cadastradas para este procedimento.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Relatório Detalhado do Cálculo */}
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-blue-100 dark:border-slate-800 space-y-2 text-xs">
                        <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                          <span>Relatório de Apuração do Cálculo:</span>
                          <span className="text-[10px] text-slate-400">Verificação de Conformidade</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                            <span className="text-slate-400 block text-[10px]">Data Início Ciclo:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {formatarDataBr(dataInicioCiclo, showMonthInitials)}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                            <span className="text-slate-400 block text-[10px]">Alinhamento Próx. Autorização:</span>
                            <span className="font-bold text-[#002172] dark:text-blue-300">
                              {formatarDataBr(alinhamentoCalc.dataProximaAutorizacaoCalculada, showMonthInitials)}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900">
                            <span className="text-slate-400 block text-[10px]">Fórmula Aplicada:</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {resultadoSessoesPeriodo.formulaExplicativa}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <strong>Regra aplicada:</strong> {alinhamentoCalc.regraDescritiva}
                        </div>
                      </div>
                    </div>

                    {/* 9. Formulário do Paciente (Download Direto) */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#002172] dark:text-blue-300" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            9. Formulário do Paciente
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!paciente.formulario) {
                                handleSimularImportacaoDrawer('pdf');
                              }
                              setModalVisualizarFormAberto(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#002172] dark:text-blue-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Visualizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleBaixarArquivo}
                            disabled={!paciente.formulario}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs ${
                              paciente.formulario
                                ? 'text-white bg-[#002172] hover:bg-[#001752] cursor-pointer'
                                : 'text-slate-400 bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <Download className="w-3.5 h-3.5 text-[#91CA0C]" />
                            <span>Baixar Formulário</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {paciente.formulario?.nomeArquivo || 'Formulário padrão cadastrado'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {paciente.formulario ? (
                              <span>
                                Emissão: {formatarDataBr(paciente.formulario.dataEmissao, showMonthInitials)} • Vencimento:{' '}
                                {formatarDataBr(paciente.formulario.dataVencimento, showMonthInitials)} (
                                {paciente.formulario.diasRestantes} dias restantes)
                              </span>
                            ) : (
                              <span>Formulário pronto para download e anexo no portal</span>
                            )}
                          </div>
                        </div>

                        {paciente.formulario?.statusVencimento === 'VALIDO' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                            ✓ Válido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Disponível
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Indicação de Observação / Justificativa Padrão (Idêntico ao Card da Calculadora, SEM ACENTOS) */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <span>Justificativa Padrão Gerada para o Portal do Convênio</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopiar1Clique(justificativaSemAcentos, 'justificativa')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          {copiadoChave === 'justificativa' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                              <span>Copiar Justificativa</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-800 dark:text-slate-100 font-medium italic border border-amber-200 dark:border-amber-800/60 text-xs leading-relaxed">
                        "{justificativaSemAcentos}"
                      </p>

                      <div className="text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <span>✓ Observação formatada sem caracteres especiais para aceitação estrita nos portais.</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ========================================================================= */
                  /* SUB-ABA 2: TIVITA                                                         */
                  /* ========================================================================= */
                  <div className="space-y-4 animate-in fade-in">
                    {/* Banner Informativo Tivita */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Modo de Autorização — TIVITA</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold">
                              1-Clique para Copiar
                            </span>
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Dados específicos estruturados para autorizações no portal Tivita.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Grid de Itens 1, 2, 3: Nome do Paciente, Prestador, Indicação Clínica */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Nome do Paciente */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            <span>1. Nome do Paciente</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(paciente.nome, 'tivita_nome_paciente')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'tivita_nome_paciente'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {copiadoChave === 'tivita_nome_paciente' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'tivita_nome_paciente' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white truncate" title={paciente.nome}>
                          {paciente.nome}
                        </div>
                      </div>

                      {/* 2. Nome do Prestador */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                            <span>2. Nome do Prestador</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(prestadorNome, 'tivita_nome_prestador')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'tivita_nome_prestador'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {copiadoChave === 'tivita_nome_prestador' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'tivita_nome_prestador' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white truncate" title={prestadorNome}>
                          {prestadorNome}
                        </div>
                      </div>

                      {/* 3. Indicação Clínica (SEMPRE SERÁ "F84") */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3. Indicação Clínica</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique('F84', 'tivita_indicacao_clinica')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'tivita_indicacao_clinica'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {copiadoChave === 'tivita_indicacao_clinica' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'tivita_indicacao_clinica' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                          <span>F84</span>
                          <span className="text-[10px] font-sans font-normal text-slate-400">Transtornos globais do desenvolvimento</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. A Justificativa Padrão Gerada para o Portal do Convênio */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 dark:text-amber-200 text-xs flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          <span>4. Justificativa Padrão Gerada para o Portal do Convênio</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopiar1Clique(justificativaSemAcentos, 'tivita_justificativa')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          {copiadoChave === 'tivita_justificativa' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                              <span>Copiar Justificativa</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-800 dark:text-slate-100 font-medium italic border border-amber-200 dark:border-amber-800/60 text-xs leading-relaxed">
                        "{justificativaSemAcentos}"
                      </p>

                      <div className="text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <span>✓ Observação sem acentos para aceitação automática no portal Tivita.</span>
                      </div>
                    </div>

                    {/* Grid 5 & 6: Formulário do Paciente e Data de Emissão */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 5. Formulário do Paciente */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>5. Formulário do Paciente</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!paciente.formulario) {
                                  handleSimularImportacaoDrawer('pdf');
                                }
                                setModalVisualizarFormAberto(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                            >
                              Visualizar
                            </button>
                            <button
                              type="button"
                              onClick={handleBaixarArquivo}
                              disabled={!paciente.formulario}
                              className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all shadow-2xs ${
                                paciente.formulario
                                  ? 'text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                                  : 'text-slate-400 bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </button>
                          </div>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {paciente.formulario?.nomeArquivo || 'Formulário padrão cadastrado'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Pronto
                          </span>
                        </div>
                      </div>

                      {/* 6. Data de Emissão deste Formulário */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>6. Data de Emissão do Formulário</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(dataEmissaoFormularioBr, 'tivita_emissao_form')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'tivita_emissao_form'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {copiadoChave === 'tivita_emissao_form' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'tivita_emissao_form' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono font-extrabold text-base text-slate-900 dark:text-white flex items-center justify-between">
                          <span>{dataEmissaoFormularioBr}</span>
                          <span className="text-[11px] font-sans font-normal text-slate-400">dd/mm/aaaa</span>
                        </div>
                      </div>
                    </div>

                    {/* 7. Código do Procedimento deste paciente e suas Variações */}
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          <Calculator className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          <span>7. Código do Procedimento e Variações</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {procEncontrado?.descricao || paciente.procedimentoPrincipal}
                        </span>
                      </div>

                      {/* Código Principal em Destaque */}
                      <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border-2 border-emerald-500/40 dark:border-emerald-700/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 block">
                            Procedimento Regular (Principal)
                          </span>
                          <div className="font-mono text-lg font-black text-emerald-800 dark:text-emerald-300 tracking-wider">
                            {codigoProcedimentoApenasNumeros}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {procEncontrado?.descricao}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopiar1Clique(codigoProcedimentoApenasNumeros, 'tivita_proc_principal')}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                            copiadoChave === 'tivita_proc_principal'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {copiadoChave === 'tivita_proc_principal' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiadoChave === 'tivita_proc_principal' ? 'Copiado!' : 'Copiar Código'}</span>
                        </button>
                      </div>

                      {/* Variações com Menos Destaque */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                          Variações do Procedimento (Avaliações / Reavaliações):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {variacoesProcedimento.length > 0 ? (
                            variacoesProcedimento.map((vp) => {
                              const codLimpo = vp.codigo.replace(/\D/g, '');
                              const chaveVp = `tivita_var_${vp.id}`;
                              return (
                                <div
                                  key={vp.id}
                                  className="p-2.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                                >
                                  <div className="space-y-0.5 truncate pr-2">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">
                                      {codLimpo}
                                    </span>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={vp.descricao}>
                                      {vp.descricao}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopiar1Clique(codLimpo, chaveVp)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                                      copiadoChave === chaveVp
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {copiadoChave === chaveVp ? '✓ Copiado' : 'Copiar'}
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-2 text-slate-400 text-[11px] italic col-span-2">
                              Nenhuma variação registrada para este procedimento.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grid 8 & 9: Dia da Execução e Nome do Doutor Mefisa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 8. Dia da Execução (Dia SEGUINTE à data atual) */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>8. Dia da Execução (Dia Seguinte)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(dataExecucaoAmanhaBr, 'tivita_execucao')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'tivita_execucao'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {copiadoChave === 'tivita_execucao' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'tivita_execucao' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                          <span>{dataExecucaoAmanhaBr}</span>
                          <span className="text-[10px] font-sans font-normal text-slate-400">Amanhã</span>
                        </div>
                      </div>

                      {/* 9. Nome do Doutor Mefisa do Paciente */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-500 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                            <span>9. Doutor Mefisa do Paciente</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopiar1Clique(doutorMefisaPacienteNome, 'tivita_dr_mefisa')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              copiadoChave === 'tivita_dr_mefisa'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {copiadoChave === 'tivita_dr_mefisa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiadoChave === 'tivita_dr_mefisa' ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white truncate" title={doutorMefisaPacienteNome}>
                          {doutorMefisaPacienteNome}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ========================================================================= */
              /* MODO PRONTUÁRIO GERAL (CONTEÚDO COMPLETO ORIGINAL)                         */
              /* ========================================================================= */
              <>
                {/* 1. RESUMO */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#002172] dark:text-blue-300" />
                <span>Resumo Cadastral Principal</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">CPF do Paciente</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-800">
                      {cpfRevelado
                        ? paciente.cpf || 'Não informado'
                        : paciente.cpfMascarado || mascararCpf(paciente.cpf || '') || 'Não informado'}
                    </span>
                    {paciente.cpf && (
                      <button
                        onClick={() => setCpfRevelado(!cpfRevelado)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                        title={cpfRevelado ? 'Mascarar CPF (LGPD)' : 'Revelar CPF completo'}
                      >
                        {cpfRevelado ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Convênio Principal</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {paciente.convenioNome}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Carteirinha Atual</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-slate-800">
                      {carteirinhaRevelada
                        ? paciente.carteirinhaAtual || paciente.carteirinha
                        : paciente.carteirinhaAtualMascarada ||
                          mascararCarteirinha(paciente.carteirinhaAtual || paciente.carteirinha || '')}
                    </span>
                    <button
                      onClick={() => setCarteirinhaRevelada(!carteirinhaRevelada)}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title={carteirinhaRevelada ? 'Mascarar carteirinha' : 'Revelar carteirinha completa'}
                    >
                      {carteirinhaRevelada ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Responsável Principal</span>
                  <span className="font-bold text-slate-800 block mt-0.5 truncate">
                    {paciente.responsavelPrincipalNome || paciente.responsavelNome || 'Não informado'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Procedimento Habitual: </span>
                  <span className="font-semibold text-slate-800">
                    {paciente.procedimentoPrincipal || 'A definir'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Terapeuta / Prestador: </span>
                  <span className="font-semibold text-slate-800">
                    {paciente.prestadorNome || 'Não atribuído'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Pasta Físico/Digital: </span>
                  <span className="font-bold text-blue-900 dark:text-blue-300">
                    {paciente.pastaDoutoraMefisa || 'Atribuída na etapa de Digitação'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">Dia da Semana & Frequência: </span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {paciente.diaDaSemana || 'Segunda-feira'} ({paciente.sessoesPorSemana || paciente.quantidadeSemana || 1}x/sem)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. PRÓXIMAS ATIVIDADES */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#002172] dark:text-blue-300" />
                <span>Próximas Atividades & Ciclo Operacional</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paciente.aguardandoDoutor || paciente.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || paciente.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR' ? (
                  <div className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-slate-500 shrink-0" />
                      Próxima Autorização
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block mt-1 uppercase">
                      AGUARDANDO DR.°(ª)
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-0.5">
                      Doutora em falta no sistema
                    </span>
                  </div>
                ) : paciente.autorizacaoAtrasada || paciente.proximaAutorizacaoData === 'AUTORIZAÇÃO ATRASADA' ? (
                  <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300 block flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      Próxima Autorização
                    </span>
                    <span className="text-xs font-extrabold text-amber-900 dark:text-amber-100 block mt-1 uppercase">
                      AUTORIZAÇÃO ATRASADA
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-0.5">
                      Autorização pendente/atrasada
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                    <span className="text-[10px] font-bold uppercase text-blue-800 dark:text-blue-300 block">
                      Próxima Autorização
                    </span>
                    <span className="text-sm font-bold text-[#002172] dark:text-blue-200 block mt-0.5">
                      {paciente.status === 'ENCERRADO' || paciente.status === 'INATIVO' || !paciente.proximaAutorizacaoData
                        ? '—'
                        : formatarDataBr(paciente.proximaAutorizacaoData, showMonthInitials)}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5">
                      {paciente.status === 'ENCERRADO' || paciente.status === 'INATIVO'
                        ? 'Inativo / Encerrado'
                        : 'Ciclo alinhado'}
                    </span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                    Última Autorização
                  </span>
                  <span className="text-sm font-bold text-emerald-900 block mt-0.5">
                    {formatarDataBr(paciente.ultimaAutorizacaoData || '2026-10-01', showMonthInitials)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">
                    Vigente no portal
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">
                    Pendências Ativas
                  </span>
                  <span className="text-sm font-bold text-amber-900 block mt-0.5">
                    {paciente.pendenciasQuantidade || 0} pendência(s)
                  </span>
                  <span className="text-[10px] text-amber-700 block mt-0.5">
                    {paciente.pendenciasQuantidade ? 'Requer atenção' : 'Tudo regular'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Análises de Convênio
                  </span>
                  <span className="text-sm font-bold text-slate-800 block mt-0.5">
                    {analisesPaciente.length > 0 ? `${analisesPaciente.length} em análise` : '0 ativas'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Portal do convênio
                  </span>
                </div>
              </div>
            </div>

            {/* 3. DOCUMENTO & FORMULÁRIO (IMPORTAÇÃO + AUTO-IDENTIFICAÇÃO DE FORMATO + SÓ DEPOIS BAIXAR/IMPRIMIR) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <input
                ref={fileInputDrawerRef}
                type="file"
                accept=".pdf,.jpeg,.jpg,application/pdf,image/jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImportarArquivo(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#002172] dark:text-blue-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Formulário Cadastral do Paciente
                  </h3>
                </div>

                {/* Opções de Visualização e Download no Prontuário */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!paciente.formulario) {
                        handleSimularImportacaoDrawer('pdf');
                      }
                      setModalVisualizarFormAberto(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs text-white bg-[#002172] hover:bg-[#001752] border border-[#002172] cursor-pointer"
                    title="Visualizar o formulário dentro do site sem abrir abas externas"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#91CA0C]" />
                    <span>Visualizar Formulário</span>
                  </button>

                  <button
                    onClick={handleBaixarArquivo}
                    disabled={!paciente.formulario}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs ${
                      paciente.formulario
                        ? 'text-[#002172] dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 cursor-pointer'
                        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                    title={
                      paciente.formulario
                        ? `Baixar ${paciente.formulario.nomeArquivo}`
                        : 'Importe o formulário do paciente primeiro para liberar o download'
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Arquivo</span>
                  </button>
                </div>
              </div>

              {paciente.formulario ? (
                /* Formulário Importado: Exibe dados e identificação automática do formato */
                <div
                  className={`p-3.5 rounded-xl border space-y-3 ${
                    paciente.formulario.statusVencimento === 'VENCIDO'
                      ? 'border-red-300 bg-red-50/60'
                      : paciente.formulario.statusVencimento === 'ALERTA_PROXIMO_VENCIMENTO'
                      ? 'border-amber-300 bg-amber-50/60'
                      : 'border-emerald-200 bg-emerald-50/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {paciente.formulario.nomeArquivo}
                        </span>
                        <span
                          data-force-dark-text="true"
                          style={{ color: '#0f172a' }}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-200 text-slate-900 dark:!text-[#0f172a] force-text-dark"
                        >
                          {paciente.formulario.tamanhoKb} KB
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                        <span>Emissão:</span>
                        <input
                          type="date"
                          value={paciente.formulario.dataEmissao}
                          onChange={(e) => handleAtualizarDataEmissao(e.target.value)}
                          className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-bold text-slate-800 dark:text-white transition-colors cursor-pointer"
                        />
                        <span>•</span>
                        <span>
                          Vencimento (180 dias):{' '}
                          <strong className="font-mono">{formatarDataBr(paciente.formulario.dataVencimento, showMonthInitials)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {paciente.formulario.statusVencimento === 'VENCIDO' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Vencido ({paciente.formulario.diasRestantes} dias)
                          </span>
                        ) : paciente.formulario.statusVencimento === 'ALERTA_PROXIMO_VENCIMENTO' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                            <Clock className="w-3.5 h-3.5" />
                            Vence em {paciente.formulario.diasRestantes} dias
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Válido ({paciente.formulario.diasRestantes} dias)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputDrawerRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                        title="Importar outro arquivo para substituir"
                      >
                        Substituir
                      </button>
                    </div>
                  </div>

                  {/* IDENTIFICAÇÃO DO FORMATO (SEM DROPDOWN) */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600 text-[11px]">Formato Identificado:</span>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#002172] text-white text-[11px] font-bold">
                        <FileType className="w-3 h-3 text-[#91CA0C]" />
                        <span>
                          {paciente.formulario.tipoArquivo === 'pdf'
                            ? 'DOCUMENTO PDF (.pdf)'
                            : 'IMAGEM DIGITALIZADA JPEG (.jpeg)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">Detectado automaticamente pelo arquivo</span>
                    </div>

                    <span className="text-[11px] text-emerald-700 font-semibold">
                      ✓ Download e Impressão liberados
                    </span>
                  </div>
                </div>
              ) : (
                /* Estado: Formulário Ainda Não Importado */
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-3">
                  <div className="w-9 h-9 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-[#002172]">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Importar Formulário do Paciente
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Para liberar o download e a impressão, selecione o formulário digitalizado (.pdf ou .jpeg).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputDrawerRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002172] text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#91CA0C]" />
                      <span>Selecionar Arquivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimularImportacaoDrawer('pdf')}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                      title="Simular arquivo em PDF para testes rápidos"
                    >
                      + Exemplo .pdf
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimularImportacaoDrawer('jpeg')}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                      title="Simular arquivo em JPEG para testes rápidos"
                    >
                      + Exemplo .jpeg
                    </button>
                  </div>

                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium">
                    ⚠️ Atenção: As opções de <strong>Baixar Arquivo</strong> e <strong>Imprimir</strong> acima estão bloqueadas até que o formulário seja importado.
                  </div>
                </div>
              )}
            </div>

            {/* 4. HISTÓRICO PERPÉTUO DE CARTEIRINHAS (REQUISITO 6) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#002172] dark:text-blue-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Histórico de Carteirinhas & Convênios
                  </h3>
                </div>
                <button
                  onClick={() => setModalTrocarCartAberto(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#002172] dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Trocar / Nova Carteirinha</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Convênio</th>
                      <th className="py-2 px-3">Número Carteirinha</th>
                      <th className="py-2 px-3">Início</th>
                      <th className="py-2 px-3">Fim</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Cadastrado Por</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(paciente.carteirinhas && paciente.carteirinhas.length > 0
                      ? paciente.carteirinhas
                      : [
                          {
                            id: 'c-init',
                            convenioId: paciente.convenioId,
                            convenioNome: paciente.convenioNome,
                            numeroCarteirinha: paciente.carteirinhaAtual || paciente.carteirinha,
                            dataInicio: paciente.dataCriacao || '2026-01-01',
                            status: 'ATUAL' as const,
                            criadoPorUsuario: 'Maria Clara Fonseca',
                            criadoEm: '2026-01-01',
                          },
                        ]
                    ).map((cart) => (
                      <tr key={cart.id} className={cart.status === 'ATUAL' ? 'bg-emerald-50/30' : ''}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{cart.convenioNome}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-800">
                          {mascararCarteirinha(cart.numeroCarteirinha)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{formatarDataBr(cart.dataInicio, showMonthInitials)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{cart.dataFim ? formatarDataBr(cart.dataFim, showMonthInitials) : '—'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cart.status === 'ATUAL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {cart.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{cart.criadoPorUsuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. GESTÃO DE RESPONSÁVEIS LEGAIS (REQUISITO 5) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#002172] dark:text-blue-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Responsáveis Legais Vinculados ({paciente.responsaveis?.length || 1})
                  </h3>
                </div>
                <button
                  onClick={() => setModalResponsaveisAberto(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#002172] dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Gerenciar Responsáveis</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(paciente.responsaveis && paciente.responsaveis.length > 0
                  ? paciente.responsaveis
                  : [
                      {
                        id: 'r-padrao',
                        nome: paciente.responsavelNome || 'Responsável Não Informado',
                        parentesco: 'Mãe',
                        telefone: '(11) 98765-4321',
                        principal: true,
                      },
                    ]
                ).map((resp) => (
                  <div
                    key={resp.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      resp.principal
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{resp.nome}</span>
                      {resp.principal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {resp.parentesco} • {resp.telefone}
                    </div>
                    {resp.email && (
                      <div className="text-slate-400 text-[10px]">{resp.email}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 6. HISTÓRICO FUTURO (AUTORIZAÇÕES, SESSÕES, GUIAS, ANÁLISES & AUDITORIA) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              {/* Abas */}
              <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setAbaHistorico('autorizacoes')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    abaHistorico === 'autorizacoes'
                      ? 'bg-[#002172] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Autorizações ({autorizacoesPaciente.length})
                </button>
                <button
                  onClick={() => setAbaHistorico('guias')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    abaHistorico === 'guias'
                      ? 'bg-[#002172] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Guias Digitadas ({guiasPaciente.length})
                </button>
                <button
                  onClick={() => setAbaHistorico('analises')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    abaHistorico === 'analises'
                      ? 'bg-[#002172] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Análises de Convênio ({analisesPaciente.length})
                </button>
                <button
                  onClick={() => setAbaHistorico('auditoria')}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    abaHistorico === 'auditoria'
                      ? 'bg-[#002172] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Auditoria Cadastral ({auditoriaLocal.length})
                </button>
              </div>

              {/* Conteúdo da Aba */}
              {abaHistorico === 'autorizacoes' && (
                <div>
                  {autorizacoesPaciente.length > 0 ? (
                    <div className="space-y-2">
                      {autorizacoesPaciente.map((aut) => (
                        <div
                          key={aut.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">
                              Solicitação {aut.numeroSolicitacao}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {aut.procedimentoNome} • {aut.quantidadeTotal} sessões autorizadas
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {aut.status}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Próx: {formatarDataBr(aut.dataProximaAutorizacao, showMonthInitials)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      Este paciente ainda não possui autorizações registradas no sistema.
                    </div>
                  )}
                </div>
              )}

              {abaHistorico === 'guias' && (
                <div>
                  {guiasPaciente.length > 0 ? (
                    <div className="space-y-2">
                      {guiasPaciente.map((guia) => (
                        <div
                          key={guia.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block font-mono">
                              Guia nº {guia.numeroGuia}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              Pasta: {guia.pastaDoutora} • Duração: {guia.duracaoHoras}h
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {guia.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      Este paciente ainda não possui guias digitadas ou em trâmite.
                    </div>
                  )}
                </div>
              )}

              {abaHistorico === 'analises' && (
                <div>
                  {analisesPaciente.length > 0 ? (
                    <div className="space-y-2">
                      {analisesPaciente.map((an) => (
                        <div
                          key={an.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {an.convenioNome}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              Dias em Análise: {an.diasEmAnalise} de {an.limiteDias} dias permitidos
                            </span>
                          </div>
                          <span className="badge-analise-amarelo px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-400 text-slate-950 border border-yellow-500 shadow-xs">
                            {an.situacao}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      Nenhuma análise em andamento para este paciente.
                    </div>
                  )}
                </div>
              )}

              {abaHistorico === 'auditoria' && (
                <div>
                  {auditoriaLocal.length > 0 ? (
                    <div className="space-y-2">
                      {auditoriaLocal.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{ev.acao}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{ev.dataHora}</span>
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            Campo: <strong className="text-slate-800">{ev.campoAlterado}</strong> • De:{' '}
                            <span className="line-through text-slate-400">{ev.valorAnterior}</span> Para:{' '}
                            <span className="font-bold text-slate-800">{ev.valorNovo}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Operador: {ev.usuarioNome} ({ev.papelUsuario})
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      Nenhuma alteração cadastral recente registrada na auditoria local deste paciente.
                    </div>
                  )}
                </div>
              )}
            </div>
            </>
          )}
          </div>

          {/* Rodapé */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Última atualização: <strong>{formatarDataBr(paciente.dataUltimaAtualizacao, showMonthInitials)}</strong> ({paciente.atualizadoPor || 'Sistema'})
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Modal de Edição */}
      {modalEditarAberto && (
        <EditarPacienteModal
          paciente={paciente}
          usuarioAtual={usuarioAtual}
          onFechar={() => setModalEditarAberto(false)}
          onSalvo={(pacAtualizado) => {
            notificarAlteracao(pacAtualizado, 'Dados cadastrais do paciente atualizados com sucesso');
          }}
        />
      )}

      {/* Sub-Modal de Troca de Carteirinha */}
      {modalTrocarCartAberto && (
        <TrocarCarteirinhaModal
          paciente={paciente}
          usuarioAtual={usuarioAtual}
          onFechar={() => setModalTrocarCartAberto(false)}
          onSalvo={(pacAtualizado) => {
            notificarAlteracao(
              pacAtualizado,
              `Carteirinha alterada para ${pacAtualizado.carteirinhaAtual}. Histórico anterior preservado.`
            );
          }}
        />
      )}

      {/* Sub-Modal de Gerenciar Responsáveis */}
      {modalResponsaveisAberto && (
        <GerenciarResponsaveisModal
          paciente={paciente}
          usuarioAtual={usuarioAtual}
          onFechar={() => setModalResponsaveisAberto(false)}
          onSalvo={(pacAtualizado) => {
            notificarAlteracao(
              pacAtualizado,
              'Lista de responsáveis legais e contato prioritário atualizados'
            );
          }}
        />
      )}

      {/* Sub-Modal de Visualização Interna do Formulário Cadastral */}
      {modalVisualizarFormAberto && (
        <VisualizadorFormularioModal
          paciente={paciente}
          formulario={
            paciente.formulario || {
              nomeArquivo: `formulario_${paciente.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`,
              tipoArquivo: 'pdf',
              tamanhoKb: 350,
              dataEmissao: dataEmissaoDrawer || '2026-10-24',
              dataVencimento: '2027-04-22',
              statusVencimento: 'VALIDO',
              diasRestantes: 180,
            }
          }
          onFechar={() => setModalVisualizarFormAberto(false)}
          onBaixarArquivo={handleBaixarArquivo}
          onImprimirArquivo={handleImprimirArquivo}
          onArquivoCarregado={(novoForm) => {
            const { paciente: atualizado } = PacientesService.atualizarPaciente(
              paciente.id,
              { formulario: novoForm },
              usuarioAtual,
              `Substituição do arquivo do formulário para ${novoForm.nomeArquivo}`
            );
            notificarAlteracao(atualizado, `Imagem do formulário atualizada para ${novoForm.nomeArquivo}`);
          }}
        />
      )}
    </>
  );
};
