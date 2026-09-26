import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Edit2,
  Check,
  RotateCcw,
  Tag,
  DollarSign,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ProcedimentosService,
  ProcedimentoCompleto,
  CategoriaProcedimento,
} from '../../services/procedimentosService';
import { obterBadgeColorProcedimento } from '../../utils/procedureStyles';

interface GerenciarProcedimentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcedimentoAtualizado?: () => void;
}

export const GerenciarProcedimentosModal: React.FC<GerenciarProcedimentosModalProps> = ({
  isOpen,
  onClose,
  onProcedimentoAtualizado,
}) => {
  const [procedimentos, setProcedimentos] = useState<ProcedimentoCompleto[]>(
    ProcedimentosService.obterTodos()
  );
  const [filtroCategoria, setFiltroCategoria] = useState<'TODOS' | CategoriaProcedimento>('TODOS');
  const [busca, setBusca] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editCodigo, setEditCodigo] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  if (!isOpen) return null;

  const recarregar = () => {
    setProcedimentos(ProcedimentosService.obterTodos());
    if (onProcedimentoAtualizado) onProcedimentoAtualizado();
  };

  const handleIniciarEdicao = (proc: ProcedimentoCompleto) => {
    setEditandoId(proc.id);
    setEditCodigo(proc.codigo);
    setEditPreco(proc.preco.toFixed(2).replace('.', ','));
  };

  const handleSalvarEdicao = (procId: string) => {
    const precoNum = parseFloat(editPreco.replace(',', '.'));
    if (!editCodigo.trim()) {
      alert('O código do procedimento não pode ser vazio.');
      return;
    }
    if (isNaN(precoNum) || precoNum < 0) {
      alert('Informe um valor de preço válido.');
      return;
    }

    ProcedimentosService.atualizarProcedimento(procId, {
      codigo: editCodigo.trim(),
      preco: precoNum,
    });

    recarregar();
    setEditandoId(null);
    setMensagemSucesso(`Procedimento atualizado com sucesso!`);
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  const handleResetarPadroes = () => {
    if (
      confirm(
        'Deseja restaurar a tabela oficial de Procedimentos ABA da Mefisa (15 itens com código e R$ 91,40)?'
      )
    ) {
      ProcedimentosService.resetarPadroes();
      recarregar();
      setMensagemSucesso('Tabela restaurada para os padrões originais!');
      setTimeout(() => setMensagemSucesso(null), 3000);
    }
  };

  const procedimentosFiltrados = procedimentos.filter((proc) => {
    const matchCat = filtroCategoria === 'TODOS' || proc.categoria === filtroCategoria;
    const matchBusca =
      busca === '' ||
      proc.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      proc.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      proc.especialidade.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  const qtdAbas = procedimentos.filter((p) => p.categoria === 'ABA_REGULAR').length;
  const qtdAvaliacoes = procedimentos.filter((p) => p.categoria === 'AVALIACAO_ABA').length;
  const qtdReavaliacoes = procedimentos.filter((p) => p.categoria === 'REAVALIACAO_ABA').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-white">
        {/* Topo do Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#002172] dark:text-blue-300">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-['Quicksand'] leading-tight">
                  Tabela Oficial de Procedimentos & Preços ABA
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Gerenciamento de códigos TUSS, preços fixados (R$ 91,40) e regras de autorização vs. digitação
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetarPadroes}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              title="Restaurar tabela padrão Mefisa (15 procedimentos a R$ 91,40)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificação / Feedback de Sucesso */}
        {mensagemSucesso && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {/* Quadro de Regra Clínica em Destaque */}
        <div className="p-4 bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200/80 dark:border-amber-800/80 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-200">
              Regra Determinante Mefisa de Digitação vs. Autorização:
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11.5px]">
              • <strong>As ABAS (5 regulares):</strong> Permitidas tanto na Autorização prévia quanto na Digitação de guias.<br />
              • <strong>As AVALIAÇÕES (5 variantes) e REAVALIAÇÕES (5 variantes):</strong> Exclusivas do fluxo de Autorização. O sistema bloqueia formalmente sua inserção nas digitações operacionais de guias.
            </p>
          </div>
        </div>

        {/* Filtros e Busca Rápida */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Categorias */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFiltroCategoria('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filtroCategoria === 'TODOS'
                  ? 'bg-[#002172] text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700'
              }`}
            >
              Todos ({procedimentos.length})
            </button>

            <button
              onClick={() => setFiltroCategoria('ABA_REGULAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filtroCategoria === 'ABA_REGULAR'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              ABAS Regulares ({qtdAbas})
            </button>

            <button
              onClick={() => setFiltroCategoria('AVALIACAO_ABA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filtroCategoria === 'AVALIACAO_ABA'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              Avaliações ({qtdAvaliacoes})
            </button>

            <button
              onClick={() => setFiltroCategoria('REAVALIACAO_ABA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filtroCategoria === 'REAVALIACAO_ABA'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
              }`}
            >
              Reavaliações ({qtdReavaliacoes})
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-[#002172]"
            />
          </div>
        </div>

        {/* Lista / Tabela de Procedimentos com Espaço para Código e Preço */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {procedimentosFiltrados.map((proc) => {
              const emEdicao = editandoId === proc.id;

              return (
                <div
                  key={proc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    emEdicao
                      ? 'border-[#002172] dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/30 ring-1 ring-[#002172]'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Código TUSS */}
                        {emEdicao ? (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={editCodigo}
                              onChange={(e) => setEditCodigo(e.target.value)}
                              placeholder="Código"
                              className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-blue-400 rounded text-slate-900 dark:text-white w-28"
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#002172] dark:text-blue-300 border border-slate-200 dark:border-slate-700">
                            {proc.codigo}
                          </span>
                        )}

                        {/* Categoria & Especialidade Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${obterBadgeColorProcedimento(proc.descricao)}`}
                        >
                          {proc.categoria === 'ABA_REGULAR'
                            ? 'ABA Regular'
                            : proc.categoria === 'AVALIACAO_ABA'
                            ? 'Avaliação'
                            : 'Reavaliação'}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                        {proc.descricao}
                      </h3>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {proc.especialidade}
                      </div>
                    </div>

                    {/* Preço Fixo / Editável */}
                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Preço Unitário
                      </div>
                      {emEdicao ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-slate-500">R$</span>
                          <input
                            type="text"
                            value={editPreco}
                            onChange={(e) => setEditPreco(e.target.value)}
                            placeholder="0,00"
                            className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-blue-400 rounded text-slate-900 dark:text-white w-20 text-right"
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400">
                          R$ {proc.preco.toFixed(2).replace('.', ',')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permissões e Ações */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-2">
                    <div className="flex items-center gap-2 text-[10.5px]">
                      {proc.permiteDigitacao ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Permitido em Digitação
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                          <Lock className="w-3 h-3" />
                          Bloqueado na Digitação
                        </span>
                      )}
                    </div>

                    <div>
                      {emEdicao ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSalvarEdicao(proc.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 font-semibold text-[11px]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleIniciarEdicao(proc)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-[11px] transition-colors"
                          title="Ajustar código ou preço"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Total de <strong>{procedimentos.length} procedimentos</strong> configurados na base clínica.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white font-bold text-xs transition-colors shadow-2xs"
          >
            Fechar Tabela
          </button>
        </div>
      </div>
    </div>
  );
};
