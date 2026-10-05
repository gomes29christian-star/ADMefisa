/**
 * Módulo de Pré-visualização, Mapeamento e Importação Transacional de Planilhas Legadas — Clínica Mefisa
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  FileText,
  Layers,
  Check,
  HelpCircle,
  Sparkles,
  Pencil,
  Edit3,
  X,
  Search,
} from 'lucide-react';
import { LegacyImportService, DADOS_FICTICIOS_EXEMPLO_CSV, DADOS_FICTICIOS_CONVENCIONAIS_CSV } from '../../services/legacyImportService';
import { LinhaPreviaImportacao, ImportBatch, RelatorioImportacao } from '../../types/import';
import { useTheme } from '../../context/ThemeContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import { Usuario } from '../../types/clinic';
import { obterPrestadoresStorage } from '../../data/mockClinicData';
import { ProcedimentosService } from '../../services/procedimentosService';

interface ImportacaoViewProps {
  onOpenAudit: () => void;
  usuarioAtualNome?: string;
  usuarioAtual?: Usuario;
}

export const ImportacaoView: React.FC<ImportacaoViewProps> = ({
  onOpenAudit,
  usuarioAtualNome = 'Maria Clara Fonseca',
  usuarioAtual,
}) => {
  const { getThemeStrokeStyle } = useTheme();

  const isAdmin = usuarioAtual?.papel === 'ADMINISTRADOR';

  if (!isAdmin) {
    return (
      <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto my-12 space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
            Acesso Restrito a Administradores
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            A importação de planilhas de doutores e pacientes é uma operação restrita exclusivamente a usuários com papel de <strong className="text-slate-800 dark:text-slate-200">Administrador (ADM)</strong>.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
            Seu nível de acesso atual: {usuarioAtual?.papel || 'Funcionário'}
          </span>
        </div>
      </div>
    );
  }

  // Etapas do Wizard de Importação (1: Upload/Fixture -> 2: Mapeamento -> 3: Pré-visualização/Validação -> 4: Relatório Final)
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

  // Estados de dados
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [conteudoBrutoTexto, setConteudoBrutoTexto] = useState<string>('');
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [linhasBrutas, setLinhasBrutas] = useState<Record<string, string>[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [linhasPrevias, setLinhasPrevias] = useState<LinhaPreviaImportacao[]>([]);
  const [relatorioFinal, setRelatorioFinal] = useState<RelatorioImportacao | null>(null);

  // Estados de otimização de renderização e paginação do preview
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [itensPorPagina, setItensPorPagina] = useState<number>(30);
  const [filtroPesquisaPreview, setFiltroPesquisaPreview] = useState<string>('');
  const [processandoImportacao, setProcessandoImportacao] = useState<boolean>(false);

  // Filtragem memoizada de alta performance para o preview
  const linhasFiltradasPreview = useMemo(() => {
    if (!filtroPesquisaPreview.trim()) return linhasPrevias;
    const term = filtroPesquisaPreview.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return linhasPrevias.filter((l) => {
      const m = l.dadosMapeados;
      const nomeNorm = (m.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cartNorm = (m.carteirinha || '').toLowerCase();
      const procNorm = (m.procedimento || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const docNorm = (m.doutorMefisa || m.prestador || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nomeNorm.includes(term) || cartNorm.includes(term) || procNorm.includes(term) || docNorm.includes(term);
    });
  }, [linhasPrevias, filtroPesquisaPreview]);

  // Total de páginas memoizado
  const totalPaginasPreview = useMemo(() => {
    if (itensPorPagina === 0) return 1;
    return Math.max(1, Math.ceil(linhasFiltradasPreview.length / itensPorPagina));
  }, [linhasFiltradasPreview.length, itensPorPagina]);

  // Linhas da página atual
  const linhasPaginaPreview = useMemo(() => {
    if (itensPorPagina === 0) return linhasFiltradasPreview;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return linhasFiltradasPreview.slice(inicio, inicio + itensPorPagina);
  }, [linhasFiltradasPreview, paginaAtual, itensPorPagina]);

  // Estados de edição no preview da importação
  const [modoEdicaoDireta, setModoEdicaoDireta] = useState<boolean>(true);
  const [linhaEmEdicaoModal, setLinhaEmEdicaoModal] = useState<LinhaPreviaImportacao | null>(null);

  // Atualizador em tempo real dos campos da linha da pré-visualização
  const handleUpdateCampoLinha = (
    indiceLinha: number,
    campo: keyof LinhaPreviaImportacao['dadosMapeados'],
    valor: any
  ) => {
    setLinhasPrevias((prev) =>
      prev.map((l) => {
        if (l.indiceLinha !== indiceLinha) return l;

        const dadosMapeadosAtualizados = {
          ...l.dadosMapeados,
          [campo]: valor,
        };

        if (campo === 'quantidadeSemana' || campo === 'diaDaSemana' || campo === 'semanasAtendimento') {
          const resAtim = LegacyImportService.extrairDiasAtendimentoInteligente(
            dadosMapeadosAtualizados.diaDaSemana || dadosMapeadosAtualizados.semanasAtendimento,
            dadosMapeadosAtualizados.quantidadeSemana
          );
          dadosMapeadosAtualizados.quantidadeSemana = resAtim.quantidadeSemana;
          dadosMapeadosAtualizados.sessoesPorSemana = resAtim.quantidadeSemana;
          dadosMapeadosAtualizados.diasDaSemana = resAtim.dias;
          dadosMapeadosAtualizados.diaDaSemana = resAtim.diaDaSemanaStr;
        }

        const novosProblemas: LinhaPreviaImportacao['problemas'] = [];
        const nomeVal = (dadosMapeadosAtualizados.nome || '').trim();

        if (!nomeVal) {
          novosProblemas.push({
            linha: indiceLinha,
            campo: 'nome',
            tipo: 'ERROR',
            descricao: 'Nome do paciente é obrigatório.',
          });
        }

        const temErroCritico = novosProblemas.some((p) => p.tipo === 'ERROR');

        return {
          ...l,
          dadosMapeados: dadosMapeadosAtualizados,
          problemas: novosProblemas,
          validoParaImportar: !temErroCritico,
        };
      })
    );
  };

  // Módulo Selecionado Antecipadamente ('ABA' ou 'CONVENCIONAL')
  const [moduloAntecipado, setModuloAntecipado] = useState<'ABA' | 'CONVENCIONAL'>('CONVENCIONAL');

  // Carregar fixture fictícia de teste (Módulo ABA)
  const handleCarregarFixtureAba = () => {
    setModuloAntecipado('ABA');
    setNomeArquivo('planilha_legada_aba_mefisa.csv');
    setConteudoBrutoTexto(DADOS_FICTICIOS_EXEMPLO_CSV);
    const parsed = LegacyImportService.parseCsv(DADOS_FICTICIOS_EXEMPLO_CSV);
    setCabecalho(parsed.cabecalho);
    setLinhasBrutas(parsed.linhas);
    const prestadores = obterPrestadoresStorage();
    const procedimentos = ProcedimentosService.obterTodos();
    const sugestao = LegacyImportService.sugerirMapeamentoComDados(
      parsed.cabecalho,
      parsed.linhas,
      prestadores,
      procedimentos
    );
    setMapeamento(sugestao);
    setEtapa(2);
  };

  // Carregar fixture fictícia de teste (Módulo Convencionais)
  const handleCarregarFixtureConvencionais = () => {
    setModuloAntecipado('CONVENCIONAL');
    setNomeArquivo('planilha_legada_convencionais_mefisa.csv');
    setConteudoBrutoTexto(DADOS_FICTICIOS_CONVENCIONAIS_CSV);
    const parsed = LegacyImportService.parseCsv(DADOS_FICTICIOS_CONVENCIONAIS_CSV);
    setCabecalho(parsed.cabecalho);
    setLinhasBrutas(parsed.linhas);
    const prestadores = obterPrestadoresStorage();
    const procedimentos = ProcedimentosService.obterTodos();
    const sugestao = LegacyImportService.sugerirMapeamentoComDados(
      parsed.cabecalho,
      parsed.linhas,
      prestadores,
      procedimentos
    );
    setMapeamento(sugestao);
    setEtapa(2);
  };

  // Upload manual de arquivo CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setConteudoBrutoTexto(text);
        const parsed = LegacyImportService.parseCsv(text);
        setCabecalho(parsed.cabecalho);
        setLinhasBrutas(parsed.linhas);
        const prestadores = obterPrestadoresStorage();
        const procedimentos = ProcedimentosService.obterTodos();
        const sugestao = LegacyImportService.sugerirMapeamentoComDados(
          parsed.cabecalho,
          parsed.linhas,
          prestadores,
          procedimentos
        );
        setMapeamento(sugestao);
        setEtapa(2);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Executar análise e validação após confirmar mapeamento
  const handleAvancarParaPrevia = () => {
    const analise = LegacyImportService.analisarLinhas(linhasBrutas, mapeamento);
    const analiseComModulo = analise.map((l) => ({
      ...l,
      dadosMapeados: {
        ...l.dadosMapeados,
        classificacao: l.dadosMapeados.classificacao || moduloAntecipado,
        statusImpressao: l.dadosMapeados.statusImpressao || 'A_IMPRIMIR',
        duracaoSessao: l.dadosMapeados.duracaoSessao || (moduloAntecipado === 'CONVENCIONAL' ? '30MIN' : '1H'),
      },
    }));
    setLinhasPrevias(analiseComModulo);
    setEtapa(3);
  };

  // Confirmar importação transacional com overlay de alta performance
  const handleConfirmarImportacao = () => {
    setProcessandoImportacao(true);
    setTimeout(() => {
      const { relatorio } = LegacyImportService.executarImportacaoTransacional(
        linhasPrevias,
        nomeArquivo,
        usuarioAtualNome
      );
      setRelatorioFinal(relatorio);
      setProcessandoImportacao(false);
      setEtapa(4);
    }, 60);
  };

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold mb-2 text-xs border border-blue-200 dark:border-blue-800">
            <Sparkles className="w-3.5 h-3.5 text-[#002172] dark:text-blue-400" />
            <span>Módulo V0.5 — Importação e Migração Segura de Planilhas Legadas</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Quicksand'] text-slate-900 dark:text-white tracking-tight">
            Migração & Importação de Dados
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl font-['Nunito_Sans']">
            Converta planilhas legadas em cadastros mestre estruturados com pré-visualização transacional, validação estrita, preservação de histórico e detecção de duplicidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAudit}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            Ver Trilha de Auditoria
          </button>
        </div>
      </div>

      {/* Indicador de Etapas do Wizard */}
      <div className="grid grid-cols-4 gap-2">
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 1 ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002172] text-[#002172] dark:text-blue-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          1. Seleção de Arquivo
        </div>
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 2 ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002172] text-[#002172] dark:text-blue-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          2. Mapeamento de Colunas
        </div>
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 3 ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002172] text-[#002172] dark:text-blue-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          3. Validação & Pré-visualização
        </div>
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 4 ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          4. Relatório Concluído
        </div>
      </div>

      {/* ETAPA 1: Seleção de Arquivo ou Fixture Fictícia */}
      {etapa === 1 && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-[#002172] dark:text-blue-300 flex items-center justify-center mx-auto shadow-inner">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Selecione o arquivo de planilha legada (.csv ou .xlsx)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              O arquivo será processado localmente com total segurança LGPD. Nenhum dado será enviado a servidores externos ou APIs de IA.
            </p>
          </div>

          {/* Seletor Antecipado de Módulo (ABA vs CONVENCIONAIS) */}
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Escolha Antecipada do Módulo Mestre de Destino:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setModuloAntecipado('ABA')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  moduloAntecipado === 'ABA'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <span>🎯 Módulo ABA</span>
                  {moduloAntecipado === 'ABA' && <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.2 rounded-full">Selecionado</span>}
                </div>
                <div className={`text-[10.5px] mt-1 ${moduloAntecipado === 'ABA' ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  Para Psicologia ABA, Fono ABA, TO ABA, Musicoterapia e Avaliações ABA (Sessões 1H)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModuloAntecipado('CONVENCIONAL')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  moduloAntecipado === 'CONVENCIONAL'
                    ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-500'
                }`}
              >
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <span>🏥 Módulo Convencionais</span>
                  {moduloAntecipado === 'CONVENCIONAL' && <span className="text-[10px] bg-purple-900 text-white px-1.5 py-0.2 rounded-full">Selecionado</span>}
                </div>
                <div className={`text-[10.5px] mt-1 ${moduloAntecipado === 'CONVENCIONAL' ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  Para Fisioterapia, Fonoaudiologia, Terapia Ocupacional e Psicologia Convencional (30MIN / 1H)
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 flex-wrap">
            <label className="px-5 py-3 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold shadow-md cursor-pointer transition-colors inline-flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#91CA0C]" />
              <span>Escolher Arquivo do Computador</span>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleCarregarFixtureAba}
              className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Planilha Exemplo ABA</span>
            </button>

            <button
              onClick={handleCarregarFixtureConvencionais}
              className="px-4 py-3 rounded-xl bg-purple-50 dark:bg-purple-950/80 hover:bg-purple-100 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              <span>Planilha Exemplo Convencionais</span>
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Mapeamento de Colunas */}
      {etapa === 2 && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold font-['Quicksand'] text-slate-900 dark:text-white">
                Mapeamento de Colunas da Planilha ({nomeArquivo})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                O sistema sugeriu correspondências automaticamente. Confirme ou ajuste conforme necessário antes de analisar.
              </p>
            </div>
            <button
              onClick={() => setEtapa(1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ← Voltar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cabecalho.map((colunaPlanilha) => (
              <div key={colunaPlanilha} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">{colunaPlanilha}</div>
                  <div className="text-[10px] text-slate-400">Ex: {linhasBrutas[0]?.[colunaPlanilha] || '(vazio)'}</div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={mapeamento[colunaPlanilha] || 'ignorar'}
                    onChange={(e) => setMapeamento({ ...mapeamento, [colunaPlanilha]: e.target.value })}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-[#002172]"
                  >
                    <option value="ignorar">-- Ignorar Coluna --</option>
                    <option value="nome">👤 Nome do Paciente *</option>
                    <option value="carteirinha">🪪 Número da Carteirinha</option>
                    <option value="cpf">🆔 CPF do Paciente</option>
                    <option value="convenio">🏥 Convênio Principal</option>
                    <option value="procedimento">📋 Procedimento Terapêutico TUSS</option>
                    <option value="token">🔐 Código do TOKEN</option>
                    <option value="tokenStatus">🚦 Status do TOKEN (V / NVJ / NVNJ)</option>
                    <option value="tokenJustificativa">📝 Justificativa do TOKEN</option>
                    <option value="statusImpressao">🖨️ Status de Impressão (IMPRIMIDO / A IMPRIMIR)</option>
                    <option value="polo">🏢 Polo (M1 / M2 / ON)</option>
                    <option value="duracaoSessao">⏱️ Duração da Sessão (30MIN / 1H)</option>
                    <option value="cid">🩺 Diagnóstico / CID-10</option>
                    <option value="responsavelNome">👨‍👩‍👧 Responsável Legal</option>
                    <option value="observacoes">💬 Observações / Anotações</option>
                    <option value="classificacao">🏷️ Módulo / Categoria (ABA / Convencional)</option>
                    <option value="doutorMefisa">👨‍⚕️ Doutor(a) / Atendente Mefisa</option>
                    <option value="prestador">🩺 Prestador / Médico Solicitante</option>
                    <option value="diaDaSemana">📅 Dias em que passa (seg., ter., qua., qui., sex., sáb.)</option>
                    <option value="quantidadeSemana">🔢 Quantidade de Sessões por Semana</option>
                    <option value="dataSolicitacao">📆 Data da Solicitação</option>
                    <option value="proximaAutorizacao">📆 Próxima Autorização</option>
                    <option value="ultimaAutorizacao">📆 Última Autorização</option>
                    <option value="pastaDoutoraMefisa">📁 Pasta do Doutor Mefisa</option>
                    <option value="cbo">CBO</option>
                    <option value="crm">CRM / CRP / Conselho</option>
                    <option value="uf">UF</option>
                    <option value="indicadorIrregularidade">Indicador Visual de Irregularidade</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleAvancarParaPrevia}
              className="px-6 py-2.5 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-2"
            >
              <span>Analisar e Validar Dados</span>
              <ArrowRight className="w-4 h-4 text-[#91CA0C]" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Pré-visualização e Validação */}
      {etapa === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Analisado</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{linhasPrevias.length}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Válidos para Importar</div>
              <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 font-mono">
                {linhasPrevias.filter((l) => l.validoParaImportar).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Possíveis Duplicidades</div>
              <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 font-mono">
                {linhasPrevias.filter((l) => l.statusDuplicidade === 'POSSIVEL_DUPLICIDADE').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 shadow-2xs">
              <div className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase">Erros / Rejeitados</div>
              <div className="text-2xl font-extrabold text-red-900 dark:text-red-200 mt-1 font-mono">
                {linhasPrevias.filter((l) => !l.validoParaImportar).length}
              </div>
            </div>
          </div>

          {/* Banner de Controle do Modo de Edição e Busca Rápida */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#002172] dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Edição em Tempo Real
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Altere qualquer dado diretamente nas células da tabela abaixo ou clique em "Detalhes" para editar todos os campos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nome, carteirinha, procedimento..."
                  value={filtroPesquisaPreview}
                  onChange={(e) => {
                    setFiltroPesquisaPreview(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white w-60 focus:outline-[#002172]"
                />
              </div>

              <button
                type="button"
                onClick={() => setModoEdicaoDireta(!modoEdicaoDireta)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  modoEdicaoDireta
                    ? 'bg-[#002172] text-white border border-[#002172]'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Pencil className="w-3.5 h-3.5 text-[#91CA0C]" />
                <span>{modoEdicaoDireta ? '⚡ Edição Direta: ATIVA' : '👁️ Somente Leitura'}</span>
              </button>
            </div>
          </div>

          {/* Barra de Paginação de Alta Performance */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
              <span>Exibindo <strong className="font-mono text-slate-900 dark:text-white">{linhasPaginaPreview.length}</strong> de <strong className="font-mono text-slate-900 dark:text-white">{linhasFiltradasPreview.length}</strong> registros mapeados</span>
              <span>•</span>
              <span>Por página:</span>
              <select
                value={itensPorPagina}
                onChange={(e) => {
                  setItensPorPagina(Number(e.target.value));
                  setPaginaAtual(1);
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172]"
              >
                <option value={30}>30 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={0}>Exibir Todos ({linhasFiltradasPreview.length})</option>
              </select>
            </div>

            {itensPorPagina > 0 && totalPaginasPreview > 1 && (
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <button
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  ← Anterior
                </button>
                <span className="px-2 py-1 text-slate-700 dark:text-slate-300">
                  Página {paginaAtual} de {totalPaginasPreview}
                </span>
                <button
                  disabled={paginaAtual >= totalPaginasPreview}
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginasPreview, p + 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>

          <TopScrollTableWrapper tableTitle="Pré-visualização e Edição dos Registros Mapeados">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">Linha</th>
                  <th className="py-3 px-3 font-bold min-w-[170px]">Nome Mapeado *</th>
                  <th className="py-3 px-3 font-bold text-center min-w-[120px]">Módulo Mestre</th>
                  <th className="py-3 px-3 font-bold text-center min-w-[120px]">IMPRESSO?</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">Carteirinha</th>
                  <th className="py-3 px-3 font-bold text-center min-w-[80px]">M (M1/M2)</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Doutor(a) Mefisa</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Prestador Solicitante</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Procedimento TUSS</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Dias em que passa</th>
                  <th className="py-3 px-3 font-bold text-center min-w-[100px]">Qtd. / Semana</th>
                  <th className="py-3 px-3 font-bold min-w-[110px]">Última Aut.</th>
                  <th className="py-3 px-3 font-bold text-[#002172] dark:text-blue-300 min-w-[110px]">Próxima Aut.</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">Status Duplicidade</th>
                  <th className="py-3 px-3 font-bold min-w-[100px]">Validação</th>
                  <th className="py-3 px-3 font-bold text-right min-w-[90px]">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {linhasPaginaPreview.map((linha: LinhaPreviaImportacao) => (
                  <tr key={linha.indiceLinha} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">#{linha.indiceLinha}</td>
                    
                    {/* Nome Mapeado */}
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.nome || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'nome', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172] focus:ring-1 focus:ring-[#002172]"
                          placeholder="Nome do paciente..."
                        />
                      ) : (
                        <span>{linha.dadosMapeados.nome || '(Sem Nome)'}</span>
                      )}
                    </td>

                    {/* Módulo Mestre */}
                    <td className="py-2 px-3 text-center">
                      {modoEdicaoDireta ? (
                        <select
                          value={linha.dadosMapeados.classificacao || moduloAntecipado}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'classificacao', e.target.value)}
                          className="px-2 py-1 text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-slate-900 dark:text-white focus:outline-[#002172]"
                        >
                          <option value="ABA">🎯 ABA</option>
                          <option value="CONVENCIONAL">🏥 CONVENCIONAL</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          linha.dadosMapeados.classificacao === 'ABA'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-purple-100 text-purple-900 border border-purple-300'
                        }`}>
                          {linha.dadosMapeados.classificacao === 'ABA' ? '🎯 ABA' : '🏥 CONVENCIONAL'}
                        </span>
                      )}
                    </td>

                    {/* Status de Impressão */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCampoLinha(
                            linha.indiceLinha,
                            'statusImpressao',
                            linha.dadosMapeados.statusImpressao === 'IMPRIMIDO' ? 'A_IMPRIMIR' : 'IMPRIMIDO'
                          )
                        }
                        title="Clique para alternar entre IMPRIMIDO e A IMPRIMIR"
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border cursor-pointer shadow-2xs transition-transform hover:scale-105 ${
                          linha.dadosMapeados.statusImpressao === 'IMPRIMIDO'
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-red-600 text-white border-red-700 animate-pulse'
                        }`}
                      >
                        {linha.dadosMapeados.statusImpressao === 'IMPRIMIDO' ? '✓ IMPRIMIDO' : '🖨️ A IMPRIMIR'}
                      </button>
                    </td>

                    {/* Carteirinha */}
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.carteirinha || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'carteirinha', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="Carteirinha..."
                        />
                      ) : (
                        <span>{linha.dadosMapeados.carteirinha || 'Particular'}</span>
                      )}
                    </td>

                    {/* Polo M1 / M2 / ON */}
                    <td className="py-2 px-3 text-center">
                      {modoEdicaoDireta ? (
                        <select
                          value={
                            (linha.dadosMapeados.polo || '').toString().toUpperCase().includes('ON')
                              ? 'ON'
                              : (linha.dadosMapeados.polo === 'M2' || linha.dadosMapeados.polo === 'Polo 2' ? 'M2' : 'M1')
                          }
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'polo', e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172]"
                        >
                          <option value="M1">M1</option>
                          <option value="M2">M2</option>
                          <option value="ON">ON</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (linha.dadosMapeados.polo || '').toString().toUpperCase().includes('ON')
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                            : (linha.dadosMapeados.polo === 'M2' || linha.dadosMapeados.polo === 'Polo 2'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-300')
                        }`}>
                          {(linha.dadosMapeados.polo || '').toString().toUpperCase().includes('ON')
                            ? 'ON'
                            : (linha.dadosMapeados.polo === 'M2' || linha.dadosMapeados.polo === 'Polo 2' ? 'M2' : 'M1')}
                        </span>
                      )}
                    </td>

                    {/* Doutor(a) Mefisa */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <div className="space-y-1">
                          <select
                            value={
                              obterPrestadoresStorage().find(
                                (p) => p.nome.toLowerCase() === (linha.dadosMapeados.doutorMefisa || '').toLowerCase()
                              )?.nome || linha.dadosMapeados.doutorMefisa || ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCampoLinha(linha.indiceLinha, 'doutorMefisa', val);
                              const pEnc = obterPrestadoresStorage().find((p) => p.nome === val);
                              if (pEnc) {
                                handleUpdateCampoLinha(linha.indiceLinha, 'prestadorId', pEnc.id);
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172]"
                          >
                            <option value="">-- Selecionar Doutor(a) Mefisa --</option>
                            {obterPrestadoresStorage().map((p) => (
                              <option key={p.id} value={p.nome}>
                                {p.nome} ({p.orgaoClasse || 'CRM'} {p.crmOuCrp || ''})
                              </option>
                            ))}
                            {linha.dadosMapeados.doutorMefisa &&
                              !obterPrestadoresStorage().some(
                                (p) => p.nome.toLowerCase() === (linha.dadosMapeados.doutorMefisa || '').toLowerCase()
                              ) && (
                                <option value={linha.dadosMapeados.doutorMefisa}>
                                  📝 {linha.dadosMapeados.doutorMefisa} (Digitado / Não cadastrado)
                                </option>
                              )}
                          </select>
                          {obterPrestadoresStorage().some(
                            (p) => p.nome.toLowerCase() === (linha.dadosMapeados.doutorMefisa || '').toLowerCase()
                          ) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> Cadastrado no Mefisa
                            </span>
                          ) : (
                            linha.dadosMapeados.doutorMefisa && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                ⚠️ Não cadastrado
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="font-bold text-slate-900 dark:text-white">
                          {linha.dadosMapeados.doutorMefisa || (linha.dadosMapeados.doutorIdentificadoNome) || 'Não informado'}
                        </div>
                      )}
                    </td>

                    {/* Prestador Solicitante */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.prestador || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'prestador', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="Prestador solicitante..."
                        />
                      ) : (
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {linha.dadosMapeados.prestador || 'Mesmo do Doutor Mefisa'}
                        </div>
                      )}
                    </td>

                    {/* Procedimento TUSS */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.procedimento || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'procedimento', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-purple-900 dark:text-purple-300 focus:outline-[#002172]"
                          placeholder="Procedimento..."
                        />
                      ) : (
                        <div className="font-bold text-purple-900 dark:text-purple-300">
                          {linha.dadosMapeados.procedimento || 'Psicologia ABA'}
                        </div>
                      )}
                    </td>

                    {/* Dias em que passa */}
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.diaDaSemana || linha.dadosMapeados.semanasAtendimento || ''}
                          onChange={(e) => {
                            handleUpdateCampoLinha(linha.indiceLinha, 'diaDaSemana', e.target.value);
                            handleUpdateCampoLinha(linha.indiceLinha, 'semanasAtendimento', e.target.value);
                          }}
                          className="w-36 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-medium text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="Ex: seg., ter., qua., sex."
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-[10px]">
                          {linha.dadosMapeados.diaDaSemana || linha.dadosMapeados.semanasAtendimento || 'seg., ter., qua., sex.'}
                        </span>
                      )}
                    </td>

                    {/* Quantidade por Semana */}
                    <td className="py-2 px-3 text-center">
                      {modoEdicaoDireta ? (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={linha.dadosMapeados.quantidadeSemana || 2}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'quantidadeSemana', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-[#002172] dark:text-blue-300 focus:outline-[#002172]"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-[#002172] dark:bg-blue-950 dark:text-blue-300 font-extrabold text-[10px] font-mono">
                          {linha.dadosMapeados.quantidadeSemana || 2}x/sem
                        </span>
                      )}
                    </td>

                    {/* Última Autorização */}
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.ultimaAutorizacao || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'ultimaAutorizacao', e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="DD/MM/AAAA"
                        />
                      ) : (
                        <span>{linha.dadosMapeados.ultimaAutorizacao || '—'}</span>
                      )}
                    </td>

                    {/* Próxima Autorização */}
                    <td className="py-2 px-3 font-mono text-blue-800 dark:text-blue-300 font-bold">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.proximaAutorizacao || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'proximaAutorizacao', e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono font-bold text-blue-800 dark:text-blue-300 focus:outline-[#002172]"
                          placeholder="DD/MM/AAAA"
                        />
                      ) : (
                        <span>{linha.dadosMapeados.proximaAutorizacao || '—'}</span>
                      )}
                    </td>

                    {/* Status Duplicidade */}
                    <td className="py-3 px-3">
                      {linha.statusDuplicidade === 'POSSIVEL_DUPLICIDADE' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-[10px] font-bold border border-amber-300">
                          ⚠️ Possível Duplicidade ({linha.pacienteExistenteNome})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold border border-emerald-300">
                          ✓ Novo Paciente
                        </span>
                      )}
                    </td>

                    {/* Validação */}
                    <td className="py-3 px-3">
                      {linha.validoParaImportar ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                        </span>
                      ) : (
                        <span className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Erro Crítico
                        </span>
                      )}
                    </td>

                    {/* Ação Modal Detalhes */}
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setLinhaEmEdicaoModal(linha)}
                        title="Editar todos os campos detalhados deste registro"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#002172] dark:text-blue-400" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TopScrollTableWrapper>

          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <button
              onClick={() => setEtapa(2)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ← Ajustar Mapeamento
            </button>

            <button
              onClick={handleConfirmarImportacao}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-white" />
              <span>Confirmar e Executar Importação Transacional</span>
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Relatório Final */}
      {etapa === 4 && relatorioFinal && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Importação Concluída com Sucesso!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Lote ID: {relatorioFinal.lote.id} · Duração: {relatorioFinal.lote.duracaoMs}ms
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Pacientes Criados</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{relatorioFinal.resumo.pacientesCriados}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Associados (Histórico)</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{relatorioFinal.resumo.pacientesAssociados}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Possíveis Duplicidades</div>
              <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">{relatorioFinal.resumo.possiveisDuplicidades}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Registros Rejeitados</div>
              <div className="text-xl font-extrabold text-red-700 dark:text-red-400 font-mono">{relatorioFinal.resumo.rejeitados}</div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setEtapa(1);
                setRelatorioFinal(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#002172] text-white text-xs font-bold shadow-md hover:bg-[#001752] transition-colors"
            >
              Realizar Nova Importação
            </button>
            <button
              onClick={onOpenAudit}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Visualizar Trilha de Auditoria
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição Detalhada de Registro */}
      {linhaEmEdicaoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="text-base font-bold font-['Quicksand'] text-slate-900 dark:text-white">
                  Editar Registro #{linhaEmEdicaoModal.indiceLinha} — {linhaEmEdicaoModal.dadosMapeados.nome || '(Sem Nome)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLinhaEmEdicaoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Paciente *
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.nome || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, nome: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                  placeholder="Nome do paciente..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Módulo Mestre de Destino
                </label>
                <select
                  value={linhaEmEdicaoModal.dadosMapeados.classificacao || moduloAntecipado}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, classificacao: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                >
                  <option value="ABA">🎯 Módulo ABA</option>
                  <option value="CONVENCIONAL">🏥 Módulo Convencionais</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status de Impressão (IMPRIMIDO?)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLinhaEmEdicaoModal({
                        ...linhaEmEdicaoModal,
                        dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, statusImpressao: 'IMPRIMIDO' },
                      })
                    }
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      linhaEmEdicaoModal.dadosMapeados.statusImpressao === 'IMPRIMIDO'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✓ IMPRIMIDO
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLinhaEmEdicaoModal({
                        ...linhaEmEdicaoModal,
                        dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, statusImpressao: 'A_IMPRIMIR' },
                      })
                    }
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      linhaEmEdicaoModal.dadosMapeados.statusImpressao === 'A_IMPRIMIR'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🖨️ A IMPRIMIR
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Número da Carteirinha
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.carteirinha || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, carteirinha: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-[#002172]"
                  placeholder="Carteirinha..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  M (Polo)
                </label>
                <select
                  value={
                    (linhaEmEdicaoModal.dadosMapeados.polo || '').toString().toUpperCase().includes('ON')
                      ? 'ON'
                      : (linhaEmEdicaoModal.dadosMapeados.polo === 'M2' || linhaEmEdicaoModal.dadosMapeados.polo === 'Polo 2'
                      ? 'M2'
                      : 'M1')
                  }
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, polo: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                >
                  <option value="M1">M1</option>
                  <option value="M2">M2</option>
                  <option value="ON">ON</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doutor(a) Mefisa
                </label>
                <select
                  value={
                    obterPrestadoresStorage().find(
                      (p) => p.nome.toLowerCase() === (linhaEmEdicaoModal.dadosMapeados.doutorMefisa || '').toLowerCase()
                    )?.nome || linhaEmEdicaoModal.dadosMapeados.doutorMefisa || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const pEnc = obterPrestadoresStorage().find((p) => p.nome === val);
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: {
                        ...linhaEmEdicaoModal.dadosMapeados,
                        doutorMefisa: val,
                        prestadorId: pEnc?.id || linhaEmEdicaoModal.dadosMapeados.prestadorId,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                >
                  <option value="">-- Selecionar Doutor(a) Mefisa --</option>
                  {obterPrestadoresStorage().map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome} ({p.orgaoClasse || 'CRM'} {p.crmOuCrp || ''})
                    </option>
                  ))}
                  {linhaEmEdicaoModal.dadosMapeados.doutorMefisa &&
                    !obterPrestadoresStorage().some(
                      (p) => p.nome.toLowerCase() === (linhaEmEdicaoModal.dadosMapeados.doutorMefisa || '').toLowerCase()
                    ) && (
                      <option value={linhaEmEdicaoModal.dadosMapeados.doutorMefisa}>
                        📝 {linhaEmEdicaoModal.dadosMapeados.doutorMefisa} (Texto livre)
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prestador / Médico Solicitante
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.prestador || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, prestador: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-[#002172]"
                  placeholder="Prestador externo..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Procedimento Terapêutico
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.procedimento || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, procedimento: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-300 font-bold focus:outline-[#002172]"
                  placeholder="Procedimento..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Última Autorização
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.ultimaAutorizacao || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, ultimaAutorizacao: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-[#002172]"
                  placeholder="DD/MM/AAAA"
                />
              </div>

              <div>
                <label className="block font-bold text-[#002172] dark:text-blue-300 mb-1">
                  Próxima Autorização
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.proximaAutorizacao || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, proximaAutorizacao: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-200 font-mono font-bold focus:outline-[#002172]"
                  placeholder="DD/MM/AAAA"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Convênio Principal
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.convenio || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, convenio: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-[#002172]"
                  placeholder="Ex: Bradesco Saúde, Amil..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pasta do Doutor Mefisa
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.pastaDoutoraMefisa || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, pastaDoutoraMefisa: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-[#002172]"
                  placeholder="Ex: Pasta Dra. Ana Beatriz..."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinhaEmEdicaoModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateCampoLinha(
                    linhaEmEdicaoModal.indiceLinha,
                    'nome',
                    linhaEmEdicaoModal.dadosMapeados.nome
                  );
                  setLinhasPrevias((prev) =>
                    prev.map((l) =>
                      l.indiceLinha === linhaEmEdicaoModal.indiceLinha
                        ? {
                            ...linhaEmEdicaoModal,
                            validoParaImportar: Boolean(linhaEmEdicaoModal.dadosMapeados.nome?.trim()),
                          }
                        : l
                    )
                  );
                  setLinhaEmEdicaoModal(null);
                }}
                className="px-6 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white font-bold shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-[#91CA0C]" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Processamento Transacional de Alta Performance */}
      {processandoImportacao && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full text-center space-y-4 font-sans">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white font-['Quicksand']">
              Processando Importação Transacional em Lote...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Gravando e sincronizando registros sem travamentos no navegador. Por favor, aguarde alguns instantes...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
