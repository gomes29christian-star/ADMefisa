import { Procedimento } from '../types/clinic';

export type CategoriaProcedimento = 'ABA_REGULAR' | 'AVALIACAO_ABA' | 'REAVALIACAO_ABA' | 'OUTROS';

export interface ProcedimentoCompleto extends Procedimento {
  preco: number;
  categoria: CategoriaProcedimento;
  permiteDigitacao: boolean; // false para Avaliações e Reavaliações
  permiteAutorizacao: boolean; // true para todos
  observacaoRegra?: string;
  cid?: string;
}

const STORAGE_KEY = 'mefisa_procedimentos_tuss_v1';

export const PROCEDIMENTOS_INICIAIS: ProcedimentoCompleto[] = [
  // 1. AS ABAS REGULARES (Custam R$ 91,40 - Permitidas em Digitação e Autorização)
  {
    id: 'proc-66600480',
    codigo: '66600480',
    descricao: 'Psicologia ABA',
    especialidade: 'Psicologia ABA',
    sessoesPorSemanaPadrao: 3,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'ABA_REGULAR',
    cid: 'F84.0',
    permiteDigitacao: true,
    permiteAutorizacao: true,
    observacaoRegra: 'Sessão regular terapêutica ABA. Permitida em autorizações e digitações de guias.',
  },
  {
    id: 'proc-66600499',
    codigo: '66600499',
    descricao: 'Fonoaudiologia ABA',
    especialidade: 'Fonoaudiologia ABA',
    sessoesPorSemanaPadrao: 2,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'ABA_REGULAR',
    cid: 'F84.0',
    permiteDigitacao: true,
    permiteAutorizacao: true,
    observacaoRegra: 'Sessão regular terapêutica ABA. Permitida em autorizações e digitações de guias.',
  },
  {
    id: 'proc-66600502',
    codigo: '66600502',
    descricao: 'TO Terapia Ocupacional ABA',
    especialidade: 'Terapia Ocupacional ABA',
    sessoesPorSemanaPadrao: 2,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'ABA_REGULAR',
    cid: 'F84.0',
    permiteDigitacao: true,
    permiteAutorizacao: true,
    observacaoRegra: 'Sessão regular terapêutica ABA. Permitida em autorizações e digitações de guias.',
  },
  {
    id: 'proc-66601070',
    codigo: '66601070',
    descricao: 'Musicoterapia ABA',
    especialidade: 'Musicoterapia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'ABA_REGULAR',
    cid: 'F84.0',
    permiteDigitacao: true,
    permiteAutorizacao: true,
    observacaoRegra: 'Sessão regular terapêutica ABA. Permitida em autorizações e digitações de guias.',
  },
  {
    id: 'proc-66601088',
    codigo: '66601088',
    descricao: 'Psicomotricidade ABA',
    especialidade: 'Psicomotricidade ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'ABA_REGULAR',
    cid: 'F84.0',
    permiteDigitacao: true,
    permiteAutorizacao: true,
    observacaoRegra: 'Sessão regular terapêutica ABA. Permitida em autorizações e digitações de guias.',
  },

  // 2. AS AVALIAÇÕES (NÃO PODEM SER COLOCADAS NAS DIGITAÇÕES; SOMENTE NA AUTORIZAÇÃO)
  {
    id: 'proc-66600510',
    codigo: '66600510',
    descricao: 'Avaliação Psicologia ABA',
    especialidade: 'Psicologia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'AVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de AVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66600529',
    codigo: '66600529',
    descricao: 'Avaliação Fonoaudiologia ABA',
    especialidade: 'Fonoaudiologia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'AVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de AVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66600537',
    codigo: '66600537',
    descricao: 'Avaliação TO Terapia Ocupacional ABA',
    especialidade: 'Terapia Ocupacional ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'AVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de AVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66601118',
    codigo: '66601118',
    descricao: 'Avaliação Musicoterapia ABA',
    especialidade: 'Musicoterapia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'AVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de AVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66601134',
    codigo: '66601134',
    descricao: 'Avaliação Psicomotricidade ABA',
    especialidade: 'Psicomotricidade ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'AVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de AVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },

  // 3. AS REAVALIAÇÕES (NÃO PODEM SER COLOCADAS NAS DIGITAÇÕES; SOMENTE NA AUTORIZAÇÃO)
  {
    id: 'proc-66600545',
    codigo: '66600545',
    descricao: 'Reavaliação Psicologia ABA',
    especialidade: 'Psicologia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'REAVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de REAVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66600553',
    codigo: '66600553',
    descricao: 'Reavaliação Fonoaudiologia ABA',
    especialidade: 'Fonoaudiologia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'REAVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de REAVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66600561',
    codigo: '66600561',
    descricao: 'Reavaliação TO Terapia Ocupacional ABA',
    especialidade: 'Terapia Ocupacional ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'REAVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de REAVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66601126',
    codigo: '66601126',
    descricao: 'Reavaliação Musicoterapia ABA',
    especialidade: 'Musicoterapia ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'REAVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de REAVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
  {
    id: 'proc-66601142',
    codigo: '66601142',
    descricao: 'Reavaliação Psicomotricidade ABA',
    especialidade: 'Psicomotricidade ABA',
    sessoesPorSemanaPadrao: 1,
    duracaoHoras: 1,
    preco: 91.4,
    categoria: 'REAVALIACAO_ABA',
    cid: 'F84.0',
    permiteDigitacao: false,
    permiteAutorizacao: true,
    observacaoRegra: 'Variante de REAVALIAÇÃO: Permitida SOMENTE no fluxo de Autorização prévia. Proibida inclusão em digitações operacionais.',
  },
];

export class ProcedimentosService {
  public static obterTodos(): ProcedimentoCompleto[] {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [...PROCEDIMENTOS_INICIAIS];
  }

  public static salvarTodos(procedimentos: ProcedimentoCompleto[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(procedimentos));
    } catch {
      // ignore
    }
  }

  public static atualizarProcedimento(
    idOuCodigo: string,
    campos: Partial<Pick<ProcedimentoCompleto, 'codigo' | 'preco' | 'descricao'>>
  ): ProcedimentoCompleto[] {
    const lista = this.obterTodos();
    const index = lista.findIndex((p) => p.id === idOuCodigo || p.codigo === idOuCodigo);
    if (index >= 0) {
      lista[index] = {
        ...lista[index],
        ...campos,
      };
      this.salvarTodos(lista);
    }
    return lista;
  }

  public static obterPermitidosParaDigitacao(): ProcedimentoCompleto[] {
    return this.obterTodos().filter((p) => p.permiteDigitacao);
  }

  public static obterPermitidosParaAutorizacao(): ProcedimentoCompleto[] {
    return this.obterTodos().filter((p) => p.permiteAutorizacao);
  }

  public static obterPorCodigo(codigo: string): ProcedimentoCompleto | undefined {
    return this.obterTodos().find((p) => p.codigo === codigo);
  }

  /**
   * REGRA DE NEGÓCIO DA MEFISA:
   * "Agora há suas variantes que NÃO PODEM SER COLOCADAS NAS DIGITAÇÕES; somente na autorização...
   * As AVALIAÇÕES (...) E as REAVALIAÇÕES..."
   */
  public static validarInclusaoEmDigitacao(codigoOuNome: string): {
    permitido: boolean;
    motivoBloqueio?: string;
    procedimento?: ProcedimentoCompleto;
  } {
    const todos = this.obterTodos();
    const encontrado = todos.find(
      (p) => p.codigo === codigoOuNome || p.descricao.toLowerCase() === codigoOuNome.toLowerCase()
    );

    if (!encontrado) {
      // Procedimento desconhecido ou customizado
      return { permitido: true };
    }

    if (!encontrado.permiteDigitacao) {
      const tipoRotulo = encontrado.categoria === 'AVALIACAO_ABA' ? 'AVALIAÇÃO' : 'REAVALIAÇÃO';
      return {
        permitido: false,
        procedimento: encontrado,
        motivoBloqueio: `REGRA CLÍNICA: O procedimento "${encontrado.descricao}" (cód. ${encontrado.codigo}) é uma ${tipoRotulo} e NÃO PODE ser inserido em Digitações operacionais. Deve ser processado exclusivamente na Autorização.`,
      };
    }

    return { permitido: true, procedimento: encontrado };
  }

  public static resetarPadroes(): ProcedimentoCompleto[] {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return [...PROCEDIMENTOS_INICIAIS];
  }
}
