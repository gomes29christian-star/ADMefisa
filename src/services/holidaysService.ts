/**
 * Serviço de Gerenciamento Configurável de Feriados — Clínica Mefisa
 * Distingue Feriados Nacionais, Estaduais (SP), Municipais (Ferraz de Vasconcelos)
 * e Datas Administrativas Internas da Clínica.
 *
 * Registra a regra/legislação determinante que estabeleceu a data como feriado.
 */

import { FeriadoConfig, TipoFeriado } from '../types/clinic';

const STORAGE_KEY_FERIADOS = 'mefisa_feriados_config_v1';

// Base oficial configurada para 2026 (expansível e editável pelo usuário/gestão)
const FERIADOS_INICIAIS: FeriadoConfig[] = [
  // Feriados Nacionais
  {
    id: 'fer-nac-01',
    data: '2026-01-01',
    nome: 'Confraternização Universal (Ano Novo)',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-02',
    data: '2026-04-21',
    nome: 'Tiradentes',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-03',
    data: '2026-05-01',
    nome: 'Dia Mundial do Trabalho',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-04',
    data: '2026-09-07',
    nome: 'Independência do Brasil',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-05',
    data: '2026-10-12',
    nome: 'Nossa Senhora Aparecida / Padroeira do Brasil',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 6.802/1980',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-06',
    data: '2026-11-02',
    nome: 'Finados',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-07',
    data: '2026-11-15',
    nome: 'Proclamação da República',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-08',
    data: '2026-11-20',
    nome: 'Dia Nacional de Zumbi e da Consciência Negra',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 14.759/2023',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-nac-09',
    data: '2026-12-25',
    nome: 'Natal',
    tipo: 'NACIONAL',
    regraDeterminante: 'Lei Federal nº 10.607/2002',
    bloqueiaAtendimento: true,
  },

  // Feriado Estadual - São Paulo
  {
    id: 'fer-est-01',
    data: '2026-07-09',
    nome: 'Revolução Constitucionalista de 1932',
    tipo: 'ESTADUAL_SP',
    regraDeterminante: 'Lei Estadual (SP) nº 9.497/1997',
    bloqueiaAtendimento: true,
  },

  // Feriados Municipais - Ferraz de Vasconcelos (SP)
  {
    id: 'fer-mun-01',
    data: '2026-10-14',
    nome: 'Emancipação Político-Administrativa de Ferraz de Vasconcelos',
    tipo: 'MUNICIPAL_FERRAZ',
    regraDeterminante: 'Lei Municipal de Ferraz de Vasconcelos nº 473/1967 e Calendário Oficial da PMFV',
    descricao: 'Aniversário da Cidade de Ferraz de Vasconcelos. Feriado municipal obrigatório para toda a rede de saúde e serviços locais.',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-mun-02',
    data: '2026-04-03',
    nome: 'Sexta-feira Santa / Paixão de Cristo',
    tipo: 'MUNICIPAL_FERRAZ',
    regraDeterminante: 'Lei Municipal de Ferraz de Vasconcelos / Tradição Religiosa Municipal',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-mun-03',
    data: '2026-06-04',
    nome: 'Corpus Christi',
    tipo: 'MUNICIPAL_FERRAZ',
    regraDeterminante: 'Decreto Municipal Anual de Ferraz de Vasconcelos',
    bloqueiaAtendimento: true,
  },

  // Datas Administrativas Internas - Clínica Mefisa
  {
    id: 'fer-adm-01',
    data: '2026-12-24',
    nome: 'Recesso Administrativo de Fim de Ano - Véspera de Natal',
    tipo: 'ADMINISTRATIVO_MEFISA',
    regraDeterminante: 'Portaria Interna da Diretoria Mefisa 2026/02',
    descricao: 'Suspensão dos atendimentos eletivos para manutenção técnica anual.',
    bloqueiaAtendimento: true,
  },
  {
    id: 'fer-adm-02',
    data: '2026-12-31',
    nome: 'Recesso Administrativo de Fim de Ano - Réveillon',
    tipo: 'ADMINISTRATIVO_MEFISA',
    regraDeterminante: 'Portaria Interna da Diretoria Mefisa 2026/02',
    bloqueiaAtendimento: true,
  },
];

