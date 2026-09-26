/**
 * Suíte de Testes Unitários Automatizados — Motor de Regras de Negócio Clínica Mefisa
 * Valida todos os 13 cenários obrigatórios especificados:
 *
 * 1. Atendimento na segunda-feira
 * 2. Atendimento na terça-feira
 * 3. Atendimento na quarta-feira
 * 4. Atendimento na quinta-feira
 * 5. Atendimento na sexta-feira
 * 6. Atendimento no sábado (Exceção de Sábado)
 * 7. Virada de mês no meio da semana
 * 8. Primeiro atendimento do próximo mês
 * 9. Feriado em dia de atendimento
 * 10. Feriado em Ferraz de Vasconcelos (14/10)
 * 11. Remanejamento normal
 * 12. Remanejamento anormal (~30 dias)
 * 13. Tentativa de duplicação pela combinação Paciente + Procedimento + Data
 */

import {
  identificarDiaSemana,
  formatarDiaSemanaPt,
  calcularAlinhamentoProximaAutorizacao,
  verificarConflitoFeriado,
  validarRemarcacaoSessao,
  gerarNotificacaoAnomaliaGestao,
  calcularStatusAnaliseDiasCorridos,
  validarDuplicidadeGuia,
  gerarChaveDuplicidade,
  calcularSessoesPeriodo,
  obterPreferenciasNotificacao,
  calcularDatasSessoesAlinhadas,
  formatarContagemRepeticoesSessoes,
  calcularSessoesSemanaisJanela,
  sanitizarCbo,
} from './businessRules';
import { HolidayService } from './holidaysService';

interface TestResult {
  nome: string;
  passou: boolean;
  detalhe?: string;
}

const resultados: TestResult[] = [];

function assert(condicao: boolean, nome: string, detalheFalha?: string) {
  if (condicao) {
    resultados.push({ nome, passou: true });
    console.log(`  ✓ [PASSOU] ${nome}`);
  } else {
    resultados.push({ nome, passou: false, detalhe: detalheFalha || 'Afirmação retornou falsa' });
    console.error(`  ✗ [FALHOU] ${nome} — ${detalheFalha}`);
  }
}

console.log('\n======================================================');
console.log('CLÍNICA MEFISA — EXECUÇÃO DE TESTES UNITÁRIOS DAS REGRAS');
console.log('======================================================\n');

// ----------------------------------------------------
// 1. Atendimento na segunda-feira
// ----------------------------------------------------
{
  console.log('CENÁRIO 1: Atendimento habitual na SEGUNDA-FEIRA');
  // Paciente com atendimento na segunda-feira (1).
  // Início do ciclo: 2026-10-05 (Segunda-feira).
  // Próximo mês: Novembro/2026.
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 1, // Segunda-feira
    dataInicioCicloStr: '2026-10-05',
    sessoesPorSemana: 2,
    dataReferenciaCorteStr: '2026-11-06', // 06/11/2026 é Sexta-feira
  });

  // Como a referência de corte inicial caiu numa sexta (5), o sistema deve recuar para a segunda-feira anterior (2026-11-02)
  const diaSemanaFinal = identificarDiaSemana(res.dataProximaAutorizacaoCalculada);
  assert(
    diaSemanaFinal === 1,
    '1.1 Alinhamento deve cair obrigatoriamente em uma Segunda-feira',
    `Esperado dia 1 (Segunda), obtido: ${diaSemanaFinal} (${res.dataProximaAutorizacaoCalculada})`
  );
  assert(
    res.foiDeslocadoParaDiaAnterior === true,
    '1.2 Deve ter detectado necessidade de recuo para dia anterior',
    'foiDeslocadoParaDiaAnterior deveria ser true'
  );
  assert(
    res.dataProximaAutorizacaoCalculada <= '2026-11-06',
    '1.3 Data final não pode ser posterior à referência de corte',
    `Data ${res.dataProximaAutorizacaoCalculada} > 2026-11-06`
  );
}

