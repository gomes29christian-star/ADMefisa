/**
 * Serviço de Backup, Restauração e Migração de Dados — Clínica Mefisa
 * Permite exportar todos os dados cadastrados em um ambiente (como o Studio)
 * e importá-los em outro ambiente (como o GitHub Pages ou outro computador).
 */

export interface ClinicBackupPayload {
  versao: string;
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
  dadosStorage: Record<string, string>;
}

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
  'mefisa_secret_achievements',
  'mefisa_secret_unlocked',
  'mefisa_theme',
  'mefisa_font_size',
  'mefisa_reduced_motion',
  'mefisa_high_contrast',
  'mefisa_letter_spacing',
  'mefisa_line_height',
  'mefisa_trusted_browser',
];

export const BackupSyncService = {
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
   * Coleta todos os dados do localStorage e gera o pacote de exportação
   */
  gerarBackup(): ClinicBackupPayload {
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

    return {
      versao: '2.0.0',
      dataExportacao: dataFormatada,
      ambienteOrigem: window.location.origin,
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
  },

  /**
   * Faz o download automático de um arquivo .json de backup
   */
  baixarArquivoBackup(): void {
    const payload = this.gerarBackup();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const hoje = new Date();
    const dataArquivo = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;
    link.href = url;
    link.download = `backup_clinica_mefisa_${dataArquivo}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Copia o backup serializado diretamente para a área de transferência
   */
  async copiarBackupParaClipboard(): Promise<boolean> {
    const payload = this.gerarBackup();
    const jsonStr = JSON.stringify(payload);
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
   * Restaura o backup para o localStorage do navegador atual
   */
  restaurarBackup(jsonStrOuObjeto: string | ClinicBackupPayload): { sucesso: boolean; mensagem: string } {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { sucesso: false, mensagem: 'LocalStorage indisponível.' };
    }

    try {
      let payload: ClinicBackupPayload;
      if (typeof jsonStrOuObjeto === 'string') {
        payload = JSON.parse(jsonStrOuObjeto);
      } else {
        payload = jsonStrOuObjeto;
      }

      if (!payload.dadosStorage || typeof payload.dadosStorage !== 'object') {
        return { sucesso: false, mensagem: 'Arquivo de backup inválido: dados não reconhecidos.' };
      }

      const chaves = Object.keys(payload.dadosStorage);
      if (chaves.length === 0) {
        return { sucesso: false, mensagem: 'O backup informado está vazio.' };
      }

      chaves.forEach((chave) => {
        const valor = payload.dadosStorage[chave];
        if (typeof valor === 'string') {
          localStorage.setItem(chave, valor);
        }
      });

      return {
        sucesso: true,
        mensagem: `Restauração concluída com sucesso! ${chaves.length} coleções de dados importadas.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { sucesso: false, mensagem: `Falha ao processar arquivo de backup: ${msg}` };
    }
  },
};
