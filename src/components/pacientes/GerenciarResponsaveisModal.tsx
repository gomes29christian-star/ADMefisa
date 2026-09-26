import React, { useState } from 'react';
import { Users, Plus, Star, Trash2, Check, X, Shield, Phone, Mail } from 'lucide-react';
import { Paciente, ResponsavelLegal, PapelUsuario } from '../../types/clinic';
import { PacientesService } from '../../services/pacientesService';

interface GerenciarResponsaveisModalProps {
  paciente: Paciente;
  usuarioAtual: { nome: string; papel: PapelUsuario };
  onFechar: () => void;
  onSalvo: (pacienteAtualizado: Paciente) => void;
}

export const GerenciarResponsaveisModal: React.FC<GerenciarResponsaveisModalProps> = ({
  paciente,
  usuarioAtual,
  onFechar,
  onSalvo,
}) => {
  const [responsaveis, setResponsaveis] = useState<ResponsavelLegal[]>(
    paciente.responsaveis && paciente.responsaveis.length > 0
      ? [...paciente.responsaveis]
      : [
          {
            id: `resp-init-${Date.now()}`,
            nome: paciente.responsavelNome || 'Responsável Não Informado',
            parentesco: 'Mãe',
            telefone: '(11) 99999-9999',
            principal: true,
          },
        ]
  );

  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoParentesco, setNovoParentesco] = useState('Mãe');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleDefinirPrincipal = (id: string) => {
    setResponsaveis((prev) =>
      prev.map((r) => ({
        ...r,
        principal: r.id === id,
      }))
    );
  };

  const handleRemover = (id: string) => {
    const atualizados = responsaveis.filter((r) => r.id !== id);
    // Se o removido era o principal, elege o primeiro restante como principal
    if (!atualizados.some((r) => r.principal) && atualizados.length > 0) {
      atualizados[0].principal = true;
    }
    setResponsaveis(atualizados);
    setErro('');
  };

  const handleAdicionar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      setErro('Nome do responsável é obrigatório para adicionar.');
      return;
    }

    const novo: ResponsavelLegal = {
      id: `resp-${Date.now()}`,
      nome: novoNome.trim(),
      parentesco: novoParentesco,
      telefone: novoTelefone.trim() || 'Não informado',
      email: novoEmail.trim() || undefined,
      principal: responsaveis.length === 0, // se for o único, é principal
    };

    setResponsaveis((prev) => [...prev, novo]);
    setNovoNome('');
    setNovoTelefone('');
    setNovoEmail('');
    setModoAdicionar(false);
    setErro('');
  };

  const handleSalvarTudo = () => {
    setSalvando(true);
    try {
      const { paciente: atualizado } = PacientesService.atualizarResponsaveis(
        paciente.id,
        responsaveis,
        usuarioAtual,
        'Atualização da grade de responsáveis legais'
      );
      onSalvo(atualizado);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar responsáveis.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-900/60 rounded-xl">
              <Users className="w-5 h-5 text-[#91CA0C]" />
            </div>
            <div>
              <h3 className="font-bold text-base font-['Quicksand']">
                Responsáveis Legais & Contatos
              </h3>
              <p className="text-xs text-blue-100">
                Paciente: {paciente.nome} ({paciente.codigoProntuario})
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

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {erro}
            </div>
          )}

          {/* Lista de Responsáveis Cadastrados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Responsáveis Vinculados ({responsaveis.length})
              </h4>
              {!modoAdicionar && (
                <button
                  type="button"
                  onClick={() => setModoAdicionar(true)}
                  className="flex items-center gap-1 text-xs font-bold text-[#002172] hover:text-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Responsável</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {responsaveis.map((resp) => (
                <div
                  key={resp.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    resp.principal
                      ? 'border-[#91CA0C]/80 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{resp.nome}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                        {resp.parentesco}
                      </span>
                      {resp.principal && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <Star className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                          Contato Principal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {resp.telefone}
                      </span>
                      {resp.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {resp.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!resp.principal && (
                      <button
                        type="button"
                        onClick={() => handleDefinirPrincipal(resp.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-[#002172] hover:bg-slate-200/60 rounded-lg transition-colors"
                        title="Tornar responsável prioritário de contato"
                      >
                        Definir Principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemover(resp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remover vínculo deste responsável"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subformulário de Adição */}
          {modoAdicionar && (
            <form onSubmit={handleAdicionar} className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#002172]">Novo Responsável Legal</span>
                <button
                  type="button"
                  onClick={() => setModoAdicionar(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Silva"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-[#002172]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Grau de Parentesco
                  </label>
                  <select
                    value={novoParentesco}
                    onChange={(e) => setNovoParentesco(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-[#002172]"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Avó/Avô">Avó/Avô</option>
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="Irmão/Irmã">Irmão/Irmã</option>
                    <option value="Outro">Outro Responsável</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-[#002172]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="exemplo@email.com"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-[#002172]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-[#002172] text-white rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Adicionar à Lista
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Rodapé com Salvar */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Operador: <strong>{usuarioAtual.nome}</strong> (Registrado em auditoria)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border dark:border-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={handleSalvarTudo}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-[#91CA0C]" />
              <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