// ----------------------------------------------------
// 2. Atendimento na terça-feira
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 2: Atendimento habitual na TERÇA-FEIRA');
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 2, // Terça-feira
    dataInicioCicloStr: '2026-10-06',
    sessoesPorSemana: 1,
    dataReferenciaCorteStr: '2026-11-07', // Sábado (6)
  });

  const diaFinal = identificarDiaSemana(res.dataProximaAutorizacaoCalculada);
  assert(
    diaFinal === 2,
    '2.1 Data final deve cair exatamente numa Terça-feira',
    `Esperado dia 2 (Terça), obtido: ${diaFinal} (${res.dataProximaAutorizacaoCalculada})`
  );
  assert(
    res.dataProximaAutorizacaoCalculada === '2026-11-03', // Terça imediatamente anterior ao Sábado 07/11
    '2.2 Terça-feira anterior ao corte de 07/11 deve ser 03/11/2026',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
}

// ----------------------------------------------------
// 3. Atendimento na quarta-feira
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 3: Atendimento habitual na QUARTA-FEIRA');
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 3, // Quarta-feira
    dataInicioCicloStr: '2026-10-07',
    sessoesPorSemana: 1,
    dataReferenciaCorteStr: '2026-11-04', // 04/11/2026 é exatamente Quarta-feira!
  });

  assert(
    res.dataProximaAutorizacaoCalculada === '2026-11-04',
    '3.1 Como a referência já é quarta-feira, deve manter 04/11/2026',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
  assert(
    res.foiDeslocadoParaDiaAnterior === false,
    '3.2 Não deve marcar recuo desnecessário se já coincide com o dia habitual',
    'foiDeslocadoParaDiaAnterior deveria ser false'
  );
}

// ----------------------------------------------------
// 4. Atendimento na quinta-feira (Exemplo do documento do usuário)
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 4: Atendimento na QUINTA-FEIRA (Exemplo oficial do usuário)');
  // Exemplo do usuário: Atendimento habitual = Quinta-feira. Data inicialmente encontrada = Sexta-feira.
  // Deve ajustar para a Quinta-feira correspondente anterior e adicionar ocorrência semanal.
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 4, // Quinta-feira
    dataInicioCicloStr: '2026-10-01',
    sessoesPorSemana: 1,
    dataReferenciaCorteStr: '2026-10-30', // 30/10/2026 é Sexta-feira
  });

  const diaFinal = identificarDiaSemana(res.dataProximaAutorizacaoCalculada);
  assert(
    diaFinal === 4,
    '4.1 Data final deve cair obrigatoriamente na Quinta-feira',
    `Esperado 4 (Quinta), obtido: ${diaFinal}`
  );
  assert(
    res.dataProximaAutorizacaoCalculada === '2026-10-29', // 29/10 é Quinta-feira anterior a 30/10 Sexta
    '4.2 Deve realocar para a Quinta-feira 29/10/2026 (1 dia antes da Sexta 30/10)',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
  assert(
    res.adicionouOcorrenciaSemanal === true,
    '4.3 Deve considerar mais uma ocorrência semanal para integridade do ciclo',
    'adicionouOcorrenciaSemanal deveria ser true'
  );
}

// ----------------------------------------------------
// 5. Atendimento na sexta-feira
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 5: Atendimento habitual na SEXTA-FEIRA');
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 5, // Sexta-feira
    dataInicioCicloStr: '2026-10-02',
    sessoesPorSemana: 3,
    dataReferenciaCorteStr: '2026-11-01', // 01/11/2026 é Domingo (0)
  });

  const diaFinal = identificarDiaSemana(res.dataProximaAutorizacaoCalculada);
  assert(
    diaFinal === 5,
    '5.1 Alinhamento deve cair na Sexta-feira',
    `Esperado 5 (Sexta), obtido: ${diaFinal}`
  );
  assert(
    res.dataProximaAutorizacaoCalculada === '2026-10-30', // Sexta-feira anterior a Domingo 01/11
    '5.2 Recuo de 2 dias do Domingo 01/11 para a Sexta 30/10/2026',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
}

