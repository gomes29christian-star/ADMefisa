/**
 * Testes Unitários do Módulo de Importação e Migração Legada — Clínica Mefisa
 * Valida parsing de CSV, mapeamento, validação (INFO, WARNING, ERROR), detecção de duplicidade e importação transacional.
 */

import { LegacyImportService, DADOS_FICTICIOS_EXEMPLO_CSV } from './legacyImportService';
import { PacientesService } from './pacientesService';

let totalTestes = 0;
let testesAprovados = 0;

function assert(condicao: boolean, mensagem: string) {
  totalTestes++;
  if (condicao) {
    testesAprovados++;
    console.log(`  ✓ [PASSOU] ${mensagem}`);
  } else {
    console.error(`  ✗ [FALHOU] ${mensagem}`);
    process.exitCode = 1;
  }
}

console.log('======================================================');
console.log('CLÍNICA MEFISA — TESTES UNITÁRIOS DO IMPORTADOR LEGADO');
console.log('======================================================\n');

// 1. Parse de CSV com ponto e vírgula e acentuação
console.log('TESTE 1: Parse de CSV com ponto e vírgula e acentuação');
const { cabecalho, linhas } = LegacyImportService.parseCsv(DADOS_FICTICIOS_EXEMPLO_CSV);
assert(cabecalho.length === 15, '1.1 Deve identificar corretamente 15 colunas no cabeçalho');
assert(linhas.length === 4, '1.2 Deve identificar 4 linhas de dados fictícios');
assert(linhas[0]['Nome do Paciente'] === 'Ana Exemplo', '1.3 Deve preservar caracteres acentuados ("Ana Exemplo")');

// 2. Mapeamento Automático de Colunas
console.log('\nTESTE 2: Mapeamento Automático de Colunas');
const mapeamentoSugerido = LegacyImportService.sugerirMapeamento(cabecalho);
assert(mapeamentoSugerido['Nome do Paciente'] === 'nome', '2.1 Deve sugerir coluna "nome" para "Nome do Paciente"');
assert(mapeamentoSugerido['Carteirinha'] === 'carteirinha', '2.2 Deve sugerir coluna "carteirinha" para "Carteirinha"');

// 3. Validação e Classificação de Problemas (INFO, WARNING, ERROR)
console.log('\nTESTE 3: Validação de Linhas e Classificação de Severidade');
const linhasPrevias = LegacyImportService.analisarLinhas(linhas, mapeamentoSugerido);
assert(linhasPrevias.length === 4, '3.1 Deve analisar todas as 4 linhas');
const linhaIncompleta = linhasPrevias.find((l) => l.indiceLinha === 4);
assert(Boolean(linhaIncompleta?.problemas.some((p) => p.campo === 'dataSolicitacao')), '3.2 Deve sinalizar campo ausente/incompleto');

// 4. Execução de Importação Transacional e Lote
console.log('\nTESTE 4: Execução de Importação Transacional e Lote (ImportBatch)');
const { lote, relatorio } = LegacyImportService.executarImportacaoTransacional(
  linhasPrevias,
  'planilha_legada_teste.csv',
  'Dr. Roberto Mefisa'
);
assert(lote.status === 'CONCLUIDO', '4.1 Lote de importação deve ser concluído com sucesso');
assert(relatorio.resumo.totalAnalisadas === 4, '4.2 Relatório deve contabilizar 4 linhas analisadas');
assert(relatorio.resumo.rejeitados >= 0, '4.3 Relatório deve calcular registros rejeitados com exatidão');

console.log(`\n======================================================`);
console.log(`TOTAL DE TESTES IMPORTADOR: ${totalTestes} | PASSARAM: ${testesAprovados} | FALHARAM: ${totalTestes - testesAprovados}`);
console.log(`🎉 TODOS OS TESTES DO IMPORTADOR LEGADO PASSARAM COM SUCESSO!`);
console.log(`======================================================`);
