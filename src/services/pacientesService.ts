/**
 * Serviço de Gestão Mestre de Pacientes — Clínica Mefisa V1
 *
 * Responsável por:
 * 1. CRUD mestre com entidade central única.
 * 2. Gestão de múltiplos responsáveis legais e responsável principal.
 * 3. Histórico perpétuo de carteirinhas (sem sobrescrita destrutiva).
 * 4. Validação de formulários (.pdf / .jpeg) com cálculo de 180 dias de vencimento e alerta de urgência.
 * 5. Detecção de duplicidade por CPF, Carteirinha ou Nome + Nascimento (permitindo homônimos).
 * 6. Auditoria completa com carimbo de tempo, usuário e valores anterior/novo.
 * 7. Isolamento de filtros por sessão de usuário.
 */

import {
  Paciente,
  ResponsavelLegal,
  HistoricoCarteirinha,
  FormularioCadastroPaciente,
  ResultadoVerificacaoDuplicidadePaciente,
  FiltroPacientesUsuario,
  EventoAuditoria,
  PapelUsuario,
  StatusPaciente,
} from '../types/clinic';
import { parseIsoDateLocal, formatIsoDate, normalizarEDeduplicarDiasSemana } from './businessRules';
import { CloudSyncService } from './cloudSyncService';
import { DeletedRecordsService } from './deletedRecordsService';
import { AuditoriaService } from './auditoriaService';

const STORAGE_PACIENTES_KEY = 'mefisa_pacientes_v2';
const STORAGE_AUDITORIA_KEY = 'mefisa_auditoria_pacientes_v1';
const STORAGE_FILTROS_PREFIX = 'mefisa_filtro_pacientes_';

/**
 * Mascara o CPF preservando apenas os 3 primeiros dígitos e os 2 últimos dígitos verificadores
 */
export function mascararCpf(cpf: string): string {
  if (!cpf) return '';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return `${limpo.slice(0, 3)}.***.***-${limpo.slice(9)}`;
}

/**
 * Mascara número de carteirinha de convênio
 */
export function mascararCarteirinha(carteirinha: string): string {
  if (!carteirinha) return '';
  const limpo = carteirinha.trim();
  if (limpo.length <= 6) return limpo;
  const inicio = limpo.slice(0, 4);
  const fim = limpo.slice(-3);
  return `${inicio}*****${fim}`;
}

/**
 * Normaliza strings para comparação fonética/textual
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * REGRA DO FORMULÁRIO (180 DIAS):
 * Calcula o vencimento a partir da data de emissão informada pelo usuário.
 * 6 meses = exatamente 180 dias corridos.
 */
export function calcularVencimentoFormulario(
  dataEmissaoIso: string,
  dataReferenciaAtualIso: string = '2026-10-24'
): {
  dataVencimento: string;
  diasRestantes: number;
  status: 'VALIDO' | 'ALERTA_PROXIMO_VENCIMENTO' | 'VENCIDO';
  alertaUrgenteEmpregados: boolean;
} {
  const dEmissao = parseIsoDateLocal(dataEmissaoIso);
  const dVencimento = new Date(dEmissao);
  dVencimento.setDate(dVencimento.getDate() + 180);

  const dRef = parseIsoDateLocal(dataReferenciaAtualIso);
  const diferencaMs = dVencimento.getTime() - dRef.getTime();
  const diasRestantes = Math.round(diferencaMs / (1000 * 60 * 60 * 24));

  let status: 'VALIDO' | 'ALERTA_PROXIMO_VENCIMENTO' | 'VENCIDO';
  let alertaUrgenteEmpregados = false;

  if (diasRestantes < 0) {
    status = 'VENCIDO';
    alertaUrgenteEmpregados = true;
  } else if (diasRestantes <= 30) {
    status = 'ALERTA_PROXIMO_VENCIMENTO';
    alertaUrgenteEmpregados = false;
  } else {
    status = 'VALIDO';
    alertaUrgenteEmpregados = false;
  }

  return {
    dataVencimento: formatIsoDate(dVencimento),
    diasRestantes,
    status,
    alertaUrgenteEmpregados,
  };
}

/**
 * Converte strings de datas variadas (YYYY-MM-DD, DD/MM/YYYY) em YYYY-MM-DD local
 */