// ----------------------------------------------------
// 6. Atendimento no sábado (REGRA ESPECIAL DE SÁBADO)
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 6: Atendimento no SÁBADO (Exceção de Não Expediente Administrativo)');
  // Sábado, 10/10/2026 -> Sistema deve detectar não operação e sugerir Sexta-feira 09/10/2026
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 6, // Sábado
    dataInicioCicloStr: '2026-09-12',
    sessoesPorSemana: 1,
    dataReferenciaCorteStr: '2026-10-10', // Sábado
    opcaoSabadoEscolhida: 'SEXTA_FEIRA_ANTERIOR',
  });

  assert(
    res.excecaoSabado.detectada === true,
    '6.1 Deve detectar ativamente a exceção de sábado',
    'excecaoSabado.detectada deveria ser true'
  );
  assert(
    res.excecaoSabado.dataSabadoOriginal === '2026-10-10',
    '6.2 Deve registrar a data de sábado original (2026-10-10)',
    `Obtido: ${res.excecaoSabado.dataSabadoOriginal}`
  );
  assert(
    res.dataProximaAutorizacaoCalculada === '2026-10-09',
    '6.3 Nova data sugerida deve ser a Sexta-feira 09/10/2026',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
  assert(
    res.excecaoSabado.justificativaOperacional !== undefined &&
      res.excecaoSabado.justificativaOperacional.includes('sábado'),
    '6.4 Deve conter a justificativa operacional explícita',
    res.excecaoSabado.justificativaOperacional
  );
}

// ----------------------------------------------------
// 7. Virada de mês no meio da semana
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 7: Virada de mês no meio da semana (Ex: 30/09 Quarta -> 01/10 Quinta)');
  // Testando transição de Setembro para Outubro de 2026
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 2, // Terça-feira
    dataInicioCicloStr: '2026-09-01',
    sessoesPorSemana: 2,
    dataReferenciaCorteStr: '2026-10-01', // 01/10/2026 é Quinta-feira
  });

  // Terça-feira anterior a Quinta 01/10 é Terça 29/09/2026
  assert(
    res.dataProximaAutorizacaoCalculada === '2026-09-29',
    '7.1 Alinhamento encontra a Terça-feira correspondente sem extrapolar o mês de corte',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
  assert(
    identificarDiaSemana(res.dataProximaAutorizacaoCalculada) === 2,
    '7.2 Permanece em Terça-feira',
    `Obtido: ${identificarDiaSemana(res.dataProximaAutorizacaoCalculada)}`
  );
}

// ----------------------------------------------------
// 8. Primeiro atendimento do próximo mês
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 8: Primeiro atendimento do próximo mês');
  const res = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 1, // Segunda-feira
    dataInicioCicloStr: '2026-10-05',
    sessoesPorSemana: 1,
    dataReferenciaCorteStr: '2026-11-02', // 02/11/2026 é exatamente a primeira Segunda-feira de Novembro
  });

  assert(
    res.dataProximaAutorizacaoCalculada === '2026-11-02',
    '8.1 Alinha perfeitamente à primeira Segunda-feira de Novembro',
    `Obtido: ${res.dataProximaAutorizacaoCalculada}`
  );
  assert(
    res.mesCompetenciaReferencia.includes('Novembro/2026'),
    '8.2 Identifica a competência de Novembro/2026',
    res.mesCompetenciaReferencia
  );
}

// ----------------------------------------------------
// 9. Feriado em dia de atendimento (Nacional)
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 9: Feriado em dia de atendimento (12/10/2026 - N. Sra. Aparecida)');
  const conflito = verificarConflitoFeriado('2026-10-12');
  assert(
    conflito !== null,
    '9.1 Deve detectar conflito na data 2026-10-12',
    'Deveria ter retornado ConflitoFeriadoSessao'
  );
  assert(
    conflito?.feriado.tipo === 'NACIONAL',
    '9.2 Tipo de feriado deve ser NACIONAL',
    conflito?.feriado.tipo
  );
  assert(
    conflito?.novaDataSugerida === '2026-10-13', // Terça-feira dia útil seguinte
    '9.3 Nova data sugerida deve ser o dia útil seguinte (13/10/2026)',
    conflito?.novaDataSugerida
  );
}

