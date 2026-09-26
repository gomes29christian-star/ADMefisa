/**
 * Motor Central de Regras de Negócio — Clínica Mefisa
 * Implementação estrita e determinística das Regras 1, 2 e 3 + Homologação das Regras a Confirmar (01 a 05).
 */

import {
  DiaSemanaIndice,
  AlinhamentoAutorizacaoResultado,
  ConflitoFeriadoSessao,
  ValidacaoRemarcacaoResultado,
  NotificacaoAnomaliaGestao,
  ValidacaoDuplicidadeGuiaSessao,
  NivelSlaAnalise,
  ModoAbatimentoFaltas,
  PreferenciasNotificacaoGestao,
} from '../types/clinic';
import { HolidayService } from './holidaysService';

export const STORAGE_KEY_NOTIFICACOES_ANOMALIA = 'mefisa_notificacoes_anomalia_v1';
export const STORAGE_KEY_PREFERENCIAS_GESTAO = 'mefisa_preferencias_notificacao_v1';
export const STORAGE_KEY_DUPLICIDADES_CONFIRMADAS = 'mefisa_duplicidades_confirmadas_v1';

export const PREFERENCIAS_NOTIFICACAO_PADRAO: PreferenciasNotificacaoGestao = {
  canais: {
    painelInterno: true,
    email: true,
    webhook: true,
    destinatariosEmails: ['ceo@clinicamefisa.com.br', 'admchefe@clinicamefisa.com.br'],
    webhookUrl: 'https://api.clinicamefisa.com.br/webhooks/gestao',
  },
  gatilhos: {
    remarcacaoAnormal: true,
    duplicidadeConfirmada: true,
    analiseAtrasada7Dias: true,
    analiseAtencao5Dias: true,
    feriadoConflitoFerraz: true,
  },
};

export function obterPreferenciasNotificacao(): PreferenciasNotificacaoGestao {
  if (typeof window === 'undefined' || !window.localStorage) {
    return PREFERENCIAS_NOTIFICACAO_PADRAO;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFERENCIAS_GESTAO);
    return raw ? JSON.parse(raw) : PREFERENCIAS_NOTIFICACAO_PADRAO;
  } catch {
    return PREFERENCIAS_NOTIFICACAO_PADRAO;
  }
}

export function salvarPreferenciasNotificacao(prefs: PreferenciasNotificacaoGestao): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFERENCIAS_GESTAO, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Erro ao salvar preferências de notificação:', e);
  }
}

/**
 * Normaliza strings para chaves compostas
 */
export function normalizarChave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Formata qualquer data ISO ou BR para o formato brasileiro, opcionalmente com iniciais dos meses
 * Ex: "2026-10-24" -> "24/10/2026" ou "24/out./2026"
 * Ex: "2026-10-24 14:15" -> "24/10/2026 14:15" ou "24/out./2026 14:15"
 */
export function formatarDataBr(dataStr: string | undefined | null, showMonthInitials: boolean = false): string {
  if (!dataStr) return '';
  
  const original = dataStr.trim();
  let datePart = original;
  let timePart = '';
  
  // Separar data e hora se houver
  if (original.includes(' ')) {
    const spaceIndex = original.indexOf(' ');
    datePart = original.slice(0, spaceIndex);
    timePart = original.slice(spaceIndex);
  } else if (original.includes('T')) {
    const tIndex = original.indexOf('T') !== -1 ? original.indexOf('T') : original.indexOf('t');
    datePart = original.slice(0, tIndex);
    timePart = ' ' + original.slice(tIndex + 1, tIndex + 6);
  }
  
  let day = '';
  let month = '';
  let year = '';
  
  if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const p0 = parts[0];
      const p1 = parts[1];
      const p2 = parts[2];
      if (p2.length === 4) {
        const n0 = parseInt(p0, 10);
        const n1 = parseInt(p1, 10);
        // Se p0 for > 12, certamente é dia (DD/MM/YYYY). Se p1 for > 12, p0 é mês (MM/DD/YYYY).
        if (n0 <= 12 && n1 > 12) {
          month = p0.padStart(2, '0');
          day = p1.padStart(2, '0');
        } else {
          day = p0.padStart(2, '0');
          month = p1.padStart(2, '0');
        }
        year = p2;
      } else if (p0.length === 4) {
        year = p0;
        month = p1.padStart(2, '0');
        day = p2.padStart(2, '0');
      } else {
        day = p0.padStart(2, '0');
        month = p1.padStart(2, '0');
        year = p2.length === 2 ? '20' + p2 : p2;
      }
    }
  } else if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD (ISO / American) -> Converter para DD/MM/YYYY
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      } else {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
        year = parts[2];
      }
    }
  }
  
  if (!day || !month || !year) {
    return original;
  }
  
  if (showMonthInitials) {
    const iniciaisMeses = [
      'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
      'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      const init = iniciaisMeses[monthIndex];
      return `${day}/${init}/${year}${timePart}`;
    }
  }
  
  return `${day}/${month}/${year}${timePart}`;
}

