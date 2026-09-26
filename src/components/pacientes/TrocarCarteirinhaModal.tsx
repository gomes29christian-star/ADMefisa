import React, { useState } from 'react';
import { CreditCard, History, Shield, Check, X, AlertCircle } from 'lucide-react';
import { Paciente, PapelUsuario } from '../../types/clinic';
import { PacientesService, mascararCarteirinha } from '../../services/pacientesService';
import { MOCK_CONVENIOS } from '../../data/mockClinicData';

interface TrocarCarteirinhaModalProps {
  paciente: Paciente;
  usuarioAtual: { nome: string; papel: PapelUsuario };
  onFechar: () => void;
  onSalvo: (pacienteAtualizado: Paciente) => void;
}

export const TrocarCarteirinhaModal: React.FC<TrocarCarteirinhaModalProps> = ({
  paciente,
  usuarioAtual,
  onFechar,
  onSalvo,
}) => {
  const [convenioId, setConvenioId] = useState(paciente.convenioPrincipalId || paciente.convenioId || 'conv-1');
  const [numeroCarteirinha, setNumeroCarteirinha] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carteirinhaAtualNumero = paciente.carteirinhaAtual || paciente.carteirinha || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroCarteirinha.trim()) {
      setErro('Informe o novo número da carteirinha.');
      return;
    }

    if (numeroCarteirinha.trim() === carteirinhaAtualNumero.trim()) {
      setErro('O novo número deve ser diferente da carteirinha atual.');
      return;
    }

    const convSelecionado = MOCK_CONVENIOS.find((c) => c.id === convenioId) || {
      id: convenioId,
      nome: 'Convênio Selecionado',
    };

    setSalvando(true);
    try {
      const { paciente: atualizado } = PacientesService.trocarCarteirinha(
        paciente.id,
        {
          convenioId: convSelecionado.id,
          convenioNome: convSelecionado.nome,
          numeroCarteirinha: numeroCarteirinha.trim(),
          dataInicio,
          observacao: observacao.trim() || 'Substituição cadastral com preservação de histórico',
        },
        usuarioAtual
      );

      onSalvo(atualizado);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao trocar carteirinha.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-900/60 rounded-xl">
              <CreditCard className="w-5 h-5 text-[#91CA0C]" />
            </div>
            <div>
              <h3 className="font-bold text-base font-['Quicksand']">
                Trocar Carteirinha / Convênio
              </h3>
              <p className="text-xs text-blue-100">
                Preservação perpétua: a carteirinha anterior não será apagada.
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Card Informativo da Carteirinha Atual */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Carteirinha Atual</span>
              <span className="font-bold text-slate-800">
                {mascararCarteirinha(carteirinhaAtualNumero)} ({paciente.convenioNome})
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Passará a: ENCERRADA
            </span>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Novo Convênio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Novo Convênio
            </label>
            <select
              value={convenioId}
              onChange={(e) => setConvenioId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-[#002172]"
            >
              {MOCK_CONVENIOS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} (ANS: {c.codigoAns})
                </option>
              ))}
              <option value="conv-particular">Particular / Avulso</option>
            </select>
          </div>

          {/* Novo Número de Carteirinha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Novo Número da Carteirinha
            </label>
            <input
              type="text"
              placeholder="Ex: 982019230198002"
              value={numeroCarteirinha}
              onChange={(e) => {
                const limpo = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                setNumeroCarteirinha(limpo);
                setErro('');
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-[#002172]"
              required
            />
          </div>

          {/* Data de Início da Nova Carteirinha */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Data de Início da Nova Validade
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-[#002172]"
              required
            />
          </div>

          {/* Motivo da Substituição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motivo da Substituição (Registrado em Auditoria)
            </label>
            <input
              type="text"
              placeholder="Ex: Reemissão por perda, migração de plano empresarial..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-[#002172]"
            />
          </div>

          {/* Alerta de Auditoria */}
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-[11px] text-blue-900">
            <History className="w-4 h-4 text-[#002172] shrink-0" />
            <span>
              Esta ação será auditada em nome de <strong>{usuarioAtual.nome}</strong>. O histórico permitirá rastrear qual carteirinha estava ativa em cada ciclo de autorização.
            </span>
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border dark:border-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-[#91CA0C]" />
              <span>{salvando ? 'Salvando...' : 'Salvar Nova Carteirinha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