// ----------------------------------------------------
// 10. Feriado em Ferraz de Vasconcelos (14/10)
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 10: Feriado em Ferraz de Vasconcelos (14/10/2026 - Aniversário da Cidade)');
  const conflito = verificarConflitoFeriado('2026-10-14');
  assert(
    conflito !== null,
    '10.1 Deve detectar feriado de Ferraz de Vasconcelos em 14/10/2026',
    'Não detectou o feriado municipal'
  );
  assert(
    conflito?.feriado.tipo === 'MUNICIPAL_FERRAZ',
    '10.2 Tipo de feriado deve ser MUNICIPAL_FERRAZ',
    conflito?.feriado.tipo
  );
  assert(
    Boolean(conflito?.feriado.regraDeterminante.includes('Ferraz de Vasconcelos')),
    '10.3 Regra determinante deve mencionar legislação de Ferraz de Vasconcelos',
    conflito?.feriado.regraDeterminante
  );
  assert(
    Boolean(
      conflito?.motivoConflito.includes('Emancipação') ||
        conflito?.motivoConflito.includes('Ferraz de Vasconcelos')
    ),
    '10.4 Motivo do conflito deve citar o aniversário/emancipação de Ferraz',
    conflito?.motivoConflito
  );
}

// ----------------------------------------------------
// 11. Remanejamento normal
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 11: Remanejamento normal de sessão (ex: 10/10/2026 para 13/10/2026 - 3 dias)');
  const val = validarRemarcacaoSessao('2026-10-10', '2026-10-13');
  assert(
    val.valido === true,
    '11.1 Remanejamento deve ser válido',
    'valido deveria ser true'
  );
  assert(
    val.ehAnomalia === false,
    '11.2 Não deve ser classificado como anomalia (3 dias)',
    `ehAnomalia foi ${val.ehAnomalia}`
  );
  assert(
    val.exigeConfirmacaoExplicita === false,
    '11.3 Não deve exigir confirmação de anomalia',
    'exigeConfirmacaoExplicita deveria ser false'
  );
}

// ----------------------------------------------------
// 12. Remanejamento anormal (~30 dias / 1 mês depois)
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 12: Remanejamento anormal (10/10/2026 para 09/11/2026 - 30 dias)');
  const val = validarRemarcacaoSessao('2026-10-10', '2026-11-09');
  assert(
    val.ehAnomalia === true,
    '12.1 Deve classificar intervalo de 30 dias como ANOMALIA',
    `ehAnomalia foi ${val.ehAnomalia} para ${val.diasDiferenca} dias`
  );
  assert(
    val.exigeConfirmacaoExplicita === true,
    '12.2 Deve exigir confirmação explícita do usuário',
    'exigeConfirmacaoExplicita deveria ser true'
  );

  // Simula confirmação e disparo da notificação para ADM CHEFE e CEO
  const notif = gerarNotificacaoAnomaliaGestao({
    pacienteNome: 'João Silva',
    procedimentoNome: 'Psicologia ABA',
    dataOriginal: '2026-10-10',
    novaData: '2026-11-09',
    diasDiferenca: val.diasDiferenca,
    usuarioNome: 'Maria Clara Fonseca',
    usuarioPapel: 'FUNCIONARIO_ADMINISTRATIVO',
    motivoConfirmado: 'Paciente viajou ao exterior por 30 dias com atestado médico aprovado',
  });

  assert(
    notif.destinatarios.includes('ADM_CHEFE') && notif.destinatarios.includes('CEO'),
    '12.3 Notificação deve ser endereçada obrigatoriamente a ADM CHEFE e à CEO',
    JSON.stringify(notif.destinatarios)
  );
  assert(
    notif.status === 'DISPARADA_IMEDIATA',
    '12.4 Notificação com status imediato',
    notif.status
  );
}