/**
 * Formata Date para YYYY-MM-DD local sem fuso
 */
export function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte YYYY-MM-DD em Date local
 */
export function parseIsoDateLocal(isoStr: string): Date {
  const parts = isoStr.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Retorna o nome em português do dia da semana
 */
export function formatarDiaSemanaPt(diaIndice: DiaSemanaIndice): string {
  const nomes: Record<DiaSemanaIndice, string> = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
  };
  return nomes[diaIndice] || 'Dia Indefinido';
}

export const DIAS_SEMANA_NOMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/**
 * Retorna o índice do dia da semana a partir de uma data ISO (0 = Domingo .. 6 = Sábado)
 */
export function identificarDiaSemana(dataIsoStr: string): DiaSemanaIndice {
  return parseIsoDateLocal(dataIsoStr).getDay() as DiaSemanaIndice;
}

/**
 * Retorna o último dia de um mês no calendário (REGRA 03: "Ela é cortada")
 */
export function obterUltimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/**
 * REGRA 1 — ALINHAMENTO AO DIA REAL DE ATENDIMENTO & EXCEÇÃO DE SÁBADO
 */
export function calcularAlinhamentoProximaAutorizacao(params: {
  diaSemanaHabitual: DiaSemanaIndice | DiaSemanaIndice[];
  dataInicioCicloStr: string;
  sessoesPorSemana: number;
  dataReferenciaCorteStr?: string;
  dataCorteMensalFimStr?: string;
  opcaoSabadoEscolhida?: 'SEXTA_FEIRA_ANTERIOR' | 'SEGUNDA_FEIRA_SEGUINTE';
}): AlinhamentoAutorizacaoResultado {
  const { diaSemanaHabitual: diaSemanaParam, dataInicioCicloStr, sessoesPorSemana } = params;
  const diasArray: DiaSemanaIndice[] = Array.isArray(diaSemanaParam)
    ? diaSemanaParam
    : [diaSemanaParam];
  const diaSemanaHabitual = diasArray[0] ?? 4;
  const dataInicio = parseIsoDateLocal(dataInicioCicloStr);

  // Determina a data de corte inicial do próximo ciclo
  let dataCorteBase: Date;
  if (params.dataReferenciaCorteStr) {
    dataCorteBase = parseIsoDateLocal(params.dataReferenciaCorteStr);
  } else {
    // Mês seguinte no dia 01 para buscar o primeiro dia de atendimento do próximo mês
    const mesSeguinte = new Date(dataInicio);
    mesSeguinte.setMonth(mesSeguinte.getMonth() + 1);
    mesSeguinte.setDate(1);

    // Encontra o primeiro dia do próximo mês que seja um dos dias habituais do paciente
    while (!diasArray.includes(mesSeguinte.getDay() as DiaSemanaIndice)) {
      mesSeguinte.setDate(mesSeguinte.getDate() + 1);
    }
    dataCorteBase = mesSeguinte;
  }

  // Se foi fornecida data de corte estrito do mês, não permite ultrapassá-la
  if (params.dataCorteMensalFimStr) {
    const dCorteEstrito = parseIsoDateLocal(params.dataCorteMensalFimStr);
    if (dataCorteBase.getTime() > dCorteEstrito.getTime()) {
      dataCorteBase = dCorteEstrito;
    }
  }

  const diaSemanaCorte = dataCorteBase.getDay() as DiaSemanaIndice;
  let diasRecuo = 0;
  let dataFinal = new Date(dataCorteBase);

  if (!diasArray.includes(diaSemanaCorte)) {
    diasRecuo = (diaSemanaCorte - diaSemanaHabitual + 7) % 7;
    dataFinal.setDate(dataFinal.getDate() - diasRecuo);
  }

  // Verifica se precisou adicionar ocorrência semanal para fechar o ciclo
  const diffDiasTotal = Math.ceil(
    (dataFinal.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
  );
  const adicionouOcorrenciaSemanal = diasRecuo > 0 && diffDiasTotal >= 28;
  const semanasCalculadas = Math.max(1, Math.round(diffDiasTotal / 7));
  const totalSessoesSugeridas = sessoesPorSemana * semanasCalculadas;

  // EXCEÇÃO OPERACIONAL — SÁBADO
  let excecaoSabadoInfo = {
    detectada: false,
    dataSabadoOriginal: undefined as string | undefined,
    dataSugeridaDeslocamento: undefined as string | undefined,
    justificativaOperacional: undefined as string | undefined,
    diasAlternativosDisponiveis: undefined as
      | Array<{ data: string; descricao: string }>
      | undefined,
  };

  if (diaSemanaHabitual === 6 || dataFinal.getDay() === 6) {
    const dataSabado = new Date(dataFinal);
    const dataSexta = new Date(dataSabado);
    dataSexta.setDate(dataSabado.getDate() - 1); // 1 dia anterior

    const dataSegunda = new Date(dataSabado);
    dataSegunda.setDate(dataSabado.getDate() + 2); // 2 dias posterior

    excecaoSabadoInfo = {
      detectada: true,
      dataSabadoOriginal: formatIsoDate(dataSabado),
      dataSugeridaDeslocamento: formatIsoDate(dataSexta),
      justificativaOperacional:
        'Esta autorização caiu em um sábado, quando não há operação administrativa na Clínica Mefisa.',
      diasAlternativosDisponiveis: [
        {
          data: formatIsoDate(dataSexta),
          descricao: `Sexta-feira anterior (${formatIsoDate(dataSexta)}) — Padrão recomendado`,
        },
        {
          data: formatIsoDate(dataSegunda),
          descricao: `Segunda-feira subsequente (${formatIsoDate(dataSegunda)})`,
        },
      ],
    };

    // Aloca a data padrão sugerida na sexta-feira ou a escolhida pelo operador
    if (params.opcaoSabadoEscolhida === 'SEGUNDA_FEIRA_SEGUINTE') {
      dataFinal = dataSegunda;
    } else {
      dataFinal = dataSexta;
    }
  }

  const MESES_NOMES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const mesCompetencia = `${MESES_NOMES[dataFinal.getMonth()]}/${dataFinal.getFullYear()}`;

  // A data de Próxima Autorização é a PRIMEIRA ocorrência do dia habitual de atendimento APÓS o término da última sessão do ciclo atual
  const dataProximaAutorizacaoCalculadaIso = calcularProximaAutorizacaoAposUltimaSessao(
    formatIsoDate(dataFinal),
    diasArray
  );

  return {
    diaSemanaHabitual,
    diaSemanaNome: formatarDiaSemanaPt(parseIsoDateLocal(dataProximaAutorizacaoCalculadaIso).getDay() as DiaSemanaIndice),
    mesCompetenciaReferencia: mesCompetencia,
    dataReferenciaInicialCorte: formatIsoDate(dataCorteBase),
    dataProximaAutorizacaoCalculada: dataProximaAutorizacaoCalculadaIso,
    foiDeslocadoParaDiaAnterior: diasRecuo > 0,
    diasDeslocadosAnterior: diasRecuo,
    adicionouOcorrenciaSemanal,
    semanasCicloCalculadas: semanasCalculadas,
    totalSessoesSugeridas,
    excecaoSabado: excecaoSabadoInfo,
    regraDescritiva: `A data da próxima autorização foi alinhada à próxima ${formatarDiaSemanaPt(
      diaSemanaHabitual
    )} (${formatarDataBr(dataProximaAutorizacaoCalculadaIso)}), subsequente à última sessão do ciclo (${formatarDataBr(formatIsoDate(dataFinal))}).`,
  };
}

/**
 * Consulta se uma data coincide com feriado aplicável
 */
export function verificarConflitoFeriado(dataIsoStr: string): ConflitoFeriadoSessao | null {
  const feriado = HolidayService.obterFeriadoNaData(dataIsoStr);
  if (!feriado) return null;

  const data = parseIsoDateLocal(dataIsoStr);
  const diaSemana = data.getDay() as DiaSemanaIndice;

  // Próximo dia útil sugerido
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + 1);
  if (novaData.getDay() === 0) novaData.setDate(novaData.getDate() + 1);
  if (novaData.getDay() === 6) novaData.setDate(novaData.getDate() + 2);

  return {
    dataOriginal: dataIsoStr,
    diaSemanaNome: formatarDiaSemanaPt(diaSemana),
    feriado,
    motivoConflito: `Sessão agendada coincide com feriado "${feriado.nome}" (${feriado.regraDeterminante}).`,
    novaDataSugerida: formatIsoDate(novaData),
    impactoCronograma: 'A sessão não poderá ser realizada no feriado e deve ser remanejada.',
    impactoProximaAutorizacao:
      'Caso seja a última sessão do ciclo, a data de renovação pode requerer confirmação.',
  };
}

