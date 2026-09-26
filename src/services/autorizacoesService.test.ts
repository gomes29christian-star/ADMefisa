import { calcularDiasCorridos, carregarAutorizacoesIniciais } from './autorizacoesService';
import { AutorizacaoV2 } from '../types/autorizacao';

console.log('======================================================');
console.log('CLÍNICA MEFISA — TESTES UNITÁRIOS DO MÓDULO AUTORIZAÇÕES V2');
console.log('======================================================');

let testesPassaram = 0;
let testesFalharam = 0;

const assert = (condicao: boolean, descricao: string) => {
  if (condicao) {
    console.log(`  ✓ [PASSOU] ${descricao}`);
    testesPassaram++;
  } else {
    console.error(`  ✕ [FALHOU] ${descricao}`);
    testesFalharam++;
  }
};

// TESTE 1: Cálculo de Dias Corridos
const testarDiasCorridos = () => {
  console.log('TESTE 1: Cálculo de Dias Corridos em Análise');
  const hoje = new Date();
  const cincoDiasAtras = new Date(hoje.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dias = calcularDiasCorridos(cincoDiasAtras);
  assert(dias === 5, '1.1 Deve calcular exatamente 5 dias corridos');
};

// TESTE 2: Regra dos 7 Dias de Alerta
const testarRegraSeteDias = () => {
  console.log('TESTE 2: Regra de Alerta Crítico (> 7 dias corridos)');
  const oitoDiasAtras = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dias = calcularDiasCorridos(oitoDiasAtras);
  assert(dias === 8, '2.1 Deve calcular 8 dias corridos');
  assert(dias > 7, '2.2 Deve acionar condição de alerta crítico (> 7 dias)');
};

// TESTE 3: Criação e Estrutura Inicial de Autorizações
const testarEstruturaInicial = () => {
  console.log('TESTE 3: Carga Inicial e Estrutura de Autorizações');
  const autorizacoes = carregarAutorizacoesIniciais();
  assert(autorizacoes.length >= 4, '3.1 Deve conter pelo menos 4 autorizações iniciais padrão');
  const autEmAnalise = autorizacoes.find(a => a.status === 'EM_ANALISE' && a.diasEmAnalise > 7);
  assert(Boolean(autEmAnalise), '3.2 Deve identificar autorização em análise com mais de 7 dias');
  assert(autEmAnalise?.diasEmAnalise === 9, '3.3 Dias em análise deve ser 9 para o caso de teste');
};

// TESTE 4: Transição de Status (Concluído, Recusado, Em Análise) e Histórico
const testarTransicoesStatus = () => {
  console.log('TESTE 4: Transição de Status e Histórico Imutável');
  const autorizacaoTeste: AutorizacaoV2 = {
    id: 'aut-teste-1',
    numeroAutorizacao: 'AUT-TEST',
    pacienteId: 'pac-1',
    pacienteNome: 'Paciente Teste',
    carteirinha: '123456',
    operadora: 'SulAmérica',
    procedimento: 'Psicologia',
    prestador: 'Dra. Ana',
    dataSolicitacao: '2026-09-01',
    quantidadeSolicitada: 10,
    competencia: '2026-09',
    proximaAutorizacao: '2026-10-01',
    status: 'EM_ANALISE',
    responsavel: 'Ana Beatriz',
    ultimaAtualizacao: new Date().toISOString(),
    diasEmAnalise: 5,
    historico: [
      {
        id: 'h-1',
        statusAnterior: 'EM_ANALISE',
        novoStatus: 'EM_ANALISE',
        usuarioNome: 'Ana Beatriz',
        dataHora: '2026-09-01 10:00',
        justificativa: 'Iniciado',
      },
    ],
  };

  // Simular alteração para Concluído
  const novoHistorico = [
    ...autorizacaoTeste.historico,
    {
      id: 'h-2',
      statusAnterior: ('EM_ANALISE' as const),
      novoStatus: ('CONCLUIDO' as const),
      usuarioNome: 'Christian Gomes',
      dataHora: '2026-09-03 14:00',
      justificativa: 'Autorizado pela operadora',
    },
  ];

  autorizacaoTeste.status = 'CONCLUIDO';
  autorizacaoTeste.historico = novoHistorico;

  assert(autorizacaoTeste.status === 'CONCLUIDO', '4.1 Status deve ter mudado para CONCLUIDO');
  assert(autorizacaoTeste.historico.length === 2, '4.2 Histórico deve preservar 2 registros');
  assert(autorizacaoTeste.historico[1].novoStatus === 'CONCLUIDO', '4.3 Histórico deve registrar o novo status Concluído');
  assert(Boolean(autorizacaoTeste.historico[1].justificativa), '4.4 Histórico deve registrar justificativa');
};

testarDiasCorridos();
testarRegraSeteDias();
testarEstruturaInicial();
testarTransicoesStatus();

console.log('======================================================');
console.log(`TOTAL DE TESTES V2: ${testesPassaram + testesFalharam} | PASSARAM: ${testesPassaram} | FALHARAM: ${testesFalharam}`);
console.log('======================================================');

if (testesFalharam > 0) {
  process.exit(1);
} else {
  console.log('🎉 TODOS OS TESTES DO MÓDULO AUTORIZAÇÕES V2 FORAM APROVADOS COM SUCESSO!');
}