// ----------------------------------------------------
// 13. Tentativa de duplicação pela combinação Paciente + Procedimento + Data
// ----------------------------------------------------
{
  console.log('\nCENÁRIO 13: Tentativa de duplicação pela combinação PACIENTE + PROCEDIMENTO + DATA');
  const baseRegistrada = [
    {
      id: 'guia-10',
      pacienteNome: 'João Silva',
      procedimentoNome: 'Psicologia',
      dataSessao: '2026-10-10',
      numeroGuia: '#GUIA-99001',
      status: 'DIGITADA_FATURADA',
    },
  ];

  // Tentativa com número de guia diferente (#GUIA-NOVA-888), mas MESMO paciente, procedimento e data
  const valDuplicidade = validarDuplicidadeGuia(
    {
      pacienteNome: 'João Silva',
      procedimentoNome: 'Psicologia',
      dataSessao: '2026-10-10',
      numeroGuia: '#GUIA-NOVA-888',
    },
    baseRegistrada
  );

  assert(
    valDuplicidade.duplicada === true,
    '13.1 Deve acusar POSSÍVEL DUPLICIDADE mesmo com número de guia diferente',
    `duplicada foi ${valDuplicidade.duplicada}`
  );
  assert(
    valDuplicidade.exigeConfirmacaoComJustificativa === true,
    '13.1b REGRA 01 (Opção B): Deve exigir confirmação explícita com justificativa',
    `exigeConfirmacaoComJustificativa foi ${valDuplicidade.exigeConfirmacaoComJustificativa}`
  );
  assert(
    valDuplicidade.chaveValidacao === gerarChaveDuplicidade('João Silva', 'Psicologia', '2026-10-10'),
    '13.2 Chave de validação deve ser a composição dos 3 atributos normalizados',
    valDuplicidade.chaveValidacao
  );
  assert(
    valDuplicidade.registroExistente?.numeroGuia === '#GUIA-99001',
    '13.3 Deve identificar a guia preexistente conflitante',
    valDuplicidade.registroExistente?.numeroGuia
  );

  // Tentativa com outro procedimento não deve acusar duplicidade
  const valNaoDuplicada = validarDuplicidadeGuia(
    {
      pacienteNome: 'João Silva',
      procedimentoNome: 'Fonoaudiologia', // diferente
      dataSessao: '2026-10-10',
      numeroGuia: '#GUIA-FON-111',
    },
    baseRegistrada
  );
  assert(
    valNaoDuplicada.duplicada === false,
    '13.4 Não deve bloquear se o procedimento for diferente',
    'duplicada deveria ser false'
  );
}

// ----------------------------------------------------
// Bônus: Validação da REGRA 2 & REGRA 04 — Contagem com Nível Preventivo (5-7 dias) e Atraso (> 7 dias)
// ----------------------------------------------------
{
  console.log('\nBÔNUS REGRA 2 & 04: Contagem de dias corridos em análise com Níveis de Alerta');
  // Cenário 1: 3 dias decorridos = NORMAL
  const analiseNormal = calcularStatusAnaliseDiasCorridos('2026-10-01', '2026-10-04', 7, 5);
  assert(
    analiseNormal.nivelSla === 'NORMAL' && analiseNormal.emAtraso === false && analiseNormal.alertaPreventivo === false,
    'B.0 3 dias corridos deve ter status NORMAL',
    analiseNormal.statusTexto
  );

  // Cenário 2: 6 dias decorridos = ATENCAO_PREVENTIVA (Regra 04 confirmada)
  const analiseAtencao = calcularStatusAnaliseDiasCorridos('2026-10-01', '2026-10-07', 7, 5);
  assert(
    analiseAtencao.alertaPreventivo === true && analiseAtencao.nivelSla === 'ATENCAO_PREVENTIVA',
    'B.1 6 dias corridos deve estar em ATENÇÃO PREVENTIVA (amarelo)',
    analiseAtencao.statusTexto
  );

  // Cenário 3: 8 dias decorridos = ATRASADO_CRITICO
  const analiseAtraso = calcularStatusAnaliseDiasCorridos('2026-10-01', '2026-10-09', 7, 5);
  assert(
    analiseAtraso.diasCorridosDecorridos === 8 && analiseAtraso.emAtraso === true && analiseAtraso.nivelSla === 'ATRASADO_CRITICO',
    'B.2 8 dias corridos (> 7) deve estar marcado como 🔴 ATRASADO',
    analiseAtraso.statusTexto
  );
}