export function converterDataParaIso(dataStr: string | undefined | null): string | null {
  if (!dataStr) return null;
  const str = dataStr.trim();
  if (!str || str.startsWith('AGUARDANDO') || str.startsWith('AUTORIZAÇÃO') || str === '—') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    const parts = str.split('-');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Verificação unificada se a autorização do paciente está atrasada
 * (ou seja, se a data de Próxima Autorização é anterior à data atual ou marcada como atrasada)
 */
export function isAutorizacaoAtrasada(pac: Paciente, hojeIsoInput?: string): boolean {
  if (!pac) return false;
  if (pac.status === 'ENCERRADO' || pac.status === 'INATIVO') return false;
  if (pac.autorizacaoAtrasada || pac.proximaAutorizacaoData === 'AUTORIZAÇÃO ATRASADA') {
    return true;
  }
  if (!pac.proximaAutorizacaoData || pac.proximaAutorizacaoData === 'AGUARDANDO DR.°(ª)' || pac.proximaAutorizacaoData === 'AGUARDANDO_DOUTOR') {
    return false;
  }
  const dataIso = converterDataParaIso(pac.proximaAutorizacaoData);
  if (!dataIso) return false;

  const hoje = hojeIsoInput || new Date().toISOString().split('T')[0];
  return dataIso < hoje;
}

/**
 * Verificação unificada de formulário vencido para um paciente
 */
export function isFormularioVencido(pac: Paciente): boolean {
  if (!pac) return false;
  if (pac.formulario) {
    if (pac.formulario.statusVencimento === 'VENCIDO' || (pac.formulario as any).statusFormulario === 'VENCIDO') {
      return true;
    }
    if (pac.formulario.dataEmissao) {
      const v = calcularVencimentoFormulario(pac.formulario.dataEmissao);
      return v.status === 'VENCIDO';
    }
  }
  return false;
}

/**
 * BASE DE PACIENTES INICIAIS (ZERADA POR SOLICITAÇÃO DO USUÁRIO)
 */
export const PACIENTES_TEST_FIXTURES: Paciente[] = [
  {
    id: 'pac-test-1',
    codigoProntuario: '#MEF-001',
    nome: 'Lucas Gabriel Mendes',
    dataNascimento: '2018-03-15',
    idade: 8,
    cpf: '381.921.842-10',
    cpfMascarado: '381.***.***-10',
    carteirinha: '982019230198001',
    carteirinhaAtual: '982019230198001',
    convenioId: 'conv-1',
    convenioNome: 'SulAmérica Saúde',
    procedimentoPrincipal: 'Psicoterapia ABA Individual',
    prestadorId: 'prest-1',
    prestadorNome: 'Dra. Ana Beatriz Albuquerque',
    status: 'ATIVO',
    responsavelNome: 'Mariana Mendes',
    responsaveis: [
      {
        id: 'resp-1',
        nome: 'Mariana Mendes',
        parentesco: 'Mãe',
        telefone: '(11) 99999-8888',
        principal: true,
      },
    ],
    carteirinhas: [
      {
        id: 'cart-1',
        convenioId: 'conv-1',
        convenioNome: 'SulAmérica Saúde',
        numeroCarteirinha: '982019230198001',
        dataInicio: '2025-01-01',
        status: 'ATUAL',
        criadoPorUsuario: 'Sistema',
        criadoEm: '2025-01-01',
      },
    ],
    dataCriacao: '2026-01-01T10:00:00.000Z',
    dataUltimaAtualizacao: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'pac-test-2',
    codigoProntuario: '#MEF-002',
    nome: 'Matheus Henrique da Silva',
    dataNascimento: '2020-07-22',
    idade: 6,
    cpf: '221.443.551-09',
    cpfMascarado: '221.***.***-09',
    carteirinha: '772910394012001',
    carteirinhaAtual: '772910394012001',
    convenioId: 'conv-2',
    convenioNome: 'Bradesco Saúde',
    procedimentoPrincipal: 'Fonoaudiologia ABA',
    prestadorId: 'prest-2',
    prestadorNome: 'Dr. Carlos Eduardo Neves',
    status: 'ATIVO',
    responsavelNome: 'Roberto Silva',
    responsaveis: [
      {
        id: 'resp-2',
        nome: 'Roberto Silva',
        parentesco: 'Pai',
        telefone: '(11) 97777-6666',
        principal: true,
      },
    ],
    carteirinhas: [
      {
        id: 'cart-2',
        convenioId: 'conv-2',
        convenioNome: 'Bradesco Saúde',
        numeroCarteirinha: '772910394012001',
        dataInicio: '2025-01-01',
        status: 'ATUAL',
        criadoPorUsuario: 'Sistema',
        criadoEm: '2025-01-01',
      },
    ],
    dataCriacao: '2026-01-01T10:00:00.000Z',
    dataUltimaAtualizacao: '2026-01-01T10:00:00.000Z',
  },
];

let memoriaPacientes: Paciente[] | null = null;
let memoriaAuditoria: EventoAuditoria[] = [];
let memoriaFiltrosPorUsuario: Record<string, FiltroPacientesUsuario> = {};

export class PacientesService {
  /**
   * Obtém a lista de pacientes do storage (somente pacientes cadastrados/importados pelo usuário)
   */
  static obterPacientes(): Paciente[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return memoriaPacientes || [];
      }
      const raw = localStorage.getItem(STORAGE_PACIENTES_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_PACIENTES_KEY, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Remove quaisquer fixtures automáticas de teste legadas (ex: pac-001 até pac-012)
        const apenasReais = parsed.filter((p: any) => {
          if (!p || !p.id) return false;
          const isFixture = /^pac-0\d+$/.test(p.id) || p.id === 'pac-000';
          return !isFixture;
        });

        // Garante sincronia e deduplicação de dias da semana para qualquer paciente
        let houveCorrecao = false;
        const corrigidos = apenasReais.map((p: Paciente) => {
          let pAjustado = p;
          const { diasArray, diaStr } = normalizarEDeduplicarDiasSemana(p.diasDaSemana || p.diaDaSemana);
          if (p.diaDaSemana !== diaStr || JSON.stringify(p.diasDaSemana) !== JSON.stringify(diasArray)) {
            houveCorrecao = true;
            pAjustado = {
              ...pAjustado,
              diaDaSemana: diaStr,
              diasDaSemana: diasArray,
            };
          }
          if (diasArray.length > 0 && pAjustado.sessoesPorSemana !== diasArray.length && !pAjustado.frequenciasPorProcedimento) {
            houveCorrecao = true;
            pAjustado = {
              ...pAjustado,
              sessoesPorSemana: diasArray.length,
              quantidadeSemana: diasArray.length,
            };
          }
          return pAjustado;
        });

        // Filtra pacientes enviados para os Registros Deletados (Lixeira)
        const deletedRegs = DeletedRecordsService.obterRegistrosDeletados();
        const idsExcluidos = new Set(
          deletedRegs
            .filter((r) => r.tipo === 'paciente' && r.dadosOriginais?.id)
            .map((r) => r.dadosOriginais.id)
        );

        const naoDeletados = corrigidos.filter(
          (p: Paciente) => !idsExcluidos.has(p.id) && (p as any).status !== 'EXCLUIDO' && !(p as any).deletado
        );

        if (houveCorrecao || naoDeletados.length !== parsed.length) {
          try {
            localStorage.setItem(STORAGE_PACIENTES_KEY, JSON.stringify(this.sanitizarPacientesParaStorage(naoDeletados)));
          } catch {}
        }
        return naoDeletados;
      }
      return [];
    } catch {
      return memoriaPacientes || [];
    }
  }

  /**
   * Sanitiza a lista de pacientes antes de salvar no localStorage,
   * removendo URLs de DataURL gigantes (>20KB) para não exceder a cota do localStorage (QuotaExceededError).
   */
  private static sanitizarPacientesParaStorage(pacientes: Paciente[]): Paciente[] {
    return pacientes.map((p) => {
      if (!p.formulario) return p;
      const f = p.formulario;
      const ehDataUrlGrande = (url?: string) => Boolean(url && url.length > 20000 && url.startsWith('data:'));
      if (ehDataUrlGrande(f.urlImagem) || ehDataUrlGrande(f.baixarUrl)) {
        return {
          ...p,
          formulario: {
            ...f,
            urlImagem: ehDataUrlGrande(f.urlImagem) ? undefined : f.urlImagem,
            baixarUrl: ehDataUrlGrande(f.baixarUrl) ? undefined : f.baixarUrl,
          },
        };
      }
      return p;
    });
  }

  /**
   * Salva a lista de pacientes com proteção contra QuotaExceededError
   */
  static persistirPacientes(pacientes: Paciente[]): void {
    memoriaPacientes = pacientes;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const sanitizados = this.sanitizarPacientesParaStorage(pacientes);
        localStorage.setItem(STORAGE_PACIENTES_KEY, JSON.stringify(sanitizados));
        setTimeout(() => {
          window.dispatchEvent(new Event('storage'));
        }, 0);
      } catch (err) {
        console.warn('Alerta de cota excedida do localStorage. Aplicando limpeza dos anexos para manter sincronia:', err);
        try {
          const ultraLimpo = pacientes.map((p) => ({
            ...p,
            formulario: p.formulario
              ? {
                  ...p.formulario,
                  urlImagem: undefined,
                  baixarUrl: undefined,
                }
              : undefined,
          }));
          localStorage.setItem(STORAGE_PACIENTES_KEY, JSON.stringify(ultraLimpo));
        } catch {
          // Ignora se o localStorage do navegador estiver completamente lotado de outras chaves
        }
      }
    }
  }

  /**
   * Limpa todas as observações registradas em todos os pacientes da lista
   */
  static limparTodasObservacoesPacientes(): Paciente[] {
    const lista = this.obterPacientes();
    const limpos = lista.map((p) => {
      const pCopia = { ...p, observacoes: '' };
      delete (pCopia as any).observacao;
      if (pCopia.formulario) {
        pCopia.formulario = { ...pCopia.formulario };
        delete (pCopia.formulario as any).observacoes;
        delete (pCopia.formulario as any).observacao;
      }
      return pCopia;
    });

    this.persistirPacientes(limpos);
    return limpos;
  }

  /**
   * Busca um paciente pelo ID
   */
  static obterPacientePorId(id: string): Paciente | null {
    const todos = this.obterPacientes();
    return todos.find((p) => p.id === id) || null;
  }

  /**
   * REGRA DE DETECÇÃO DE DUPLICIDADE:
   * Verifica se já existe um paciente com:
   * 1. CPF idêntico (se informado)
   * 2. Número de carteirinha idêntico
   * 3. Nome completo + data de nascimento idênticos
   *
   * IMPORTANTE: Não bloqueia homônimos (nomes iguais com nascimento/CPF diferentes).
   */
  static verificarDuplicidade(
    dados: {
      nome: string;
      dataNascimento?: string;
      cpf?: string;
      carteirinha?: string;
      procedimento?: string;
    },
    ignorarId?: string,
    basePacientes?: Paciente[]
  ): ResultadoVerificacaoDuplicidadePaciente {
    const lista = basePacientes || this.obterPacientes();

    const cpfLimpo = (dados.cpf || '').replace(/\D/g, '');
    const carteirinhaLimpa = (dados.carteirinha || '').trim().toLowerCase();
    const nomeNorm = normalizarTexto(dados.nome || '');
    const dataNasc = (dados.dataNascimento || '').trim();
    const procNorm = normalizarTexto(dados.procedimento || '');

    for (const pac of lista) {
      if (ignorarId && pac.id === ignorarId) continue;
      const pacNomeNorm = normalizarTexto(pac.nome || '');

      // 1. CPF Idêntico
      const pacCpfLimpo = (pac.cpf || '').replace(/\D/g, '');
      if (cpfLimpo && pacCpfLimpo && cpfLimpo === pacCpfLimpo) {
        return {
          possivelDuplicidade: true,
          motivoCorrespondencia: 'CPF_IDENTICO',
          pacienteExistente: pac,
          detalhes: `CPF ${mascararCpf(pac.cpf || '')} já cadastrado para o paciente ${pac.nome}.`,
        };
      }

      // 2. Carteirinha Idêntica
      const pacCarteirinha = (pac.carteirinhaAtual || pac.carteirinha || '').trim().toLowerCase();
      if (carteirinhaLimpa && pacCarteirinha && carteirinhaLimpa === pacCarteirinha) {
        return {
          possivelDuplicidade: true,
          motivoCorrespondencia: 'CARTEIRINHA_IDENTICA',
          pacienteExistente: pac,
          detalhes: `Carteirinha ${mascararCarteirinha(pacCarteirinha)} já associada ao paciente ${pac.nome}.`,
        };
      }

      // 3. Nome + Data de Nascimento Idênticos
      const pacDataNasc = (pac.dataNascimento || '').trim();
      if (nomeNorm && dataNasc && pacDataNasc && nomeNorm === pacNomeNorm && dataNasc === pacDataNasc) {
        return {
          possivelDuplicidade: true,
          motivoCorrespondencia: 'NOME_E_NASCIMENTO_IDENTICOS',
          pacienteExistente: pac,
          detalhes: `Paciente com mesmo nome completo e mesma data de nascimento (${dataNasc}) já cadastrado.`,
        };
      }

      // 4. Nome + Procedimento Idênticos
      if (nomeNorm && procNorm && nomeNorm === pacNomeNorm) {
        const pacProcNorm = normalizarTexto(pac.procedimentoPrincipal || '');
        const pacProcsNorm = (pac.procedimentos || []).map((p) => normalizarTexto(p));
        if (pacProcNorm === procNorm || pacProcsNorm.includes(procNorm)) {
          return {
            possivelDuplicidade: true,
            motivoCorrespondencia: 'NOME_E_PROCEDIMENTO_IDENTICOS',
            pacienteExistente: pac,
            detalhes: `Paciente "${pac.nome}" já está cadastrado no sistema com o procedimento "${dados.procedimento}".`,
          };
        }
      }
    }

    return {
      possivelDuplicidade: false,
      detalhes: 'Nenhuma duplicidade detectada.',
    };
  }

  /**
   * Cadastra um novo paciente com auditoria completa
   */
  static cadastrarPaciente(
    novoPaciente: Omit<Paciente, 'id' | 'codigoProntuario' | 'dataCriacao' | 'dataUltimaAtualizacao'> & {
      codigoProntuario?: string;
    },
    usuario: { nome: string; papel: PapelUsuario },
    justificativaDuplicidade?: string
  ): { paciente: Paciente; eventoAuditoria: EventoAuditoria } {
    const lista = this.obterPacientes();
    const novoId = `pac-${Date.now()}`;
    const codigoProntuario =
      novoPaciente.codigoProntuario || `#MEF-2026-${String(lista.length + 1).padStart(3, '0')}`;

    const agora = new Date();
    const agoraFormatado = `${formatIsoDate(agora)} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    // Carteirinha inicial vinculada
    const carteirinhaInicial: HistoricoCarteirinha = {
      id: `cart-${Date.now()}`,
      convenioId: novoPaciente.convenioPrincipalId || novoPaciente.convenioId || 'conv-1',
      convenioNome: novoPaciente.convenioPrincipalNome || novoPaciente.convenioNome || 'Convênio Padrão',
      numeroCarteirinha: novoPaciente.carteirinhaAtual || novoPaciente.carteirinha || '',
      dataInicio: formatIsoDate(agora),
      status: 'ATUAL',
      observacao: 'Cadastro inicial do paciente',
      criadoPorUsuario: usuario.nome,
      criadoEm: agoraFormatado,
    };

    const pacienteCriado: Paciente = {
      ...novoPaciente,
      id: novoId,
      codigoProntuario,
      carteirinhaAtual: novoPaciente.carteirinhaAtual || novoPaciente.carteirinha,
      carteirinhaAtualMascarada: mascararCarteirinha(novoPaciente.carteirinhaAtual || novoPaciente.carteirinha),
      cpfMascarado: mascararCpf(novoPaciente.cpf || ''),
      carteirinhas: novoPaciente.carteirinhas?.length ? novoPaciente.carteirinhas : [carteirinhaInicial],
      responsaveis: novoPaciente.responsaveis || [],
      responsavelPrincipalNome:
        novoPaciente.responsaveis?.find((r) => r.principal)?.nome ||
        novoPaciente.responsavelNome ||
        'Não informado',
      dataCriacao: formatIsoDate(agora),
      dataUltimaAtualizacao: agoraFormatado,
      atualizadoPor: usuario.nome,
    };

    // Se o novo paciente possui formulário, propaga para todos os pacientes com o mesmo nome
    if (pacienteCriado.formulario) {
      const nomeNormalizado = normalizarTexto(pacienteCriado.nome);
      lista.forEach((p, idx) => {
        if (p.id !== pacienteCriado.id && normalizarTexto(p.nome) === nomeNormalizado) {
          lista[idx] = {
            ...p,
            formulario: pacienteCriado.formulario ? { ...pacienteCriado.formulario } : undefined,
            pendenciasQuantidade:
              pacienteCriado.formulario && pacienteCriado.formulario.statusVencimento === 'VENCIDO' ? 1 : 0,
            dataUltimaAtualizacao: agoraFormatado,
            atualizadoPor: usuario.nome,
          };
        }
      });
    } else {
      // Se não possui formulário mas já existe paciente com o mesmo nome que possui, herda automaticamente
      const nomeNormalizado = normalizarTexto(pacienteCriado.nome);
      const homonimoComForm = lista.find(
        (p) => p.id !== pacienteCriado.id && normalizarTexto(p.nome) === nomeNormalizado && p.formulario
      );
      if (homonimoComForm && homonimoComForm.formulario) {
        pacienteCriado.formulario = { ...homonimoComForm.formulario };
        pacienteCriado.pendenciasQuantidade =
          homonimoComForm.formulario.statusVencimento === 'VENCIDO' ? 1 : 0;
      }
    }

    lista.unshift(pacienteCriado);
    this.persistirPacientes(lista);
    CloudSyncService.salvarPacienteNuvem(pacienteCriado).catch(() => {});

    // Registra evento de auditoria
    const evento: EventoAuditoria = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      dataHora: agoraFormatado,
      usuarioId: 'usr-sessao',
      usuarioNome: usuario.nome,
      papelUsuario: usuario.papel,
      acao: 'Criação de Paciente',
      entidade: 'PACIENTE',
      registroId: pacienteCriado.id,
      descricaoRegistro: `Paciente ${pacienteCriado.nome} (Prontuário ${pacienteCriado.codigoProntuario})`,
      campoAlterado: 'CADASTRO_COMPLETO',
      valorAnterior: 'NENHUM (NOVO REGISTRO)',
      valorNovo: `Criado com Convênio ${pacienteCriado.convenioNome}, Carteirinha ${mascararCarteirinha(pacienteCriado.carteirinhaAtual || '')}`,
      motivo: justificativaDuplicidade
        ? `Cadastro criado sob confirmação de duplicidade: ${justificativaDuplicidade}`
        : 'Inclusão cadastral no módulo mestre de pacientes V1',
    };

    this.gravarEventoAuditoria(evento);

    return { paciente: pacienteCriado, eventoAuditoria: evento };
  }

  /**
   * Atualiza dados cadastrais com trilha de auditoria para cada campo relevante modificado
   */
  static atualizarPaciente(
    id: string,
    camposAtualizados: Partial<Paciente>,
    usuario: { nome: string; papel: PapelUsuario },
    motivoGeral?: string
  ): { paciente: Paciente; eventosAuditoria: EventoAuditoria[] } {
    const lista = this.obterPacientes();
    const indice = lista.findIndex((p) => p.id === id);
    if (indice === -1) {
      throw new Error(`Paciente com ID ${id} não encontrado.`);
    }

    const pacienteAnterior = { ...lista[indice] };
    const agora = new Date();
    const agoraFormatado = `${formatIsoDate(agora)} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    const pacienteAtualizado: Paciente = {
      ...pacienteAnterior,
      ...camposAtualizados,
      dataUltimaAtualizacao: agoraFormatado,
      atualizadoPor: usuario.nome,
    };

    if (camposAtualizados.status === 'ENCERRADO' || camposAtualizados.status === 'INATIVO') {
      pacienteAtualizado.proximaAutorizacaoData = undefined;
    }

    if (camposAtualizados.cpf) {
      pacienteAtualizado.cpfMascarado = mascararCpf(camposAtualizados.cpf);
    }
    if (camposAtualizados.carteirinhaAtual) {
      pacienteAtualizado.carteirinha = camposAtualizados.carteirinhaAtual;
      pacienteAtualizado.carteirinhaAtualMascarada = mascararCarteirinha(camposAtualizados.carteirinhaAtual);
    }

    lista[indice] = pacienteAtualizado;

    // Se houve alteração/registro de formulário, propaga automaticamente para TODOS os pacientes com o mesmo nome
    if (camposAtualizados.formulario !== undefined) {
      const nomeAlvoNormalizado = normalizarTexto(pacienteAtualizado.nome);
      lista.forEach((p, idx) => {
        if (normalizarTexto(p.nome) === nomeAlvoNormalizado) {
          lista[idx] = {
            ...p,
            formulario: camposAtualizados.formulario ? { ...camposAtualizados.formulario } : undefined,
            pendenciasQuantidade:
              camposAtualizados.formulario && camposAtualizados.formulario.statusVencimento === 'VENCIDO'
                ? 1
                : 0,
            dataUltimaAtualizacao: agoraFormatado,
            atualizadoPor: usuario.nome,
          };
        }
      });
    }

    // Se houve alteração da data da Próxima Autorização, sincroniza no registro de autorizações ativas do paciente
    if (camposAtualizados.proximaAutorizacaoData !== undefined && typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawAuts = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
        if (rawAuts) {
          const auts = JSON.parse(rawAuts);
          if (Array.isArray(auts)) {
            let houveAjuste = false;
            const normNome = normalizarTexto(pacienteAtualizado.nome);
            const atualizadas = auts.map((a: any) => {
              const mesmoPac = a.pacienteId === pacienteAtualizado.id || normalizarTexto(a.pacienteNome || '') === normNome;
              if (mesmoPac) {
                houveAjuste = true;
                return {
                  ...a,
                  proximaAutorizacao: camposAtualizados.proximaAutorizacaoData,
                };
              }
              return a;
            });
            if (houveAjuste) {
              localStorage.setItem('clinica_mefisa_autorizacoes_v2', JSON.stringify(atualizadas));
            }
          }
        }
      } catch (errAut) {
        console.warn('Erro ao sincronizar proximaAutorizacaoData em autorizações:', errAut);
      }
    }

    this.persistirPacientes(lista);
    CloudSyncService.salvarPacienteNuvem(pacienteAtualizado).catch(() => {});

    // Gera auditoria para cada campo relevante alterado
    const eventos: EventoAuditoria[] = [];

    const camposParaAuditar: (keyof Paciente)[] = [
      'nome',
      'status',
      'cpf',
      'dataNascimento',
      'convenioNome',
      'procedimentoPrincipal',
      'prestadorId',
      'proximaAutorizacaoData',
    ];

    for (const campo of camposParaAuditar) {
      const vAnt = String((pacienteAnterior as any)[campo] || '');
      const vNov = String((camposAtualizados as any)[campo] || '');

      if (vNov !== '' && vNov !== undefined && vNov !== vAnt) {
        const ev: EventoAuditoria = {
          id: `aud-${Date.now()}-${campo}-${Math.random().toString(36).substring(2, 9)}`,
          dataHora: agoraFormatado,
          usuarioId: 'usr-sessao',
          usuarioNome: usuario.nome,
          papelUsuario: usuario.papel,
          acao: `Alteração de Campo (${campo})`,
          entidade: 'PACIENTE',
          registroId: pacienteAtualizado.id,
          descricaoRegistro: `Paciente ${pacienteAtualizado.nome} (${pacienteAtualizado.codigoProntuario})`,
          campoAlterado: campo,
          valorAnterior: campo === 'cpf' ? mascararCpf(vAnt) : vAnt,
          valorNovo: campo === 'cpf' ? mascararCpf(vNov) : vNov,
          motivo: motivoGeral || 'Atualização cadastral do paciente',
        };
        eventos.push(ev);
        this.gravarEventoAuditoria(ev);
      }
    }

    // Se nenhum campo individual gerou evento mas houve update (ex: observação)
    if (eventos.length === 0) {
      const ev: EventoAuditoria = {
        id: `aud-${Date.now()}-geral-${Math.random().toString(36).substring(2, 9)}`,
        dataHora: agoraFormatado,
        usuarioId: 'usr-sessao',
        usuarioNome: usuario.nome,
        papelUsuario: usuario.papel,
        acao: 'Atualização de Cadastro',
        entidade: 'PACIENTE',
        registroId: pacienteAtualizado.id,
        descricaoRegistro: `Paciente ${pacienteAtualizado.nome}`,
        campoAlterado: 'DADOS_GERAIS',
        valorAnterior: 'Cadastro prévio',
        valorNovo: 'Dados revisados',
        motivo: motivoGeral || 'Revisão cadastral',
      };
      eventos.push(ev);
      this.gravarEventoAuditoria(ev);
    }

    return { paciente: pacienteAtualizado, eventosAuditoria: eventos };
  }

  /**
   * Deleta uma lista de pacientes enviando-os para os Registros Deletados (Lixeira)
   */
  static deletarPacientes(
    idsParaDeletar: string[],
    usuario: { nome: string; papel: PapelUsuario }
  ): { deletadosCount: number } {
    if (!idsParaDeletar || idsParaDeletar.length === 0) return { deletadosCount: 0 };

    const lista = this.obterPacientes();
    const paraManter: Paciente[] = [];
    let deletadosCount = 0;

    const agora = new Date();
    const agoraFormatado = `${formatIsoDate(agora)} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    lista.forEach((p) => {
      if (idsParaDeletar.includes(p.id)) {
        deletadosCount++;

        // Envia para o repositório de Registros Deletados (Lixeira)
        DeletedRecordsService.adicionarRegistroDeletado({
          tipo: 'paciente',
          titulo: p.nome,
          subtitulo: `CPF: ${p.cpf || 'Não informado'} • Carteirinha: ${p.carteirinhaAtual || p.carteirinha || 'Sem N°'}`,
          detalhes: `Prontuário: ${p.codigoProntuario} • Convênio: ${p.convenioPrincipalNome || p.convenioNome || 'N/A'} • Polo: ${p.polo || 'Polo 1'} • Deletado por: ${usuario.nome}`,
          deletadoPor: usuario.nome,
          dadosOriginais: p,
        });

        // Evento de auditoria
        const ev: EventoAuditoria = {
          id: `aud-${Date.now()}-del-${Math.random().toString(36).substring(2, 9)}`,
          dataHora: agoraFormatado,
          usuarioId: 'usr-sessao',
          usuarioNome: usuario.nome,
          papelUsuario: usuario.papel,
          acao: 'Exclusão de Paciente',
          entidade: 'PACIENTE',
          registroId: p.id,
          descricaoRegistro: `Paciente ${p.nome} (${p.codigoProntuario})`,
          campoAlterado: 'STATUS_EXCLUSAO',
          valorAnterior: 'ATIVO',
          valorNovo: 'ENVIADO_PARA_REGISTROS_DELETADOS',
          motivo: 'Exclusão realizada na Gestão Mestre de Pacientes (Enviado para Lixeira)',
        };
        this.gravarEventoAuditoria(ev);
      } else {
        paraManter.push(p);
      }
    });

    this.persistirPacientes(paraManter);
    idsParaDeletar.forEach((id) => {
      CloudSyncService.removerPacienteNuvem(id).catch(() => {});
    });
    return { deletadosCount };
  }

  /**
   * REGRA DAS CARTEIRINHAS:
   * A carteirinha atual NÃO substitui a anterior; mantém histórico perpétuo.
   */
  static trocarCarteirinha(
    pacienteId: string,
    novaCarteirinhaDados: {
      convenioId: string;
      convenioNome: string;
      numeroCarteirinha: string;
      dataInicio: string;
      observacao?: string;
    },
    usuario: { nome: string; papel: PapelUsuario }
  ): { paciente: Paciente; eventoAuditoria: EventoAuditoria } {
    const lista = this.obterPacientes();
    const indice = lista.findIndex((p) => p.id === pacienteId);
    if (indice === -1) {
      throw new Error(`Paciente com ID ${pacienteId} não encontrado.`);
    }

    const paciente = lista[indice];
    const agora = new Date();
    const agoraFormatado = `${formatIsoDate(agora)} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    const carteirinhaAnteriorNumero = paciente.carteirinhaAtual || paciente.carteirinha || '';

    // Encerra carteirinhas ativas anteriores
    const historicoAtualizado: HistoricoCarteirinha[] = (paciente.carteirinhas || []).map((c) => {
      if (c.status === 'ATUAL') {
        return {
          ...c,
          status: 'ENCERRADA' as const,
          dataFim: novaCarteirinhaDados.dataInicio || formatIsoDate(agora),
        };
      }
      return c;
    });

    // Cria a nova carteirinha
    const novaCart: HistoricoCarteirinha = {
      id: `cart-${Date.now()}`,
      convenioId: novaCarteirinhaDados.convenioId,
      convenioNome: novaCarteirinhaDados.convenioNome,
      numeroCarteirinha: novaCarteirinhaDados.numeroCarteirinha,
      dataInicio: novaCarteirinhaDados.dataInicio || formatIsoDate(agora),
      status: 'ATUAL',
      observacao: novaCarteirinhaDados.observacao || 'Atualização de carteirinha',
      criadoPorUsuario: usuario.nome,
      criadoEm: agoraFormatado,
    };

    historicoAtualizado.push(novaCart);

    paciente.carteirinhas = historicoAtualizado;
    paciente.carteirinha = novaCarteirinhaDados.numeroCarteirinha;
    paciente.carteirinhaAtual = novaCarteirinhaDados.numeroCarteirinha;
    paciente.carteirinhaAtualMascarada = mascararCarteirinha(novaCarteirinhaDados.numeroCarteirinha);
    paciente.convenioId = novaCarteirinhaDados.convenioId;
    paciente.convenioNome = novaCarteirinhaDados.convenioNome;
    paciente.convenioPrincipalId = novaCarteirinhaDados.convenioId;
    paciente.convenioPrincipalNome = novaCarteirinhaDados.convenioNome;
    paciente.dataUltimaAtualizacao = agoraFormatado;
    paciente.atualizadoPor = usuario.nome;

    lista[indice] = paciente;
    this.persistirPacientes(lista);
    CloudSyncService.salvarPacienteNuvem(paciente).catch(() => {});

    const evento: EventoAuditoria = {
      id: `aud-${Date.now()}-cart-${Math.random().toString(36).substring(2, 9)}`,
      dataHora: agoraFormatado,
      usuarioId: 'usr-sessao',
      usuarioNome: usuario.nome,
      papelUsuario: usuario.papel,
      acao: 'Troca de Carteirinha / Convênio',
      entidade: 'PACIENTE',
      registroId: paciente.id,
      descricaoRegistro: `Paciente ${paciente.nome} (${paciente.codigoProntuario})`,
      campoAlterado: 'carteirinhaAtual',
      valorAnterior: `${mascararCarteirinha(carteirinhaAnteriorNumero)} (${paciente.convenioNome})`,
      valorNovo: `${mascararCarteirinha(novaCarteirinhaDados.numeroCarteirinha)} (${novaCarteirinhaDados.convenioNome})`,
      motivo: novaCarteirinhaDados.observacao || 'Substituição de carteirinha com preservação do histórico',
    };

    this.gravarEventoAuditoria(evento);

    return { paciente, eventoAuditoria: evento };
  }

  /**
   * REGRA DOS RESPONSÁVEIS LEGAIS:
   * Suporte a múltiplos responsáveis, alteração de responsável principal e auditoria.
   */
  static atualizarResponsaveis(
    pacienteId: string,
    novosResponsaveis: ResponsavelLegal[],
    usuario: { nome: string; papel: PapelUsuario },
    motivo?: string
  ): { paciente: Paciente; eventoAuditoria: EventoAuditoria } {
    const lista = this.obterPacientes();
    const indice = lista.findIndex((p) => p.id === pacienteId);
    if (indice === -1) {
      throw new Error(`Paciente com ID ${pacienteId} não encontrado.`);
    }

    const paciente = lista[indice];
    const agora = new Date();
    const agoraFormatado = `${formatIsoDate(agora)} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    const principal = novosResponsaveis.find((r) => r.principal) || novosResponsaveis[0];

    const respAnterioresStr = (paciente.responsaveis || [])
      .map((r) => `${r.nome} (${r.parentesco}${r.principal ? ' - Principal' : ''})`)
      .join(', ');

    const respNovosStr = novosResponsaveis
      .map((r) => `${r.nome} (${r.parentesco}${r.principal ? ' - Principal' : ''})`)
      .join(', ');

    paciente.responsaveis = novosResponsaveis;
    paciente.responsavelPrincipalNome = principal
      ? `${principal.nome} (${principal.parentesco})`
      : 'Não informado';
    paciente.responsavelNome = principal ? principal.nome : 'Não informado';
    paciente.dataUltimaAtualizacao = agoraFormatado;
    paciente.atualizadoPor = usuario.nome;

    lista[indice] = paciente;
    this.persistirPacientes(lista);

    const evento: EventoAuditoria = {
      id: `aud-${Date.now()}-resp-${Math.random().toString(36).substring(2, 9)}`,
      dataHora: agoraFormatado,
      usuarioId: 'usr-sessao',
      usuarioNome: usuario.nome,
      papelUsuario: usuario.papel,
      acao: 'Atualização de Responsáveis Legais',
      entidade: 'PACIENTE',
      registroId: paciente.id,
      descricaoRegistro: `Paciente ${paciente.nome} (${paciente.codigoProntuario})`,
      campoAlterado: 'responsaveis',
      valorAnterior: respAnterioresStr || 'Nenhum',
      valorNovo: respNovosStr || 'Nenhum',
      motivo: motivo || 'Gestão de responsáveis legais do paciente',
    };

    this.gravarEventoAuditoria(evento);

    return { paciente, eventoAuditoria: evento };
  }

  /**
   * Vincula ou atualiza o formulário do paciente (.pdf ou .jpeg com 180 dias de validade)
   */
  static vincularFormulario(
    pacienteId: string,
    formularioDados: {
      nomeArquivo: string;
      tipoArquivo: 'pdf' | 'jpeg';
      tamanhoKb: number;
      dataEmissao: string;
    },
    usuario: { nome: string; papel: PapelUsuario }
  ): { paciente: Paciente; eventoAuditoria: EventoAuditoria } {
    const lista = this.obterPacientes();
    const indice = lista.findIndex((p) => p.id === pacienteId);
    if (indice === -1) {
      throw new Error(`Paciente com ID ${pacienteId} não encontrado.`);
    }

    const pacienteAlvo = lista[indice];
    const nomeAlvoNormalizado = normalizarTexto(pacienteAlvo.nome);
    const calculoVenc = calcularVencimentoFormulario(formularioDados.dataEmissao);

    const agora = new Date();
    const agoraFormatado = `${formatIsoDate(agora)} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    const formularioCompleto: FormularioCadastroPaciente = {
      nomeArquivo: formularioDados.nomeArquivo,
      tipoArquivo: formularioDados.tipoArquivo,
      tamanhoKb: formularioDados.tamanhoKb,
      dataEmissao: formularioDados.dataEmissao,
      dataVencimento: calculoVenc.dataVencimento,
      statusVencimento: calculoVenc.status,
      diasRestantes: calculoVenc.diasRestantes,
    };

    // Propagar o formulário para TODOS os pacientes na lista que possuem o mesmo nome
    lista.forEach((p, idx) => {
      if (normalizarTexto(p.nome) === nomeAlvoNormalizado) {
        lista[idx] = {
          ...p,
          formulario: formularioCompleto,
          dataUltimaAtualizacao: agoraFormatado,
          atualizadoPor: usuario.nome,
        };
      }
    });

    this.persistirPacientes(lista);

    const evento: EventoAuditoria = {
      id: `aud-${Date.now()}-form-${Math.random().toString(36).substring(2, 9)}`,
      dataHora: agoraFormatado,
      usuarioId: 'usr-sessao',
      usuarioNome: usuario.nome,
      papelUsuario: usuario.papel,
      acao: 'Vínculo de Formulário Cadastral (Propagado para homônimos)',
      entidade: 'PACIENTE',
      registroId: pacienteAlvo.id,
      descricaoRegistro: `Paciente ${pacienteAlvo.nome} (Sincronizado para todos com este nome)`,
      campoAlterado: 'formulario',
      valorAnterior: pacienteAlvo.formulario ? pacienteAlvo.formulario.nomeArquivo : 'Nenhum',
      valorNovo: `${formularioDados.nomeArquivo} (Emissão: ${formularioDados.dataEmissao}, Vencimento 180d: ${calculoVenc.dataVencimento})`,
      motivo: 'Registro de documento com validade de 6 meses (180 dias) propagado para homônimos',
    };

    this.gravarEventoAuditoria(evento);

    return { paciente: lista[indice], eventoAuditoria: evento };
  }

  /**
   * FILTRAGEM DETERMINÍSTICA LOCAL POR USUÁRIO:
   * Busca e filtros são executados na sessão local do usuário.
   */
  static filtrarPacientes(pacientes: Paciente[], filtros: FiltroPacientesUsuario): Paciente[] {
    const t = normalizarTexto(filtros.busca || '');

    return pacientes.filter((pac) => {
      // 1. Filtro de Status
      if (filtros.status && filtros.status !== 'TODOS' && pac.status !== filtros.status) {
        return false;
      }

      // 2. Filtro de Convênio
      if (filtros.convenioId && filtros.convenioId !== 'TODOS') {
        const cId = pac.convenioPrincipalId || pac.convenioId;
        const cNome = (pac.convenioPrincipalNome || pac.convenioNome || '').toLowerCase();
        if (cId !== filtros.convenioId && !cNome.includes(filtros.convenioId.toLowerCase())) {
          return false;
        }
      }

      // 3. Filtro de Autorizações Atrasadas (Próxima Autorização antes da data atual)
      if (filtros.autorizacoesAtrasadasApenas && !isAutorizacaoAtrasada(pac)) {
        return false;
      }

      // 4. Filtro de Pendências
      if (filtros.comPendenciasApenas && (!pac.pendenciasQuantidade || pac.pendenciasQuantidade <= 0)) {
        return false;
      }

      // 5. Filtro de Formulário Vencido
      if (filtros.formularioVencidoApenas && !isFormularioVencido(pac)) {
        return false;
      }

      // 5. Busca rápida por: Nome, Carteirinha, CPF, Prontuário, Responsável, Convênio, Procedimento, Prestador
      if (!t) return true;

      const tDigits = t.replace(/\D/g, '');

      const nomeMatch = normalizarTexto(pac.nome || '').includes(t);
      const carteirinhaMatch = normalizarTexto(pac.carteirinhaAtual || pac.carteirinha || '').includes(t);
      const prontuarioMatch = normalizarTexto(pac.codigoProntuario || '').includes(t);
      const cpfMatch = tDigits.length >= 3 && (pac.cpf || '').replace(/\D/g, '').includes(tDigits);

      const respMatch = (pac.responsaveis || []).some((r) =>
        normalizarTexto(r.nome || '').includes(t)
      ) || normalizarTexto(pac.responsavelNome || pac.responsavelPrincipalNome || '').includes(t);

      const convenioMatch = normalizarTexto(pac.convenioPrincipalNome || pac.convenioNome || '').includes(t);
      const procedimentoMatch = normalizarTexto(pac.procedimentoPrincipal || '').includes(t);
      const prestadorMatch = normalizarTexto(pac.prestadorNome || '').includes(t);

      return nomeMatch || carteirinhaMatch || prontuarioMatch || cpfMatch || respMatch || convenioMatch || procedimentoMatch || prestadorMatch;
    });
  }

  /**
   * ISOLAMENTO DE FILTROS POR USUÁRIO:
   * Garante que os filtros selecionados por uma funcionária (ex: Ana) NÃO afetem a tela de outra (ex: Maria Clara).
   */
  static obterFiltroUsuario(usuarioId: string): FiltroPacientesUsuario {
    const padrao: FiltroPacientesUsuario = {
      busca: '',
      status: 'TODOS',
      convenioId: 'TODOS',
      comPendenciasApenas: false,
      formularioVencidoApenas: false,
    };
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = window.sessionStorage.getItem(`${STORAGE_FILTROS_PREFIX}${usuarioId}`);
        if (raw) return JSON.parse(raw);
      }
      if (memoriaFiltrosPorUsuario[usuarioId]) {
        return memoriaFiltrosPorUsuario[usuarioId];
      }
      return padrao;
    } catch {
      return memoriaFiltrosPorUsuario[usuarioId] || padrao;
    }
  }

  static salvarFiltroUsuario(usuarioId: string, filtro: FiltroPacientesUsuario): void {
    memoriaFiltrosPorUsuario[usuarioId] = filtro;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(`${STORAGE_FILTROS_PREFIX}${usuarioId}`, JSON.stringify(filtro));
      }
    } catch {
      // Ignora erro de sessionStorage restrito
    }
  }

  /**
   * Persiste evento de auditoria no repositório de auditoria geral
   */
  private static gravarEventoAuditoria(evento: EventoAuditoria): void {
    // Garante que o evento tenha um ID único
    if (!evento.id || memoriaAuditoria.some((e) => e.id === evento.id)) {
      evento.id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    memoriaAuditoria.unshift(evento);

    // Registra no AuditoriaService Central
    AuditoriaService.registrarAcao({
      usuario: {
        id: evento.usuarioId || 'usr-sessao',
        nome: evento.usuarioNome,
        papel: evento.papelUsuario,
      },
      acao: evento.acao,
      entidade: 'PACIENTE',
      registroId: evento.registroId,
      descricaoRegistro: evento.descricaoRegistro,
      campoAlterado: evento.campoAlterado,
      valorAnterior: evento.valorAnterior,
      valorNovo: evento.valorNovo,
      motivo: evento.motivo,
    });

    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = localStorage.getItem(STORAGE_AUDITORIA_KEY);
      const lista: EventoAuditoria[] = raw ? JSON.parse(raw) : [];
      const vistos = new Set<string>();
      const listaUnica: EventoAuditoria[] = [];
      [evento, ...lista].forEach((item) => {
        if (item && item.id && !vistos.has(item.id)) {
          vistos.add(item.id);
          listaUnica.push(item);
        }
      });
      localStorage.setItem(STORAGE_AUDITORIA_KEY, JSON.stringify(listaUnica.slice(0, 200)));
    } catch {
      // Ignora erro de storage
    }
  }

  static obterAuditoriaPacientes(): EventoAuditoria[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return memoriaAuditoria;
      const raw = localStorage.getItem(STORAGE_AUDITORIA_KEY);
      const lista: EventoAuditoria[] = raw ? JSON.parse(raw) : [];
      const vistos = new Set<string>();
      const listaDeduplicada: EventoAuditoria[] = [];
      lista.forEach((item, idx) => {
        if (!item.id || vistos.has(item.id)) {
          item.id = `${item.id || 'aud'}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        }
        vistos.add(item.id);
        listaDeduplicada.push(item);
      });
      return listaDeduplicada;
    } catch {
      return memoriaAuditoria;
    }
  }
}
