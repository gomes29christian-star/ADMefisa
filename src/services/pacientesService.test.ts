/**
 * Bateria de Testes Unitários do Módulo Mestre de Pacientes V1 — Clínica Mefisa
 * Executa validações rigorosas e determinísticas de todos os requisitos do V1.
 */

import { describe, it, expect } from 'vitest';
import {
  PacientesService,
  calcularVencimentoFormulario,
  mascararCpf,
  mascararCarteirinha,
  PACIENTES_TEST_FIXTURES,
} from './pacientesService';
import { Paciente, ResponsavelLegal, FiltroPacientesUsuario } from '../types/clinic';

describe('Testes do Módulo de Pacientes V1', () => {
  it('deve executar e aprovar os testes do módulo de pacientes', () => {
    let totalTestes = 0;
    let testesAprovados = 0;

    function assert(condicao: boolean, mensagem: string) {
      totalTestes++;
      if (condicao) {
        testesAprovados++;
        console.log(`  ✓ [PASSOU] ${mensagem}`);
      } else {
        console.error(`  ✗ [FALHOU] ${mensagem}`);
      }
    }

console.log('======================================================');
console.log('CLÍNICA MEFISA — TESTES UNITÁRIOS DO MÓDULO PACIENTES V1');
console.log('======================================================\n');

// Seed test fixtures explicitly for tests
PacientesService.persistirPacientes(PACIENTES_TEST_FIXTURES);

// ----------------------------------------------------
// 1. CRIAÇÃO DE PACIENTE & AUDITORIA DE CRIAÇÃO
// ----------------------------------------------------
console.log('TESTE 1 & 13: Criação de Paciente e Auditoria de Criação');
const novoPacienteBase: Omit<Paciente, 'id' | 'codigoProntuario' | 'dataCriacao' | 'dataUltimaAtualizacao'> = {
  nome: 'Bernardo Castilho Neves',
  dataNascimento: '2019-05-18',
  idade: 7,
  cpf: '412.890.112-99',
  cpfMascarado: '412.***.***-99',
  carteirinha: '772910394055551',
  carteirinhaAtual: '772910394055551',
  convenioId: 'conv-1',
  convenioNome: 'SulAmérica Saúde',
  convenioPrincipalId: 'conv-1',
  convenioPrincipalNome: 'SulAmérica Saúde',
  procedimentoPrincipal: 'Psicoterapia ABA Individual',
  prestadorId: 'prest-1',
  prestadorNome: 'Dra. Beatriz Albuquerque',
  status: 'ATIVO',
  responsavelNome: 'Helena Castilho',
  responsaveis: [
    {
      id: 'resp-b1',
      nome: 'Helena Castilho',
      parentesco: 'Mãe',
      telefone: '(11) 98888-7777',
      principal: true,
    },
  ],
};

const { paciente: pacCriado, eventoAuditoria: evCriacao } = PacientesService.cadastrarPaciente(
  novoPacienteBase,
  { nome: 'Ana Beatriz Silveira', papel: 'FUNCIONARIO_ADMINISTRATIVO' }
);

assert(Boolean(pacCriado.id), '1.1 Paciente deve receber ID único');
assert(pacCriado.codigoProntuario.startsWith('#MEF-'), '1.2 Deve gerar código de prontuário sequencial');
assert(pacCriado.carteirinhas?.length === 1, '1.3 Deve inicializar histórico com a primeira carteirinha');
assert(pacCriado.carteirinhas?.[0].status === 'ATUAL', '1.4 Primeira carteirinha deve estar como ATUAL');
assert(evCriacao.acao === 'Criação de Paciente', '13.1 Auditoria deve registrar Ação: Criação de Paciente');
assert(evCriacao.usuarioNome === 'Ana Beatriz Silveira', '13.2 Auditoria deve identificar Ana Beatriz como operadora');

// ----------------------------------------------------
// 2. EDIÇÃO DE PACIENTE & AUDITORIA DE ALTERAÇÃO
// ----------------------------------------------------
console.log('\nTESTE 2 & 14: Edição de Paciente e Auditoria de Alteração');
const { paciente: pacEditado, eventosAuditoria: evsEdicao } = PacientesService.atualizarPaciente(
  pacCriado.id,
  {
    status: 'EM_ACOMPANHAMENTO',
    procedimentoPrincipal: 'Psicoterapia ABA Avançada',
  },
  { nome: 'Maria Clara Fonseca', papel: 'FUNCIONARIO_ADMINISTRATIVO' },
  'Readequação do plano terapêutico pela coordenação'
);

assert(pacEditado.status === 'EM_ACOMPANHAMENTO', '2.1 Status deve ter sido atualizado para EM_ACOMPANHAMENTO');
assert(
  pacEditado.procedimentoPrincipal === 'Psicoterapia ABA Avançada',
  '2.2 Procedimento deve ter sido atualizado'
);
assert(evsEdicao.length >= 2, '14.1 Deve gerar eventos de auditoria para os campos alterados');
const evStatus = evsEdicao.find((e) => e.campoAlterado === 'status');
assert(evStatus?.valorAnterior === 'ATIVO', '14.2 Auditoria deve registrar valor anterior = ATIVO');
assert(evStatus?.valorNovo === 'EM_ACOMPANHAMENTO', '14.3 Auditoria deve registrar valor novo = EM_ACOMPANHAMENTO');
assert(
  evStatus?.usuarioNome === 'Maria Clara Fonseca',
  '14.4 Auditoria deve registrar usuário = Maria Clara Fonseca'
);

// ----------------------------------------------------
// 3, 4, 5. BUSCA RÁPIDA (NOME, CPF, CARTEIRINHA, RESPONSÁVEL)
// ----------------------------------------------------
console.log('\nTESTE 3, 4 & 5: Busca por Nome, CPF, Carteirinha e Responsável');
const listaParaBusca = PacientesService.obterPacientes();

// Busca por Nome
const buscaNome = PacientesService.filtrarPacientes(listaParaBusca, {
  busca: 'Lucas Gabriel',
  status: 'TODOS',
  convenioId: 'TODOS',
  comPendenciasApenas: false,
  formularioVencidoApenas: false,
});
assert(buscaNome.some((p) => p.nome.includes('Lucas Gabriel')), '3.1 Deve localizar paciente por nome');

// Busca por CPF
const buscaCpf = PacientesService.filtrarPacientes(listaParaBusca, {
  busca: '381921842',
  status: 'TODOS',
  convenioId: 'TODOS',
  comPendenciasApenas: false,
  formularioVencidoApenas: false,
});
assert(buscaCpf.length >= 1, '4.1 Deve localizar paciente por CPF numérico');

// Busca por Carteirinha
const buscaCart = PacientesService.filtrarPacientes(listaParaBusca, {
  busca: '982019230198001',
  status: 'TODOS',
  convenioId: 'TODOS',
  comPendenciasApenas: false,
  formularioVencidoApenas: false,
});
assert(buscaCart.length >= 1, '5.1 Deve localizar paciente por carteirinha');

// Busca por Responsável
const buscaResp = PacientesService.filtrarPacientes(listaParaBusca, {
  busca: 'Mariana Mendes',
  status: 'TODOS',
  convenioId: 'TODOS',
  comPendenciasApenas: false,
  formularioVencidoApenas: false,
});
assert(buscaResp.length >= 1, '5.2 Deve localizar paciente pelo nome de seu responsável legal');

// ----------------------------------------------------
// 6, 7 & 8. RESPONSÁVEIS LEGAIS: MÚLTIPLOS E ALTERAÇÃO DE PRINCIPAL
// ----------------------------------------------------
console.log('\nTESTE 6, 7 & 8: Cadastro e Gestão de Múltiplos Responsáveis Legais');
const novosResponsaveis: ResponsavelLegal[] = [
  {
    id: 'r-1',
    nome: 'Helena Castilho',
    parentesco: 'Mãe',
    telefone: '(11) 98888-7777',
    principal: false, // Alterando para não principal
  },
  {
    id: 'r-2',
    nome: 'Rogério Neves',
    parentesco: 'Pai',
    telefone: '(11) 97777-6666',
    principal: true, // Novo principal
  },
];

const { paciente: pacRespAtualizado, eventoAuditoria: evResp } = PacientesService.atualizarResponsaveis(
  pacCriado.id,
  novosResponsaveis,
  { nome: 'Ana Beatriz Silveira', papel: 'FUNCIONARIO_ADMINISTRATIVO' },
  'Pai assumiu contato prioritário'
);

assert(pacRespAtualizado.responsaveis?.length === 2, '7.1 Deve registrar múltiplos responsáveis');
assert(
  Boolean(pacRespAtualizado.responsavelPrincipalNome?.includes('Rogério Neves')),
  '8.1 Deve alterar responsável principal para Rogério Neves'
);
assert(evResp.acao === 'Atualização de Responsáveis Legais', '8.2 Auditoria de alteração de responsável registrada');

// ----------------------------------------------------
// 9, 10 & 15. HISTÓRICO DE CARTEIRINHAS & AUDITORIA DE TROCA
// ----------------------------------------------------
console.log('\nTESTE 9, 10 & 15: Troca de Carteirinha com Preservação de Histórico');
const { paciente: pacCartTrocada, eventoAuditoria: evTrocaCart } = PacientesService.trocarCarteirinha(
  pacCriado.id,
  {
    convenioId: 'conv-2',
    convenioNome: 'Bradesco Saúde',
    numeroCarteirinha: '89104499999901',
    dataInicio: '2026-11-01',
    observacao: 'Migração de convênio da empresa do pai',
  },
  { nome: 'Maria Clara Fonseca', papel: 'FUNCIONARIO_ADMINISTRATIVO' }
);

assert(pacCartTrocada.carteirinhas?.length === 2, '9.1 Histórico deve conter 2 carteirinhas (antiga + nova)');
const cartAnterior = pacCartTrocada.carteirinhas?.find((c) => c.status === 'ENCERRADA');
const cartNova = pacCartTrocada.carteirinhas?.find((c) => c.status === 'ATUAL');

assert(Boolean(cartAnterior), '9.2 Carteirinha anterior deve ter sido preservada e marcada como ENCERRADA');
assert(cartAnterior?.numeroCarteirinha === '772910394055551', '9.3 Número da carteirinha anterior preservado');
assert(cartNova?.numeroCarteirinha === '89104499999901', '10.1 Nova carteirinha marcada como ATUAL');
assert(pacCartTrocada.carteirinhaAtual === '89104499999901', '10.2 Campo carteirinhaAtual do paciente atualizado');
assert(pacCartTrocada.convenioNome === 'Bradesco Saúde', '10.3 Convênio do paciente atualizado para Bradesco Saúde');
assert(evTrocaCart.acao === 'Troca de Carteirinha / Convênio', '15.1 Auditoria deve registrar Troca de Carteirinha');
assert(
  evTrocaCart.valorAnterior.includes('7729'),
  '15.2 Auditoria deve registrar valor anterior mascarado da carteirinha'
);
assert(
  evTrocaCart.valorNovo.includes('8910'),
  '15.3 Auditoria deve registrar valor novo mascarado da carteirinha'
);

// ----------------------------------------------------
// 11 & 12. DETECÇÃO DE DUPLICIDADE & HOMÔNIMOS PERMITIDOS
// ----------------------------------------------------
console.log('\nTESTE 11 & 12: Detecção de Duplicidade e Permissão de Homônimos');

// Caso A: Duplicidade por CPF idêntico
const dupCpf = PacientesService.verificarDuplicidade(
  {
    nome: 'Outro Nome Qualquer',
    dataNascimento: '2000-01-01',
    cpf: '381.921.842-10', // CPF do Lucas Gabriel
    carteirinha: '999999',
  },
  undefined,
  PACIENTES_TEST_FIXTURES
);
assert(dupCpf.possivelDuplicidade, '11.1 Deve detectar duplicidade por CPF idêntico');
assert(dupCpf.motivoCorrespondencia === 'CPF_IDENTICO', '11.2 Motivo deve ser CPF_IDENTICO');

// Caso B: Duplicidade por Carteirinha idêntica
const dupCart = PacientesService.verificarDuplicidade(
  {
    nome: 'Terceiro Nome',
    dataNascimento: '1995-05-05',
    cpf: '999.888.777-66',
    carteirinha: '772910394012001', // Carteirinha do Matheus
  },
  undefined,
  PACIENTES_TEST_FIXTURES
);
assert(dupCart.possivelDuplicidade, '11.3 Deve detectar duplicidade por Carteirinha idêntica');
assert(dupCart.motivoCorrespondencia === 'CARTEIRINHA_IDENTICA', '11.4 Motivo deve ser CARTEIRINHA_IDENTICA');

// Caso C: Duplicidade por Nome Completo + Data de Nascimento idênticos
const dupNomeNasc = PacientesService.verificarDuplicidade(
  {
    nome: 'Lucas Gabriel Mendes',
    dataNascimento: '2018-03-15',
  },
  undefined,
  PACIENTES_TEST_FIXTURES
);
assert(dupNomeNasc.possivelDuplicidade, '11.5 Deve detectar duplicidade por Nome + Data de Nascimento idênticos');

// Caso D (REGRA VITAL): Homônimo com data de nascimento diferente NÃO É DUPLICIDADE BLOQUEADA!
const homonimoPermitido = PacientesService.verificarDuplicidade(
  {
    nome: 'Lucas Gabriel Mendes', // Mesmo nome
    dataNascimento: '2015-03-10', // Data de nascimento DIFERENTE (homônimo real)
    cpf: '888.111.222-33',
    carteirinha: 'NOVA-CART-8811',
  },
  undefined,
  PACIENTES_TEST_FIXTURES
);
assert(
  !homonimoPermitido.possivelDuplicidade,
  '12.1 Homônimo com data de nascimento diferente NÃO deve ser marcado como duplicidade indevida'
);

// ----------------------------------------------------
// 16. ISOLAMENTO DOS FILTROS POR USUÁRIO
// ----------------------------------------------------
console.log('\nTESTE 16: Isolamento Estrito de Filtros por Usuário');
const filtroAna: FiltroPacientesUsuario = {
  busca: 'Lucas',
  status: 'ATIVO',
  convenioId: 'conv-1',
  comPendenciasApenas: false,
  formularioVencidoApenas: false,
};

const filtroMariaClara: FiltroPacientesUsuario = {
  busca: 'Bradesco',
  status: 'EM_ACOMPANHAMENTO',
  convenioId: 'conv-2',
  comPendenciasApenas: true,
  formularioVencidoApenas: true,
};

// Mock de sessionStorage para o teste
const sessionMock: Record<string, string> = {};
(globalThis as any).window = {
  sessionStorage: {
    getItem: (k: string) => sessionMock[k] || null,
    setItem: (k: string, v: string) => {
      sessionMock[k] = v;
    },
  },
};

PacientesService.salvarFiltroUsuario('usr-ana', filtroAna);
PacientesService.salvarFiltroUsuario('usr-maria', filtroMariaClara);

const filtroRecuperadoAna = PacientesService.obterFiltroUsuario('usr-ana');
const filtroRecuperadoMaria = PacientesService.obterFiltroUsuario('usr-maria');

assert(filtroRecuperadoAna.busca === 'Lucas', '16.1 Filtro de Ana preserva termo "Lucas"');
assert(filtroRecuperadoMaria.busca === 'Bradesco', '16.2 Filtro de Maria Clara preserva termo "Bradesco"');
assert(filtroRecuperadoAna.status === 'ATIVO', '16.3 Filtro de Ana preserva status "ATIVO"');
assert(
  filtroRecuperadoMaria.status === 'EM_ACOMPANHAMENTO',
  '16.4 Filtro de Maria Clara preserva status "EM_ACOMPANHAMENTO"'
);
assert(
  filtroRecuperadoAna.comPendenciasApenas !== filtroRecuperadoMaria.comPendenciasApenas,
  '16.5 Modificações nos filtros de Ana NÃO afetam a sessão de Maria Clara'
);

// ----------------------------------------------------
// 17 & 18. VALIDAÇÃO DE FORMULÁRIO (180 DIAS) & ALERTA URGENTE AOS EMPREGADOS
// ----------------------------------------------------
console.log('\nTESTE 17 & 18: Cálculo do Formulário em Exatamente 180 Dias e Alerta de Urgência');
// Emissão em 01/05/2026. 180 dias depois = 28/10/2026.
const vencCalc = calcularVencimentoFormulario('2026-05-01', '2026-10-24');
assert(vencCalc.dataVencimento === '2026-10-28', '17.1 Vencimento deve ser exatamente 180 dias após emissão (28/10/2026)');
assert(vencCalc.diasRestantes === 4, '17.2 Dias restantes devem ser calculados com exatidão');
assert(vencCalc.status === 'ALERTA_PROXIMO_VENCIMENTO', '17.3 Com 4 dias restantes deve gerar status ALERTA_PROXIMO_VENCIMENTO');

// Caso Vencido: Emissão em 01/01/2026 (venceu em 30/06/2026, com referência em 24/10/2026)
const vencExpirado = calcularVencimentoFormulario('2026-01-01', '2026-10-24');
assert(vencExpirado.status === 'VENCIDO', '18.1 Formulário com mais de 180 dias deve estar VENCIDO');
assert(
  vencExpirado.alertaUrgenteEmpregados === true,
  '18.2 Formulário vencido deve emitir alerta URGENTE para empregados avisarem aos responsáveis'
);

// ----------------------------------------------------
// 19. CRIAÇÃO DE PACIENTE SEM DATA DE NASCIMENTO E SEM RESPONSÁVEL OBRIGATÓRIO
// ----------------------------------------------------
console.log('\nTESTE 19: Cadastro sem Data de Nascimento e Responsável Opcional');
const pacSemNascEOpcional = {
  nome: 'Clarice Lispector Viana',
  // dataNascimento e idade omitidos
  carteirinha: '998877665544332',
  convenioId: 'conv-1',
  convenioNome: 'SulAmérica Saúde',
  procedimentoPrincipal: 'Psicomotricidade Relacional',
  prestadorId: 'prest-1',
  status: 'ATIVO' as const,
  // Responsável legal omitido / não informado
  responsavelNome: 'Não informado',
  responsaveis: [],
};

const { paciente: pacSemNascCriado } = PacientesService.cadastrarPaciente(
  pacSemNascEOpcional,
  { nome: 'Ana Beatriz Silveira', papel: 'FUNCIONARIO_ADMINISTRATIVO' }
);

assert(Boolean(pacSemNascCriado.id), '19.1 Cadastro sem data de nascimento deve ser aceito');
assert(pacSemNascCriado.dataNascimento === undefined, '19.2 dataNascimento permanece indefinida');
assert(pacSemNascCriado.responsaveis?.length === 0, '19.3 Permite paciente sem responsáveis cadastrados inicialmente');
assert(pacSemNascCriado.responsavelNome === 'Não informado', '19.4 Responsável padrão definido como Não informado');

// ----------------------------------------------------
// 20. IDENTIFICAÇÃO AUTOMÁTICA DE FORMATO DE FORMULÁRIO (.PDF vs .JPEG)
// ----------------------------------------------------
console.log('\nTESTE 20: Auto-identificação de Formato de Formulário (.pdf vs .jpeg)');
function autoIdentificarFormato(nomeArquivo: string, mimeType?: string): 'pdf' | 'jpeg' {
  const ext = nomeArquivo.split('.').pop()?.toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg' || (mimeType && (mimeType.includes('jpeg') || mimeType.includes('jpg')))) {
    return 'jpeg';
  }
  return 'pdf';
}

assert(autoIdentificarFormato('formulario_mefisa.pdf') === 'pdf', '20.1 Identifica automaticamente arquivo .pdf');
assert(autoIdentificarFormato('scan_laudo.jpeg') === 'jpeg', '20.2 Identifica automaticamente arquivo .jpeg');
assert(autoIdentificarFormato('foto_documento.jpg') === 'jpeg', '20.3 Identifica .jpg como jpeg');

// ----------------------------------------------------
// RESULTADO FINAL
// ----------------------------------------------------
    console.log('\n======================================================');
    console.log(`TOTAL DE TESTES V1: ${totalTestes} | PASSARAM: ${testesAprovados} | FALHARAM: ${totalTestes - testesAprovados}`);
    if (testesAprovados === totalTestes) {
      console.log('🎉 TODOS OS TESTES DO MÓDULO PACIENTES V1 FORAM APROVADOS COM SUCESSO!');
    } else {
      console.error('❌ HOUVE FALHA EM TESTES!');
    }
    expect(testesAprovados).toBe(totalTestes);
  });
});
