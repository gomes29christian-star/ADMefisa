import React, { useState } from 'react';
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
  const [busca, setBusca] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const isAdminActive = activeUsuario.papel === 'ADMINISTRADOR';

  const handleRestaurar = (id: string) => {
    if (!isAdminActive) {
      alert('Acesso negado: Somente administradores podem recuperar registros deletados.');
      return;
    }

    const item = DeletedRecordsService.removerRegistroDaLixeira(id);
    if (item) {
      setRegistros(DeletedRecordsService.obterRegistrosDeletados());
      
      // Salvar de volta nas listas ativas do localStorage correspondentes
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

      setFeedbackMsg(`Registro "${item.titulo}" recuperado com sucesso e recolocado na lista ativa!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      if (onRestaurarSucesso) {
        onRestaurarSucesso(item.tipo, item.dadosOriginais);
      }
    }
  };

  const registrosFiltrados = registros.filter((reg) => {
    const matchTipo = filtroTipo === 'todos' || reg.tipo === filtroTipo;
    const matchBusca =
      reg.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      reg.subtitulo.toLowerCase().includes(busca.toLowerCase()) ||
      reg.detalhes.toLowerCase().includes(busca.toLowerCase());
    return matchTipo && matchBusca;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Registros Deletados (Lixeira Anual)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
              {registros.length} registros nos últimos 12 meses
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Histórico completo de pacientes, faturamentos e autorizações deletadas permanentemente ao longo de 1 ano. Administradores podem restaurá-los com apenas um clique.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
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

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar nos deletados..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#002172]"
          />
        </div>
      </div>

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
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {iconeTipo}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${badgeCor}`}>
                        {reg.tipo}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
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

                <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {isAdminActive ? (
                    <button
                      onClick={() => handleRestaurar(reg.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                      title="Restaurar registro para a lista ativa"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Recuperar Registro</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-lg">
                      Apenas ADMs podem recuperar
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
