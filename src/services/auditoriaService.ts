import { EventoAuditoria, PapelUsuario } from '../types/clinic';

export interface EventoAuditoriaCompleto extends EventoAuditoria {
  dataIso?: string;
  tipoAcao?: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'STATUS' | 'FATURAMENTO' | 'IMPORTACAO' | 'SISTEMA' | 'ACESSO';
  ipOrigem?: string;
  detalhesAdicionais?: string;
}

const STORAGE_KEY_AUDITORIA_GERAL = 'mefisa_auditoria_geral_v2';

export class AuditoriaService {
  /**
   * Obtém a lista completa de logs de auditoria
   */
  public static obterLogs(): EventoAuditoriaCompleto[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return this.obterSeedLogs();
      }
      const raw = localStorage.getItem(STORAGE_KEY_AUDITORIA_GERAL);
      if (!raw) {
        const initial = this.obterSeedLogs();
        localStorage.setItem(STORAGE_KEY_AUDITORIA_GERAL, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return this.obterSeedLogs();
    }
  }

  /**
   * Registra uma nova ação realizada por um usuário no sistema
   */
  public static registrarAcao(params: {
    usuario: { id: string; nome: string; papel: PapelUsuario; email?: string };
    acao: string;
    entidade: 'PACIENTE' | 'AUTORIZACAO' | 'SESSAO' | 'GUIA' | 'PRESTADOR' | 'USUARIO' | 'CONFIGURACAO' | 'IMPORTACAO';
    registroId: string;
    descricaoRegistro: string;
    campoAlterado: string;
    valorAnterior: string;
    valorNovo: string;
    motivo?: string;
    tipoAcao?: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'STATUS' | 'FATURAMENTO' | 'IMPORTACAO' | 'SISTEMA' | 'ACESSO';
  }): EventoAuditoriaCompleto {
    const agora = new Date();
    const dataHora = `${agora.toLocaleDateString('pt-BR')} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`;

    const novoEvento: EventoAuditoriaCompleto = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataHora,
      dataIso: agora.toISOString(),
      usuarioId: params.usuario.id,
      usuarioNome: params.usuario.nome,
      papelUsuario: params.usuario.papel,
      acao: params.acao,
      tipoAcao: params.tipoAcao || this.inferirTipoAcao(params.acao, params.campoAlterado),
      entidade: params.entidade,
      registroId: params.registroId,
      descricaoRegistro: params.descricaoRegistro,
      campoAlterado: params.campoAlterado,
      valorAnterior: params.valorAnterior || '—',
      valorNovo: params.valorNovo || '—',
      motivo: params.motivo || 'Operação realizada no sistema',
      ipOrigem: '192.168.1.104 (Sessão Autenticada)',
    };