// ----------------------------------------------------
// REGRA 02 CONFIRMADA: Decisão do Usuário sobre Faltas Justificadas no Ciclo
// ----------------------------------------------------
{
  console.log('\nREGRA 02 CONFIRMADA: Decisão do Usuário sobre Faltas Justificadas');
  // Opção 1: Descontar faltas
  const calcComDesconto = calcularSessoesPeriodo(
    2, // 2 sessões/semana
    '2026-10-01',
    '2026-10-28', // 4 semanas = 8 sessões brutas
    2.5,
    {
      modoAbatimento: 'DESCONTAR_PROXIMA_AUTORIZACAO',
      quantidadeFaltasJustificadas: 2,
      motivoFaltas: 'Gripe e febre da criança',
    }
  );
  assert(
    calcComDesconto.quantidadeTotalBruta === 8,
    'R02.1 Quantidade bruta sem desconto deve ser 8',
    String(calcComDesconto.quantidadeTotalBruta)
  );
  assert(
    calcComDesconto.quantidadeTotalSugerida === 6,
    'R02.2 Quantidade sugerida com abatimento de 2 faltas deve ser 6',
    String(calcComDesconto.quantidadeTotalSugerida)
  );
  assert(
    calcComDesconto.observacaoFaltasAuditoria.includes('Abatimento aprovado'),
    'R02.3 Deve registrar observação de auditoria do desconto aprovado pelo usuário',
    calcComDesconto.observacaoFaltasAuditoria
  );

  // Opção 2: Manter integral (reposição em prontuário)
  const calcIntegral = calcularSessoesPeriodo(
    2,
    '2026-10-01',
    '2026-10-28',
    2.5,
    {
      modoAbatimento: 'MANTER_INTEGRAL_REPOSICAO_PRONTUARIO',
      quantidadeFaltasJustificadas: 2,
    }
  );
  assert(
    calcIntegral.quantidadeTotalSugerida === 8,
    'R02.4 Mantém quantidade integral (8 sessões) para reposição clínica em prontuário',
    String(calcIntegral.quantidadeTotalSugerida)
  );
}

// ----------------------------------------------------
// REGRA 03 CONFIRMADA: Corte Estrito no Último Dia do Mês
// ----------------------------------------------------
{
  console.log('\nREGRA 03 CONFIRMADA: Corte Estrito no Fim do Mês (Ela é cortada)');
  const alinhamento = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: 4, // Quinta-feira
    dataInicioCicloStr: '2026-10-01',
    sessoesPorSemana: 1,
    dataReferenciaCorteStr: '2026-10-31', // Sábado 31/10 (último dia estrito)
  });
  // Quinta-feira anterior a 31/10 (Sábado) é 29/10/2026
  assert(
    alinhamento.dataProximaAutorizacaoCalculada === '2026-10-29',
    'R03.1 Data alinhada respeita estritamente o corte final do mês',
    alinhamento.dataProximaAutorizacaoCalculada
  );
}

