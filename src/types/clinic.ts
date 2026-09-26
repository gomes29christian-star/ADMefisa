/**
 * Tipos e Modelos Centrais da Clínica Mefisa
 * Base arquitetural para pacientes, prestadores, autorizações, guias e auditoria.
 */

export type PapelUsuario =
  | 'ADMINISTRADOR'
  | 'GESTOR'
  | 'FUNCIONARIO_ADMINISTRATIVO'
  | 'VISUALIZACAO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  departamento: string;
  avatar: string;
  ativo: boolean;
  ultimoAcesso: string;
  permissoes?: string[];
  systemPassword?: string;
  personalPasscode?: string;
}

export type StatusPaciente =
  | 'ATIVO'
  | 'INATIVO'
  | 'EM_ACOMPANHAMENTO'
  | 'ENCERRADO'
  | 'EM_TRATAMENTO'
  | 'SUSPENSO'
  | 'ALTA';

export interface ResponsavelLegal {
  id: string;
  nome: string;
  parentesco: string; // 'Mãe' | 'Pai' | 'Tutor Legal' | 'Avó/Avô' | 'Cônjuge' | 'Outro'
  telefone: string;
  email?: string;
  cpf?: string;
  principal: boolean;
  observacao?: string;
}

export interface HistoricoCarteirinha {
  id: string;
  convenioId: string;
  convenioNome: string;
  numeroCarteirinha: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD (quando encerrada)
  status: 'ATUAL' | 'ENCERRADA';
  observacao?: string;
  criadoPorUsuario: string;
  criadoEm: string;
}

export interface FormularioCadastroPaciente {
  nomeArquivo: string;
  tipoArquivo: 'pdf' | 'jpeg';
  tamanhoKb: number;
  dataEmissao: string; // YYYY-MM-DD
  dataVencimento: string; // Automaticamente 180 dias após dataEmissao
  statusVencimento: 'VALIDO' | 'ALERTA_PROXIMO_VENCIMENTO' | 'VENCIDO';
  diasRestantes?: number;
  baixarUrl?: string;
  urlImagem?: string;
}

export interface Paciente {
  id: string;
  codigoProntuario: string;
  nome: string;
  dataNascimento?: string;
  idade?: number;
  cpf?: string;
  cpfMascarado?: string;
  carteirinha: string;
  carteirinhaAtual?: string;
  carteirinhaAtualMascarada?: string;
  convenioId: string;
  convenioNome: string;
  convenioPrincipalId?: string;
  convenioPrincipalNome?: string;
  procedimentoPrincipal: string;
  procedimentos?: string[];
  prestadorId: string;
  prestadorNome?: string;
  status: StatusPaciente;
  responsavelNome?: string;
  responsavelPrincipalNome?: string;
  responsaveis?: ResponsavelLegal[];
  carteirinhas?: HistoricoCarteirinha[];
  formulario?: FormularioCadastroPaciente;
  ultimaAutorizacaoData?: string;
  proximaAutorizacaoData?: string;
  aguardandoDoutor?: boolean;
  autorizacaoAtrasada?: boolean;
  pendenciasQuantidade?: number;
  diaDaSemana?: string;
  diasDaSemana?: string[];
  quantidadeSemana?: number;
  sessoesPorSemana?: number;
  doutoresAtendentesIds?: string[];
  doutoresAtendentesNomes?: string[];
  pastaDoutoraMefisa?: string;
  polo?: 'M1' | 'M2' | 'Polo 1' | 'Polo 2';
  observacoes?: string;
  dataCriacao?: string;
  dataUltimaAtualizacao: string;
  atualizadoPor?: string;
}

export interface ResultadoVerificacaoDuplicidadePaciente {
  possivelDuplicidade: boolean;
  motivoCorrespondencia?: 'CPF_IDENTICO' | 'CARTEIRINHA_IDENTICA' | 'NOME_E_NASCIMENTO_IDENTICOS' | 'NOME_E_PROCEDIMENTO_IDENTICOS';
  pacienteExistente?: Paciente;
  detalhes: string;
}

export interface FiltroPacientesUsuario {
  busca: string;
  status: string; // 'TODOS' | StatusPaciente
  convenioId: string; // 'TODOS' | string
  comPendenciasApenas: boolean;
  autorizacoesAtrasadasApenas?: boolean;
  formularioVencidoApenas: boolean;
}

export interface Prestador {
  id: string;
  nome: string;
  cpf?: string;
  titulo: string;
  cbo: string;
  crmOuCrp: string;
  orgaoClasse: 'CRM' | 'CRP' | 'CREFITO' | 'CRFa' | 'Outro';
  uf: string;
  especialidade: string;
  procedimentos?: string[];
  pastaAtribuida: string;
  ativo: boolean;
  tipo?: 'MEFISA' | 'PRESTADOR';
}

