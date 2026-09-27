import { Paciente } from '../types/clinic';
import { AutorizacaoV2 } from '../types/autorizacao';
import { ProcedimentosService } from './procedimentosService';

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
 * Não utiliza nenhuma regra estática por nome de paciente; inspeciona dinamicamente:
 * 1. Terapias/frequências específicas do paciente para este procedimento
 * 2. Histórico de autorizações do paciente para este procedimento
 * 3. Dias da semana cadastrados no perfil caso coincida com o procedimento principal
 * 4. Padrão clínico cadastrado no catálogo TUSS do sistema
 */
export function identificarSessoesPorSemanaDoProcedimento(
  paciente: Paciente | any,
  procedimentoNome: string,
  historicoAutorizacoes?: AutorizacaoV2[]
): number {
  if (!procedimentoNome) return 1;

  // 1. Procura na lista de terapias estruturadas do paciente (se houver)
  if (paciente && Array.isArray(paciente.terapias) && paciente.terapias.length > 0) {
    const terapia = paciente.terapias.find((t: any) =>
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

  // 2. Procura no dicionário de frequências por procedimento do paciente
  if (paciente && paciente.frequenciasPorProcedimento && typeof paciente.frequenciasPorProcedimento === 'object') {
    for (const [chave, qtd] of Object.entries(paciente.frequenciasPorProcedimento)) {
      if (correspondemAoMesmoProcedimento(chave, procedimentoNome) && typeof qtd === 'number' && qtd > 0) {
        return qtd;
      }
    }
  }

  // 3. Procura no dicionário de dias por procedimento do paciente
  if (paciente && paciente.diasPorProcedimento && typeof paciente.diasPorProcedimento === 'object') {
    for (const [chave, dias] of Object.entries(paciente.diasPorProcedimento)) {
      if (correspondemAoMesmoProcedimento(chave, procedimentoNome) && Array.isArray(dias) && dias.length > 0) {
        return dias.length;
      }
    }
  }

  // 4. Procura no histórico de autorizações do paciente PARA ESTE PROCEDIMENTO
  if (paciente && Array.isArray(historicoAutorizacoes) && historicoAutorizacoes.length > 0) {
    const autProc = historicoAutorizacoes.find((a) => {
      const mesmoPac =
        (paciente.id && a.pacienteId === paciente.id) ||
        (a.pacienteNome && paciente.nome && a.pacienteNome.toLowerCase().includes(paciente.nome.toLowerCase()));
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

  // 5. Se o procedimento coincidir com o procedimento principal do paciente
  if (
    paciente &&
    paciente.procedimentoPrincipal &&
    correspondemAoMesmoProcedimento(paciente.procedimentoPrincipal, procedimentoNome)
  ) {
    if (Array.isArray(paciente.diasDaSemana) && paciente.diasDaSemana.length > 0) {
      return paciente.diasDaSemana.length;
    }
    if (paciente.sessoesPorSemana && Number(paciente.sessoesPorSemana) > 0) {
      return Number(paciente.sessoesPorSemana);
    }
    if (paciente.quantidadeSemana && Number(paciente.quantidadeSemana) > 0) {
      return Number(paciente.quantidadeSemana);
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
      (Array.isArray(paciente.diasDaSemana) && paciente.diasDaSemana.length > 0
        ? paciente.diasDaSemana.length
        : undefined) ||
      paciente.sessoesPorSemana ||
      paciente.quantidadeSemana;
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
