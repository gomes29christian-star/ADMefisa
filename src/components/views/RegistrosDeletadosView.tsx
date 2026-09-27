import React, { useState, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  ShieldCheck,
  Search,
  Calendar,
  FileText,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Filter,
  CheckSquare,
  Square,
  Lock,
} from 'lucide-react';
import { DeletedRecordsService, DeletedRecord } from '../../services/deletedRecordsService';
import { Usuario } from '../../types/clinic';
import { useTheme } from '../../context/ThemeContext';
import { formatarDataBr } from '../../services/businessRules';

interface RegistrosDeletadosViewProps {
  activeUsuario: Usuario;
  onRestaurarSucesso?: (tipo: string, registro: any) => void;
}

export const RegistrosDeletadosView: React.FC<RegistrosDeletadosViewProps> = ({
  activeUsuario,
  onRestaurarSucesso,
}) => {
  const { showMonthInitials } = useTheme();
  const [registros, setRegistros] = useState<DeletedRecord[]>(() =>
    DeletedRecordsService.obterRegistrosDeletados()
  );
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [isConfirmarExclusaoModalOpen, setIsConfirmarExclusaoModalOpen] = useState(false);

  const isAdminActive = activeUsuario.papel === 'ADMINISTRADOR';

  const mostrarFeedback = (texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setFeedbackMsg({ texto, tipo });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Filtragem dos registros
  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      const matchTipo = filtroTipo === 'todos' || reg.tipo === filtroTipo;
      
      const matchBusca =
        reg.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        reg.subtitulo.toLowerCase().includes(busca.toLowerCase()) ||
        reg.detalhes.toLowerCase().includes(busca.toLowerCase());

      let matchPeriodo = true;
      if (filtroPeriodo !== 'todos' && reg.dataExclusao) {
        const dReg = new Date(reg.dataExclusao + 'T12:00:00');
        const hoje = new Date();
        if (filtroPeriodo === '7dias') {
          const limite = new Date();
          limite.setDate(limite.getDate() - 7);
          matchPeriodo = dReg >= limite;
        } else if (filtroPeriodo === '30dias') {
          const limite = new Date();
          limite.setDate(limite.getDate() - 30);
          matchPeriodo = dReg >= limite;
        } else if (filtroPeriodo === 'esteMes') {
          matchPeriodo = dReg.getMonth() === hoje.getMonth() && dReg.getFullYear() === hoje.getFullYear();
        } else if (filtroPeriodo === 'esteAno') {
          matchPeriodo = dReg.getFullYear() === hoje.getFullYear();
        }
      }

      return matchTipo && matchBusca && matchPeriodo;
    });
  }, [registros, filtroTipo, filtroPeriodo, busca]);

  // Controle de Seleção
  const handleToggleSelecionarTudo = () => {
    if (!isAdminActive) return;
    const todosFiltradosIds = registrosFiltrados.map((r) => r.id);
    const todosJaSelecionados = todosFiltradosIds.every((id) => idsSelecionados.includes(id));

    if (todosJaSelecionados) {
      setIdsSelecionados((prev) => prev.filter((id) => !todosFiltradosIds.includes(id)));
    } else {
      setIdsSelecionados((prev) => Array.from(new Set([...prev, ...todosFiltradosIds])));
    }
  };

  const handleToggleItem = (id: string) => {
    if (!isAdminActive) return;
    setIdsSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleLimparSelecao = () => {
    setIdsSelecionados([]);
  };

  // Restaurar em Massa ou Individual
  const handleRestaurarEmMassa = () => {
    if (!isAdminActive) {
      mostrarFeedback('Acesso negado: Somente administradores podem recuperar registros deletados.', 'erro');
      return;
    }

    if (idsSelecionados.length === 0) return;

    const itensRemovidos = DeletedRecordsService.removerMúltiplosDaLixeira(idsSelecionados);
    
    // Devolver os itens para o localStorage das suas listas ativas
    itensRemovidos.forEach((item) => {
      if (item.tipo === 'paciente') {
        try {
          const pacientesSalvos = localStorage.getItem('mefisa_pacientes_v2');
          const listaPacientes = pacientesSalvos ? JSON.parse(pacientesSalvos) : [];
          const novaLista = [item.dadosOriginais, ...listaPacientes];
          localStorage.setItem('mefisa_pacientes_v2', JSON.stringify(novaLista));
        } catch (e) {}
      } else if (item.tipo === 'autorizacao') {
        try {
          const autSalvas = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
          const listaAut = autSalvas ? JSON.parse(autSalvas) : [];
          const novaLista = [item.dadosOriginais, ...listaAut];
          localStorage.setItem('clinica_mefisa_autorizacoes_v2', JSON.stringify(novaLista));
        } catch (e) {}
      } else if (item.tipo === 'faturamento') {
        try {
          const fatSalvos = localStorage.getItem('clinica_mefisa_faturamentos_v1');
          const listaFat = fatSalvos ? JSON.parse(fatSalvos) : [];
          const novaLista = [item.dadosOriginais, ...listaFat];
          localStorage.setItem('clinica_mefisa_faturamentos_v1', JSON.stringify(novaLista));
        } catch (e) {}
      }

      if (onRestaurarSucesso) {
        onRestaurarSucesso(item.tipo, item.dadosOriginais);
      }
    });

    setRegistros(DeletedRecordsService.obterRegistrosDeletados());
    mostrarFeedback(`${itensRemovidos.length} registro(s) restaurado(s) com sucesso para as listas ativas!`);
    setIdsSelecionados([]);
  };

  // Excluir Permanentemente em Massa
  const handleExcluirPermanentementeEmMassa = () => {
    if (!isAdminActive) {
      mostrarFeedback('Acesso negado: Somente administradores podem excluir registros permanentemente.', 'erro');
      return;
    }

    if (idsSelecionados.length === 0) return;

    const quantidadeExcluida = DeletedRecordsService.excluirPermanentementeMúltiplos(idsSelecionados);
    setRegistros(DeletedRecordsService.obterRegistrosDeletados());
    mostrarFeedback(`${quantidadeExcluida} registro(s) excluído(s) permanentemente da Lixeira.`);
    setIdsSelecionados([]);
    setIsConfirmarExclusaoModalOpen(false);
  };

  const todosFiltradosSelecionados =
    registrosFiltrados.length > 0 &&
    registrosFiltrados.every((r) => idsSelecionados.includes(r.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              <span>Registros Deletados (Lixeira Anual)</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
              {registros.length} registros no histórico
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Histórico completo de pacientes, faturamentos e autorizações excluídas. Administradores podem selecionar para restaurar ou excluir permanentemente em massa.
          </p>
        </div>
      </div>

      {/* Banner de aviso para Usuários não-Administradores */}
      {!isAdminActive && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Somente Leitura:</strong> Apenas usuários com perfil de <strong>Administrador</strong> têm permissão para selecionar, restaurar ou excluir permanentemente os registros da lixeira.
          </span>
        </div>
      )}

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedbackMsg.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Selecionar Todos os Filtrados */}
          {isAdminActive && (
            <button
              onClick={handleToggleSelecionarTudo}
              disabled={registrosFiltrados.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                todosFiltradosSelecionados
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {todosFiltradosSelecionados ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Selecionar Todos ({registrosFiltrados.length})</span>
            </button>
          )}

          {/* Filtro por Tipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filtroTipo === 'todos'
                  ? 'bg-[#002172] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Todos ({registros.length})
            </button>
            <button
              onClick={() => setFiltroTipo('paciente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filtroTipo === 'paciente'
                  ? 'bg-[#002172] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Pacientes ({registros.filter((r) => r.tipo === 'paciente').length})
            </button>
            <button
              onClick={() => setFiltroTipo('autorizacao')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filtroTipo === 'autorizacao'
                  ? 'bg-[#002172] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Autorizações ({registros.filter((r) => r.tipo === 'autorizacao').length})
            </button>
            <button
              onClick={() => setFiltroTipo('faturamento')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filtroTipo === 'faturamento'
                  ? 'bg-[#002172] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Faturamentos ({registros.filter((r) => r.tipo === 'faturamento').length})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Filtro de Período */}
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#002172]"
          >
            <option value="todos">Todos os Períodos</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="esteMes">Este Mês</option>
            <option value="esteAno">Este Ano</option>
          </select>

          {/* Campo de Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar nos deletados..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#002172]"
            />
          </div>
        </div>
      </div>

      {/* Barra Flutuante / Painel de Ações em Massa (Apenas ADM quando houver selecionados) */}
      {isAdminActive && idsSelecionados.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#002172] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2 font-bold text-xs">
            <span className="bg-white/20 px-2.5 py-1 rounded-lg text-white font-mono">
              {idsSelecionados.length}
            </span>
            <span>registro(s) selecionado(s)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Restaurar Selecionados */}
            <button
              onClick={handleRestaurarEmMassa}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Selecionados ({idsSelecionados.length})</span>
            </button>

            {/* Deletar Permanentemente Selecionados */}
            <button
              onClick={() => setIsConfirmarExclusaoModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Permanentemente ({idsSelecionados.length})</span>
            </button>

            {/* Desmarcar Seleção */}
            <button
              onClick={handleLimparSelecao}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Registros Deletados */}
      {registrosFiltrados.length === 0 ? (
        <div className="p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Trash2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Nenhum registro deletado encontrado com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {registrosFiltrados.map((reg) => {
            const isSelected = idsSelecionados.includes(reg.id);

            const iconeTipo =
              reg.tipo === 'paciente' ? (
                <User className="w-4 h-4 text-blue-600" />
              ) : reg.tipo === 'autorizacao' ? (
                <FileText className="w-4 h-4 text-purple-600" />
              ) : (
                <DollarSign className="w-4 h-4 text-emerald-600" />
              );

            const badgeCor =
              reg.tipo === 'paciente'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : reg.tipo === 'autorizacao'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';

            return (
              <div
                key={reg.id}
                onClick={() => isAdminActive && handleToggleItem(reg.id)}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isAdminActive ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Checkbox de Seleção (ADM) */}
                  {isAdminActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleItem(reg.id);
                      }}
                      className="mt-1 text-slate-400 hover:text-blue-600 focus:outline-hidden"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  )}

                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {iconeTipo}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${badgeCor}`}>
                        {reg.tipo}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        Deletado em {formatarDataBr(reg.dataExclusao, showMonthInitials)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {reg.titulo}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {reg.subtitulo}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {reg.detalhes}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAdminActive ? (
                    <>
                      <button
                        onClick={() => {
                          setIdsSelecionados([reg.id]);
                          setIsConfirmarExclusaoModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors"
                        title="Excluir este registro permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>

                      <button
                        onClick={() => {
                          const item = DeletedRecordsService.removerRegistroDaLixeira(reg.id);
                          if (item) {
                            if (item.tipo === 'paciente') {
                              try {
                                const pSalvos = localStorage.getItem('mefisa_pacientes_v2');
                                const listaP = pSalvos ? JSON.parse(pSalvos) : [];
                                localStorage.setItem('mefisa_pacientes_v2', JSON.stringify([item.dadosOriginais, ...listaP]));
                              } catch (e) {}
                            } else if (item.tipo === 'autorizacao') {
                              try {
                                const aSalvas = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
                                const listaA = aSalvas ? JSON.parse(aSalvas) : [];
                                localStorage.setItem('clinica_mefisa_autorizacoes_v2', JSON.stringify([item.dadosOriginais, ...listaA]));
                              } catch (e) {}
                            } else if (item.tipo === 'faturamento') {
                              try {
                                const fSalvos = localStorage.getItem('clinica_mefisa_faturamentos_v1');
                                const listaF = fSalvos ? JSON.parse(fSalvos) : [];
                                localStorage.setItem('clinica_mefisa_faturamentos_v1', JSON.stringify([item.dadosOriginais, ...listaF]));
                              } catch (e) {}
                            }

                            setRegistros(DeletedRecordsService.obterRegistrosDeletados());
                            mostrarFeedback(`Registro "${item.titulo}" restaurado com sucesso!`);
                            if (onRestaurarSucesso) onRestaurarSucesso(item.tipo, item.dadosOriginais);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                        title="Restaurar registro para a lista ativa"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recuperar</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Apenas ADMs
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Permanente */}
      {isConfirmarExclusaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-['Quicksand'] text-slate-900 dark:text-white">
                Excluir Permanentemente?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Você está prestes a excluir permanentemente <strong>{idsSelecionados.length} registro(s)</strong> da lixeira. Esta ação <strong>NÃO PODERÁ SER DESFEITA</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmarExclusaoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluirPermanentementeEmMassa}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
