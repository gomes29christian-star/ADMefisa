import React, { useState, useRef } from 'react';
import {
  UserPlus,
  FileText,
  Calendar,
  AlertTriangle,
  Upload,
  Printer,
  Download,
  Shield,
  Check,
  X,
  FileCheck,
  FileType,
  Image as ImageIcon,
  Stethoscope,
  Building,
  Search,
  FolderCheck,
  Clock,
} from 'lucide-react';
import { Paciente, PapelUsuario, ResultadoVerificacaoDuplicidadePaciente, StatusTokenPaciente, StatusImpressaoPaciente } from '../../types/clinic';
import {
  PacientesService,
  calcularVencimentoFormulario,
  mascararCpf,
} from '../../services/pacientesService';
import { formatarDataBr, isProcedimentoNutricionismo } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';
import { MOCK_CONVENIOS, MOCK_PRESTADORES, obterPrestadoresStorage } from '../../data/mockClinicData';
import { ProcedimentosService } from '../../services/procedimentosService';
import { DuplicidadeAlertaModal } from './DuplicidadeAlertaModal';

interface NovoPacienteModalProps {
  usuarioAtual: { nome: string; papel: PapelUsuario };
  onFechar: () => void;
  onPacienteCriado: (novoPaciente: Paciente) => void;
  onAbrirPacienteExistente: (paciente: Paciente) => void;
}

interface FormularioImportadoState {
  nomeArquivo: string;
  tipoArquivo: 'pdf' | 'jpeg';
  tamanhoKb: number;
  dataEmissao: string;
  arquivoUrl?: string;
}