    const logsAtuais = this.obterLogs();
    const logsAtualizados = [novoEvento, ...logsAtuais].slice(0, 500);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_AUDITORIA_GERAL, JSON.stringify(logsAtualizados));
      }
    } catch (e) {
      console.error('Erro ao salvar log de auditoria', e);
    }

    return novoEvento;
  }

  /**
   * Limpa todo o histórico de logs (ação restrita a administradores)
   */
  public static limparLogs(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY_AUDITORIA_GERAL);
      }
    } catch {}
  }

  private static inferirTipoAcao(acao: string, campo: string): 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'STATUS' | 'FATURAMENTO' | 'IMPORTACAO' | 'SISTEMA' | 'ACESSO' {
    const lower = (acao + ' ' + campo).toLowerCase();
    if (lower.includes('exclu') || lower.includes('delet')) return 'EXCLUSAO';
    if (lower.includes('cria') || lower.includes('novo') || lower.includes('cadastr')) return 'CRIACAO';
    if (lower.includes('import')) return 'IMPORTACAO';
    if (lower.includes('fatur') || lower.includes('guia')) return 'FATURAMENTO';
    if (lower.includes('status') || lower.includes('encerr') || lower.includes('inativ')) return 'STATUS';
    if (lower.includes('login') || lower.includes('acesso')) return 'ACESSO';
    return 'EDICAO';
  }

  /**
   * Seed inicial de logs de auditoria realistas cobrindo interações recentes na clínica
   */
  public static obterSeedLogs(): EventoAuditoriaCompleto[] {
    return [
      {
        id: 'aud-seed-101',
        dataHora: '25/09/2026 13:45:12',
        dataIso: '2026-09-25T13:45:12.000Z',
        usuarioId: 'usr-christian',
        usuarioNome: 'Christian Gomes',
        papelUsuario: 'ADMINISTRADOR',
        acao: 'Status Alterado (Paciente Inativado)',
        tipoAcao: 'STATUS',
        entidade: 'PACIENTE',
        registroId: 'pac-4',
        descricaoRegistro: 'Paciente Renato Incompleto (#PRT-2026-004)',
        campoAlterado: 'status & proximaAutorizacaoData',
        valorAnterior: 'Status: ATIVO | Próxima Aut: 10/11/2026',
        valorNovo: 'Status: INATIVO | Próxima Aut: — (Removida automaticamente)',
        motivo: 'Paciente solicitou pausa no tratamento por motivos pessoais',
        ipOrigem: '192.168.1.104',
      },
      {
        id: 'aud-seed-102',
        dataHora: '25/09/2026 12:30:05',
        dataIso: '2026-09-25T12:30:05.000Z',
        usuarioId: 'usr-christian',
        usuarioNome: 'Christian Gomes',
        papelUsuario: 'ADMINISTRADOR',
        acao: 'Importação do Lote de CSV Legado',
        tipoAcao: 'IMPORTACAO',
        entidade: 'IMPORTACAO',
        registroId: 'batch-20260925-01',
        descricaoRegistro: 'Lote de CSV: planilha_legada_ficticia_mefisa.csv',
        campoAlterado: 'loteImportacao',
        valorAnterior: '—',
        valorNovo: '4 registros importados e vinculados com sucesso ao Mefisa',
        motivo: 'Migração de registros legados de faturamento e autorizações',
        ipOrigem: '192.168.1.104',
      },
      {
        id: 'aud-seed-103',
        dataHora: '25/09/2026 10:15:40',
        dataIso: '2026-09-25T10:15:40.000Z',
        usuarioId: 'usr-ana',
        usuarioNome: 'Ana Beatriz',
        papelUsuario: 'FUNCIONARIO_ADMINISTRATIVO',
        acao: 'Troca de Carteirinha de Convênio',
        tipoAcao: 'EDICAO',
        entidade: 'PACIENTE',
        registroId: 'pac-1',
        descricaoRegistro: 'Paciente Ana Exemplo (#PRT-2026-001)',
        campoAlterado: 'carteirinhaAtual',
        valorAnterior: '982019230198001 (SulAmérica)',
        valorNovo: '982019230198002 (Bradesco Saúde)',
        motivo: 'Troca de plano de saúde informada pelo responsável legal',
        ipOrigem: '192.168.1.112',
      },
      {
        id: 'aud-seed-104',
        dataHora: '24/09/2026 16:20:00',
        dataIso: '2026-09-24T16:20:00.000Z',
        usuarioId: 'usr-ana',
        usuarioNome: 'Ana Beatriz',
        papelUsuario: 'FUNCIONARIO_ADMINISTRATIVO',
        acao: 'Digitada / Faturada (Guia Faturamento)',
        tipoAcao: 'FATURAMENTO',
        entidade: 'GUIA',
        registroId: 'gui-108',
        descricaoRegistro: 'Guia #GUI-2026-108 (Paciente Carlos Teste)',
        campoAlterado: 'status',
        valorAnterior: 'AGUARDANDO_DIGITACAO',
        valorNovo: 'DIGITADA_FATURADA',
        motivo: 'Conferência efetuada e lote enviado ao portal Bradesco',
        ipOrigem: '192.168.1.112',
      },
      {
        id: 'aud-seed-105',
        dataHora: '24/09/2026 14:10:18',
        dataIso: '2026-09-24T14:10:18.000Z',
        usuarioId: 'usr-mariana',
        usuarioNome: 'Mariana Costa',
        papelUsuario: 'FUNCIONARIO_ADMINISTRATIVO',
        acao: 'Criação de Novo Paciente',
        tipoAcao: 'CRIACAO',
        entidade: 'PACIENTE',
        registroId: 'pac-109',
        descricaoRegistro: 'Paciente Pedro Lucas Santos (#PRT-2026-109)',
        campoAlterado: 'cadastroPaciente',
        valorAnterior: 'Nenhum',
        valorNovo: 'Paciente cadastrado com Polo M1, Doutor Mefisa e Convênio Amil',
        motivo: 'Acolhimento inicial e triagem clínica concluída',
        ipOrigem: '192.168.1.108',
      },
      {
        id: 'aud-seed-106',
        dataHora: '23/09/2026 11:05:30',
        dataIso: '2026-09-23T11:05:30.000Z',
        usuarioId: 'prest-1',
        usuarioNome: 'Dra. Ana Beatriz Albuquerque',
        papelUsuario: 'GESTOR',
        acao: 'Alteração de Configuração do Sistema',
        tipoAcao: 'CONFIGURACAO' as any,
        entidade: 'CONFIGURACAO',
        registroId: 'cfg-sla-01',
        descricaoRegistro: 'Regras de Alerta de Anomalia e SLA de Guias',
        campoAlterado: 'prazoLimiteDias',
        valorAnterior: '5 dias úteis',
        valorNovo: '7 dias úteis',
        motivo: 'Adequação ao prazo de análise atual do convênio SulAmérica',
        ipOrigem: '192.168.1.102',
      },
      {
        id: 'aud-seed-107',
        dataHora: '22/09/2026 09:12:45',
        dataIso: '2026-09-22T09:12:45.000Z',
        usuarioId: 'usr-christian',
        usuarioNome: 'Christian Gomes',
        papelUsuario: 'ADMINISTRADOR',
        acao: 'Exclusão de Registro',
        tipoAcao: 'EXCLUSAO',
        entidade: 'PACIENTE',
        registroId: 'pac-del-104',
        descricaoRegistro: 'Paciente Juliana Mendes de Souza',
        campoAlterado: 'registroCompleto',
        valorAnterior: 'Registro Ativo no Mefisa',
        valorNovo: 'Movido para Lixeira de Registros Deletados',
        motivo: 'Duplicidade de cadastro identificada pelo setor financeiro',
        ipOrigem: '192.168.1.104',
      },
      {
        id: 'aud-seed-108',
        dataHora: '21/09/2026 15:40:22',
        dataIso: '2026-09-21T15:40:22.000Z',
        usuarioId: 'usr-ana',
        usuarioNome: 'Ana Beatriz',
        papelUsuario: 'FUNCIONARIO_ADMINISTRATIVO',
        acao: 'Vínculo de Formulário Cadastral',
        tipoAcao: 'EDICAO',
        entidade: 'PACIENTE',
        registroId: 'pac-2',
        descricaoRegistro: 'Paciente Carlos Teste (#PRT-2026-002)',
        campoAlterado: 'formulario',
        valorAnterior: 'Nenhum',
        valorNovo: 'Formulario_Carlos_2026.pdf (Validade 180 dias)',
        motivo: 'Upload do formulário de triagem assinado pelo responsável',
        ipOrigem: '192.168.1.112',
      },
      {
        id: 'aud-seed-109',
        dataHora: '20/09/2026 14:00:00',
        dataIso: '2026-09-20T14:00:00.000Z',
        usuarioId: 'prest-2',
        usuarioNome: 'Dr. Carlos Eduardo Neves',
        papelUsuario: 'FUNCIONARIO_ADMINISTRATIVO',
        acao: 'Remarcação de Sessão',
        tipoAcao: 'EDICAO',
        entidade: 'SESSAO',
        registroId: 'ses-9921',
        descricaoRegistro: 'Sessão de Neurologia Infantil - Paciente Ana Exemplo',
        campoAlterado: 'dataHora',
        valorAnterior: '20/09/2026 14:00',
        valorNovo: '22/09/2026 10:00',
        motivo: 'Solicitação médica por imprevisto na agenda cirúrgica',
        ipOrigem: '192.168.1.105',
      },
    ];
  }
}
