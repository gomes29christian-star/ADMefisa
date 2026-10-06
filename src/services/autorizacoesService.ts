import { AutorizacaoV2, HistoricoStatusAutorizacao, StatusAutorizacao } from '../types/autorizacao';
import { GuiaDigitacao } from '../types/clinic';
import { MOCK_AUDITORIA } from '../data/mockClinicData';
import { CloudSyncService } from './cloudSyncService';

const STORAGE_KEY_AUTORIZACOES = 'clinica_mefisa_autorizacoes_v2';
const STORAGE_KEY_GUIAS_FATURAMENTO = 'clinica_mefisa_guias_faturamento_v2';

export const calcularDiasCorridos = (dataInicioStr: string): number => {
  if (!dataInicioStr) return 0;
  const inicio = new Date(dataInicioStr);
  const hoje = new Date();
  inicio.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  const diffTime = hoje.getTime() - inicio.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const carregarAutorizacoesIniciais = (): AutorizacaoV2[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY_AUTORIZACOES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((a: any) => ({
            ...a,
            operadora: 'SULAMÉRICA',
            diasEmAnalise: a.status === 'EM_ANALISE' ? calcularDiasCorridos(a.dataSolicitacao) : (a.diasEmAnalise || 0),
          }));
        }
      }
    }
  } catch (e) {
    console.error('Erro ao carregar autorizações do localStorage', e);
  }

  const dataAntiga = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 9 dias atrás (> 7 dias)
  const dataRecente = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 dias atrás

  return [
    {
      id: 'aut-v2-1',
      numeroAutorizacao: 'AUT-2026-9901',
      pacienteId: 'pac-1',
      pacienteNome: 'Lucas Gabriel da Silva',
      carteirinha: '00624689123',
      operadora: 'SULAMÉRICA',
      procedimento: 'Psicologia ABA',
      prestador: 'Dra. Ana Beatriz Albuquerque',
      cbo: '251510',
      crm: 'CRP 06/12345',
      dataSolicitacao: dataAntiga,
      quantidadeSolicitada: 12,
      competencia: '2026-10',
      proximaAutorizacao: '2026-10-28',
      status: 'EM_ANALISE',
      responsavel: 'Ana Beatriz',
      ultimaAtualizacao: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      diasEmAnalise: 9,
      historico: [
        {
          id: 'hist-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'EM_ANALISE',
          usuarioNome: 'Ana Beatriz',
          dataHora: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toLocaleString('pt-BR'),
          justificativa: 'Solicitação inicial enviada via portal da operadora.',
        },
      ],
      observacoes: 'Aguardando liberação de auditoria médica da operadora.',
    },
    {
      id: 'aut-v2-2',
      numeroAutorizacao: 'AUT-2026-9902',
      pacienteId: 'pac-2',
      pacienteNome: 'Beatriz Lima Souza',
      carteirinha: '00571123456',
      operadora: 'SULAMÉRICA',
      procedimento: 'Fonoaudiologia',
      prestador: 'Dr. Carlos Eduardo Neves',
      cbo: '223810',
      crm: 'CRFa 2-4567',
      dataSolicitacao: dataRecente,
      quantidadeSolicitada: 8,
      competencia: '2026-10',
      proximaAutorizacao: '2026-11-02',
      status: 'EM_ANALISE',
      responsavel: 'Christian Gomes',
      ultimaAtualizacao: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      diasEmAnalise: 3,
      historico: [
        {
          id: 'hist-2',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'EM_ANALISE',
          usuarioNome: 'Christian Gomes',
          dataHora: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString('pt-BR'),
          justificativa: 'Em análise padrão.',
        },
      ],
      observacoes: 'Documentação entregue no prazo.',
    },
    {
      id: 'aut-v2-3',
      numeroAutorizacao: 'AUT-2026-9895',
      pacienteId: 'pac-3',
      pacienteNome: 'Matheus Henrique',
      carteirinha: '30536788990',
      operadora: 'SULAMÉRICA',
      procedimento: 'Terapia Ocupacional',
      prestador: 'Dra. Mariana Souza',
      cbo: '251510',
      crm: 'CREFITO 15892',
      dataSolicitacao: '2026-09-10',
      dataAutorizacao: '2026-09-12',
      quantidadeSolicitada: 10,
      competencia: '2026-09',
      proximaAutorizacao: '2026-10-15',
      status: 'CONCLUIDO',
      responsavel: 'Ana Beatriz',
      ultimaAtualizacao: '2026-09-12T14:30:00.000Z',
      diasEmAnalise: 2,
      historico: [
        {
          id: 'hist-3-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'EM_ANALISE',
          usuarioNome: 'Ana Beatriz',
          dataHora: '2026-09-10 09:00',
          justificativa: 'Início da solicitação',
        },
        {
          id: 'hist-3-2',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'CONCLUIDO',
          usuarioNome: 'Ana Beatriz',
          dataHora: '2026-09-12 14:30',
          justificativa: 'Autorizado com sucesso pela operadora.',
        },
      ],
      observacoes: 'Guia emitida e validada.',
      polo: 'M1',
      dataColocacaoPasta: '2026-09-13',
      pastaDoutora: 'Pasta Dra. Mariana Souza',
      responsavelColocacaoPasta: 'Maria Clara Fonseca',
      dataRetorno: '2026-09-18',
      assinada: 'PARCIAL',
      responsavelColherAssinatura: 'Ana Beatriz Silveira',
    },
    {
      id: 'aut-v2-5',
      numeroAutorizacao: 'AUT-2026-9770',
      pacienteId: 'pac-5',
      pacienteNome: 'Gabriel Costa Silva',
      carteirinha: '006246112233',
      operadora: 'SulAmérica Saúde',
      procedimento: 'Psicopedagogia ABA',
      prestador: 'Dra. Ana Beatriz Albuquerque',
      cbo: '251510',
      crm: 'CRP 06/12345',
      dataSolicitacao: '2026-09-14',
      dataAutorizacao: '2026-09-15',
      quantidadeSolicitada: 12,
      competencia: '2026-09',
      proximaAutorizacao: '2026-10-20',
      status: 'CONCLUIDO',
      responsavel: 'Maria Clara Fonseca',
      ultimaAtualizacao: '2026-09-15T10:15:00.000Z',
      diasEmAnalise: 1,
      historico: [
        {
          id: 'hist-5-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'CONCLUIDO',
          usuarioNome: 'Maria Clara Fonseca',
          dataHora: '2026-09-15 10:15',
          justificativa: 'Concluído via portal de autorização rápida.',
        },
      ],
      observacoes: 'Guia autorizada pronta para digitação.',
      polo: 'M2',
      dataColocacaoPasta: '2026-09-16',
      pastaDoutora: 'Pasta Dra. Ana Beatriz Albuquerque',
      responsavelColocacaoPasta: 'Christian Gomes',
      dataRetorno: '',
      assinada: 'NAO',
      responsavelColherAssinatura: 'Ana Beatriz Silveira',
    },
    {
      id: 'aut-v2-theo-psico',
      numeroAutorizacao: 'AUT-2026-9889',
      pacienteId: 'pac-theo-pio',
      pacienteNome: 'Theo Pio Correia Silva',
      carteirinha: '005711998877',
      operadora: 'SulAmérica Saúde',
      procedimento: 'Psicologia ABA',
      prestador: 'Dra. Ana Beatriz Albuquerque',
      cbo: '251510',
      crm: 'CRP 06/12345',
      dataSolicitacao: '2026-09-20',
      dataAutorizacao: '2026-09-22',
      quantidadeSolicitada: 8,
      sessoesPorSemana: 2,
      competencia: '2026-09',
      proximaAutorizacao: '2026-10-25',
      status: 'CONCLUIDO',
      responsavel: 'Christian Gomes',
      ultimaAtualizacao: '2026-09-22T16:00:00.000Z',
      diasEmAnalise: 2,
      historico: [
        {
          id: 'hist-theo-psico-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'CONCLUIDO',
          usuarioNome: 'Christian Gomes',
          dataHora: '2026-09-22 16:00',
          justificativa: 'Autorizado 8 sessões (2x por semana em Psicologia ABA). Início em 22/09/2026.',
        },
      ],
      observacoes: 'Psicologia ABA: 2 sessões por semana.',
      polo: 'M1',
      dataColocacaoPasta: '2026-09-23',
      pastaDoutora: 'Pasta Dra. Ana Beatriz Albuquerque',
      responsavelColocacaoPasta: 'Maria Clara Fonseca',
      assinada: 'SIM',
      responsavelColherAssinatura: 'Christian Gomes',
    },
    {
      id: 'aut-v2-6',
      numeroAutorizacao: 'AUT-2026-9888',
      pacienteId: 'pac-theo-pio',
      pacienteNome: 'Theo Pio Correia Silva',
      carteirinha: '005711998877',
      operadora: 'SulAmérica Saúde',
      procedimento: 'TO Terapia Ocupacional ABA',
      prestador: 'Dra. Mariana Souza',
      cbo: '251510',
      crm: 'CREFITO 15892',
      dataSolicitacao: '2026-09-20',
      dataAutorizacao: '2026-09-22',
      quantidadeSolicitada: 4,
      sessoesPorSemana: 1,
      competencia: '2026-09',
      proximaAutorizacao: '2026-10-25',
      status: 'CONCLUIDO',
      responsavel: 'Christian Gomes',
      ultimaAtualizacao: '2026-09-22T16:00:00.000Z',
      diasEmAnalise: 2,
      historico: [
        {
          id: 'hist-6-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'CONCLUIDO',
          usuarioNome: 'Christian Gomes',
          dataHora: '2026-09-22 16:00',
          justificativa: 'Autorizado 4 sessões (1x por semana na Quarta-feira). Início em 22/09/2026.',
        },
      ],
      observacoes: 'Atenção: A 4ª e última sessão ocorre em 14/10/2026. 1 vez na semana na quarta-feira.',
      polo: 'M1',
      dataColocacaoPasta: '2026-09-23',
      pastaDoutora: 'Pasta Dra. Mariana Souza',
      responsavelColocacaoPasta: 'Maria Clara Fonseca',
      assinada: 'SIM',
      responsavelColherAssinatura: 'Christian Gomes',
    },
    {
      id: 'aut-v2-7',
      numeroAutorizacao: 'AUT-2026-9890',
      pacienteId: 'pac-7',
      pacienteNome: 'Alice de Oliveira Leão',
      carteirinha: '305367332211',
      operadora: 'SulAmérica Saúde',
      procedimento: 'Fonoaudiologia ABA',
      prestador: 'Dr. Carlos Eduardo Neves',
      cbo: '223810',
      crm: 'CRFa 2-4567',
      dataSolicitacao: '2026-09-22',
      dataAutorizacao: '2026-09-24',
      quantidadeSolicitada: 6,
      competencia: '2026-09',
      proximaAutorizacao: '2026-10-28',
      status: 'CONCLUIDO',
      responsavel: 'Christian Gomes',
      ultimaAtualizacao: '2026-09-24T11:00:00.000Z',
      diasEmAnalise: 2,
      historico: [
        {
          id: 'hist-7-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'CONCLUIDO',
          usuarioNome: 'Christian Gomes',
          dataHora: '2026-09-24 11:00',
          justificativa: 'Autorizado 6 sessões.',
        },
      ],
      observacoes: 'A última sessão do pacote é no dia 01/10/2026 (após hoje 25/09/2026).',
      polo: 'M2',
      dataColocacaoPasta: '2026-09-24',
      pastaDoutora: 'Pasta Dr. Carlos Eduardo Neves',
      responsavelColocacaoPasta: 'João Pedro Alves',
      assinada: 'SIM',
      responsavelColherAssinatura: 'Christian Gomes',
    },
    {
      id: 'aut-v2-4',
      numeroAutorizacao: 'AUT-2026-9880',
      pacienteId: 'pac-4',
      pacienteNome: 'Sophia Ribeiro',
      carteirinha: '32630511223',
      operadora: 'SulAmérica Saúde',
      procedimento: 'Musicoterapia',
      prestador: 'Dr. Carlos Eduardo Neves',
      cbo: '223810',
      crm: 'CRFa 2-4567',
      dataSolicitacao: '2026-09-01',
      quantidadeSolicitada: 6,
      competencia: '2026-09',
      proximaAutorizacao: '2026-10-01',
      status: 'RECUSADO',
      responsavel: 'Christian Gomes',
      ultimaAtualizacao: '2026-09-05T11:00:00.000Z',
      diasEmAnalise: 4,
      historico: [
        {
          id: 'hist-4-1',
          statusAnterior: 'EM_ANALISE',
          novoStatus: 'RECUSADO',
          usuarioNome: 'Christian Gomes',
          dataHora: '2026-09-05 11:00',
          justificativa: 'Recusado pela operadora: CID divergente do formulário de encaminhamento médico.',
        },
      ],
      observacoes: 'Necessário reemitir laudo com CID correto.',
    },
  ];
};