const DIAS_DA_SEMANA_OPCOES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const NovoPacienteModal: React.FC<NovoPacienteModalProps> = ({
  usuarioAtual,
  onFechar,
  onPacienteCriado,
  onAbrirPacienteExistente,
}) => {
  const { showMonthInitials } = useTheme();
  // Lista de Prestadores cadastrados no sistema
  const prestadoresSistema = obterPrestadoresStorage();

  // Procedimentos do sistema (Apenas sessões - SEM Avaliação ou Reavaliação)
  const procedimentosSessoesApenas = ProcedimentosService.obterPermitidosParaAutorizacao().filter((p) => {
    if (p.categoria === 'AVALIACAO_ABA' || p.categoria === 'REAVALIACAO_ABA') return false;
    const descNorm = (p.descricao || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (descNorm.includes('avaliacao') || descNorm.includes('reavaliacao')) return false;
    return true;
  });

  // Dados do Paciente
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [convenioId, setConvenioId] = useState('conv-1');
  const [carteirinha, setCarteirinha] = useState('');
  const [prestadorId, setPrestadorId] = useState(prestadoresSistema[0]?.id || 'prest-1');
  const [diasDaSemana, setDiasDaSemana] = useState<string[]>(['Segunda-feira']);
  const [doutoresAtendentesIds, setDoutoresAtendentesIds] = useState<string[]>(
    prestadoresSistema.length > 0 ? [prestadoresSistema[0].id] : []
  );
  const [polo, setPolo] = useState<'M1' | 'M2' | 'ON' | 'Polo 1' | 'Polo 2' | 'Polo ON'>('M1');
  const [classificacao, setClassificacao] = useState<'ABA' | 'CONVENCIONAL'>('ABA');
  const [polos, setPolos] = useState<Array<'M1' | 'M2' | 'ON' | 'Polo 1' | 'Polo 2' | 'Polo ON'>>(['M1']);

  // Procedimentos filtrados dinamicamente pelo Módulo/Classificação
  const procedimentosFiltradosPorModulo = procedimentosSessoesApenas.filter((p) => {
    const isConv = p.categoria === 'CONVENCIONAL' || (p.descricao || '').toLowerCase().includes('sessão de');
    return classificacao === 'CONVENCIONAL' ? isConv : !isConv;
  });

  const [procedimentoPrincipal, setProcedimentoPrincipal] = useState(
    procedimentosFiltradosPorModulo[0]?.descricao || 'TO Terapia Ocupacional ABA'
  );
  const [sessoesPorSemana, setSessoesPorSemana] = useState<number>(
    procedimentosFiltradosPorModulo[0]?.sessoesPorSemanaPadrao || 3
  );

  const handleTrocarClassificacao = (novaClassificacao: 'ABA' | 'CONVENCIONAL') => {
    setClassificacao(novaClassificacao);
    const disponiveis = procedimentosSessoesApenas.filter((p) => {
      const isConv = p.categoria === 'CONVENCIONAL' || (p.descricao || '').toLowerCase().includes('sessão de');
      return novaClassificacao === 'CONVENCIONAL' ? isConv : !isConv;
    });
    if (disponiveis.length > 0) {
      const jaPertence = disponiveis.some((p) => p.descricao === procedimentoPrincipal);
      if (!jaPertence) {
        const primeiroProc = disponiveis[0];
        setProcedimentoPrincipal(primeiroProc.descricao);
        if (primeiroProc.sessoesPorSemanaPadrao) {
          setSessoesPorSemana(primeiroProc.sessoesPorSemanaPadrao);
        }
      }
    }
  };
  const [token, setToken] = useState('');
  const [tokenStatusOpcao, setTokenStatusOpcao] = useState<'V' | 'NV'>('V');
  const [tokenJustificativa, setTokenJustificativa] = useState('');
  const [statusImpressao, setStatusImpressao] = useState<StatusImpressaoPaciente>('A_IMPRIMIR');
  const [duracaoSessao, setDuracaoSessao] = useState<'30MIN' | '1H'>('1H');
  const [cid, setCid] = useState('F84.0');
  const [ultimaAutorizacaoDataInput, setUltimaAutorizacaoDataInput] = useState('');
  const [pesquisaPrestadorInput, setPesquisaPrestadorInput] = useState('');
  const [pesquisaDoutoresInput, setPesquisaDoutoresInput] = useState('');
  const [dropdownPrestadorAberto, setDropdownPrestadorAberto] = useState(false);

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

  const [aguardandoDoutor, setAguardandoDoutor] = useState(false);
  const [proximaAutorizacaoDataInput, setProximaAutorizacaoDataInput] = useState('');

  // Responsável Legal (INFORMAÇÕES NÃO OBRIGATÓRIAS)
  const [respNome, setRespNome] = useState('');
  const [respParentesco, setRespParentesco] = useState('Mãe');
  const [respTelefone, setRespTelefone] = useState('');
  const [respEmail, setRespEmail] = useState('');

  // Formulário do Paciente (IMPORTAÇÃO OBRIGATÓRIA PARA BAIXAR/IMPRIMIR)
  // Formato é auto-identificado (sem opção de selecionar manualmente)
  const [formularioImportado, setFormularioImportado] = useState<FormularioImportadoState | null>(null);
  const [formDataEmissao, setFormDataEmissao] = useState(new Date().toISOString().slice(0, 10));

  // Validação e Duplicidade
  const [erro, setErro] = useState('');
  const [duplicidadeAlerta, setDuplicidadeAlerta] = useState<ResultadoVerificacaoDuplicidadePaciente | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // REGRA DO FORMULÁRIO: cálculo automático em exatamente 180 dias
  const vencimentoFormularioInfo = calcularVencimentoFormulario(
    formDataEmissao || new Date().toISOString().slice(0, 10)
  );

  /**
   * Processa o arquivo selecionado ou arrastado
   * Identifica automaticamente o formato (.pdf ou .jpeg) sem exigir seleção manual
   */
  const processarArquivoImportado = (file: File) => {
    const nome = file.name;
    const extensao = nome.split('.').pop()?.toLowerCase();

    // Auto-identificação do formato
    let tipoIdentificado: 'pdf' | 'jpeg' = 'pdf';
    if (extensao === 'jpeg' || extensao === 'jpg' || file.type.includes('jpeg') || file.type.includes('jpg')) {
      tipoIdentificado = 'jpeg';
    } else {
      tipoIdentificado = 'pdf';
    }

    const tamanhoKb = Math.round(file.size / 1024) || 320;
    const url = URL.createObjectURL(file);

    setFormularioImportado({
      nomeArquivo: nome,
      tipoArquivo: tipoIdentificado,
      tamanhoKb,
      dataEmissao: formDataEmissao,
      arquivoUrl: url,
    });
    setErro('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processarArquivoImportado(e.target.files[0]);
    }
  };

  /**
   * Importação simulada para agilizar testes no ambiente web
   */
  const handleSimularImportacao = (tipo: 'pdf' | 'jpeg') => {
    const nomeArquivo =
      tipo === 'pdf'
        ? `formulario_paciente_${nome ? nome.toLowerCase().replace(/\s+/g, '_') : 'cadastro'}.pdf`
        : `formulario_paciente_${nome ? nome.toLowerCase().replace(/\s+/g, '_') : 'cadastro'}.jpeg`;

    const blob = new Blob(
      [tipo === 'pdf' ? '%PDF-1.4 Formulário Mefisa Oficial' : 'JPEG_RAW_DATA_SIMULATED'],
      { type: tipo === 'pdf' ? 'application/pdf' : 'image/jpeg' }
    );
    const url = URL.createObjectURL(blob);

    setFormularioImportado({
      nomeArquivo,
      tipoArquivo: tipo,
      tamanhoKb: tipo === 'pdf' ? 1420 : 890,
      dataEmissao: formDataEmissao,
      arquivoUrl: url,
    });
    setErro('');
  };

  /**
   * Ação de Download — Habilitada SÓ DEPOIS de importar
   */
  const handleBaixarFormulario = () => {
    if (!formularioImportado) return;

    if (formularioImportado.arquivoUrl) {
      const a = document.createElement('a');
      a.href = formularioImportado.arquivoUrl;
      a.download = formularioImportado.nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Download do arquivo importado "${formularioImportado.nomeArquivo}" iniciado com sucesso.`);
    }
  };

  /**
   * Ação de Impressão — Habilitada SÓ DEPOIS de importar
   */
  const handleImprimirFormulario = () => {
    if (!formularioImportado) return;
    window.print();
  };

  // Execução do Salvamento
  const executarCriacao = (justificativaDuplicidade?: string) => {
    setSalvando(true);
    try {
      const convObj = MOCK_CONVENIOS.find((c) => c.id === convenioId) || {
        id: 'conv-1',
        nome: 'SULAMÉRICA',
      };
      const prestObj = prestadoresSistema.find((p) => p.id === prestadorId) || prestadoresSistema[0];
      const doutoresSel = prestadoresSistema.filter((p) => doutoresAtendentesIds.includes(p.id));

      const novoPacDados = {
        nome: nome.trim(),
        dataNascimento: undefined,
        idade: undefined,
        cpf: cpf.trim() || undefined,
        cpfMascarado: mascararCpf(cpf.trim()),
        carteirinha: carteirinha.trim(),
        carteirinhaAtual: carteirinha.trim(),
        convenioId: convObj.id,
        convenioNome: convObj.nome,
        convenioPrincipalId: convObj.id,
        convenioPrincipalNome: convObj.nome,
        procedimentoPrincipal: procedimentoPrincipal.trim(),
        procedimentos: [procedimentoPrincipal.trim()],
        sessoesPorSemana,
        quantidadeSemana: sessoesPorSemana,
        prestadorId: prestObj ? prestObj.id : 'prest-1',
        prestadorNome: prestObj ? prestObj.nome : 'Dra. Beatriz Albuquerque',
        doutoresAtendentesIds,
        doutoresAtendentesNomes: doutoresSel.map((p) => `${p.nome} (${p.orgaoClasse} ${p.crmOuCrp})`),
        pastaDoutoraMefisa: undefined,
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
        statusImpressao,
        duracaoSessao,
        cid: cid.trim() || undefined,
        ultimaAutorizacaoData: ultimaAutorizacaoDataInput.trim() || undefined,
        status: 'ATIVO' as const,
        aguardandoDoutor,
        proximaAutorizacaoData: aguardandoDoutor
          ? 'AGUARDANDO DR.°(ª)'
          : (proximaAutorizacaoDataInput.trim() || undefined),
        responsavelNome: respNome.trim() || 'Não informado',
        responsavelPrincipalNome: respNome.trim()
          ? `${respNome.trim()} (${respParentesco})`
          : 'Não informado',
        responsaveis: respNome.trim()
          ? [
              {
                id: `resp-${Date.now()}`,
                nome: respNome.trim(),
                parentesco: respParentesco,
                telefone: respTelefone.trim() || 'Não informado',
                email: respEmail.trim() || undefined,
                principal: true,
              },
            ]
          : [],
        formulario: formularioImportado
          ? {
              nomeArquivo: formularioImportado.nomeArquivo,
              tipoArquivo: formularioImportado.tipoArquivo,
              tamanhoKb: formularioImportado.tamanhoKb,
              dataEmissao: formDataEmissao,
              dataVencimento: vencimentoFormularioInfo.dataVencimento,
              statusVencimento: vencimentoFormularioInfo.status,
              diasRestantes: vencimentoFormularioInfo.diasRestantes,
              baixarUrl: formularioImportado.arquivoUrl,
            }
          : undefined,
        pendenciasQuantidade:
          formularioImportado && vencimentoFormularioInfo.status === 'VENCIDO' ? 1 : 0,
        diaDaSemana: diasDaSemana.join(', '),
        diasDaSemana,
      };

      const { paciente: criado } = PacientesService.cadastrarPaciente(
        novoPacDados,
        usuarioAtual,
        justificativaDuplicidade
      );

      onPacienteCriado(criado);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao cadastrar novo paciente.');
      setSalvando(false);
    }
  };

  const handleValidarECadastrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('O nome completo do paciente é obrigatório.');
      return;
    }
    if (!carteirinha.trim()) {
      setErro('O número da carteirinha do convênio é obrigatório.');
      return;
    }
    if (!prestadorId) {
      setErro('É obrigatório selecionar O PRESTADOR registrado no sistema.');
      return;
    }
    if (doutoresAtendentesIds.length === 0) {
      setErro('É obrigatório selecionar pelo menos 1 DOUTOR MEFISA vinculado.');
      return;
    }

    // Verificação de duplicidade por CPF, Carteirinha ou Nome + Procedimento
    const resultadoDup = PacientesService.verificarDuplicidade({
      nome: nome.trim(),
      cpf: cpf.trim(),
      carteirinha: carteirinha.trim(),
      procedimento: procedimentoPrincipal.trim(),
    });

    if (resultadoDup.possivelDuplicidade) {
      setDuplicidadeAlerta(resultadoDup);
      return;
    }

    executarCriacao();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-[#002172] text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-900/60 rounded-xl">
                <UserPlus className="w-5 h-5 text-[#91CA0C]" />
              </div>
              <div>
                <h3 className="font-bold text-base font-['Quicksand']">
                  Novo Cadastro de Paciente
                </h3>
                <p className="text-xs text-blue-100">
                  Entidade única central • Previne duplicidades e dispersão de registros
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

          {/* Form com Scroll */}
          <form onSubmit={handleValidarECadastrar} className="p-6 overflow-y-auto space-y-5 flex-1">
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* SEÇÃO 1: DADOS DO PACIENTE (SEM DATA DE NASCIMENTO) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Dados do Paciente
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Privacidade LGPD
                </span>
              </div>

              {/* Seletor de Classificação / Módulo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Classificação / Módulo de Atendimento *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTrocarClassificacao('ABA')}
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
                    onClick={() => handleTrocarClassificacao('CONVENCIONAL')}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo do Paciente *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bernardo Silva Neves"
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      setErro('');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-[#002172]"
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

                  {/* Status de Impressão (Imprimido vs A imprimir) */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Status de Impressão (IMPRIMIDO?) *</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black text-white ${
                        statusImpressao === 'IMPRIMIDO'
                          ? 'bg-emerald-600'
                          : 'bg-red-600 animate-pulse'
                      }`}>
                        {statusImpressao === 'IMPRIMIDO' ? '✓ IMPRIMIDO' : '🖨️ A IMPRIMIR'}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusImpressao('IMPRIMIDO')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          statusImpressao === 'IMPRIMIDO'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ✓ IMPRIMIDO
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusImpressao('A_IMPRIMIR')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          statusImpressao === 'A_IMPRIMIR'
                            ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        🖨️ A IMPRIMIR
                      </button>
                    </div>
                  </div>
                </div>

                {isProcedimentoNutricionismo(procedimentoPrincipal) ? (
                  <div className="sm:col-span-2 p-3 bg-purple-50 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 rounded-xl text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-2 font-extrabold text-purple-900 dark:text-purple-200">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Duração & Frequência: 1 por mês (1x/mês)</span>
                    </div>
                    <p className="text-[11px] text-purple-800 dark:text-purple-300 font-medium">
                      Atribuído automaticamente conforme protocolo do procedimento de Nutricionismo.
                    </p>
                  </div>
                ) : classificacao === 'CONVENCIONAL' ? (
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
                            ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
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
                            ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ⏱️ 1 HORA
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantidade de Sessões por Semana *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={sessoesPorSemana || ''}
                      onChange={(e) => setSessoesPorSemana(e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10)))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-slate-800 dark:text-white focus:outline-[#002172]"
                      placeholder="Ex: 3"
                      required
                    />
                  </div>
                )}

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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CPF (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-[#002172]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Convênio Principal *
                  </label>
                  <select
                    value={convenioId}
                    onChange={(e) => setConvenioId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-[#002172]"
                  >
                    {MOCK_CONVENIOS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número da Carteirinha *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 982019230198001"
                    value={carteirinha}
                    onChange={(e) => {
                      const limpo = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                      setCarteirinha(limpo);
                      setErro('');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-[#002172]"
                    required
                  />
                </div>

                {/* Seleção do PRESTADOR do Sistema com Sistema de Pesquisa */}
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-[#002172] dark:text-white"
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

                {/* Seleção do PROCEDIMENTO TERAPÊUTICO (Apenas Sessões) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-[#002172]" />
                      <span>Procedimento Terapêutico *</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Apenas Sessões</span>
                  </label>
                  <select
                    value={procedimentoPrincipal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProcedimentoPrincipal(val);
                      const procObj = procedimentosFiltradosPorModulo.find((p) => p.descricao === val);
                      if (procObj?.sessoesPorSemanaPadrao) {
                        setSessoesPorSemana(procObj.sessoesPorSemanaPadrao);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-[#002172] dark:text-white"
                    required
                  >
                    {procedimentosFiltradosPorModulo.map((proc) => (
                      <option key={proc.id} value={proc.descricao}>
                        {proc.codigo} — {proc.descricao} (CID {proc.cid || 'F84.0'} • R$ {proc.preco.toFixed(2).replace('.', ',')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doutor(es) Mefisa Vinculados (Seleção Múltipla com Sistema de Busca) */}
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

                {/* Seleção de M (M1 vs M2) */}
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

                {/* Seleção Múltipla de Dias da Semana */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Dia(s) da Semana em que passa *</span>
                    <span className="text-[10px] text-slate-500">Selecione um ou múltiplos dias</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
                    {DIAS_DA_SEMANA_OPCOES.map((dia) => {
                      const ativo = diasDaSemana.includes(dia);
                      return (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => {
                            let novosDias: string[];
                            if (ativo) {
                              if (diasDaSemana.length === 1) return;
                              novosDias = diasDaSemana.filter((d) => d !== dia);
                            } else {
                              novosDias = [...diasDaSemana, dia];
                            }
                            setDiasDaSemana(novosDias);
                            if (novosDias.length > 0) {
                              setSessoesPorSemana(novosDias.length);
                            }
                          }}
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

                {/* Próxima Autorização & Status da Doutora */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Próxima Autorização & Alerta de Doutora
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Data da Próxima Autorização
                      </label>
                      <input
                        type="date"
                        disabled={aguardandoDoutor}
                        value={aguardandoDoutor ? '' : proximaAutorizacaoDataInput}
                        onChange={(e) => setProximaAutorizacaoDataInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-[#002172] disabled:opacity-50"
                      />
                    </div>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      aguardandoDoutor
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 dark:border-slate-600 shadow-2xs ring-2 ring-slate-400/50'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
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
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                          AGUARDANDO DR.°(ª)
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                          Sinaliza Doutora em falta no sistema (em cinza) e substitui a data da próxima autorização.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: RESPONSÁVEL LEGAL (NÃO OBRIGATÓRIO) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Informações do Responsável Legal
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Opcional
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Pode ser informado posteriormente no prontuário
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome Completo do Responsável (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mariana Mendes"
                    value={respNome}
                    onChange={(e) => setRespNome(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-[#002172]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Parentesco / Relação
                  </label>
                  <select
                    value={respParentesco}
                    onChange={(e) => setRespParentesco(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-[#002172]"
                  >
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Avó/Avô">Avó/Avô</option>
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="O próprio">O próprio paciente</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={respTelefone}
                    onChange={(e) => setRespTelefone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-[#002172]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail do Responsável (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="contato.responsavel@email.com"
                    value={respEmail}
                    onChange={(e) => setRespEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-[#002172]"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: FORMULÁRIO DO PACIENTE (IMPORTAÇÃO + AUTO-IDENTIFICAÇÃO DE FORMATO + SÓ DEPOIS BAIXAR/IMPRIMIR) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#002172]" />
                  <span className="text-xs font-bold text-slate-800">
                    3. Formulário do Paciente
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#002172]">
                    Importe primeiro para baixar/imprimir
                  </span>
                </div>

                {/* BOTÕES DE BAIXAR E IMPRIMIR — HABILITADOS SÓ DEPOIS DA IMPORTAÇÃO */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!formularioImportado}
                    onClick={handleBaixarFormulario}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs ${
                      formularioImportado
                        ? 'text-[#002172] bg-white border border-slate-200 hover:bg-blue-50 cursor-pointer'
                        : 'text-slate-400 bg-slate-100 border border-slate-200 opacity-50 cursor-not-allowed'
                    }`}
                    title={
                      formularioImportado
                        ? `Baixar ${formularioImportado.nomeArquivo}`
                        : 'Importe o formulário do paciente primeiro para liberar o download'
                    }
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Arquivo</span>
                  </button>

                  <button
                    type="button"
                    disabled={!formularioImportado}
                    onClick={handleImprimirFormulario}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs ${
                      formularioImportado
                        ? 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer'
                        : 'text-slate-400 bg-slate-100 border border-slate-200 opacity-50 cursor-not-allowed'
                    }`}
                    title={
                      formularioImportado
                        ? 'Imprimir formulário importado'
                        : 'Importe o formulário do paciente primeiro para liberar a impressão'
                    }
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* ÁREA DE IMPORTAÇÃO */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpeg,.jpg,application/pdf,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {!formularioImportado ? (
                /* Estado: Formulário Ainda Não Importado */
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-white text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-[#002172]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Importar Formulário do Paciente
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Selecione o arquivo digitalizado (.pdf ou .jpeg). O sistema identificará automaticamente o formato.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#002172] text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#91CA0C]" />
                      <span>Selecionar Arquivo para Importar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimularImportacao('pdf')}
                      className="px-2.5 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                      title="Simular arquivo em PDF para testes rápidos"
                    >
                      + Exemplo .pdf
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimularImportacao('jpeg')}
                      className="px-2.5 py-2 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                      title="Simular arquivo em JPEG para testes rápidos"
                    >
                      + Exemplo .jpeg
                    </button>
                  </div>

                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium">
                    ⚠️ Atenção: As opções de <strong>Baixar</strong> e <strong>Imprimir</strong> acima permanecerão bloqueadas até que o formulário seja importado.
                  </div>
                </div>
              ) : (
                /* Estado: Formulário Já Importado */
                <div className="p-3.5 bg-white border border-emerald-300 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                        {formularioImportado.tipoArquivo === 'pdf' ? (
                          <FileCheck className="w-5 h-5" />
                        ) : (
                          <ImageIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {formularioImportado.nomeArquivo}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            ({formularioImportado.tamanhoKb} KB)
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1.5">
                          <span>✓ Formulário importado com sucesso.</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">Download e Impressão liberados!</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormularioImportado(null)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Remover formulário importado"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* IDENTIFICAÇÃO AUTOMÁTICA DO FORMATO (SEM DROPDOWN) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        Formato Identificado:
                      </span>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#002172] text-white text-xs font-bold">
                        <FileType className="w-3.5 h-3.5 text-[#91CA0C]" />
                        <span>
                          {formularioImportado.tipoArquivo === 'pdf'
                            ? 'DOCUMENTO PDF (.pdf)'
                            : 'IMAGEM DIGITALIZADA JPEG (.jpeg)'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Data de Emissão do Formulário
                      </label>
                      <input
                        type="date"
                        value={formDataEmissao}
                        onChange={(e) => setFormDataEmissao(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-[#002172]"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        Vencimento (180 Dias)
                      </span>
                      <div className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-800">
                        {formatarDataBr(vencimentoFormularioInfo.dataVencimento, showMonthInitials)}
                      </div>
                    </div>
                  </div>

                  {/* Status de Validade */}
                  <div
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                      vencimentoFormularioInfo.status === 'VENCIDO'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : vencimentoFormularioInfo.status === 'ALERTA_PROXIMO_VENCIMENTO'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Validade da Importação:{' '}
                        <strong>
                          {vencimentoFormularioInfo.diasRestantes >= 0
                            ? `${vencimentoFormularioInfo.diasRestantes} dias restantes`
                            : `VENCIDO há ${Math.abs(vencimentoFormularioInfo.diasRestantes)} dias`}
                        </strong>
                      </span>
                    </div>

                    {vencimentoFormularioInfo.alertaUrgenteEmpregados && (
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                        ⚠️ URGÊNCIA: Avisar aos responsáveis para renovação!
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Trilha de Auditoria */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900">
              <Shield className="w-4 h-4 text-[#002172] shrink-0" />
              <span>
                Operação realizada por <strong>{usuarioAtual.nome}</strong>. O cadastro gerará evento imutável na trilha de auditoria.
              </span>
            </div>
          </form>

          {/* Footer com Ações */}
          <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
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
              onClick={handleValidarECadastrar}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-[#91CA0C]" />
              <span>{salvando ? 'Cadastrando...' : 'Cadastrar Paciente'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Alerta de Possível Duplicidade */}
      {duplicidadeAlerta && (
        <DuplicidadeAlertaModal
          resultado={duplicidadeAlerta}
          onFechar={() => setDuplicidadeAlerta(null)}
          onAbrirExistente={(pacExistente) => {
            setDuplicidadeAlerta(null);
            onFechar();
            onAbrirPacienteExistente(pacExistente);
          }}
          onContinuarMesmoAssim={(justificativa) => {
            setDuplicidadeAlerta(null);
            executarCriacao(justificativa);
          }}
        />
      )}
    </>
  );
};