// Helper seguro de parsing de datas YYYY-MM-DD
export function parseIsoDateLocal(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return new Date();
  }
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return new Date();
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > 2100) {
    return new Date();
  }
  const d = new Date(year, month, day, 12, 0, 0);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  return d;
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class HolidayService {
  private static memoriaFeriados: FeriadoConfig[] = [...FERIADOS_INICIAIS];

  /**
   * Obtém a lista completa e configurável de feriados
   */
  public static obterFeriados(): FeriadoConfig[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY_FERIADOS);
        if (salvo) {
          return JSON.parse(salvo);
        }
      } catch (e) {
        console.warn('Erro ao ler feriados do localStorage:', e);
      }
    }
    return [...this.memoriaFeriados];
  }

  /**
   * Salva a lista de feriados atualizada
   */
  public static salvarFeriados(feriados: FeriadoConfig[]): void {
    this.memoriaFeriados = feriados;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_FERIADOS, JSON.stringify(feriados));
      } catch (e) {
        console.warn('Erro ao persistir feriados no localStorage:', e);
      }
    }
  }

  /**
   * Adiciona um novo feriado à fonte configurável
   */
  public static adicionarFeriado(novo: Omit<FeriadoConfig, 'id'>): FeriadoConfig {
    const lista = this.obterFeriados();
    const feriadoCompleto: FeriadoConfig = {
      ...novo,
      id: `fer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    lista.push(feriadoCompleto);
    this.salvarFeriados(lista);
    return feriadoCompleto;
  }

  /**
   * Remove um feriado
   */
  public static removerFeriado(id: string): boolean {
    const lista = this.obterFeriados();
    const filtrada = lista.filter((f) => f.id !== id);
    if (filtrada.length !== lista.length) {
      this.salvarFeriados(filtrada);
      return true;
    }
    return false;
  }

  /**
   * Restaura os feriados padrão de Ferraz de Vasconcelos e Mefisa
   */
  public static restaurarPadrao(): FeriadoConfig[] {
    this.memoriaFeriados = [...FERIADOS_INICIAIS];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY_FERIADOS);
    }
    return [...FERIADOS_INICIAIS];
  }

  /**
   * Verifica se uma data YYYY-MM-DD é feriado aplicável
   */
  public static verificarFeriado(dataStr: string): FeriadoConfig | null {
    const lista = this.obterFeriados();
    const encontrado = lista.find((f) => f.data === dataStr && f.bloqueiaAtendimento);
    return encontrado || null;
  }

  public static obterFeriadoNaData(dataStr: string): FeriadoConfig | null {
    return this.verificarFeriado(dataStr);
  }

  /**
   * Verifica se a data fornecida (ou hoje) é véspera de um feriado
   * que cai em um dia útil (segunda a sexta, ou seja, NÃO cai em sábado nem domingo).
   */
  public static verificarVesperaFeriadoUtil(dataReferencia: Date = new Date()): {
    isVespera: boolean;
    feriado: FeriadoConfig | null;
    dataAmanhaIso: string;
  } {
    const amanha = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate() + 1, 12, 0, 0);
    const diaSemanaAmanha = amanha.getDay(); // 0 = Domingo, 6 = Sábado

    // Se amanhã for Sábado (6) ou Domingo (0), ignora (pois o feriado é no fim de semana)
    if (diaSemanaAmanha === 0 || diaSemanaAmanha === 6) {
      return { isVespera: false, feriado: null, dataAmanhaIso: formatIsoDate(amanha) };
    }

    const dataAmanhaIso = formatIsoDate(amanha);
    const mmddAmanha = dataAmanhaIso.substring(5); // MM-DD

    const feriados = this.obterFeriados();
    const feriadoEncontrado = feriados.find((f) => {
      if (!f.bloqueiaAtendimento) return false;
      return f.data === dataAmanhaIso || f.data.endsWith(mmddAmanha);
    });

    if (feriadoEncontrado) {
      return {
        isVespera: true,
        feriado: feriadoEncontrado,
        dataAmanhaIso,
      };
    }

    return { isVespera: false, feriado: null, dataAmanhaIso };
  }

  /**
   * Sugere o próximo dia útil não conflitante, considerando feriados e finais de semana
   */
  public static obterProximoDiaUtilSemFeriado(
    dataStr: string,
    excluirSabado: boolean = true
  ): {
    dataSugerida: string;
    diasDeslocados: number;
    justificativa: string;
  } {
    let curDate = parseIsoDateLocal(dataStr);
    let diasDeslocados = 0;

    // Procura o próximo dia que não seja domingo (0), não seja sábado (6 se excluirSabado) e não seja feriado
    for (let i = 1; i <= 15; i++) {
      curDate.setDate(curDate.getDate() + 1);
      diasDeslocados++;
      const diaSemana = curDate.getDay();
      const isoStr = formatIsoDate(curDate);

      // Domingo nunca atende
      if (diaSemana === 0) continue;
      // Sábado se excluir
      if (excluirSabado && diaSemana === 6) continue;

      // Verifica feriado
      const feriado = this.verificarFeriado(isoStr);
      if (!feriado) {
        return {
          dataSugerida: isoStr,
          diasDeslocados,
          justificativa: `Próximo dia operacional disponível após feriado (${diasDeslocados} dia(s) após a data original)`,
        };
      }
    }

    // Fallback de segurança
    const fallbackDate = parseIsoDateLocal(dataStr);
    fallbackDate.setDate(fallbackDate.getDate() + 1);
    return {
      dataSugerida: formatIsoDate(fallbackDate),
      diasDeslocados: 1,
      justificativa: 'Dia subsequente imediato',
    };
  }
}