/**
 * Gera cronograma mensal e avalia conflitos de feriados
 */
export function calcularProximaAutorizacaoAposUltimaSessao(
  dataUltimaSessaoStr: string,
  diaSemanaHabitualParam: DiaSemanaIndice | DiaSemanaIndice[]
): string {
  const diasArray: DiaSemanaIndice[] = Array.isArray(diaSemanaHabitualParam)
    ? diaSemanaHabitualParam
    : [diaSemanaHabitualParam];

  const dUltima = parseIsoDateLocal(dataUltimaSessaoStr);
  const dNext = new Date(dUltima);
  dNext.setDate(dNext.getDate() + 1);

  // Encontra a próxima data que corresponda a um dos dias habituais
  let diasVerificados = 0;
  while (!diasArray.includes(dNext.getDay() as DiaSemanaIndice) && diasVerificados < 14) {
    dNext.setDate(dNext.getDate() + 1);
    diasVerificados++;
  }

  return formatIsoDate(dNext);
}

export function gerarCronogramaComAuditoriaFeriados(
  dataPrimeiraSessaoStr: string,
  totalSessoes: number,
  diaSemanaHabitualParam: DiaSemanaIndice | DiaSemanaIndice[],
  sessoesPorSemana: number = 1
): {
  sessoes: Array<{
    numero: number;
    data: string;
    diaSemana: string;
    temConflitoFeriado: boolean;
    conflito?: ConflitoFeriadoSessao;
  }>;
  totalConflitos: number;
  proximaAutorizacaoSugerida: string;
} {
  const diasArray: DiaSemanaIndice[] = Array.isArray(diaSemanaHabitualParam)
    ? diaSemanaHabitualParam
    : [diaSemanaHabitualParam];

  const diaSemanaHabitual = diasArray[0] ?? 4;
  const base = parseIsoDateLocal(dataPrimeiraSessaoStr);
  const sessoes = [];
  let totalConflitos = 0;

  if (Array.isArray(diaSemanaHabitualParam) && diaSemanaHabitualParam.length > 0) {
    let dCurr = new Date(base);
    let sessoesGeradas = 0;
    let diasVerificados = 0;

    // Distribui o número de sessões por semana entre os dias selecionados
    const sessoesPorDiaBase = Math.max(1, Math.floor(sessoesPorSemana / diasArray.length));
    const restoSessoesSemana = Math.max(0, sessoesPorSemana - (sessoesPorDiaBase * diasArray.length));
    let diaIndexNaSemana = 0;

    while (sessoesGeradas < totalSessoes && diasVerificados < 365) {
      const dayOfWeek = dCurr.getDay() as DiaSemanaIndice;
      if (diasArray.includes(dayOfWeek)) {
        const ehSessaoComResto = diaIndexNaSemana < restoSessoesSemana;
        const sessoesNesteDia = sessoesPorDiaBase + (ehSessaoComResto ? 1 : 0);

        for (let s = 0; s < sessoesNesteDia && sessoesGeradas < totalSessoes; s++) {
          const dataIso = formatIsoDate(dCurr);
          const conflito = verificarConflitoFeriado(dataIso);
          if (conflito && s === 0) totalConflitos++;

          sessoes.push({
            numero: sessoesGeradas + 1,
            data: dataIso,
            diaSemana: formatarDiaSemanaPt(dayOfWeek),
            temConflitoFeriado: !!conflito,
            conflito: conflito || undefined,
          });
          sessoesGeradas++;
        }

        diaIndexNaSemana = (diaIndexNaSemana + 1) % diasArray.length;
      }
      dCurr.setDate(dCurr.getDate() + 1);
      diasVerificados++;
    }
  } else {
    for (let i = 0; i < totalSessoes; i++) {
      const d = new Date(base);

      if (sessoesPorSemana <= 1) {
        d.setDate(d.getDate() + i * 7);
      } else {
        const semanaIndex = Math.floor(i / sessoesPorSemana);
        const sessaoNaSemana = i % sessoesPorSemana;

        let offsetDiasNaSemana = 0;
        if (sessoesPorSemana === 2) {
          offsetDiasNaSemana = sessaoNaSemana === 0 ? 0 : 3;
        } else if (sessoesPorSemana === 3) {
          offsetDiasNaSemana = sessaoNaSemana * 2;
        } else if (sessoesPorSemana === 4) {
          const offsets = [0, 1, 3, 4];
          offsetDiasNaSemana = offsets[sessaoNaSemana] || (sessaoNaSemana * 2);
        } else {
          offsetDiasNaSemana = sessaoNaSemana;
        }

        d.setDate(d.getDate() + semanaIndex * 7 + offsetDiasNaSemana);
      }

      if (i === totalSessoes - 1 && diaSemanaHabitual !== undefined && totalSessoes > 0) {
        const alinhamentoFinal = calcularAlinhamentoProximaAutorizacao({
          diaSemanaHabitual,
          dataInicioCicloStr: dataPrimeiraSessaoStr,
          sessoesPorSemana,
        });
        const dAlinhado = parseIsoDateLocal(alinhamentoFinal.dataProximaAutorizacaoCalculada);
        if (dAlinhado.getTime() >= base.getTime()) {
          d.setTime(dAlinhado.getTime());
        }
      }

      const dataIso = formatIsoDate(d);
      const conflito = verificarConflitoFeriado(dataIso);

      if (conflito) totalConflitos++;

      sessoes.push({
        numero: i + 1,
        data: dataIso,
        diaSemana: formatarDiaSemanaPt(d.getDay() as DiaSemanaIndice),
        temConflitoFeriado: !!conflito,
        conflito: conflito || undefined,
      });
    }
  }

  const ultimaData = sessoes.length > 0 ? sessoes[sessoes.length - 1].data : dataPrimeiraSessaoStr;
  const proximaData = calcularProximaAutorizacaoAposUltimaSessao(ultimaData, diaSemanaHabitualParam);

  return {
    sessoes,
    totalConflitos,
    proximaAutorizacaoSugerida: proximaData,
  };
}