// ----------------------------------------------------
// REGRA ESPECÍFICA: Compressão Proporcional em Dias Úteis até a 1ª Segunda-feira do Próximo Mês
// ----------------------------------------------------
{
  console.log('\nREGRA ESPECÍFICA: Compressão Proporcional em Dias Úteis até a 1ª Segunda-feira do Próximo Mês');
  
  // Caso 1: 5 sessões a partir de 25/09/2026 para paciente que passa na Segunda-feira
  const datas5Sessoes = calcularDatasSessoesAlinhadas({
    dataInicioStr: '2026-09-25', // Sexta-feira
    quantidade: 5,
    diaSemanaHabitual: 1, // Segunda-feira (1ª do próximo mês: 05/10/2026)
  });

  assert(
    datas5Sessoes.length === 5,
    'R06.1 Deve gerar exatamente 5 sessões',
    String(datas5Sessoes.length)
  );
  assert(
    datas5Sessoes[0] === '25/09/2026',
    'R06.2 1ª Sessão deve ser na data inicial 25/09/2026 (Sexta-feira)',
    datas5Sessoes[0]
  );
  assert(
    datas5Sessoes[datas5Sessoes.length - 1] === '05/10/2026',
    'R06.3 5ª e ÚLTIMA Sessão deve ser estritamente na 1ª Segunda-feira do próximo mês (05/10/2026)',
    datas5Sessoes[datas5Sessoes.length - 1]
  );

  // Caso 2: 10 sessões comprimidas (mais sessões que dias úteis) -> permite mais de 1 sessão no mesmo dia útil
  const datas10Sessoes = calcularDatasSessoesAlinhadas({
    dataInicioStr: '2026-09-25',
    quantidade: 10,
    diaSemanaHabitual: 1,
  });

  assert(
    datas10Sessoes.length === 10,
    'R06.4 Deve gerar exatamente 10 sessões comprimidas',
    String(datas10Sessoes.length)
  );
  assert(
    datas10Sessoes[0] === '25/09/2026' && datas10Sessoes[9] === '05/10/2026',
    'R06.5 Compressão de 10 sessões inicia em 25/09/2026 e finaliza em 05/10/2026',
    `${datas10Sessoes[0]} -> ${datas10Sessoes[9]}`
  );
  // Caso 3: 15 sessões - Validação das Observações Recomendadas para Colagem
  const datas15Sessoes = calcularDatasSessoesAlinhadas({
    dataInicioStr: '2026-09-25',
    quantidade: 15,
    diaSemanaHabitual: 1,
  });

  const textoRepeticoes15 = formatarContagemRepeticoesSessoes(datas15Sessoes);
  const sessoesSemanais15 = calcularSessoesSemanaisJanela(datas15Sessoes);

  assert(
    textoRepeticoes15 === '2 e 3',
    'R06.7 Contagem de repetições deve identificar exatamente "2 e 3" sessões no mesmo dia',
    textoRepeticoes15
  );
  assert(
    sessoesSemanais15 === 11,
    'R06.8 Janela semanal deve calcular exatamente 11 sessões semanais',
    String(sessoesSemanais15)
  );
}

// ----------------------------------------------------
// REGRA ESPECÍFICA: Sanitização Estrita de CBO (Apenas Dígitos Numéricos)
// ----------------------------------------------------
{
  console.log('\nREGRA ESPECÍFICA: Sanitização Estrita de CBO (Sem traços, pontos ou caracteres especiais)');
  assert(
    sanitizarCbo('2515-10') === '251510',
    'R07.1 Deve remover traço do CBO (2515-10 -> 251510)',
    sanitizarCbo('2515-10')
  );
  assert(
    sanitizarCbo('2238.10/SP') === '223810',
    'R07.2 Deve remover pontos, barras e letras do CBO (2238.10/SP -> 223810)',
    sanitizarCbo('2238.10/SP')
  );
  assert(
    sanitizarCbo(' 2515 10 ') === '251510',
    'R07.3 Deve remover espaços em branco do CBO',
    sanitizarCbo(' 2515 10 ')
  );
  assert(
    sanitizarCbo('') === '',
    'R07.4 CBO vazio deve retornar string vazia',
    sanitizarCbo('')
  );
}

// ----------------------------------------------------
// REGRA 05 CONFIRMADA: Notificações para ADM Chefe e CEO (Painel Interno + Webhook + E-mail)
// ----------------------------------------------------
{
  console.log('\nREGRA 05 CONFIRMADA: Configuração de Canais e Gatilhos de Notificação');
  const prefs = obterPreferenciasNotificacao();
  assert(
    prefs.canais.painelInterno === true && prefs.canais.email === true && prefs.canais.webhook === true,
    'R05.1 Canais de painel interno, e-mail e webhook suportados',
    JSON.stringify(prefs.canais)
  );
  assert(
    prefs.gatilhos.remarcacaoAnormal === true && prefs.gatilhos.duplicidadeConfirmada === true,
    'R05.2 Gatilhos configuráveis para eventos críticos ativos',
    JSON.stringify(prefs.gatilhos)
  );
}

console.log('\n======================================================');
const total = resultados.length;
const passaram = resultados.filter((r) => r.passou).length;
const falharam = total - passaram;

console.log(`TOTAL DE TESTES: ${total} | PASSARAM: ${passaram} | FALHARAM: ${falharam}`);
if (falharam > 0) {
  console.error('\n⚠️ ALGUNS TESTES FALHARAM!');
  process.exit(1);
} else {
  console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO E DETERMINISMO!');
  process.exit(0);
}
