import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  ShieldCheck,
  Download,
  Printer,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { AuditoriaService, EventoAuditoriaCompleto } from '../../services/auditoriaService';
import { formatarDataBr } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import { Usuario } from '../../types/clinic';
import { CLASS_TABELA_LISTRADA_ROW } from '../../utils/procedureStyles';

interface AuditoriaViewProps {
  usuarioAtual?: Usuario;
}

type CampoOrdenacao = 'dataHora' | 'usuarioNome' | 'entidade' | 'acao' | 'campoAlterado';
type DirecaoOrdenacao = 'asc' | 'desc';

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({ usuarioAtual }) => {
  const { showMonthInitials } = useTheme();
  const [logs, setLogs] = useState<EventoAuditoriaCompleto[]>(() => AuditoriaService.obterLogs());
  const [busca, setBusca] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('TODOS');
  const [filtroEntidade, setFiltroEntidade] = useState('TODAS');
  const [filtroTipoAcao, setFiltroTipoAcao] = useState('TODOS');
  const [filtroPeriodo, setFiltroPeriodo] = useState('TODOS');
  
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacao>('dataHora');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>('desc');

  const [logSelecionado, setLogSelecionado] = useState<EventoAuditoriaCompleto | null>(null);

  // Recarregar logs do localStorage
  const handleAtualizarLogs = () => {
    setLogs(AuditoriaService.obterLogs());
  };

  // Lista única de usuários para o filtro
  const listaUsuariosFiltro = useMemo(() => {
    const nomes = Array.from(new Set(logs.map((l) => l.usuarioNome))).filter(Boolean);
    return nomes.sort();
  }, [logs]);

  // Aplicação dos Filtros Multi-Coluna
  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      // 1. Filtro por Usuário
      if (filtroUsuario !== 'TODOS' && log.usuarioNome !== filtroUsuario) {
        return false;
      }

      // 2. Filtro por Módulo / Entidade
      if (filtroEntidade !== 'TODAS' && log.entidade !== filtroEntidade) {
        return false;
      }

      // 3. Filtro por Tipo de Ação
      if (filtroTipoAcao !== 'TODOS' && log.tipoAcao !== filtroTipoAcao) {
        return false;
      }

      // 4. Filtro por Período de Data
      if (filtroPeriodo !== 'TODOS' && log.dataIso) {
        const dLog = new Date(log.dataIso);
        const agora = new Date();
        if (filtroPeriodo === 'HOJE') {
          if (dLog.toDateString() !== agora.toDateString()) return false;
        } else if (filtroPeriodo === '7_DIAS') {
          const limite = new Date();
          limite.setDate(limite.getDate() - 7);
          if (dLog < limite) return false;
        } else if (filtroPeriodo === '30_DIAS') {
          const limite = new Date();
          limite.setDate(limite.getDate() - 30);
          if (dLog < limite) return false;
        }
      }

      // 5. Busca Textual Global
      if (busca.trim()) {
        const term = busca.toLowerCase();
        const textoCompleto = `${log.usuarioNome} ${log.acao} ${log.entidade} ${log.campoAlterado} ${log.valorAnterior} ${log.valorNovo} ${log.descricaoRegistro} ${log.motivo || ''} ${log.papelUsuario}`.toLowerCase();
        return textoCompleto.includes(term);
      }

      return true;
    });
  }, [logs, filtroUsuario, filtroEntidade, filtroTipoAcao, filtroPeriodo, busca]);

  // Ordenação das colunas
  const logsOrdenados = useMemo(() => {
    return [...logsFiltrados].sort((a, b) => {
      let valA = a[campoOrdenacao] || '';
      let valB = b[campoOrdenacao] || '';

      if (campoOrdenacao === 'dataHora') {
        valA = a.dataIso || a.dataHora;
        valB = b.dataIso || b.dataHora;
      }

      if (valA < valB) return direcaoOrdenacao === 'asc' ? -1 : 1;
      if (valA > valB) return direcaoOrdenacao === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logsFiltrados, campoOrdenacao, direcaoOrdenacao]);

  // Alterna direção de ordenação da coluna
  const handleAlternarOrdenacao = (campo: CampoOrdenacao) => {
    if (campoOrdenacao === campo) {
      setDirecaoOrdenacao(direcaoOrdenacao === 'asc' ? 'desc' : 'asc');
    } else {
      setCampoOrdenacao(campo);
      setDirecaoOrdenacao('desc');
    }
  };

  // Ícone de ordenação
  const renderIconeOrdenacao = (campo: CampoOrdenacao) => {
    if (campoOrdenacao !== campo) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 ml-1" />;
    }
    return direcaoOrdenacao === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#002172] dark:text-blue-400 ml-1 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#002172] dark:text-blue-400 ml-1 font-bold" />
    );
  };

  // Limpar todos os filtros
  const handleLimparFiltros = () => {
    setBusca('');
    setFiltroUsuario('TODOS');
    setFiltroEntidade('TODAS');
    setFiltroTipoAcao('TODOS');
    setFiltroPeriodo('TODOS');
  };

  // Exportar logs filtrados em arquivo CSV
  const handleExportarCsv = () => {
    if (!logsOrdenados.length) return;
    const cabecalhos = 'ID;Data e Hora;Usuario;Papel;Modulo;Acao;Campo Alterado;Valor Anterior;Valor Novo;Motivo;IP Origem\n';
    const linhas = logsOrdenados.map((l) =>
      `"${l.id}";"${l.dataHora}";"${l.usuarioNome}";"${l.papelUsuario}";"${l.entidade}";"${l.acao}";"${l.campoAlterado}";"${(l.valorAnterior || '').replace(/"/g, '""')}";"${(l.valorNovo || '').replace(/"/g, '""')}";"${(l.motivo || '').replace(/"/g, '""')}";"${l.ipOrigem || ''}"`
    ).join('\n');

    const blob = new Blob([cabecalhos + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historico_auditoria_mefisa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir relatório
  const handleImprimir = () => {
    window.print();
  };

  // Badges formatados para Entidades
  const getEntidadeBadge = (entidade: string) => {
    switch (entidade) {
      case 'PACIENTE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">Pacientes</span>;
      case 'AUTORIZACAO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">Autorizações</span>;
      case 'GUIA':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">Faturamento</span>;
      case 'PRESTADOR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300">Doutores</span>;
      case 'IMPORTACAO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300">Importação</span>;
      case 'USUARIO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-300">Usuários</span>;
      case 'CONFIGURACAO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300">Configurações</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{entidade}</span>;
    }
  };

  // Badges para Tipos de Ação
  const getTipoAcaoBadge = (tipo?: string, acao?: string) => {
    const txt = tipo || acao || 'EDICAO';
    if (txt.includes('CRIACAO') || txt.includes('Novo')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1 w-max"><CheckCircle2 className="w-2.5 h-2.5" /> Criação</span>;
    }
    if (txt.includes('EXCLUSAO') || txt.includes('Delet')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1 w-max"><AlertTriangle className="w-2.5 h-2.5" /> Exclusão</span>;
    }
    if (txt.includes('STATUS')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1 w-max"><RefreshCw className="w-2.5 h-2.5" /> Status/Ciclo</span>;
    }
    if (txt.includes('IMPORT')) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 flex items-center gap-1 w-max"><Sparkles className="w-2.5 h-2.5" /> Importação</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 flex items-center gap-1 w-max"><FileText className="w-2.5 h-2.5" /> Alteração</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Principal da Tela */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950 text-[#002172] dark:text-blue-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-['Quicksand'] text-slate-900 dark:text-white flex items-center gap-2">
                Histórico de Ações dos Usuários
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#002172] dark:text-blue-300 border border-blue-200">
                  Trilha de Auditoria Geral
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rastreabilidade completa de quem alterou o quê, quando e o motivo detalhado em toda a Clínica Mefisa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAtualizarLogs}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Atualizar Logs de Auditoria"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportarCsv}
            disabled={!logsOrdenados.length}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#002172] dark:text-blue-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleImprimir}
            className="px-3.5 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#91CA0C]" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Estatísticas do Histórico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total de Registros</span>
            <Layers className="w-4 h-4 text-[#002172] dark:text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {logs.length}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Ações armazenadas no histórico</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Resultados Filtrados</span>
            <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-900 dark:text-purple-300 mt-2 font-mono">
            {logsOrdenados.length}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Correspondem aos filtros aplicados</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Usuários Ativos</span>
            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-2 font-mono">
            {listaUsuariosFiltro.length}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Usuários com ações no sistema</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Alterações Críticas</span>
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-2 font-mono">
            {logs.filter((l) => l.tipoAcao === 'EXCLUSAO' || l.tipoAcao === 'STATUS').length}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Status alterados e exclusões</span>
        </div>
      </div>

      {/* Painel de Organização e Filtros Avançados por Coluna */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#002172] dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-['Quicksand']">
              Filtros e Organização por Colunas
            </span>
          </div>

          {(busca || filtroUsuario !== 'TODOS' || filtroEntidade !== 'TODAS' || filtroTipoAcao !== 'TODOS' || filtroPeriodo !== 'TODOS') && (
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-sans">
          {/* Campo 1: Busca Textual Geral */}
          <div className="lg:col-span-1 space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              🔍 Busca Global
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, ação, campo..."
                className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-[#002172] focus:bg-white"
              />
            </div>
          </div>

          {/* Campo 2: Filtro por Usuário */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              👤 Usuário / Quem Alterou
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-[#002172] focus:bg-white"
            >
              <option value="TODOS">Todos os Usuários</option>
              {listaUsuariosFiltro.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Campo 3: Filtro por Módulo/Entidade */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              🏢 Módulo / Entidade
            </label>
            <select
              value={filtroEntidade}
              onChange={(e) => setFiltroEntidade(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-[#002172] focus:bg-white"
            >
              <option value="TODAS">Todos os Módulos</option>
              <option value="PACIENTE">Pacientes</option>
              <option value="AUTORIZACAO">Autorizações</option>
              <option value="GUIA">Faturamentos / Guias</option>
              <option value="PRESTADOR">Doutores / Prestadores</option>
              <option value="IMPORTACAO">Importação Legada</option>
              <option value="USUARIO">Usuários do Sistema</option>
              <option value="CONFIGURACAO">Configurações</option>
              <option value="SESSAO">Sessões & Atendimentos</option>
            </select>
          </div>

          {/* Campo 4: Filtro por Tipo de Ação */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              ⚡ Tipo de Operação
            </label>
            <select
              value={filtroTipoAcao}
              onChange={(e) => setFiltroTipoAcao(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-[#002172] focus:bg-white"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="CRIACAO">Criações de Cadastro</option>
              <option value="EDICAO">Edições & Alterações</option>
              <option value="STATUS">Mudanças de Status/Ciclo</option>
              <option value="FATURAMENTO">Faturamentos & Guias</option>
              <option value="IMPORTACAO">Importações de Planilha</option>
              <option value="EXCLUSAO">Exclusões de Registro</option>
            </select>
          </div>

          {/* Campo 5: Filtro por Período */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              📅 Período de Data
            </label>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-[#002172] focus:bg-white"
            >
              <option value="TODOS">Todo o Histórico</option>
              <option value="HOJE">Ações de Hoje</option>
              <option value="7_DIAS">Últimos 7 dias</option>
              <option value="30_DIAS">Últimos 30 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Interativa de Registros de Auditoria */}
      <TopScrollTableWrapper tableTitle={`Tabela do Histórico de Ações (${logsOrdenados.length} registros)`}>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3 font-bold">
                <button
                  type="button"
                  onClick={() => handleAlternarOrdenacao('dataHora')}
                  className="flex items-center gap-1 group cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Data & Hora</span>
                  {renderIconeOrdenacao('dataHora')}
                </button>
              </th>

              <th className="py-3 px-3 font-bold min-w-[150px]">
                <button
                  type="button"
                  onClick={() => handleAlternarOrdenacao('usuarioNome')}
                  className="flex items-center gap-1 group cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Usuário (Quem)</span>
                  {renderIconeOrdenacao('usuarioNome')}
                </button>
              </th>

              <th className="py-3 px-3 font-bold min-w-[110px]">
                <button
                  type="button"
                  onClick={() => handleAlternarOrdenacao('entidade')}
                  className="flex items-center gap-1 group cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Módulo</span>
                  {renderIconeOrdenacao('entidade')}
                </button>
              </th>

              <th className="py-3 px-3 font-bold min-w-[160px]">
                <button
                  type="button"
                  onClick={() => handleAlternarOrdenacao('acao')}
                  className="flex items-center gap-1 group cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Ação Realizada</span>
                  {renderIconeOrdenacao('acao')}
                </button>
              </th>

              <th className="py-3 px-3 font-bold min-w-[130px]">
                <button
                  type="button"
                  onClick={() => handleAlternarOrdenacao('campoAlterado')}
                  className="flex items-center gap-1 group cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Campo Alterado</span>
                  {renderIconeOrdenacao('campoAlterado')}
                </button>
              </th>

              <th className="py-3 px-3 font-bold min-w-[160px]">Valor Anterior</th>
              <th className="py-3 px-3 font-bold min-w-[160px] text-[#002172] dark:text-blue-300">Valor Novo</th>
              <th className="py-3 px-3 font-bold text-right min-w-[90px]">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {logsOrdenados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <History className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-bold">Nenhum evento de auditoria encontrado</p>
                    <p className="text-xs text-slate-400">Tente ajustar os termos de busca ou filtros acima.</p>
                  </div>
                </td>
              </tr>
            ) : (
              logsOrdenados.map((log) => (
                <tr
                  key={log.id}
                  className={`cursor-pointer ${CLASS_TABELA_LISTRADA_ROW}`}
                  onClick={() => setLogSelecionado(log)}
                >
                  {/* Data & Hora */}
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatarDataBr(log.dataHora, showMonthInitials)}
                  </td>

                  {/* Usuário */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#002172] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {log.usuarioNome.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[130px]">{log.usuarioNome}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-semibold">{log.papelUsuario}</span>
                  </td>

                  {/* Módulo / Entidade */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getEntidadeBadge(log.entidade)}
                  </td>

                  {/* Ação */}
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {log.acao}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                      {log.descricaoRegistro}
                    </div>
                  </td>

                  {/* Campo Alterado */}
                  <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                      {log.campoAlterado}
                    </span>
                  </td>

                  {/* Valor Anterior */}
                  <td className="py-3 px-3 font-mono text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 rounded-md">
                    <span className="truncate block max-w-[150px]">{log.valorAnterior || '—'}</span>
                  </td>

                  {/* Valor Novo */}
                  <td className="py-3 px-3 font-mono text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-md font-bold">
                    <span className="truncate block max-w-[150px]">{log.valorNovo || '—'}</span>
                  </td>

                  {/* Detalhes Button */}
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogSelecionado(log);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#002172] dark:text-blue-400" />
                      <span>Ver</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TopScrollTableWrapper>

      {/* Modal / Drawer de Inspeção Detalhada do Evento */}
      {logSelecionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="text-base font-bold font-['Quicksand'] text-slate-900 dark:text-white">
                  Detalhes do Registro de Auditoria #{logSelecionado.id.slice(0, 12)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLogSelecionado(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Usuário Autor</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{logSelecionado.usuarioNome}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">{logSelecionado.papelUsuario}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Carimbo de Data e Hora</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">{formatarDataBr(logSelecionado.dataHora, showMonthInitials)}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">IP: {logSelecionado.ipOrigem || 'Sessão Segura'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Módulo & Operação</span>
                <div className="flex items-center gap-2">
                  {getEntidadeBadge(logSelecionado.entidade)}
                  <span className="font-bold text-slate-900 dark:text-white">{logSelecionado.acao}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium pt-1">
                  {logSelecionado.descricaoRegistro}
                </p>
              </div>

              {/* Diff do Campo Alterado */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Comparativo de Alteração (Campo: <span className="font-mono text-[#002172] dark:text-blue-300">{logSelecionado.campoAlterado}</span>)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-1">
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase block">Valor Anterior</span>
                    <div className="font-mono text-xs text-rose-900 dark:text-rose-200 font-semibold break-words">
                      {logSelecionado.valorAnterior || '—'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Valor Novo</span>
                    <div className="font-mono text-xs text-emerald-900 dark:text-emerald-200 font-bold break-words">
                      {logSelecionado.valorNovo || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivo Justificado */}
              {logSelecionado.motivo && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                    Motivo / Observação Justificada
                  </span>
                  <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                    {logSelecionado.motivo}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setLogSelecionado(null)}
                className="px-5 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
