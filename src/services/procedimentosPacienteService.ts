import { Paciente } from '../types/clinic';
import { AutorizacaoV2 } from '../types/autorizacao';
import { ProcedimentosService } from './procedimentosService';
import { PacientesService } from './pacientesService';

/**
 * Normaliza nomes de procedimentos para comparações robustas
 */
export function normalizarNomeProcedimento(nome: string): string {
  if (!nome) return '';
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se dois nomes de procedimentos correspondem à mesma especialidade/procedimento
 */
export function correspondemAoMesmoProcedimento(proc1: string, proc2: string): boolean {
  if (!proc1 || !proc2) return false;
  const n1 = normalizarNomeProcedimento(proc1);
  const n2 = normalizarNomeProcedimento(proc2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Comparações semânticas de especialidades comuns em clínicas multidisciplinares ABA
  const especialidades = [
    'psicologia',
    'fonoaudiologia',
    'terapia ocupacional',
    'psicopedagogia',
    'fisioterapia',
    'musicoterapia',
    'psicomotricidade',
    'psiquiatria',
  ];
  for (const esp of especialidades) {
    if (n1.includes(esp) && n2.includes(esp)) return true;
  }

  // Sigla TO (Terapia Ocupacional)
  const ehTO1 = n1.includes('terapia ocupacional') || n1 === 'to' || n1.startsWith('to ') || n1.includes(' to ');
  const ehTO2 = n2.includes('terapia ocupacional') || n2 === 'to' || n2.startsWith('to ') || n2.includes(' to ');
  if (ehTO1 && ehTO2) return true;

  return false;
}

/**
 * Identifica dinamicamente a quantidade de sessões por semana de um paciente para um procedimento específico.
 */
export function identificarSessoesPorSemanaDoProcedimento(
  paciente: Paciente | any,
  procedimentoNome: string,
  historicoAutorizacoes?: AutorizacaoV2[]
): number {
  if (!paciente) return 1;

  // Obtém o registro cadastral mestre ativo mais recente (se disponível)
  let pacReal = paciente;
  try {
    const lista = PacientesService.obterPacientes();
    if (Array.isArray(lista) && lista.length > 0) {
      const encontrado = lista.find(
        (p) =>
          p.id === paciente.id ||
          (p.nome && paciente.nome && p.nome.toLowerCase().trim() === paciente.nome.toLowerCase().trim())
      );
      if (encontrado) pacReal = encontrado;
    }
  } catch {}

  // 1. PRIORIDADE MESTRE CADASTRAL: Se o paciente tem sessoesPorSemana/quantidadeSemana no seu perfil ativo,
  // E o procedimento consultado for o procedimento principal do paciente (ou omitido)
  const ehProcPrincipal =
    !procedimentoNome ||
    !pacReal.procedimentoPrincipal ||
    correspondemAoMesmoProcedimento(pacReal.procedimentoPrincipal, procedimentoNome);

  if (ehProcPrincipal) {
    if (pacReal.sessoesPorSemana && Number(pacReal.sessoesPorSemana) > 0) {
      return Number(pacReal.sessoesPorSemana);
    }
    if (pacReal.quantidadeSemana && Number(pacReal.quantidadeSemana) > 0) {
      return Number(pacReal.quantidadeSemana);
    }
  }

  // 1. Dicionário de frequências por procedimento do paciente
  if (pacReal.frequenciasPorProcedimento && typeof pacReal.frequenciasPorProcedimento === 'object') {
    for (const [chave, qtd] of Object.entries(pacReal.frequenciasPorProcedimento)) {
      if (correspondemAoMesmoProcedimento(chave, procedimentoNome) && typeof qtd === 'number' && qtd > 0) {
        return qtd;
      }
    }
  }

  // 2. Dicionário de dias por procedimento do paciente
  if (pacReal.diasPorProcedimento && typeof pacReal.diasPorProcedimento === 'object') {
    for (const [chave, dias] of Object.entries(pacReal.diasPorProcedimento)) {
      if (correspondemAoMesmoProcedimento(chave, procedimentoNome) && Array.isArray(dias) && dias.length > 0) {
        return dias.length;
      }
    }
  }

  // 3. PRIORIDADE MESTRE CADASTRAL: sessoesPorSemana/quantidadeSemana do perfil ativo
  if (pacReal.sessoesPorSemana && Number(pacReal.sessoesPorSemana) > 0) {
    return Number(pacReal.sessoesPorSemana);
  }
  if (pacReal.quantidadeSemana && Number(pacReal.quantidadeSemana) > 0) {
    return Number(pacReal.quantidadeSemana);
  }

  // 4. Terapias estruturadas
  if (Array.isArray(pacReal.terapias) && pacReal.terapias.length > 0) {
    const terapia = pacReal.terapias.find((t: any) =>
      correspondemAoMesmoProcedimento(t.procedimento, procedimentoNome)
    );
    if (terapia) {
      if (terapia.sessoesPorSemana && Number(terapia.sessoesPorSemana) > 0) {
        return Number(terapia.sessoesPorSemana);
      }
      if (Array.isArray(terapia.diasDaSemana) && terapia.diasDaSemana.length > 0) {
        return terapia.diasDaSemana.length;
      }
    }
  }

  // 5. Dias da semana cadastrados no perfil do paciente
  if (Array.isArray(pacReal.diasDaSemana) && pacReal.diasDaSemana.length > 0) {
    return pacReal.diasDaSemana.length;
  }

  // 6. Dias de atendimento obtidos para o procedimento
  try {
    const diasProc = obterDiasDeAtendimentoDoProcedimento(pacReal, procedimentoNome);
    if (Array.isArray(diasProc) && diasProc.length > 0) {
      return diasProc.length;
    }
  } catch {}

  // 7. Histórico de autorizações do paciente PARA ESTE PROCEDIMENTO
  if (pacReal && Array.isArray(historicoAutorizacoes) && historicoAutorizacoes.length > 0) {
    const autProc = historicoAutorizacoes.find((a) => {
      const mesmoPac =
        (pacReal.id && a.pacienteId === pacReal.id) ||
        (a.pacienteNome && pacReal.nome && a.pacienteNome.toLowerCase().includes(pacReal.nome.toLowerCase()));
      const mesmoProc = correspondemAoMesmoProcedimento(a.procedimento, procedimentoNome);
      return mesmoPac && mesmoProc;
    });

    if (autProc) {
      if (autProc.sessoesPorSemana && Number(autProc.sessoesPorSemana) > 0) {
        return Number(autProc.sessoesPorSemana);
      }
      if (autProc.quantidadeSolicitada && Number(autProc.quantidadeSolicitada) > 0) {
        const sessoesEstimadas = Math.round(Number(autProc.quantidadeSolicitada) / 4);
        if (sessoesEstimadas > 0) return sessoesEstimadas;
      }
    }
  }

  // 6. Procura o padrão clínico na tabela de procedimentos cadastrados
  try {
    const todosProc = ProcedimentosService.obterTodos();
    const procCadastrado = todosProc.find((p) => correspondemAoMesmoProcedimento(p.descricao, procedimentoNome));
    if (procCadastrado && procCadastrado.sessoesPorSemanaPadrao && procCadastrado.sessoesPorSemanaPadrao > 0) {
      return procCadastrado.sessoesPorSemanaPadrao;
    }
  } catch {}

  // 7. Padrão clínico geral por especialidade TUSS ABA
  const pNorm = normalizarNomeProcedimento(procedimentoNome);
  if (pNorm.includes('psicologia') || pNorm.includes('psico')) return 2;
  if (pNorm.includes('fono')) return 2;
  if (pNorm.includes('terapia ocupacional') || pNorm.includes(' to ') || pNorm.startsWith('to ')) return 2;

  return 1;
}

/**
 * Identifica os dias da semana de atendimento de um paciente para um procedimento específico
 */
export function obterDiasDeAtendimentoDoProcedimento(
  paciente: Paciente | any,
  procedimentoNome: string
): any[] {
  if (!paciente) return ['Terça-feira'];

  // Obtém o registro cadastral mestre ativo mais recente (se disponível)
  let pacReal = paciente;
  try {
    const lista = PacientesService.obterPacientes();
    if (Array.isArray(lista) && lista.length > 0) {
      const encontrado = lista.find(
        (p) =>
          p.id === paciente.id ||
          (p.nome && paciente.nome && p.nome.toLowerCase().trim() === paciente.nome.toLowerCase().trim())
      );
      if (encontrado) pacReal = encontrado;
    }
  } catch {}

  const procNomeNormalizado = (procedimentoNome || '').toLowerCase().trim();
  const procPrincipalNormalizado = (pacReal.procedimentoPrincipal || '').toLowerCase().trim();
  const ehProcPrincipal =
    !procedimentoNome ||
    !procPrincipalNormalizado ||
    correspondemAoMesmoProcedimento(procPrincipalNormalizado, procNomeNormalizado);

  // Se for o procedimento principal (ou omitido) e o paciente possuir diasDaSemana/diaDaSemana no cadastro mestre ativo,
  // os dias do cadastro mestre ativo têm PRIORIDADE ABSOLUTA!
  if (ehProcPrincipal && Array.isArray(pacReal.diasDaSemana) && pacReal.diasDaSemana.length > 0) {
    return pacReal.diasDaSemana;
  }
  if (ehProcPrincipal && pacReal.diaDaSemana) {
    return [pacReal.diaDaSemana];
  }

  // 1. Procurar em diasPorProcedimento do cadastro mestre
  if (pacReal.diasPorProcedimento && typeof pacReal.diasPorProcedimento === 'object') {
    for (const [key, val] of Object.entries(pacReal.diasPorProcedimento)) {
      if (correspondemAoMesmoProcedimento(key, procedimentoNome) && Array.isArray(val) && val.length > 0) {
        return val;
      }
    }
  }

  // 2. Procurar em frequenciasPorProcedimento do cadastro mestre
  if (pacReal.frequenciasPorProcedimento && typeof pacReal.frequenciasPorProcedimento === 'object') {
    for (const [key, val] of Object.entries(pacReal.frequenciasPorProcedimento)) {
      if (
        correspondemAoMesmoProcedimento(key, procedimentoNome) &&
        val &&
        typeof val === 'object' &&
        Array.isArray((val as any).dias) &&
        (val as any).dias.length > 0
      ) {
        return (val as any).dias;
      }
    }
  }

  // 3. Procurar em terapias estruturadas
  if (Array.isArray(pacReal.terapias) && pacReal.terapias.length > 0) {
    const t = pacReal.terapias.find((ter: any) => correspondemAoMesmoProcedimento(ter.procedimento, procedimentoNome));
    if (t && Array.isArray(t.diasDaSemana) && t.diasDaSemana.length > 0) {
      return t.diasDaSemana;
    }
  }

  // 4. Fallback para diasDaSemana do cadastro mestre do paciente
  if (Array.isArray(pacReal.diasDaSemana) && pacReal.diasDaSemana.length > 0) {
    return pacReal.diasDaSemana;
  }

  if (pacReal.diaDaSemana) {
    return [pacReal.diaDaSemana];
  }

  return ['Terça-feira'];
}

/**
 * Identifica dinamicamente todos os procedimentos que um paciente realiza e suas respectivas frequências semanais
 */
export function identificarProcedimentosDoPaciente(
  paciente: Paciente | any,
  historicoAutorizacoes?: AutorizacaoV2[]
): Array<{ procedimento: string; sessoesPorSemana: number; prestadorNome?: string }> {
  if (!paciente) return [];

  const mapa = new Map<string, { procedimento: string; sessoesPorSemana: number; prestadorNome?: string }>();

  const adicionar = (procNome: string, sessoes?: number, prestador?: string) => {
    if (!procNome) return;
    const chave = normalizarNomeProcedimento(procNome);
    if (!chave) return;

    const sessoesCalc =
      sessoes && sessoes > 0
        ? sessoes
        : identificarSessoesPorSemanaDoProcedimento(paciente, procNome, historicoAutorizacoes);

    if (mapa.has(chave)) {
      const existente = mapa.get(chave)!;
      if (prestador && !existente.prestadorNome) existente.prestadorNome = prestador;
      if (sessoes && sessoes > 0) existente.sessoesPorSemana = sessoes;
    } else {
      mapa.set(chave, {
        procedimento: procNome.trim(),
        sessoesPorSemana: sessoesCalc,
        prestadorNome: prestador || paciente.prestadorNome,
      });
    }
  };

  // 1. Procedimento principal do paciente
  if (paciente.procedimentoPrincipal) {
    const sessoesPrinc =
      (paciente.sessoesPorSemana && Number(paciente.sessoesPorSemana) > 0 ? Number(paciente.sessoesPorSemana) : undefined) ||
      (paciente.quantidadeSemana && Number(paciente.quantidadeSemana) > 0 ? Number(paciente.quantidadeSemana) : undefined) ||
      (Array.isArray(paciente.diasDaSemana) && paciente.diasDaSemana.length > 0
        ? paciente.diasDaSemana.length
        : undefined);
    adicionar(paciente.procedimentoPrincipal, sessoesPrinc, paciente.prestadorNome);
  }

  // 2. Procedimentos da lista do paciente
  if (Array.isArray(paciente.procedimentos)) {
    paciente.procedimentos.forEach((proc: string) => {
      adicionar(proc);
    });
  }

  // 3. Terapias estruturadas
  if (Array.isArray(paciente.terapias)) {
    paciente.terapias.forEach((t: any) => {
      adicionar(t.procedimento, t.sessoesPorSemana, t.prestadorNome);
    });
  }

  // 4. Histórico de autorizações
  if (Array.isArray(historicoAutorizacoes)) {
    historicoAutorizacoes.forEach((a) => {
      const mesmoPac =
        (paciente.id && a.pacienteId === paciente.id) ||
        (a.pacienteNome && paciente.nome && a.pacienteNome.toLowerCase().includes(paciente.nome.toLowerCase()));
      if (mesmoPac && a.procedimento) {
        adicionar(a.procedimento, a.sessoesPorSemana, a.prestador);
      }
    });
  }

  return Array.from(mapa.values());
}

/**
 * Valida se um conjunto de datas de sessões customizadas coincide com os dias de atendimento autorizados do paciente.
 * Se contiver datas em dias da semana em que o paciente NÃO atende (ex: Sextas-feiras para um paciente de Terça/Quarta),
 * a lista é considerada obsoleta/inválida e é descartada (retornando undefined) para forçar o recálculo automático.
 */
export function validarEManterDatasCustomizadas(
  datasCustom: string[] | undefined,
  pacienteNomeOuId?: string,
  procedimentoNome?: string
): string[] | undefined {
  if (!datasCustom || !Array.isArray(datasCustom) || datasCustom.length === 0) return undefined;
  if (!pacienteNomeOuId) return datasCustom;

  let todosPacientes: Paciente[] = [];
  try {
    todosPacientes = PacientesService.obterPacientes();
  } catch {}

  const termoNorm = pacienteNomeOuId.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const pac = todosPacientes.find((p) => {
    const nomeNorm = (p.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return (
      p.id === pacienteNomeOuId ||
      nomeNorm === termoNorm ||
      nomeNorm.includes(termoNorm) ||
      termoNorm.includes(nomeNorm)
    );
  });

  if (!pac) return datasCustom;

  const diasPac = obterDiasDeAtendimentoDoProcedimento(pac, procedimentoNome || pac.procedimentoPrincipal || '');
  if (!Array.isArray(diasPac) || diasPac.length === 0) return datasCustom;

  const parseDiaIndice = (d: any): number => {
    if (typeof d === 'number') return d >= 0 && d <= 6 ? d : 2;
    const str = String(d).trim();
    if (/^[0-6]$/.test(str)) return Number(str);
    const norm = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('seg')) return 1;
    if (norm.includes('ter')) return 2;
    if (norm.includes('qua')) return 3;
    if (norm.includes('qui')) return 4;
    if (norm.includes('sex')) return 5;
    if (norm.includes('sab') || norm.includes('sáb')) return 6;
    if (norm.includes('dom')) return 0;
    return 2;
  };

  const diasPermitidosSet = new Set<number>(diasPac.map(parseDiaIndice));

  for (const dtStr of datasCustom) {
    if (!dtStr) continue;
    let diaSemanaIdx: number | null = null;
    if (dtStr.includes('/')) {
      const parts = dtStr.split('/');
      if (parts.length === 3) {
        const dd = Number(parts[0]);
        const mm = Number(parts[1]) - 1;
        const yyyy = Number(parts[2]);
        if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
          diaSemanaIdx = new Date(yyyy, mm, dd).getDay();
        }
      }
    } else if (dtStr.includes('-')) {
      const parts = dtStr.split('-');
      if (parts.length === 3) {
        const yyyy = Number(parts[0]);
        const mm = Number(parts[1]) - 1;
        const dd = Number(parts[2]);
        if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
          diaSemanaIdx = new Date(yyyy, mm, dd).getDay();
        }
      }
    }

    if (diaSemanaIdx !== null && diaSemanaIdx >= 0 && diaSemanaIdx <= 6) {
      if (!diasPermitidosSet.has(diaSemanaIdx)) {
        return undefined;
      }
    }
  }

  return datasCustom;
}