export interface Procedimento {
  id: string;
  codigo: string;
  descricao: string;
  especialidade: string;
  sessoesPorSemanaPadrao: number;
  duracaoHoras: number;
}

export interface Convenio {
  id: string;
  nome: string;
  codigoAns: string;
  portalUrl: string;
  alertaAnaliseDiasPadrao: number;
}

export interface AjusteAutorizacao {
  id: string;
  autorizacaoId: string;
  quantidadeOriginal: number;
  novaQuantidade: number;
  motivo: string;
  usuarioNome: string;
  dataHora: string;
}

export interface Autorizacao {
  id: string;
  numeroSolicitacao: string;
  pacienteId: string;
  pacienteNome: string;
  prestadorId: string;
  prestadorNome: string;
  procedimentoId: string;
  procedimentoNome: string;
  convenioId: string;
  convenioNome: string;
  dataSolicitacao: string;
  dataAutorizacao?: string;
  dataValidadeInicio: string;
  dataValidadeFim: string;
  sessoesPorSemana: number;
  semanasCalculadas: number;
  quantidadeTotal: number;
  dataProximaAutorizacao: string;
  status:
    | 'AUTORIZADA'
    | 'EM_ANALISE'
    | 'PENDENTE_DOCUMENTO'
    | 'RENOVACAO_URGENTE'
    | 'EXPIRADA';
  diasEmAnalise?: number;
  emAtraso?: boolean;
  justificativaFormulario: string;
  tamanhoFormularioMb: number;
  ajustes: AjusteAutorizacao[];
}

export interface Sessao {
  id: string;
  autorizacaoId: string;
  pacienteId: string;
  pacienteNome: string;
  prestadorId: string;
  prestadorNome: string;
  dataHora: string;
  horarioFim: string;
  duracaoMinutos: number;
  sala: string;
  modalidade: 'PRESENCIAL' | 'TELECONSULTA';
  status: 'AGENDADA' | 'REALIZADA' | 'FALTA_JUSTIFICADA' | 'CANCELADA';
  guiaId?: string;
}

export interface GuiaDigitacao {
  id: string;
  numeroGuia: string;
  numeroConta?: string;
  autorizacaoId: string;
  pacienteId: string;
  pacienteNome: string;
  prestadorId: string;
  prestadorNome: string;
  convenioNome: string;
  dataAutorizacao: string;
  dataColocacaoPasta: string;
  pastaDoutora: string;
  duracaoHoras: 1 | 2;
  responsavelColocacaoPasta: string;
  dataRetorno?: string;
  responsavelColherGuia?: string;
  dataDigitacao?: string;
  responsavelDigitacao?: string;
  status:
    | 'AGUARDANDO_RETORNO'
    | 'AGUARDANDO_DIGITACAO'
    | 'DIGITADA_FATURADA'
    | 'REVISAR_INCONSISTENCIA';
  duplicidadeDetectada: boolean;
  observacoes?: string;
  senha?: string;
  dataValidadeSenha?: string;
  polo?: 'M1' | 'M2' | 'Polo 1' | 'Polo 2';
  assinada?: 'SIM' | 'PARCIAL' | 'NAO';
  responsavelColherAssinatura?: string;
  datasSessoes?: string[];
}

export interface AnaliseConvenio {
  id: string;
  autorizacaoId: string;
  pacienteNome: string;
  convenioNome: string;
  dataEntrada: string;
  diasEmAnalise: number;
  limiteDias: number;
  emAtraso: boolean;
  situacao: 'EM_ANDAMENTO' | 'APROVADA' | 'RECUSADA' | 'EXIGE_JUSTIFICATIVA';
  justificativaConvenio?: string;
  dataResposta?: string;
  responsavelAcompanhamento: string;
}

export interface EventoAuditoria {
  id: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  papelUsuario: PapelUsuario;
  acao: string;
  entidade: 'AUTORIZACAO' | 'PACIENTE' | 'PRESTADOR' | 'GUIA' | 'ANALISE' | 'SESSAO' | 'IMPORTACAO' | 'USUARIO' | 'CONFIGURACAO';
  registroId: string;
  descricaoRegistro: string;
  campoAlterado: string;
  valorAnterior: string;
  valorNovo: string;
  motivo?: string;
}

export interface PendenciaOperacional {
  id: string;
  tipo:
    | 'PROXIMA_AUTORIZACAO_PROXIMA'
    | 'ANALISE_ATRASADA'
    | 'GUIA_AGUARDANDO_DIGITACAO'
    | 'GUIA_SEM_RETORNO'
    | 'DOCUMENTO_DESATUALIZADO';
  titulo: string;
  descricao: string;
  pacienteNome: string;
  prazoLimite: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  responsavelSugerido: string;
  resolvido: boolean;
  linkModulo: string;
}

