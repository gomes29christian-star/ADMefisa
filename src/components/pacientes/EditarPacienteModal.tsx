import React, { useState } from 'react';
import { UserCog, Check, X, Shield, AlertCircle, Building, Stethoscope, Search, FolderCheck, Clock } from 'lucide-react';
import { Paciente, StatusPaciente, PapelUsuario } from '../../types/clinic';
import { PacientesService } from '../../services/pacientesService';
import { obterPrestadoresStorage } from '../../data/mockClinicData';
import { ProcedimentosService } from '../../services/procedimentosService';

interface EditarPacienteModalProps {
  paciente: Paciente;
  usuarioAtual: { nome: string; papel: PapelUsuario };
  onFechar: () => void;
  onSalvo: (pacienteAtualizado: Paciente) => void;
}

const DIAS_DA_SEMANA_OPCOES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const EditarPacienteModal: React.FC<EditarPacienteModalProps> = ({
  paciente,
  usuarioAtual,
  onFechar,
  onSalvo,
}) => {
  const prestadoresSistema = obterPrestadoresStorage();

  const procedimentosSessoesApenas = ProcedimentosService.obterPermitidosParaAutorizacao().filter((p) => {
    if (p.categoria === 'AVALIACAO_ABA' || p.categoria === 'REAVALIACAO_ABA') return false;
    const descNorm = (p.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (descNorm.includes('avaliacao') || descNorm.includes('reavaliacao')) return false;
    return true;
  });

  const [nome, setNome] = useState(paciente.nome);
  const [status, setStatus] = useState<StatusPaciente>(paciente.status);
  const [aguardandoDoutor, setAguardandoDoutor] = useState<boolean>(
    Boolean(paciente.aguardandoDoutor || paciente.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || paciente.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR')
  );
  const [proximaAutorizacaoData, setProximaAutorizacaoData] = useState<string>(
    paciente.status === 'ENCERRADO' || paciente.status === 'INATIVO' || paciente.aguardandoDoutor || paciente.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || paciente.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR'
      ? ''
      : (paciente.proximaAutorizacaoData || '')
  );
  const [procedimentoPrincipal, setProcedimentoPrincipal] = useState(
    paciente.procedimentoPrincipal || procedimentosSessoesApenas[0]?.descricao || 'TO Terapia Ocupacional ABA'
  );
  const [sessoesPorSemana, setSessoesPorSemana] = useState<number>(
    paciente.sessoesPorSemana || paciente.quantidadeSemana || 3
  );

  const handleStatusChange = (novoStatus: StatusPaciente) => {
    setStatus(novoStatus);
    if (novoStatus === 'ENCERRADO' || novoStatus === 'INATIVO') {
      setProximaAutorizacaoData('');
    }
  };
  const [prestadorId, setPrestadorId] = useState(
    paciente.prestadorId || prestadoresSistema[0]?.id || 'prest-1'
  );

  const initialDays = paciente.diasDaSemana && paciente.diasDaSemana.length > 0
    ? paciente.diasDaSemana
    : (paciente.diaDaSemana ? paciente.diaDaSemana.split(',').map(s => s.trim()) : ['Segunda-feira']);

  const [diasDaSemana, setDiasDaSemana] = useState<string[]>(initialDays);
  const [doutoresAtendentesIds, setDoutoresAtendentesIds] = useState<string[]>(
    paciente.doutoresAtendentesIds && paciente.doutoresAtendentesIds.length > 0
      ? paciente.doutoresAtendentesIds
      : [paciente.prestadorId || 'prest-1']
  );
  const [polo, setPolo] = useState<'M1' | 'M2' | 'ON' | 'Polo 1' | 'Polo 2' | 'Polo ON'>(
    paciente.polo === 'ON' || paciente.polo === 'Polo ON'
      ? 'ON'
      : (paciente.polo === 'M2' || paciente.polo === 'Polo 2' ? 'M2' : 'M1')
  );
  const [classificacao, setClassificacao] = useState<'ABA' | 'CONVENCIONAL'>(
    paciente.classificacao || 'ABA'
  );
  const [polos, setPolos] = useState<Array<'M1' | 'M2' | 'ON' | 'Polo 1' | 'Polo 2' | 'Polo ON'>>(
    paciente.polos && paciente.polos.length > 0 ? paciente.polos : [paciente.polo || 'M1']
  );
  const [token, setToken] = useState(paciente.token || '');
  const [tokenStatusOpcao, setTokenStatusOpcao] = useState<'V' | 'NV'>(
    paciente.tokenStatus === 'NVJ' || paciente.tokenStatus === 'NVNJ' ? 'NV' : 'V'
  );
  const [tokenJustificativa, setTokenJustificativa] = useState(paciente.tokenJustificativa || '');
  const [duracaoSessao, setDuracaoSessao] = useState<'30MIN' | '1H'>(paciente.duracaoSessao || '1H');
  const [cid, setCid] = useState(paciente.cid || 'F84.0');
  const [ultimaAutorizacaoDataInput, setUltimaAutorizacaoDataInput] = useState(
    paciente.ultimaAutorizacaoData || ''
  );
  const [observacoes, setObservacoes] = useState(paciente.observacoes || '');
  const [motivoAlteracao, setMotivoAlteracao] = useState('');
  const [pesquisaPrestadorInput, setPesquisaPrestadorInput] = useState('');
  const [pesquisaDoutoresInput, setPesquisaDoutoresInput] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Filtro dinâmico de Prestadores por nome, conselho, especialidade ou CPF
  const prestadoresFiltrados = prestadoresSistema.filter((p) => {
    if (!pesquisaPrestadorInput.trim()) return true;
    const term = pesquisaPrestadorInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nomeNorm = (p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regNorm = `${p.orgaoClasse || ''} ${p.crmOuCrp || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const espNorm = (p.especialidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cpfNorm = (p.cpf || '').replace(/\D/g, '');
    return nomeNorm.includes(term) || regNorm.includes(term) || espNorm.includes(term) || cpfNorm.includes(term);
  });

  // Filtro dinâmico de Doutores Mefisa por nome, CRM/CRP ou especialidade
  const doutoresFiltrados = prestadoresSistema.filter((p) => {
    if (!pesquisaDoutoresInput.trim()) return true;
    const term = pesquisaDoutoresInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nomeNorm = (p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regNorm = `${p.orgaoClasse || ''} ${p.crmOuCrp || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const espNorm = (p.especialidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cpfNorm = (p.cpf || '').replace(/\D/g, '');
    return nomeNorm.includes(term) || regNorm.includes(term) || espNorm.includes(term) || cpfNorm.includes(term);
  });

  const toggleDiaSemana = (dia: string) => {
    let novosDias: string[];
    if (diasDaSemana.includes(dia)) {
      if (diasDaSemana.length === 1) return;
      novosDias = diasDaSemana.filter((d) => d !== dia);
    } else {
      novosDias = [...diasDaSemana, dia];
    }
    setDiasDaSemana(novosDias);
    if (novosDias.length > 0) {
      setSessoesPorSemana(novosDias.length);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('O nome completo do paciente é obrigatório.');
      return;
    }
    if (!prestadorId) {
      setErro('É obrigatório selecionar O PRESTADOR cadastrado no sistema.');
      return;
    }
    if (doutoresAtendentesIds.length === 0) {
      setErro('É obrigatório selecionar pelo menos 1 DOUTOR MEFISA vinculado.');
      return;
    }

    if (
      (status === 'ATIVO' || status === 'EM_TRATAMENTO' || status === 'EM_ACOMPANHAMENTO') &&
      !aguardandoDoutor &&
      !proximaAutorizacaoData.trim()
    ) {
      setErro('Ao manter ou reativar o paciente como ATIVO, é obrigatório preencher a Data da Próxima Autorização ou marcar AGUARDANDO DR.°(ª).');
      return;
    }

    const prestadorObj = prestadoresSistema.find((p) => p.id === prestadorId) || prestadoresSistema[0];
    const prestadoresSel = prestadoresSistema.filter((p) => doutoresAtendentesIds.includes(p.id));

    setSalvando(true);
    try {
      const { paciente: atualizado } = PacientesService.atualizarPaciente(
        paciente.id,
        {
          nome: nome.trim(),
          status,
          aguardandoDoutor,
          proximaAutorizacaoData: (status === 'ENCERRADO' || status === 'INATIVO')
            ? undefined
            : (aguardandoDoutor ? 'AGUARDANDO DR.°(ª)' : proximaAutorizacaoData.trim()),
          procedimentoPrincipal: procedimentoPrincipal.trim(),
          procedimentos: [procedimentoPrincipal.trim()],
          sessoesPorSemana,
          quantidadeSemana: sessoesPorSemana,
          diaDaSemana: diasDaSemana.join(', '),
          diasDaSemana,
          prestadorId: prestadorObj ? prestadorObj.id : paciente.prestadorId,
          prestadorNome: prestadorObj ? prestadorObj.nome : paciente.prestadorNome,
          doutoresAtendentesIds,
          doutoresAtendentesNomes: prestadoresSel.map((p) => `${p.nome} (${p.orgaoClasse} ${p.crmOuCrp})`),
          pastaDoutoraMefisa: paciente.pastaDoutoraMefisa,
          polo: polos[0] || polo,
          polos,
          classificacao,
          token: token.trim() || undefined,
          tokenStatus: (tokenStatusOpcao === 'V'
            ? 'V'
            : tokenJustificativa.trim()
            ? 'NVJ'
            : 'NVNJ') as StatusTokenPaciente,
          tokenJustificativa: tokenStatusOpcao === 'NV' ? tokenJustificativa.trim() || undefined : undefined,
          duracaoSessao,
          cid: cid.trim() || undefined,
          ultimaAutorizacaoData: ultimaAutorizacaoDataInput.trim() || undefined,
          observacoes: observacoes.trim(),
        },
        usuarioAtual,
        motivoAlteracao.trim() || 'Edição cadastral administrativa'
      );

      onSalvo(atualizado);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao atualizar dados do paciente.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-900/60 rounded-xl">
              <UserCog className="w-5 h-5 text-[#91CA0C]" />
            </div>
            <div>
              <h3 className="font-bold text-base font-['Quicksand']">
                Editar Dados Cadastrais
              </h3>
              <p className="text-xs text-blue-100">
                Prontuário {paciente.codigoProntuario} • Registro auditável
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seletor de Classificação / Módulo */}
            <div className="sm:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Classificação / Módulo de Atendimento *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClassificacao('ABA')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    classificacao === 'ABA'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🎯 Módulo ABA Regular
                </button>
                <button
                  type="button"
                  onClick={() => setClassificacao('CONVENCIONAL')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    classificacao === 'CONVENCIONAL'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🏥 Módulo Convencional
                </button>
              </div>
            </div>

            {/* Nome Completo */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo do Paciente *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-[#002172]"
                required
              />
            </div>

            {/* Polo(s) Múltiplos */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Polo(s) de Atendimento Mefisa (Pode selecionar mais de um) *
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {(['M1', 'M2', 'ON'] as const).map((pItem) => {
                  const marcado = polos.includes(pItem);
                  return (
                    <label
                      key={pItem}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        marcado
                          ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-500 text-blue-900 dark:text-blue-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => {
                          if (marcado) {
                            if (polos.length > 1) setPolos(polos.filter((p) => p !== pItem));
                          } else {
                            setPolos([...polos, pItem]);
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Polo {pItem}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* TOKEN & Validação */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Código do TOKEN
                </label>
                <input
                  type="text"
                  placeholder="Ex: TKN-9821-X"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Validação do TOKEN</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black text-white ${
                    tokenStatusOpcao === 'V'
                      ? 'bg-emerald-600'
                      : tokenJustificativa.trim()
                      ? 'bg-red-600'
                      : 'bg-rose-950 text-rose-200 border border-rose-800 font-black'
                  }`}>
                    {tokenStatusOpcao === 'V'
                      ? 'V (VALIDADO)'
                      : tokenJustificativa.trim()
                      ? 'NVJ (NÃO VALIDADO; JUSTIFICADO)'
                      : 'NVNJ (NÃO VALIDADO; NÃO JUSTIFICADO)'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTokenStatusOpcao('V')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      tokenStatusOpcao === 'V'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✓ Validado (V)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTokenStatusOpcao('NV')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      tokenStatusOpcao === 'NV'
                        ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✕ Não Validado (NV)
                  </button>
                </div>
              </div>

              {tokenStatusOpcao === 'NV' && (
                <div className="sm:col-span-2 space-y-1 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Justificativa da Não Validação (Preenchido = NVJ vermelho | Vazio = NVNJ vinho com alerta):
                  </label>
                  <input
                    type="text"
                    placeholder="Informe a justificativa..."
                    value={tokenJustificativa}
                    onChange={(e) => setTokenJustificativa(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duração da Sessão *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDuracaoSessao('30MIN')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    duracaoSessao === '30MIN'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ⏱️ 30 MIN
                </button>
                <button
                  type="button"
                  onClick={() => setDuracaoSessao('1H')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    duracaoSessao === '1H'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  ⏱️ 1 HORA
                </button>
              </div>
            </div>

            {/* CID e Data da Última Autorização */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                CID Diagnóstico
              </label>
              <input
                type="text"
                placeholder="Ex: F84.0"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data da Última Autorização
              </label>
              <input
                type="date"
                value={ultimaAutorizacaoDataInput}
                onChange={(e) => setUltimaAutorizacaoDataInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white"
              />
            </div>

            {/* Status do Paciente */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status no Sistema *
                </label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as StatusPaciente)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                >
                  <option value="ATIVO">🟢 ATIVO</option>
                  <option value="EM_ACOMPANHAMENTO">🟡 EM ACOMPANHAMENTO</option>
                  <option value="INATIVO">⚪ INATIVO</option>
                  <option value="ENCERRADO">🔴 ENCERRADO</option>
                </select>
              </div>

              <div>
                {status === 'ENCERRADO' || status === 'INATIVO' ? (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                    <span className="font-bold block">⚠️ Próxima Autorização: Em Branco</span>
                    <span>Ao salvar como {status}, a data da próxima autorização é removida automaticamente.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#002172] dark:text-blue-300 flex items-center gap-1">
                      <span>Data da Próxima Autorização *</span>
                    </label>
                    <input
                      type="date"
                      disabled={aguardandoDoutor}
                      value={aguardandoDoutor ? '' : proximaAutorizacaoData}
                      onChange={(e) => setProximaAutorizacaoData(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold font-mono focus:outline-[#002172] disabled:opacity-50"
                      required={!aguardandoDoutor}
                    />

                    <label className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      aguardandoDoutor
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 dark:border-slate-600 shadow-2xs ring-2 ring-slate-400/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}>
                      <input
                        type="checkbox"
                        checked={aguardandoDoutor}
                        onChange={(e) => {
                          setAguardandoDoutor(e.target.checked);
                        }}
                        className="w-4 h-4 rounded text-slate-700 focus:ring-slate-500 cursor-pointer shrink-0"
                      />
                      <div>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 block">
                          AGUARDANDO DR.°(ª)
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                          Sinaliza Doutora em falta (em cinza)
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* O Prestador do Sistema com Busca em Tempo Real */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>O Prestador Cadastrado *</span>
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  {prestadoresFiltrados.length} disponível(is)
                </span>
              </label>
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar prestador por nome, CRM/CRP ou especialidade..."
                    value={pesquisaPrestadorInput}
                    onChange={(e) => setPesquisaPrestadorInput(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:outline-[#002172]"
                  />
                  {pesquisaPrestadorInput && (
                    <button
                      type="button"
                      onClick={() => setPesquisaPrestadorInput('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <select
                  value={prestadorId}
                  onChange={(e) => setPrestadorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-white focus:outline-[#002172]"
                  required
                >
                  {prestadoresFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.orgaoClasse} {p.crmOuCrp}) — {p.especialidade}
                    </option>
                  ))}
                  {prestadoresFiltrados.length === 0 && (
                    <option value="" disabled>
                      Nenhum prestador encontrado para "{pesquisaPrestadorInput}"
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Seleção Múltipla de Dias da Semana */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Dia(s) da Semana em que passa *</span>
                <span className="text-[10px] text-slate-500">Selecione um ou múltiplos dias</span>
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                {DIAS_DA_SEMANA_OPCOES.map((dia) => {
                  const ativo = diasDaSemana.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDiaSemana(dia)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        ativo
                          ? 'bg-[#002172] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {ativo && <Check className="w-3 h-3 text-[#91CA0C]" />}
                      <span>{dia}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Doutor(es) Mefisa Vinculados (Seleção Múltipla com Busca) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  <span>Doutor(es) Mefisa Vinculado(s) *</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                    {doutoresAtendentesIds.length} selecionado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (doutoresAtendentesIds.length === prestadoresSistema.length) {
                        setDoutoresAtendentesIds([]);
                      } else {
                        setDoutoresAtendentesIds(prestadoresSistema.map((p) => p.id));
                      }
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    {doutoresAtendentesIds.length === prestadoresSistema.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                {/* Campo de Pesquisa em Tempo Real dos Doutores Mefisa */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar doutores por nome, CRM/CRP ou especialidade..."
                    value={pesquisaDoutoresInput}
                    onChange={(e) => setPesquisaDoutoresInput(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-[#002172]"
                  />
                  {pesquisaDoutoresInput && (
                    <button
                      type="button"
                      onClick={() => setPesquisaDoutoresInput('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {doutoresFiltrados.length > 0 ? (
                    doutoresFiltrados.map((pres) => {
                      const marcado = doutoresAtendentesIds.includes(pres.id);
                      return (
                        <label
                          key={pres.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                            marcado
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                              : 'hover:bg-white dark:hover:bg-slate-700 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => {
                                if (marcado) {
                                  setDoutoresAtendentesIds(
                                    doutoresAtendentesIds.filter((id) => id !== pres.id)
                                  );
                                } else {
                                  setDoutoresAtendentesIds([...doutoresAtendentesIds, pres.id]);
                                }
                              }}
                              className="rounded text-[#002172] focus:ring-[#002172] w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-white block">
                                {pres.nome}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {pres.orgaoClasse} {pres.crmOuCrp} {pres.cpf ? `• CPF: ${pres.cpf}` : ''}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                            {pres.especialidade}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Nenhum Doutor Mefisa encontrado para "{pesquisaDoutoresInput}".
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Seleção do M (M1 vs M2) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>M *</span>
                </span>
                <span className="text-[10px] text-blue-600 font-bold">Unidade M1 / M2 / ON</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPolo('M1')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    polo === 'M1' || polo === 'Polo 1'
                      ? 'bg-teal-50 border-teal-600 text-teal-900 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>M1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPolo('M2')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    polo === 'M2' || polo === 'Polo 2'
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>M2</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPolo('ON')}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    polo === 'ON' || polo === 'Polo ON'
                      ? 'bg-amber-50 border-amber-600 text-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>ON</span>
                </button>
              </div>
            </div>

            {/* Procedimento Principal e Quantidade de Sessões por Semana */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Procedimento Terapêutico * (Apenas Sessões)</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Sem Avaliações</span>
                </label>
                <select
                  value={procedimentoPrincipal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProcedimentoPrincipal(val);
                    const procObj = procedimentosSessoesApenas.find((p) => p.descricao === val);
                    if (procObj?.sessoesPorSemanaPadrao) {
                      setSessoesPorSemana(procObj.sessoesPorSemanaPadrao);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:outline-[#002172]"
                  required
                >
                  {procedimentosSessoesApenas.map((proc) => (
                    <option key={proc.id} value={proc.descricao}>
                      {proc.codigo} — {proc.descricao} (CID {proc.cid || 'F84.0'} • R$ {proc.preco.toFixed(2).replace('.', ',')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sessões / Sem *</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={sessoesPorSemana || ''}
                  onChange={(e) => setSessoesPorSemana(e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value, 10)))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:outline-[#002172] text-center"
                  placeholder="Ex: 3"
                  required
                />
              </div>
            </div>

            {/* Observações Administrativas */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações Administrativas / Alertas
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Anotações internas sobre rotina de atendimento, restrições ou convênio..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-[#002172]"
              />
            </div>

            {/* Motivo da Alteração */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Justificativa da Alteração Cadastral (Trilha de Auditoria) *
              </label>
              <input
                type="text"
                value={motivoAlteracao}
                onChange={(e) => setMotivoAlteracao(e.target.value)}
                placeholder="Ex: Atualização solicitada pela família / Correção de dados"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-[#002172]"
                required
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
