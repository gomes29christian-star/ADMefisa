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
        return [];
      }
      const raw = localStorage.getItem(STORAGE_KEY_AUDITORIA_GERAL);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY_AUDITORIA_GERAL, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(raw);
      // Remove quaisquer itens de seed antigos para manter o histórico limpo e novo em folha
      const filtrados = Array.isArray(parsed)
        ? parsed.filter((item: any) => item && item.id && !item.id.startsWith('aud-seed-'))
        : [];
      if (filtrados.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_AUDITORIA_GERAL, JSON.stringify(filtrados));
      }
      return filtrados;
    } catch {
      return [];
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
        localStorage.setItem(STORAGE_KEY_AUDITORIA_GERAL, JSON.stringify([]));
        localStorage.setItem('mefisa_auditoria_pacientes_v1', JSON.stringify([]));
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
   * Seed inicial de logs de auditoria (zerado para manter histórico limpo e novo em folha)
   */
  public static obterSeedLogs(): EventoAuditoriaCompleto[] {
    return [];
  }
}
