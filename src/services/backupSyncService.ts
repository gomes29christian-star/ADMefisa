/**
 * Serviço de Backup, Restauração e Migração de Dados — Clínica ADMefisa
 * Garante criptografia exclusiva dos dados e reutilização ZERO de arquivos .json (uso único e descartável).
 */

import { criptografarBackupPayload, descriptografarBackupPayload } from '../utils/cryptoBackup';
import { CloudSyncService } from './cloudSyncService';

export interface ClinicBackupPayload {
  versao: string;
  dataExportacao: string;
  ambienteOrigem: string;
  backupId: string;
  resumo: {
    totalPacientes: number;
    totalPrestadores: number;
    totalAutorizacoes: number;
    totalGuias: number;
    totalProcedimentos: number;
    totalUsuarios: number;
  };
  dadosStorage: Record<string, string>;
}

export interface ClinicBackupContainer {
  app: string;
  versao: string;
  criptografado: boolean;
  backupId: string;
  dataExportacao: string;
  ambienteOrigem: string;
  resumo: {
    totalPacientes: number;
    totalPrestadores: number;
    totalAutorizacoes: number;
    totalGuias: number;
    totalProcedimentos: number;
    totalUsuarios: number;
  };
  dadosCriptografados: string;
}

const STORAGE_KEY_CONSUMED_BACKUPS = 'mefisa_consumed_backups_v1';

const CHAVES_MEFISA = [
  'mefisa_pacientes_v2',
  'clinica_mefisa_prestadores_v2',
  'clinica_mefisa_autorizacoes_v2',
  'clinica_mefisa_guias_faturamento_v2',
  'clinica_mefisa_usuarios_custom_v1',
  'clinica_mefisa_active_usuario_id_v1',
  'clinica_mefisa_usuarios_deletados_v1',
  'clinica_mefisa_adm_notif_deleted_access_v1',
  'mefisa_procedimentos_tuss_v1',
  'mefisa_feriados_config_v1',
  'mefisa_notificacoes_anomalia_v1',
  'mefisa_preferencias_notificacao_v1',
  'mefisa_duplicidades_confirmadas_v1',
  'clinica_mefisa_deleted_records_v1',
  'mefisa_auditoria_geral_v2',
  'mefisa_auditoria_pacientes_v1',
  'mefisa_theme',
  'mefisa_font_size',
  'mefisa_reduced_motion',
  'mefisa_high_contrast',
  'mefisa_letter_spacing',
  'mefisa_line_height',
  'mefisa_trusted_browser',
  'mefisa_consumed_backups_v1',
];