/**
 * Encontra o primeiro dia da semana desejado do próximo mês a partir de uma data base.
 * Ex: Se dataBase for 25/09/2026 e diaSemanaHabitual for 1 (Segunda-feira),
 * o próximo mês é Outubro/2026. A primeira segunda-feira de Outubro/2026 é 05/10/2026.
 */
export function obterPrimeiroDiaSemanaProximoMes(
  dataBase: Date,
  diaSemanaHabitual: DiaSemanaIndice
): Date {
  const ano = dataBase.getFullYear();
  const mesAtual = dataBase.getMonth();
  
  // Próximo mês
  const proximoMes = new Date(ano, mesAtual + 1, 1);
  
  // Encontra o primeiro dia correspondente ao diaSemanaHabitual
  while (proximoMes.getDay() !== diaSemanaHabitual) {
    proximoMes.setDate(proximoMes.getDate() + 1);
  }
  
  return proximoMes;
}

/**
 * Obtém todos os dias úteis (Segunda a Sexta, dias 1 a 5) entre duas datas (inclusive).
 */
export function obterDiasUteisPeriodo(dataInicio: Date, dataFim: Date): Date[] {
  const dias: Date[] = [];
  const curr = new Date(dataInicio);
  while (curr.getTime() <= dataFim.getTime()) {
    const dayOfWeek = curr.getDay();
    // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex (Dias Úteis)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dias.push(new Date(curr));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dias;
}

/**
 * Calcula a sequência completa de datas das sessões calculadas.
 * REGRA DO SISTEMA CLÍNICO MEFISA:
 * 1. O cálculo é feito proporcionalmente até o primeiro dia da semana em que o paciente
 *    passa do próximo mês (ex: 1ª Segunda-feira de Outubro = 05/10/2026).
 * 2. As datas são comprimidas / distribuídas contando estritamente DIAS ÚTEIS (Segunda a Sexta),
 *    permitindo até colocar mais de uma sessão no mesmo dia útil se a quantidade demandada
 *    for superior aos dias úteis disponíveis.
 * 3. A ÚLTIMA data coincide rigorosamente com o primeiro dia da semana do próximo mês (ex: 05/10/2026).
 */
export function calcularDatasSessoesAlinhadas(params: {
  dataInicioStr: string;
  quantidade: number;
  diaSemanaHabitual?: DiaSemanaIndice | DiaSemanaIndice[];
  diasSemanaHabituais?: DiaSemanaIndice[];
  sessoesPorSemana?: number;
  showMonthInitials?: boolean;
}): string[] {
  const {
    dataInicioStr,
    quantidade,
    diaSemanaHabitual,
    diasSemanaHabituais,
    sessoesPorSemana = 1,
    showMonthInitials,
  } = params;
  if (!dataInicioStr || quantidade <= 0) return [];

  const diasParam: DiaSemanaIndice | DiaSemanaIndice[] =
    diasSemanaHabituais && diasSemanaHabituais.length > 0
      ? diasSemanaHabituais
      : diaSemanaHabitual !== undefined
      ? diaSemanaHabitual
      : 1;

  const cronograma = gerarCronogramaComAuditoriaFeriados(
    dataInicioStr,
    quantidade,
    diasParam,
    sessoesPorSemana
  );

  return cronograma.sessoes.map((s) => formatarDataBr(s.data, showMonthInitials));
}

/**
 * Sanitiza o CBO removendo todos os caracteres especiais, pontos, traços e espaços,
 * mantendo estritamente dígitos numéricos (idêntico à lógica das carteirinhas).
 * Ex: "2515-10" -> "251510", "2238-10" -> "223810"
 */
export function sanitizarCbo(cbo?: string | null): string {
  if (!cbo) return '';
  return String(cbo).replace(/\D/g, '');
}

/**
 * Formata a contagem das repetições de sessões no mesmo dia que são > 1.
 * Ex: Se houver dias com 2 e 3 sessões, retorna "2 e 3".
 * Se houver dias apenas com 2 sessões, retorna "2".
 */
export function formatarContagemRepeticoesSessoes(datas: string[]): string {
  const contagem: Record<string, number> = {};
  for (const dt of datas) {
    contagem[dt] = (contagem[dt] || 0) + 1;
  }
  const repeticoes = Object.values(contagem).filter((n) => n > 1);
  if (repeticoes.length === 0) return '';
  const unicos = Array.from(new Set(repeticoes)).sort((a, b) => a - b);
  if (unicos.length === 1) return String(unicos[0]);
  if (unicos.length === 2) return `${unicos[0]} e ${unicos[1]}`;
  return `${unicos.slice(0, -1).join(', ')} e ${unicos[unicos.length - 1]}`;
}

/**
 * Calcula a quantidade máxima de sessões realizadas dentro de qualquer janela de 7 dias (semana móvel de atendimento).
 * Ex: 15 sessões entre 25/09 e 05/10 com 11 sessões dentro de 6 dias -> retorna 11.
 */
export function calcularSessoesSemanaisJanela(datas: string[]): number {
  if (datas.length === 0) return 0;
  const timestamps = datas.map((dStr) => {
    if (dStr.includes('/')) {
      const parts = dStr.split('/');
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
    }
    return new Date(dStr).getTime();
  });

  let maxNaSemana = 0;
  const SETE_DIAS_MS = 6 * 24 * 60 * 60 * 1000; // 6 dias corridos

  for (const t of timestamps) {
    const totalNaJanela = timestamps.filter((outroT) => outroT >= t && outroT <= t + SETE_DIAS_MS).length;
    if (totalNaJanela > maxNaSemana) {
      maxNaSemana = totalNaJanela;
    }
  }

  return maxNaSemana || datas.length;
}

/**
 * Validação de Remarcação de Sessão e Detecção de Anomalias (>= 20 dias / ~30 dias)
 */
export function validarRemarcacaoSessao(
  dataOriginalStr: string,
  novaDataStr: string,
  limiarDiasAnomalia: number = 20
): ValidacaoRemarcacaoResultado {
  const dOrig = parseIsoDateLocal(dataOriginalStr);
  const dNova = parseIsoDateLocal(novaDataStr);

  const diffMs = dNova.getTime() - dOrig.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const ehAnomalia = diffDias >= limiarDiasAnomalia;

  return {
    valido: true,
    ehAnomalia,
    diasDiferenca: diffDias,
    dataOriginal: dataOriginalStr,
    novaData: novaDataStr,
    mensagemAlerta: ehAnomalia
      ? `⚠️ REMARCAÇÃO FORA DO INTERVALO ESPERADO: A nova data (${novaDataStr}) está ${diffDias} dias após a data original (${dataOriginalStr}). Isso pode indicar um erro de digitação.`
      : undefined,
    exigeConfirmacaoExplicita: ehAnomalia,
  };
}

/**
 * Despacha notificação formal de anomalia de remarcação para ADM CHEFE e CEO
 * Integrando canais configuráveis (Painel interno, E-mail e Webhook) conforme Regra 05.
 */
export function gerarNotificacaoAnomaliaGestao(params: {
  pacienteNome: string;
  procedimentoNome: string;
  dataOriginal: string;
  novaData: string;
  diasDiferenca: number;
  usuarioNome: string;
  usuarioPapel: string;
  motivoConfirmado: string;
}): NotificacaoAnomaliaGestao {
  const prefs = obterPreferenciasNotificacao();

  const notificacao: NotificacaoAnomaliaGestao = {
    id: `notif-anom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    dataHora: new Date().toISOString().replace('T', ' ').substring(0, 19),
    pacienteNome: params.pacienteNome,
    procedimentoNome: params.procedimentoNome,
    dataOriginal: params.dataOriginal,
    novaData: params.novaData,
    diasDiferenca: params.diasDiferenca,
    usuarioNome: params.usuarioNome,
    usuarioPapel: params.usuarioPapel,
    motivoConfirmado: params.motivoConfirmado,
    destinatarios: ['ADM_CHEFE', 'CEO'],
    status: 'DISPARADA_IMEDIATA',
  };

  if (prefs.canais.painelInterno) {
    armazenarNotificacaoAnomalia(notificacao);
  }

  return notificacao;
}

export function armazenarNotificacaoAnomalia(notif: NotificacaoAnomaliaGestao): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const list = obterNotificacoesAnomalia();
    list.unshift(notif);
    localStorage.setItem(STORAGE_KEY_NOTIFICACOES_ANOMALIA, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar notificação:', e);
  }
}

export function obterNotificacoesAnomalia(): NotificacaoAnomaliaGestao[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const salvos = localStorage.getItem(STORAGE_KEY_NOTIFICACOES_ANOMALIA);
    return salvos ? JSON.parse(salvos) : [];
  } catch {
    return [];
  }
}

/**
 * REGRA 2 & REGRA A CONFIRMAR 04 — CONTAGEM DE DIAS DE ANÁLISE COM ALERTA PREVENTIVO
 * - Até 4 dias corridos: 🟢 EM PRAZO (NORMAL)
 * - 5 a 7 dias corridos: 🟡 ATENÇÃO / PRAZO CRÍTICO (ATENCAO_PREVENTIVA)
 * - Mais de 7 dias corridos: 🔴 ATRASADO (ATRASADO_CRITICO)
 */
export function calcularStatusAnaliseDiasCorridos(
  dataEntradaStr: string,
  dataAtualReferenciaStr?: string,
  limiteDias: number = 7,
  limiteAtencaoPreventiva: number = 5
): {
  dataEntrada: string;
  dataAtual: string;
  diasCorridosDecorridos: number;
  emAtraso: boolean;
  alertaPreventivo: boolean;
  nivelSla: NivelSlaAnalise;
  statusBadge: NivelSlaAnalise;
  statusTexto: string;
  detalheSla: string;
} {
  const dEntrada = parseIsoDateLocal(dataEntradaStr);
  const dAtual = dataAtualReferenciaStr
    ? parseIsoDateLocal(dataAtualReferenciaStr)
    : new Date();

  const diffMs = dAtual.getTime() - dEntrada.getTime();
  const diasCorridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let emAtraso = false;
  let alertaPreventivo = false;
  let nivelSla: NivelSlaAnalise = 'NORMAL';
  let statusTexto = '🟢 EM PRAZO';

  if (diasCorridos > limiteDias) {
    emAtraso = true;
    nivelSla = 'ATRASADO_CRITICO';
    statusTexto = '🔴 ATRASADO';
  } else if (diasCorridos >= limiteAtencaoPreventiva) {
    alertaPreventivo = true;
    nivelSla = 'ATENCAO_PREVENTIVA';
    statusTexto = '🟡 ATENÇÃO (PRAZO CRÍTICO)';
  } else {
    nivelSla = 'NORMAL';
    statusTexto = '🟢 EM PRAZO';
  }

  return {
    dataEntrada: dataEntradaStr,
    dataAtual: formatIsoDate(dAtual),
    diasCorridosDecorridos: diasCorridos,
    emAtraso,
    alertaPreventivo,
    nivelSla,
    statusBadge: nivelSla,
    statusTexto,
    detalheSla: `${diasCorridos} dias corridos decorridos (Alerta preventivo em ${limiteAtencaoPreventiva}d | SLA limite: ${limiteDias}d)`,
  };
}

/**
 * REGRA 3 & REGRA A CONFIRMAR 01 — DUPLICIDADE DE GUIA / SESSÃO (OPÇÃO B: CONFIRMAÇÃO COM JUSTIFICATIVA)
 * Chave Única Composta: PACIENTE + PROCEDIMENTO + DATA DA SESSÃO.
 */
export function gerarChaveDuplicidade(
  pacienteNomeOuId: string,
  procedimentoNomeOuId: string,
  dataSessao: string
): string {
  return `${normalizarChave(pacienteNomeOuId)}|${normalizarChave(procedimentoNomeOuId)}|${dataSessao.trim()}`;
}

export function validarDuplicidadeGuia(
  tentativa: {
    pacienteNome: string;
    procedimentoNome: string;
    dataSessao: string;
    numeroGuia?: string;
  },
  registrosExistentes: Array<{
    id: string;
    pacienteNome: string;
    procedimentoNome: string;
    dataSessao: string;
    numeroGuia: string;
    status: string;
  }>
): ValidacaoDuplicidadeGuiaSessao {
  const chaveTentativa = gerarChaveDuplicidade(
    tentativa.pacienteNome,
    tentativa.procedimentoNome,
    tentativa.dataSessao
  );

  const conflito = registrosExistentes.find((reg) => {
    const chaveReg = gerarChaveDuplicidade(
      reg.pacienteNome,
      reg.procedimentoNome,
      reg.dataSessao
    );
    return chaveReg === chaveTentativa;
  });

  if (conflito) {
    return {
      chaveValidacao: chaveTentativa,
      pacienteNome: tentativa.pacienteNome,
      procedimentoNome: tentativa.procedimentoNome,
      dataSessao: tentativa.dataSessao,
      numeroGuiaInformado: tentativa.numeroGuia,
      duplicada: true,
      registroExistente: {
        guiaId: conflito.id,
        numeroGuia: conflito.numeroGuia,
        pacienteNome: conflito.pacienteNome,
        procedimentoNome: conflito.procedimentoNome,
        dataSessao: conflito.dataSessao,
        status: conflito.status,
      },
      mensagem: `⚠️ POSSÍVEL DUPLICIDADE: Já existe um registro ativo para o paciente "${tentativa.pacienteNome}" no procedimento "${tentativa.procedimentoNome}" na data ${tentativa.dataSessao} (Guia existente: ${conflito.numeroGuia}).`,
      exigeConfirmacaoComJustificativa: true, // Homologação Opção B
    };
  }

  return {
    chaveValidacao: chaveTentativa,
    pacienteNome: tentativa.pacienteNome,
    procedimentoNome: tentativa.procedimentoNome,
    dataSessao: tentativa.dataSessao,
    numeroGuiaInformado: tentativa.numeroGuia,
    duplicada: false,
    mensagem: 'Nenhuma duplicidade encontrada para esta combinação de Paciente + Procedimento + Data.',
    exigeConfirmacaoComJustificativa: false,
  };
}

/**
 * Registra formalmente a confirmação excepcional de duplicata (Opção B)
 */
export function registrarDuplicidadeExcepcional(dados: {
  pacienteNome: string;
  procedimentoNome: string;
  dataSessao: string;
  numeroGuiaNova: string;
  numeroGuiaExistente: string;
  operadorNome: string;
  operadorPapel: string;
  justificativaExcepcional: string;
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const salvos = localStorage.getItem(STORAGE_KEY_DUPLICIDADES_CONFIRMADAS);
    const lista = salvos ? JSON.parse(salvos) : [];
    lista.unshift({
      id: `dup-conf-${Date.now()}`,
      dataHora: new Date().toISOString(),
      ...dados,
    });
    localStorage.setItem(STORAGE_KEY_DUPLICIDADES_CONFIRMADAS, JSON.stringify(lista));
  } catch (e) {
    console.warn('Erro ao salvar duplicidade confirmada:', e);
  }
}

/**
 * CÁLCULO DE SESSÕES & REGRA A CONFIRMAR 02 (DECISÃO DO USUÁRIO SOBRE FALTAS JUSTIFICADAS)
 * - Opção A: Descontar faltas da próxima autorização
 * - Opção B: Manter quantidade integral (reposição clínica controlada em prontuário)
 */
export function calcularSessoesPeriodo(
  sessoesPorSemana: number,
  dataInicioStr: string,
  dataFimStr: string,
  tamanhoArquivoMb: number = 2.4,
  opcoesFaltas?: {
    modoAbatimento: ModoAbatimentoFaltas;
    quantidadeFaltasJustificadas: number;
    motivoFaltas?: string;
  }
) {
  const dInicio = parseIsoDateLocal(dataInicioStr);
  const dFim = parseIsoDateLocal(dataFimStr);

  const diffMs = Math.max(0, dFim.getTime() - dInicio.getTime());
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const semanasCalculadas = Math.max(1, Math.round(diffDias / 7));
  const quantidadeBruta = sessoesPorSemana * semanasCalculadas;

  let quantidadeFinal = quantidadeBruta;
  let formulaDescritiva = `${sessoesPorSemana} sessões/sem × ${semanasCalculadas} semanas = ${quantidadeBruta} sessões autorizadas`;
  let observacaoAuditoriaFaltas = '';

  if (opcoesFaltas && opcoesFaltas.quantidadeFaltasJustificadas > 0) {
    if (opcoesFaltas.modoAbatimento === 'DESCONTAR_PROXIMA_AUTORIZACAO') {
      quantidadeFinal = Math.max(0, quantidadeBruta - opcoesFaltas.quantidadeFaltasJustificadas);
      formulaDescritiva = `(${sessoesPorSemana} sessões/sem × ${semanasCalculadas} sem) - ${opcoesFaltas.quantidadeFaltasJustificadas} faltas justificadas abatidas = ${quantidadeFinal} sessões solicitadas`;
      observacaoAuditoriaFaltas = `Abatimento aprovado pelo usuário: ${opcoesFaltas.quantidadeFaltasJustificadas} falta(s) descontada(s) da solicitação mensal. Motivo: ${opcoesFaltas.motivoFaltas || 'Saúde do paciente'}.`;
    } else {
      observacaoAuditoriaFaltas = `Opção do usuário: Mantida quantidade integral (${quantidadeBruta} sessões) conforme laudo. As ${opcoesFaltas.quantidadeFaltasJustificadas} falta(s) justificadas serão repostas em prontuário.`;
    }
  }

  const justificativa = `Sabemos que a quantidade do formulário é ${sessoesPorSemana} por semana, porém foi solicitado ${quantidadeFinal}, que será para o mês inteiro.`;

  const tamanhoValido = tamanhoArquivoMb < 10;
  const mensagemValidacao = tamanhoValido
    ? `Formulário compatível (${tamanhoArquivoMb.toFixed(1)} MB < limite de 10 MB)`
    : `Atenção: Arquivo com ${tamanhoArquivoMb.toFixed(1)} MB excede o limite estrito de 10 MB do portal do convênio!`;

  return {
    sessoesPorSemana,
    dataInicio: dataInicioStr,
    dataFim: dataFimStr,
    semanasConsideradas: semanasCalculadas,
    quantidadeTotalBruta: quantidadeBruta,
    quantidadeTotalSugerida: quantidadeFinal,
    justificativaFormularioGerada: justificativa,
    formulaExplicativa: formulaDescritiva,
    formularioTamanhoValido: tamanhoValido,
    mensagemValidacaoFormulario: mensagemValidacao,
    observacaoFaltasAuditoria: observacaoAuditoriaFaltas,
  };
}