export const carregarGuiasIniciais = (padraoIniciais: GuiaDigitacao[]): GuiaDigitacao[] => {
  const padraoUnico = padraoIniciais.map((g) => ({ ...g, convenioNome: 'SulAmérica Saúde' }));
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY_GUIAS_FATURAMENTO);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((g: any) => ({ ...g, convenioNome: 'SulAmérica Saúde' }));
        }
      }
    }
  } catch (e) {
    console.error('Erro ao carregar guias faturadas do localStorage', e);
  }
  return padraoUnico;
};

export const salvarGuiasStorage = (guias: GuiaDigitacao[]) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_GUIAS_FATURAMENTO, JSON.stringify(guias));
      setTimeout(() => {
        window.dispatchEvent(new Event('storage'));
      }, 0);
    }
  } catch (e) {
    console.error('Erro ao salvar guias faturadas no localStorage', e);
  }
};

export const salvarAutorizacoesStorage = (autorizacoes: AutorizacaoV2[], autorizacaoModificada?: AutorizacaoV2) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_AUTORIZACOES, JSON.stringify(autorizacoes));
      setTimeout(() => {
        window.dispatchEvent(new Event('storage'));
      }, 0);

      // Sincroniza apenas a autorização modificada pontualmente se fornecida
      if (autorizacaoModificada) {
        CloudSyncService.salvarAutorizacaoNuvem(autorizacaoModificada).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Erro ao salvar autorizações no localStorage', e);
  }
};

export const registrarAuditoriaAutorizacao = (
  acao: string,
  descricao: string,
  usuarioNome: string,
  autorizacaoId: string,
  campoAlterado = 'status',
  valorAnterior = 'EM_ANALISE',
  valorNovo = 'ATUALIZADO',
  motivo = ''
) => {
  try {
    MOCK_AUDITORIA.unshift({
      id: `audit-aut-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dataHora: new Date().toLocaleString('pt-BR'),
      usuarioId: 'usr-sistema',
      usuarioNome,
      papelUsuario: 'ADMINISTRADOR',
      acao,
      entidade: 'AUTORIZACAO',
      registroId: autorizacaoId,
      descricaoRegistro: descricao,
      campoAlterado,
      valorAnterior,
      valorNovo,
      motivo,
    });
  } catch (e) {
    console.error('Erro ao registrar auditoria', e);
  }
};