export interface FiltrosUsuarioLocal {
  busca: string;
  convenio: string;
  especialidade: string;
  apenasPendencias: boolean;
  somenteMinhas: boolean;
  statusFiltro: string;
  modoDensidade: 'confortavel' | 'compacta';
}

export type TipoFeriado =
  | 'NACIONAL'
  | 'ESTADUAL_SP'
  | 'MUNICIPAL_FERRAZ'
  | 'ADMINISTRATIVO_MEFISA';

export interface FeriadoConfig {
  id: string;
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: TipoFeriado;
  regraDeterminante: string;
  descricao?: string;
  bloqueiaAtendimento: boolean;
}

export type DiaSemanaIndice = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Domingo, 1=Segunda, ..., 6=Sábado

export interface AlinhamentoAutorizacaoResultado {
  diaSemanaHabitual: DiaSemanaIndice;
  diaSemanaNome: string;
  mesCompetenciaReferencia: string; // Ex: 'Novembro/2026'
  dataReferenciaInicialCorte: string;
  dataProximaAutorizacaoCalculada: string;
  foiDeslocadoParaDiaAnterior: boolean;
  diasDeslocadosAnterior: number;
  adicionouOcorrenciaSemanal: boolean;
  semanasCicloCalculadas: number;
  totalSessoesSugeridas: number;
  excecaoSabado: {
    detectada: boolean;
    dataSabadoOriginal?: string;
    dataSugeridaDeslocamento?: string;
    justificativaOperacional?: string;
    diasAlternativosDisponiveis?: Array<{ data: string; descricao: string }>;
  };
  regraDescritiva: string;
}

export interface ConflitoFeriadoSessao {
  dataOriginal: string;
  diaSemanaNome: string;
  feriado: FeriadoConfig;
  motivoConflito: string;
  novaDataSugerida: string;
  impactoCronograma: string;
  impactoProximaAutorizacao?: string;
}

export interface ValidacaoRemarcacaoResultado {
  valido: boolean;
  ehAnomalia: boolean;
  diasDiferenca: number;
  dataOriginal: string;
  novaData: string;
  mensagemAlerta?: string;
  exigeConfirmacaoExplicita: boolean;
}

export interface NotificacaoAnomaliaGestao {
  id: string;
  dataHora: string;
  pacienteNome: string;
  procedimentoNome: string;
  dataOriginal: string;
  novaData: string;
  diasDiferenca: number;
  usuarioNome: string;
  usuarioPapel: string;
  motivoConfirmado: string;
  destinatarios: Array<'ADM_CHEFE' | 'CEO'>;
  status: 'DISPARADA_IMEDIATA' | 'LIDA_GESTAO';
}

export type NivelSlaAnalise = 'NORMAL' | 'ATENCAO_PREVENTIVA' | 'ATRASADO_CRITICO';

export type ModoAbatimentoFaltas =
  | 'DESCONTAR_PROXIMA_AUTORIZACAO'
  | 'MANTER_INTEGRAL_REPOSICAO_PRONTUARIO';

export interface CanaisNotificacaoConfig {
  painelInterno: boolean;
  email: boolean;
  webhook: boolean;
  destinatariosEmails: string[];
  webhookUrl?: string;
}

export interface GatilhosNotificacaoConfig {
  remarcacaoAnormal: boolean; // Saltos >= 20 dias
  duplicidadeConfirmada: boolean; // Gravação excepcional de duplicata
  analiseAtrasada7Dias: boolean; // SLA de análise estourado (> 7 dias)
  analiseAtencao5Dias: boolean; // Alerta preventivo (5 a 7 dias)
  feriadoConflitoFerraz: boolean; // Conflito com feriado em Ferraz de Vasconcelos
}

export interface PreferenciasNotificacaoGestao {
  canais: CanaisNotificacaoConfig;
  gatilhos: GatilhosNotificacaoConfig;
}

export interface ValidacaoDuplicidadeGuiaSessao {
  chaveValidacao: string; // "PACIENTE_ID|PROCEDIMENTO_ID|DATA"
  pacienteNome: string;
  procedimentoNome: string;
  dataSessao: string;
  numeroGuiaInformado?: string;
  duplicada: boolean;
  registroExistente?: {
    guiaId: string;
    numeroGuia: string;
    pacienteNome: string;
    procedimentoNome: string;
    dataSessao: string;
    status: string;
  };
  mensagem: string;
  exigeConfirmacaoComJustificativa: boolean; // Confirmado pela Gestão: Opção B
}


