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
 * Converte YYYY-MM-DD em Date local com proteção robusta contra datas inválidas/incompletas
 */
export function parseIsoDateLocal(isoStr: string): Date {
  if (!isoStr || typeof isoStr !== 'string' || !isoStr.trim()) {
    return new Date();
  }
  const parts = isoStr.trim().split('-');
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

export const MAPA_DIAS_CANONICOS: Record<string, string> = {
  seg: 'Segunda-feira',
  segunda: 'Segunda-feira',
  'segunda-feira': 'Segunda-feira',
  ter: 'Terça-feira',
  terca: 'Terça-feira',
  terça: 'Terça-feira',
  'terca-feira': 'Terça-feira',
  'terça-feira': 'Terça-feira',
  qua: 'Quarta-feira',
  quarta: 'Quarta-feira',
  'quarta-feira': 'Quarta-feira',
  qui: 'Quinta-feira',
  quinta: 'Quinta-feira',
  'quinta-feira': 'Quinta-feira',
  sex: 'Sexta-feira',
  sexta: 'Sexta-feira',
  'sexta-feira': 'Sexta-feira',
  sab: 'Sábado',
  sabado: 'Sábado',
  sábado: 'Sábado',
  dom: 'Domingo',
  domingo: 'Domingo',
};

export function normalizarDiaSemana(dia: string): string {
  if (!dia) return '';
  const limpo = dia
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .trim();

  return MAPA_DIAS_CANONICOS[limpo] || dia.trim();
}

export function normalizarEDeduplicarDiasSemana(diasStrOuArray?: string | string[]): {
  diasArray: string[];
  diaStr: string;
} {
  if (!diasStrOuArray) return { diasArray: [], diaStr: '' };

  let listaBruta: string[] = [];
  if (Array.isArray(diasStrOuArray)) {
    listaBruta = diasStrOuArray;
  } else if (typeof diasStrOuArray === 'string') {
    listaBruta = diasStrOuArray.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  }

  const canonicosUnicos = new Set<string>();
  listaBruta.forEach((d) => {
    const canonico = normalizarDiaSemana(d);
    if (canonico) canonicosUnicos.add(canonico);
  });

  const ordenados = Array.from(canonicosUnicos);
  return {
    diasArray: ordenados,
    diaStr: ordenados.join(', '),
  };
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
 * Conta o número exato de ocorrências dos dias da semana em que o paciente atende
 * dentro do mês civil (calendário real).
 * Exemplo: Em Setembro/2026, existem 5 terças-feiras (dias 01, 08, 15, 22 e 29).
 */
export function contarOcorrenciasDiasNoMes(
  ano: number,
  mes: number,
  diasDaSemana?: string[] | DiaSemanaIndice[] | string,
  sessoesPorSemana: number = 1
): { totalSessoes: number; totalSemanas: number; detalheDias: string } {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const indicesAlvo = new Set<number>();

  if (diasDaSemana) {
    const listaBruta = Array.isArray(diasDaSemana)
      ? diasDaSemana
      : typeof diasDaSemana === 'string'
      ? diasDaSemana.split(/[,;\s]+/)
      : [diasDaSemana];

    listaBruta.forEach((d) => {
      if (typeof d === 'number') {
        indicesAlvo.add(d);
      } else if (typeof d === 'string') {
        const norm = d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (norm.includes('dom')) indicesAlvo.add(0);
        else if (norm.includes('seg')) indicesAlvo.add(1);
        else if (norm.includes('ter')) indicesAlvo.add(2);
        else if (norm.includes('qua')) indicesAlvo.add(3);
        else if (norm.includes('qui')) indicesAlvo.add(4);
        else if (norm.includes('sex')) indicesAlvo.add(5);
        else if (norm.includes('sab') || norm.includes('sáb')) indicesAlvo.add(6);
      }
    });
  }

  if (indicesAlvo.size === 0) {
    indicesAlvo.add(2); // Terça-feira
  }

  let ocorrenciasTotal = 0;
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const d = new Date(ano, mes, dia);
    if (indicesAlvo.has(d.getDay())) {
      ocorrenciasTotal++;
    }
  }

  const numDiasHabituais = Math.max(1, indicesAlvo.size);
  const sessoesPorDia = Math.max(1, sessoesPorSemana / numDiasHabituais);
  const totalSessoes = Math.max(1, Math.round(ocorrenciasTotal * sessoesPorDia));
  const totalSemanas = Math.max(1, Math.round(ocorrenciasTotal / numDiasHabituais));

  return {
    totalSessoes,
    totalSemanas,
    detalheDias: `${totalSessoes} ocorrências no mês`,
  };
}

export function contarOcorrenciasDiasRestantesNoMes(
  dataInicioStr: string,
  diasDaSemana?: string[] | DiaSemanaIndice[] | string,
  sessoesPorSemana: number = 1
): { totalSessoes: number; totalSemanas: number } {
  let dInicio: Date;
  try {
    if (dataInicioStr.includes('/')) {
      const [dia, mes, ano] = dataInicioStr.split('/').map(Number);
      dInicio = new Date(ano, mes - 1, dia);
    } else {
      const parts = dataInicioStr.split('-');
      dInicio = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  } catch {
    dInicio = new Date();
  }

  const ano = dInicio.getFullYear();
  const mes = dInicio.getMonth();
  const diaInicio = dInicio.getDate();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const indicesAlvo = new Set<number>();
  if (diasDaSemana) {
    const listaBruta = Array.isArray(diasDaSemana)
      ? diasDaSemana
      : typeof diasDaSemana === 'string'
      ? diasDaSemana.split(/[,;\s]+/)
      : [diasDaSemana];

    listaBruta.forEach((d) => {
      if (typeof d === 'number') {
        indicesAlvo.add(d);
      } else if (typeof d === 'string') {
        const norm = d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (norm.includes('dom')) indicesAlvo.add(0);
        else if (norm.includes('seg')) indicesAlvo.add(1);
        else if (norm.includes('ter')) indicesAlvo.add(2);
        else if (norm.includes('qua')) indicesAlvo.add(3);
        else if (norm.includes('qui')) indicesAlvo.add(4);
        else if (norm.includes('sex')) indicesAlvo.add(5);
        else if (norm.includes('sab') || norm.includes('sáb')) indicesAlvo.add(6);
      }
    });
  }

  if (indicesAlvo.size === 0) {
    indicesAlvo.add(2);
  }

  let ocorrenciasTotal = 0;
  for (let dia = diaInicio; dia <= ultimoDia; dia++) {
    const d = new Date(ano, mes, dia);
    if (indicesAlvo.has(d.getDay())) {
      ocorrenciasTotal++;
    }
  }

  const numDiasHabituais = Math.max(1, indicesAlvo.size);
  const sessoesPorDia = Math.max(1, sessoesPorSemana / numDiasHabituais);
  const totalSessoes = Math.max(1, Math.round(ocorrenciasTotal * sessoesPorDia));
  const totalSemanas = Math.max(1, Math.round(ocorrenciasTotal / numDiasHabituais));

  return {
    totalSessoes,
    totalSemanas,
  };
}

/**
 * REGRA 1 — ALINHAMENTO AO DIA REAL DE ATENDIMENTO & EXCEÇÃO DE SÁBADO
 */
export function calcularAlinhamentoProximaAutorizacao(params: {
  diaSemanaHabitual: DiaSemanaIndice | DiaSemanaIndice[];
  dataInicioCicloStr: string;
  sessoesPorSemana: number;
  quantidadeTotalSessoes?: number;
  datasSessoes?: string[];
  dataReferenciaCorteStr?: string;
  dataCorteMensalFimStr?: string;
  opcaoSabadoEscolhida?: 'SEXTA_FEIRA_ANTERIOR' | 'SEGUNDA_FEIRA_SEGUINTE';
}): AlinhamentoAutorizacaoResultado {
  const {
    diaSemanaHabitual: diaSemanaParam,
    dataInicioCicloStr,
    sessoesPorSemana,
    quantidadeTotalSessoes,
    datasSessoes,
  } = params;

  const diasArray: DiaSemanaIndice[] = Array.isArray(diaSemanaParam)
    ? diaSemanaParam
    : [diaSemanaParam];
  const diaSemanaHabitual = diasArray[0] ?? 2;

  let dataFinal: Date;

  if (datasSessoes && datasSessoes.length > 0) {
    const ultimaDataBr = datasSessoes[datasSessoes.length - 1];
    let dUltima: Date;
    if (ultimaDataBr.includes('/')) {
      const [dia, mes, ano] = ultimaDataBr.split('/').map(Number);
      dUltima = new Date(ano, mes - 1, dia);
    } else {
      dUltima = parseIsoDateLocal(ultimaDataBr);
    }
    // A próxima autorização inicia 7 dias após a última sessão do ciclo
    dUltima.setDate(dUltima.getDate() + 7);
    dataFinal = dUltima;
  } else if (quantidadeTotalSessoes && quantidadeTotalSessoes > 0) {
    const sessoesCalc = calcularDatasSessoesAlinhadas({
      dataInicioStr: dataInicioCicloStr,
      quantidade: quantidadeTotalSessoes,
      sessoesPorSemana,
      diasSemanaHabituais: diasArray,
    });
    if (sessoesCalc && sessoesCalc.length > 0) {
      const [dia, mes, ano] = sessoesCalc[sessoesCalc.length - 1].split('/').map(Number);
      const dUltima = new Date(ano, mes - 1, dia);
      dUltima.setDate(dUltima.getDate() + 7);
      dataFinal = dUltima;
    } else {
      const mesSeguinte = parseIsoDateLocal(dataInicioCicloStr);
      mesSeguinte.setMonth(mesSeguinte.getMonth() + 1);
      mesSeguinte.setDate(1);
      let safetyCount1 = 0;
      const targetDias1 = diasArray.length > 0 ? diasArray : [1 as DiaSemanaIndice];
      while (!targetDias1.includes(mesSeguinte.getDay() as DiaSemanaIndice) && safetyCount1++ < 31) {
        mesSeguinte.setDate(mesSeguinte.getDate() + 1);
      }
      dataFinal = mesSeguinte;
    }
  } else {
    const mesSeguinte = parseIsoDateLocal(dataInicioCicloStr);
    mesSeguinte.setMonth(mesSeguinte.getMonth() + 1);
    mesSeguinte.setDate(1);
    let safetyCount2 = 0;
    const targetDias2 = diasArray.length > 0 ? diasArray : [1 as DiaSemanaIndice];
    while (!targetDias2.includes(mesSeguinte.getDay() as DiaSemanaIndice) && safetyCount2++ < 31) {
      mesSeguinte.setDate(mesSeguinte.getDate() + 1);
    }
    dataFinal = mesSeguinte;
  }

  const diaSemanaCorte = dataFinal.getDay() as DiaSemanaIndice;
  let diasRecuo = 0;

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
    dataSexta.setDate(dataSabado.getDate() - 1);

    const dataSegunda = new Date(dataSabado);
    dataSegunda.setDate(dataSabado.getDate() + 2);

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
  const dataProximaAutorizacaoCalculadaIso = formatIsoDate(dataFinal);

  return {
    diaSemanaHabitual,
    diaSemanaNome: formatarDiaSemanaPt(parseIsoDateLocal(dataProximaAutorizacaoCalculadaIso).getDay() as DiaSemanaIndice),
    mesCompetenciaReferencia: mesCompetencia,
    dataReferenciaInicialCorte: formatIsoDate(dataFinal),
    dataProximaAutorizacaoCalculada: dataProximaAutorizacaoCalculadaIso,
    foiDeslocadoParaDiaAnterior: diasRecuo > 0,
    diasDeslocadosAnterior: diasRecuo,
    adicionouOcorrenciaSemanal: false,
    semanasCicloCalculadas: 4,
    totalSessoesSugeridas: sessoesPorSemana * 4,
    excecaoSabado: excecaoSabadoInfo,
    regraDescritiva: `A data da próxima autorização foi alinhada ao início do próximo ciclo (${formatarDataBr(dataProximaAutorizacaoCalculadaIso)}).`,
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
  diaSemanaHabitualParam: DiaSemanaIndice | DiaSemanaIndice[],
  dataInicioStr?: string,
  sessoesPorSemana: number = 1
): string {
  const diasArray: DiaSemanaIndice[] = Array.isArray(diaSemanaHabitualParam)
    ? diaSemanaHabitualParam
    : [diaSemanaHabitualParam];

  // Se for ciclo semanal de múltiplas sessões (ex: 3 sessões/semana) a partir de uma data de autorização inicial
  if (sessoesPorSemana > 1 && dataInicioStr) {
    let dNextCycle = parseIsoDateLocal(dataInicioStr);
    dNextCycle.setDate(dNextCycle.getDate() + 7);

    // Ajusta apenas se cair em domingo
    if (dNextCycle.getDay() === 0) {
      dNextCycle.setDate(dNextCycle.getDate() + 1);
    }
    return formatIsoDate(dNextCycle);
  }

  const dUltima = parseIsoDateLocal(dataUltimaSessaoStr);
  let dNext = new Date(dUltima);
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
    : [diaSemanaHabitualParam !== undefined && diaSemanaHabitualParam !== null ? diaSemanaHabitualParam : 1];

  const sessoes: Array<{
    numero: number;
    data: string;
    diaSemana: string;
    temConflitoFeriado: boolean;
    conflito?: ConflitoFeriadoSessao;
  }> = [];
  let totalConflitos = 0;

  if (totalSessoes > 0) {
    let dCurr = parseIsoDateLocal(dataPrimeiraSessaoStr);

    // REGRA 1: Domingos NUNCA são contados (avançam para Segunda-feira)
    if (dCurr.getDay() === 0) {
      dCurr.setDate(dCurr.getDate() + 1);
    }

    // Alinha a 1ª sessão para o primeiro dia habitual de atendimento do paciente
    if (diasArray.length > 0) {
      let diasAjuste = 0;
      while (!diasArray.includes(dCurr.getDay() as DiaSemanaIndice) && diasAjuste < 7) {
        dCurr.setDate(dCurr.getDate() + 1);
        if (dCurr.getDay() === 0) dCurr.setDate(dCurr.getDate() + 1); // Pula domingo
        diasAjuste++;
      }
    }

    // Sessão #1: No dia da autorização (mesmo que sábado, salvo domingos ou exceção de múltiplos dias)
    const dataIso1 = formatIsoDate(dCurr);
    const conflito1 = verificarConflitoFeriado(dataIso1);
    if (conflito1) totalConflitos++;

    sessoes.push({
      numero: 1,
      data: dataIso1,
      diaSemana: formatarDiaSemanaPt(dCurr.getDay() as DiaSemanaIndice),
      temConflitoFeriado: !!conflito1,
      conflito: conflito1 || undefined,
    });

    // Sessões #2 em diante:
    if (totalSessoes > 1) {
      if (sessoesPorSemana > 1) {
        // Quando há múltiplas sessões por semana (ex: 3 sessões/semana = 1 sessão a cada 2 dias)
        const passoDias = Math.max(1, Math.floor(7 / sessoesPorSemana));
        let dNext = new Date(dCurr);

        for (let i = 2; i <= totalSessoes; i++) {
          dNext.setDate(dNext.getDate() + passoDias);

          // Pula Domingo ou Feriado nacional/municipal
          let tentativas = 0;
          while ((dNext.getDay() === 0 || verificarConflitoFeriado(formatIsoDate(dNext))) && tentativas < 14) {
            dNext.setDate(dNext.getDate() + 1);
            tentativas++;
          }

          const dataIso = formatIsoDate(dNext);
          const conflito = verificarConflitoFeriado(dataIso);
          if (conflito) totalConflitos++;

          sessoes.push({
            numero: i,
            data: dataIso,
            diaSemana: formatarDiaSemanaPt(dNext.getDay() as DiaSemanaIndice),
            temConflitoFeriado: !!conflito,
            conflito: conflito || undefined,
          });
        }
      } else if (diasArray.length <= 1) {
        // Se 1 sessão por semana e passa em 1 dia habitual específico:
        // dCurr já está alinhado ao dia habitual para a sessão #1.
        let dNext = new Date(dCurr);
        dNext.setDate(dNext.getDate() + 7);

        for (let i = 2; i <= totalSessoes; i++) {
          // Pula Domingo ou Feriado nacional/municipal
          let tentativas = 0;
          while ((dNext.getDay() === 0 || verificarConflitoFeriado(formatIsoDate(dNext))) && tentativas < 14) {
            dNext.setDate(dNext.getDate() + 1);
            tentativas++;
          }

          const dataIso = formatIsoDate(dNext);
          const conflito = verificarConflitoFeriado(dataIso);
          if (conflito) totalConflitos++;

          sessoes.push({
            numero: i,
            data: dataIso,
            diaSemana: formatarDiaSemanaPt(dNext.getDay() as DiaSemanaIndice),
            temConflitoFeriado: !!conflito,
            conflito: conflito || undefined,
          });

          // Próximas sessões avançam de 7 em 7 dias no dia habitual
          dNext.setDate(dNext.getDate() + 7);
        }
      } else {
        // Múltiplos dias por semana
        let dNext = new Date(dCurr);
        let sessoesGeradas = 1;
        let diasVerificados = 0;

        while (sessoesGeradas < totalSessoes && diasVerificados < 365) {
          dNext.setDate(dNext.getDate() + 1);
          diasVerificados++;

          if (dNext.getDay() === 0) continue; // Pula domingo

          const dayOfWeek = dNext.getDay() as DiaSemanaIndice;
          if (diasArray.includes(dayOfWeek)) {
            const dataIso = formatIsoDate(dNext);
            const conflito = verificarConflitoFeriado(dataIso);
            if (conflito) totalConflitos++;

            sessoes.push({
              numero: sessoesGeradas + 1,
              data: dataIso,
              diaSemana: formatarDiaSemanaPt(dayOfWeek),
              temConflitoFeriado: !!conflito,
              conflito: conflito || undefined,
            });
            sessoesGeradas++;
          }
        }
      }
    }
  }

  const ultimaData = sessoes.length > 0 ? sessoes[sessoes.length - 1].data : dataPrimeiraSessaoStr;
  const proximaData = calcularProximaAutorizacaoAposUltimaSessao(
    ultimaData,
    diasArray,
    dataPrimeiraSessaoStr,
    sessoesPorSemana
  );

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