export const BackupSyncService = {
  /**
   * Obtém a lista de IDs de backups já importados/consumidos
   */
  obterBackupsConsumidos(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONSUMED_BACKUPS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  /**
   * Registra um ID de backup como consumido (inutilizado)
   */
  registrarBackupConsumido(backupId: string): void {
    if (!backupId || typeof window === 'undefined' || !window.localStorage) return;
    try {
      const consumidos = this.obterBackupsConsumidos();
      if (!consumidos.includes(backupId)) {
        const atualizados = [...consumidos, backupId];
        localStorage.setItem(STORAGE_KEY_CONSUMED_BACKUPS, JSON.stringify(atualizados));
        
        // Sincronizar token inutilizado com Cloud Firestore para revogação em todos os dispositivos
        try {
          CloudSyncService.salvarBackupConsumidoNuvem(backupId);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Erro ao registrar backup consumido:', err);
    }
  },

  /**
   * Obtém um resumo rápido dos dados presentes no localStorage deste navegador
   */
  obterResumoLocal(): {
    pacientes: number;
    prestadores: number;
    autorizacoes: number;
    guias: number;
    procedimentos: number;
    usuarios: number;
  } {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { pacientes: 0, prestadores: 0, autorizacoes: 0, guias: 0, procedimentos: 0, usuarios: 0 };
    }

    const parseContagem = (chave: string): number => {
      try {
        const item = localStorage.getItem(chave);
        if (!item) return 0;
        const parsed = JSON.parse(item);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    };

    return {
      pacientes: parseContagem('mefisa_pacientes_v2'),
      prestadores: parseContagem('clinica_mefisa_prestadores_v2'),
      autorizacoes: parseContagem('clinica_mefisa_autorizacoes_v2'),
      guias: parseContagem('clinica_mefisa_guias_faturamento_v2'),
      procedimentos: parseContagem('mefisa_procedimentos_tuss_v1'),
      usuarios: parseContagem('clinica_mefisa_usuarios_custom_v1'),
    };
  },

  /**
   * Coleta todos os dados do localStorage e gera o pacote de exportação CRIPTOGRAFADO e com TOKEN ÚNICO
   */
  gerarBackup(): ClinicBackupContainer {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('Ambiente de navegador não disponível para leitura de dados.');
    }

    const dadosStorage: Record<string, string> = {};

    // 1. Chaves conhecidas
    CHAVES_MEFISA.forEach((chave) => {
      const valor = localStorage.getItem(chave);
      if (valor !== null) {
        dadosStorage[chave] = valor;
      }
    });

    // 2. Chaves dinâmicas com prefixo mefisa_ ou clinica_mefisa_
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mefisa_') || key.startsWith('clinica_mefisa_'))) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          dadosStorage[key] = val;
        }
      }
    }

    const resumo = this.obterResumoLocal();
    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
    const backupId = `admefisa-bkp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const rawPayload: ClinicBackupPayload = {
      versao: '2.0.0',
      dataExportacao: dataFormatada,
      ambienteOrigem: window.location.origin,
      backupId,
      resumo: {
        totalPacientes: resumo.pacientes,
        totalPrestadores: resumo.prestadores,
        totalAutorizacoes: resumo.autorizacoes,
        totalGuias: resumo.guias,
        totalProcedimentos: resumo.procedimentos,
        totalUsuarios: resumo.usuarios,
      },
      dadosStorage,
    };

    // Criptografar o payload completo do backup
    const dadosCriptografados = criptografarBackupPayload(JSON.stringify(rawPayload));

    return {
      app: 'ADMefisa',
      versao: '2.0.0',
      criptografado: true,
      backupId,
      dataExportacao: dataFormatada,
      ambienteOrigem: window.location.origin,
      resumo: rawPayload.resumo,
      dadosCriptografados,
    };
  },

  /**
   * Faz o download automático de um arquivo .json criptografado de uso único
   */
  baixarArquivoBackup(): void {
    const container = this.gerarBackup();
    const jsonStr = JSON.stringify(container, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const hoje = new Date();
    const dataArquivo = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
    link.href = url;
    link.download = `backup_admefisa_criptografado_${dataArquivo}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Copia o backup criptografado serializado diretamente para a área de transferência
   */
  async copiarBackupParaClipboard(): Promise<boolean> {
    const container = this.gerarBackup();
    const jsonStr = JSON.stringify(container);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonStr);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Restaura o backup criptografado para o localStorage e INUTILIZA o arquivo para reuso futuro
   */
  restaurarBackup(jsonStrOuObjeto: string | ClinicBackupContainer | ClinicBackupPayload): { sucesso: boolean; mensagem: string } {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { sucesso: false, mensagem: 'LocalStorage indisponível.' };
    }

    try {
      let containerInput: any;
      if (typeof jsonStrOuObjeto === 'string') {
        try {
          containerInput = JSON.parse(jsonStrOuObjeto);
        } catch {
          return {
            sucesso: false,
            mensagem: '⛔ ARQUIVO INVÁLIDO: Conteúdo do arquivo de backup corrompido ou formato incorreto.',
          };
        }
      } else {
        containerInput = jsonStrOuObjeto;
      }

      // Verificação 1: Garantir que é um backup com container da ADMefisa e criptografado
      if (!containerInput || typeof containerInput !== 'object') {
        return {
          sucesso: false,
          mensagem: '⛔ FORMATO NÃO RECONHECIDO: O arquivo de backup selecionado é inválido.',
        };
      }

      let backupId = containerInput.backupId;
      let payloadDescriptografado: ClinicBackupPayload | null = null;

      if (containerInput.app === 'ADMefisa' && containerInput.dadosCriptografados) {
        // Tentar descriptografar os dados exclusivos
        try {
          const rawJson = descriptografarBackupPayload(containerInput.dadosCriptografados);
          payloadDescriptografado = JSON.parse(rawJson);
          if (!backupId && payloadDescriptografado?.backupId) {
            backupId = payloadDescriptografado.backupId;
          }
        } catch (err: any) {
          return {
            sucesso: false,
            mensagem: err.message || '⛔ FALHA DE CRIPTOGRAFIA: Não foi possível descriptografar este arquivo de backup.',
          };
        }
      } else if (containerInput.dadosStorage) {
        // Backup antigo legado não criptografado - Bloquear conforme solicitado
        return {
          sucesso: false,
          mensagem: '⛔ ACESSO NEGADO: Arquivos de backup sem criptografia exclusiva não são aceitos por políticas de segurança do ADMefisa. Gere um novo backup no sistema.',
        };
      } else {
        return {
          sucesso: false,
          mensagem: '⛔ ARQUIVO NÃO AUTORIZADO: Este arquivo não pertence ao sistema ADMefisa ou não está criptografado.',
        };
      }

      if (!payloadDescriptografado || !payloadDescriptografado.dadosStorage) {
        return {
          sucesso: false,
          mensagem: '⛔ CONTEÚDO VAZIO: Nenhum dado de armazenamento foi encontrado dentro deste backup.',
        };
      }

      // Verificação 2: Regra do Uso Único (Inutilização do Backup)
      if (backupId) {
        const consumidos = this.obterBackupsConsumidos();
        if (consumidos.includes(backupId)) {
          return {
            sucesso: false,
            mensagem: `⛔ BACKUP INDISPONÍVEL / JÁ UTILIZADO: Este arquivo de backup em específico (ID: ${backupId}) já foi importado anteriormente e foi INUTILIZADO. Cada arquivo de backup possui uso único e descartável por motivos de segurança. Por favor, gere um novo backup no computador de origem.`,
          };
        }
      }

      // Aplicar restauração dos dados no localStorage
      const chaves = Object.keys(payloadDescriptografado.dadosStorage);
      if (chaves.length === 0) {
        return { sucesso: false, mensagem: 'O backup informado está vazio.' };
      }

      chaves.forEach((chave) => {
        const valor = payloadDescriptografado!.dadosStorage[chave];
        if (typeof valor === 'string') {
          localStorage.setItem(chave, valor);
        }
      });

      // Registrar o token de backup como CONSUMIDO/INUTILIZADO
      if (backupId) {
        this.registrarBackupConsumido(backupId);
      }

      return {
        sucesso: true,
        mensagem: `✅ RESTAURAÇÃO CONCLUÍDA: Backup criptografado importado com sucesso (${chaves.length} coleções de dados)! Este arquivo específico foi INUTILIZADO e não poderá ser reimportado.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { sucesso: false, mensagem: `Falha ao processar arquivo de backup: ${msg}` };
    }
  },
};
