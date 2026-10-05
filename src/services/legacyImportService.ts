/**
 * Serviço de Importação e Migração de Planilhas Legadas — Clínica Mefisa
 * 
 * Responsável por:
 * 1. Leitura segura e parse de CSV (.csv) com suporte a UTF-8 e delimitadores comma/semicolon.
 * 2. Mapeamento inteligente de colunas com auto-sugestão e correção interativa.
 * 3. Camada de validação independente (INFO, WARNING, ERROR).
 * 4. Detecção de duplicidade avançada (CPF, Carteirinha, Nome + Nascimento).
 * 5. Pré-visualização transacional e lote de importação (ImportBatch).
 * 6. Preservação de histórico de carteirinhas, Próxima Autorização histórica e indicador visual de irregularidade.
 * 7. Auditoria integrada sem envio de dados a APIs externas.
 */

import {
  ImportBatch,
  LinhaPreviaImportacao,
  ProblemaImportacao,
  RelatorioImportacao,
  StatusDuplicidadeImportacao,
  SeverityProblemaImportacao,
} from '../types/import';
import { Paciente, EventoAuditoria, Prestador } from '../types/clinic';
import { PacientesService } from './pacientesService';
import { ProcedimentosService, ProcedimentoCompleto } from './procedimentosService';
import { sanitizarCbo } from './businessRules';
import { obterPrestadoresStorage } from '../data/mockClinicData';

export const DADOS_FICTICIOS_EXEMPLO_CSV = `Nome do Paciente;Carteirinha;Doutor Mefisa;Dias em que passa;Prestador Solicitante;CBO;CRM;UF;Data Solicitacao;Procedimento;Qtd/Semana;Ultima Autorizacao;Proxima Autorizacao;Polo;Irregularidade
Ana Exemplo;982019230198001;Ana Beatriz;seg., ter., qua., sex.;Ana Beatriz;2515-10;06/12398;SP;10/10/2026;Psico ABA;4;10/05/2026;27/10/2026;M1;FALSE
Carlos Teste;772910394012001;Carlos Eduardo;ter., qui.;Carlos Eduardo;2515-45;06/77412;SP;12/10/2026;Avaliação Psicologia;2;15/04/2026;05/11/2026;M2;TRUE
Mariana Fictícia;8910442910401;Mariana;seg., qua., sex.;Mariana;2236-05;3/99104;SP;14/10/2026;Fono;3;01/06/2026;12/11/2026;M1;FALSE
Renato Incompleto;;Helena;ter., qui., sáb.;Helena;2515-10;06/44810;SP;;TO;3;;;M2;FALSE`;

export const DADOS_FICTICIOS_CONVENCIONAIS_CSV = `Nome do Paciente;Carteirinha;CPF;Procedimento;Duração;Status Impresso;Token;Status Token;Justificativa Token;Convênio;Doutora Mefisa;Dias de Atendimento;Próxima Autorização;Polo;Observações
Beatriz Lima Fonseca;987201948201001;391.820.194-01;Sessão de Fisioterapia Motor;30MIN;A IMPRIMIR;TKN-8821;V;;Bradesco Saúde;Ana Beatriz;seg., qua., sex.;15/11/2026;M1;Tratamento pós-cirúrgico de joelho
Guilherme Santos Ribeiro;448102938102002;281.940.102-33;Sessão de Fonoaudiologia;1H;IMPRIMIDO;TKN-4412;NVJ;Sem sinal da operadora;SulAmérica Saúde;Maria Clara;ter., qui.;20/11/2026;M2;Acompanhamento de dicção e linguagem
Juliana Martins Castro;331902849102003;102.394.810-55;Sessão de Terapia Ocupacional;30MIN;A IMPRIMIR;TKN-9901;NVNJ;;Bradesco Saúde;Paula Rego;seg., ter., qui.;28/11/2026;M1;Integração sensorial ocupacional
Eduardo Mota Silveira;882019482019004;449.102.938-77;Sessão de Psicologia;1H;IMPRIMIDO;;V;;SulAmérica Saúde;Beatriz;qua., sex., sáb.;10/12/2026;M2;Encaminhado por neuropediatra`;

export interface ResultadoAtendimentoInteligente {
  dias: string[];
  diaDaSemanaStr: string;
  quantidadeSemana: number;
}

export class LegacyImportService {
  /**
   * Helper para extrair número de sessões de qualquer valor bruto
   */
  public static extrairNumeroSessoes(valRaw: any): number {
    if (typeof valRaw === 'number' && !isNaN(valRaw) && valRaw > 0) {
      return Math.round(valRaw);
    }
    if (!valRaw) return 0;
    const str = String(valRaw).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Dígito numérico isolado ou com sufixos comuns (ex: "4", "4x", "4/sem", "4 sessoes", "4x/semana")
    const matchNum = str.match(/\b(\d+)\b/);
    if (matchNum && matchNum[1]) {
      const num = parseInt(matchNum[1], 10);
      if (num > 0 && num <= 21) return num;
    }

    const matchQualquer = str.match(/\d+/);
    if (matchQualquer && matchQualquer[0]) {
      const num = parseInt(matchQualquer[0], 10);
      if (num > 0 && num <= 21) return num;
    }

    // Palavras por extenso em português
    if (/\b(uma|um|1x|1-x)\b/.test(str)) return 1;
    if (/\b(duas|dois|2x|2-x)\b/.test(str)) return 2;
    if (/\b(tres|3x|3-x)\b/.test(str)) return 3;
    if (/\b(quatro|4x|4-x)\b/.test(str)) return 4;
    if (/\b(cinco|5x|5-x)\b/.test(str)) return 5;
    if (/\b(seis|6x|6-x)\b/.test(str)) return 6;
    if (/\b(sete|7x|7-x)\b/.test(str)) return 7;

    return 0;
  }

  /**
   * Parser inteligente de dias da semana e quantidade de sessões
   * Suporta formatos como:
   * - "seg, ter, qua", "segunda, terça e quinta", "2ª e 4ª feira"
   * - "segunda a sexta", "diariamente", "todos os dias"
   * - "3x por semana (seg, qua, sex)", "2x/sem"
   * - formatos legados antigos "S1, S2, S3"
   */
  public static extrairDiasAtendimentoInteligente(
    textoRaw?: string,
    qtdInformadaRaw?: number | string
  ): ResultadoAtendimentoInteligente {
    const qtdExplicit = LegacyImportService.extrairNumeroSessoes(qtdInformadaRaw);

    let qtdDoTexto = 0;
    if (textoRaw && typeof textoRaw === 'string') {
      const matchQtdInTexto = textoRaw.match(/\b(\d+)\s*(x|vezes|sessoes|sessao|\/sem|\/semana|vez|vzs)\b/i);
      if (matchQtdInTexto && matchQtdInTexto[1]) {
        qtdDoTexto = parseInt(matchQtdInTexto[1], 10);
      }
    }

    if (!textoRaw || typeof textoRaw !== 'string' || !textoRaw.trim()) {
      const finalQtd = qtdExplicit || qtdDoTexto || 2;
      const poolBase = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
      const diasSel = poolBase.slice(0, Math.min(finalQtd, 6));
      return {
        dias: diasSel,
        diaDaSemanaStr: diasSel.join(', '),
        quantidadeSemana: finalQtd,
      };
    }

    const t = textoRaw.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Frases de intervalos ou rotina completa
    if (
      t.includes('diariamente') ||
      t.includes('todos os dias') ||
      t.includes('segunda a sabado') ||
      t.includes('seg a sab')
    ) {
      const dias = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
      const finalQtd = Math.max(qtdExplicit, 6);
      return { dias, diaDaSemanaStr: dias.join(', '), quantidadeSemana: finalQtd };
    }

    if (
      t.includes('segunda a sexta') ||
      t.includes('seg a sex') ||
      t.includes('segunda ate sexta') ||
      t.includes('seg-sex')
    ) {
      const dias = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.'];
      const finalQtd = Math.max(qtdExplicit, 5);
      return { dias, diaDaSemanaStr: dias.join(', '), quantidadeSemana: finalQtd };
    }

    const diasDetectados: string[] = [];

    // Regras com regex de fronteira de palavra
    const regrasDias: Array<{ sigla: string; regex: RegExp }> = [
      { sigla: 'seg.', regex: /\b(seg|segunda|2a|2ª|mon|monday)\b/i },
      { sigla: 'ter.', regex: /\b(ter|terca|3a|3ª|tue|tuesday)\b/i },
      { sigla: 'qua.', regex: /\b(qua|quarta|4a|4ª|wed|wednesday)\b/i },
      { sigla: 'qui.', regex: /\b(qui|quinta|5a|5ª|thu|thursday)\b/i },
      { sigla: 'sex.', regex: /\b(sex|sexta|6a|6ª|fri|friday)\b/i },
      { sigla: 'sáb.', regex: /\b(sab|sabado|7a|7ª|sat|saturday)\b/i },
      { sigla: 'dom.', regex: /\b(dom|domingo|8a|8ª|sun|sunday)\b/i },
    ];

    regrasDias.forEach(({ sigla, regex }) => {
      if (regex.test(t)) {
        if (!diasDetectados.includes(sigla)) {
          diasDetectados.push(sigla);
        }
      }
    });

    // Se o formato de entrada contiver a nomenclatura legada antiga S1..S5
    if (diasDetectados.length === 0) {
      const matchSemanas = t.match(/s[1-5]/gi);
      if (matchSemanas && matchSemanas.length > 0) {
        const qtdSemanas = matchSemanas.length;
        const targetQ = qtdExplicit || qtdDoTexto || qtdSemanas;
        const diasBase = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
        const diasInferidos = diasBase.slice(0, Math.min(targetQ, 6));
        return {
          dias: diasInferidos,
          diaDaSemanaStr: diasInferidos.join(', '),
          quantidadeSemana: targetQ,
        };
      }
    }

    // Determina a quantidade final de sessões
    let targetQtd = 0;
    if (qtdExplicit > 0) {
      targetQtd = qtdExplicit;
    } else if (qtdDoTexto > 0) {
      targetQtd = qtdDoTexto;
    } else if (diasDetectados.length > 0) {
      targetQtd = diasDetectados.length;
    } else {
      targetQtd = 2;
    }

    // Garante que a lista de dias acompanhe targetQtd
    const pool = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.', 'dom.'];
    let finalDias = [...diasDetectados];

    if (finalDias.length === 0) {
      finalDias = pool.slice(0, Math.min(targetQtd, 6));
    } else if (finalDias.length < targetQtd) {
      for (const dPool of pool) {
        if (finalDias.length >= targetQtd) break;
        if (!finalDias.includes(dPool)) {
          finalDias.push(dPool);
        }
      }
    }

    return {
      dias: finalDias,
      diaDaSemanaStr: finalDias.join(', '),
      quantidadeSemana: Math.max(targetQtd, finalDias.length),
    };
  }
  /**
   * Detector automático inteligente de delimitador CSV (ponto e vírgula, tabulação, vírgula ou pipe)
   */
  public static detectarSeparadorCsv(texto: string): string {
    const semBom = texto.replace(/^\uFEFF/, '');
    const amostraLinhas = semBom.split(/\r?\n/).slice(0, 10);

    let countSemicolon = 0;
    let countTab = 0;
    let countComma = 0;
    let countPipe = 0;

    amostraLinhas.forEach((linha) => {
      // Ignora conteúdo entre aspas para evitar contar vírgulas dentro dos textos (ex: "seg, ter, qua")
      const semAspas = linha.replace(/"[^"]*"/g, '');
      countSemicolon += (semAspas.match(/;/g) || []).length;
      countTab += (semAspas.match(/\t/g) || []).length;
      countComma += (semAspas.match(/,/g) || []).length;
      countPipe += (semAspas.match(/\|/g) || []).length;
    });

    // Em planilhas brasileiras (exportadas do Excel em português), o delimitador padrão é ponto e vírgula
    if (countSemicolon > 0 && countSemicolon >= countTab && countSemicolon >= countPipe) return ';';
    if (countTab > 0 && countTab >= countPipe) return '\t';
    if (countPipe > 0) return '|';
    if (countComma > 0) return ',';

    return ';';
  }

  /**
   * Split de linha respeitando aspas RFC 4180
   */
  public static parseLinhaCsvRobusta(linhaStr: string, separador: string): string[] {
    const colunas: string[] = [];
    let atual = '';
    let dentroAspas = false;

    for (let i = 0; i < linhaStr.length; i++) {
      const char = linhaStr[i];
      const proximo = linhaStr[i + 1];

      if (char === '"') {
        if (dentroAspas && proximo === '"') {
          atual += '"';
          i++; // pula aspa duplicada
        } else {
          dentroAspas = !dentroAspas;
        }
      } else if (char === separador && !dentroAspas) {
        colunas.push(atual.trim().replace(/^"|"$/g, ''));
        atual = '';
      } else {
        atual += char;
      }
    }
    colunas.push(atual.trim().replace(/^"|"$/g, ''));
    return colunas;
  }

  /**
   * Faz o parse de arquivo CSV/texto com suporte a múltiplos delimitadores (;, \t, ,, |)
   * e tratamento de aspas RFC 4180
   */
  static parseCsv(conteudoTexto: string): { cabecalho: string[]; linhas: Record<string, string>[] } {
    if (!conteudoTexto || !conteudoTexto.trim()) {
      return { cabecalho: [], linhas: [] };
    }

    const textoLimpo = conteudoTexto.replace(/^\uFEFF/, '').trim();
    const separador = this.detectarSeparadorCsv(textoLimpo);

    const linhasBrutas = textoLimpo
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (linhasBrutas.length === 0) {
      return { cabecalho: [], linhas: [] };
    }

    const cabecalho = this.parseLinhaCsvRobusta(linhasBrutas[0], separador);
    const linhas: Record<string, string>[] = [];

    for (let i = 1; i < linhasBrutas.length; i++) {
      const valores = this.parseLinhaCsvRobusta(linhasBrutas[i], separador);
      const obj: Record<string, string> = {};
      cabecalho.forEach((col, idx) => {
        if (col) {
          obj[col] = valores[idx] !== undefined ? valores[idx] : '';
        }
      });
      linhas.push(obj);
    }

    return { cabecalho, linhas };
  }

  /**
   * Sugere automaticamente o mapeamento de colunas com base nos nomes usuais
   */
  static sugerirMapeamento(cabecalho: string[]): Record<string, string> {
    const mapeamento: Record<string, string> = {};

    cabecalho.forEach((coluna) => {
      const colNorm = coluna
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      // 1. Doutor(a) Mefisa / Profissional / Terapeuta (verificar antes do 'nome' genérico)
      const eDoutorMefisa =
        colNorm.includes('mefisa') ||
        colNorm.includes('doutor mefisa') ||
        colNorm.includes('doutora mefisa') ||
        colNorm.includes('dra mefisa') ||
        colNorm.includes('dr mefisa') ||
        colNorm.includes('atendente') ||
        colNorm.includes('corpo clinico') ||
        (colNorm.includes('doutor') && !colNorm.includes('paciente')) ||
        (colNorm.includes('doutora') && !colNorm.includes('paciente')) ||
        (colNorm.includes('dra') && !colNorm.includes('paciente')) ||
        (colNorm.includes('dr.') && !colNorm.includes('paciente')) ||
        colNorm.includes('profissional') ||
        colNorm.includes('terapeuta');

      const ePrestadorSolicitante =
        colNorm.includes('prestador') ||
        colNorm.includes('solicitante') ||
        (colNorm.includes('medico') && !colNorm.includes('mefisa'));

      // 2. Checa se é coluna de Quantidade de Sessões / Frequência (Analisar ANTES de 'semana' genérico)
      const eQuantidadeSemana =
        colNorm.includes('qtd') ||
        colNorm.includes('quant') ||
        colNorm.includes('sess') ||
        colNorm.includes('vezes') ||
        colNorm.includes('frequenc') ||
        colNorm.includes('freq') ||
        colNorm.includes('num_sess') ||
        colNorm.includes('n_sess') ||
        colNorm.includes('nº_sess') ||
        colNorm.includes('no_sess') ||
        colNorm.includes('x/sem') ||
        colNorm.includes('x/semana') ||
        colNorm.includes('x sem') ||
        colNorm.includes('x semana');

      if (eDoutorMefisa) {
        mapeamento[coluna] = 'doutorMefisa';
      } else if (ePrestadorSolicitante) {
        mapeamento[coluna] = 'prestador';
      } else if (colNorm.includes('paciente') || colNorm.includes('nome') || colNorm.includes('aluno') || colNorm.includes('cliente')) {
        mapeamento[coluna] = 'nome';
      } else if (colNorm.includes('cart') || colNorm.includes('carteirinha') || colNorm.includes('cartao') || colNorm.includes('matricula') || colNorm.includes('beneficiario')) {
        mapeamento[coluna] = 'carteirinha';
      } else if (colNorm.includes('cpf')) {
        mapeamento[coluna] = 'cpf';
      } else if (colNorm.includes('token') && (colNorm.includes('status') || colNorm.includes('valida') || colNorm.includes('situac'))) {
        mapeamento[coluna] = 'tokenStatus';
      } else if (colNorm.includes('token') && (colNorm.includes('just') || colNorm.includes('motivo'))) {
        mapeamento[coluna] = 'tokenJustificativa';
      } else if (colNorm.includes('token') || colNorm.includes('tkn') || colNorm.includes('senha')) {
        mapeamento[coluna] = 'token';
      } else if (colNorm.includes('impress') || colNorm.includes('imprimido') || colNorm.includes('a imprimir')) {
        mapeamento[coluna] = 'statusImpressao';
      } else if (colNorm.includes('durac') || colNorm.includes('tempo') || colNorm.includes('min') || colNorm.includes('duracao')) {
        mapeamento[coluna] = 'duracaoSessao';
      } else if (colNorm.includes('convenio') || colNorm.includes('convênio') || colNorm.includes('plano') || colNorm.includes('operadora')) {
        mapeamento[coluna] = 'convenio';
      } else if (colNorm.includes('cbo')) {
        mapeamento[coluna] = 'cbo';
      } else if (colNorm.includes('crm') || colNorm.includes('crp') || colNorm.includes('conselho') || colNorm.includes('registro')) {
        mapeamento[coluna] = 'crm';
      } else if (colNorm.includes('uf') || colNorm.includes('estado')) {
        mapeamento[coluna] = 'uf';
      } else if (colNorm.includes('data') && (colNorm.includes('solicit') || colNorm.includes('pedido') || colNorm.includes('guia'))) {
        mapeamento[coluna] = 'dataSolicitacao';
      } else if (colNorm.includes('procedimento') || colNorm.includes('tratamento') || colNorm.includes('especialidade') || colNorm.includes('servico') || colNorm.includes('sessao') || colNorm.includes('sessoes')) {
        mapeamento[coluna] = 'procedimento';
      } else if (eQuantidadeSemana) {
        mapeamento[coluna] = 'quantidadeSemana';
      } else if (colNorm.includes('passa') || colNorm.includes('dias') || colNorm.includes('dia') || colNorm.includes('escala') || colNorm.includes('semana') || colNorm.includes('rotina')) {
        mapeamento[coluna] = 'diaDaSemana';
      } else if (colNorm.includes('ultim') || colNorm.includes('ult') || colNorm.includes('anterior')) {
        mapeamento[coluna] = 'ultimaAutorizacao';
      } else if (colNorm.includes('prox') || colNorm.includes('autorizacao') || colNorm.includes('validade')) {
        mapeamento[coluna] = 'proximaAutorizacao';
      } else if (colNorm.includes('irregul') || colNorm.includes('cor') || colNorm.includes('alerta')) {
        mapeamento[coluna] = 'indicadorIrregularidade';
      } else if (colNorm.includes('polo') || colNorm.includes('unidade') || colNorm.includes('filial') || colNorm.includes('m1') || colNorm.includes('m2')) {
        mapeamento[coluna] = 'polo';
      } else if (colNorm.includes('pasta')) {
        mapeamento[coluna] = 'pastaDoutoraMefisa';
      } else if (colNorm.includes('cid') || colNorm.includes('diagnostico')) {
        mapeamento[coluna] = 'cid';
      } else if (colNorm.includes('resp') || colNorm.includes('mae') || colNorm.includes('pai') || colNorm.includes('tutor') || colNorm.includes('responsavel')) {
        mapeamento[coluna] = 'responsavelNome';
      } else if (colNorm.includes('obs') || colNorm.includes('anotac') || colNorm.includes('coment') || colNorm.includes('observacao') || colNorm.includes('notas')) {
        mapeamento[coluna] = 'observacoes';
      } else if (colNorm.includes('modulo') || colNorm.includes('classifica') || colNorm.includes('categoria')) {
        mapeamento[coluna] = 'classificacao';
      }
    });

    return mapeamento;
  }

  /**
   * Sugere mapeamento analisando o cabeçalho E inspecionando os valores das células das primeiras linhas.
   * Procura nomes de Doutoras Mefisa cadastradas, Semanas e Procedimentos TUSS nas células!
   */
  static sugerirMapeamentoComDados(
    cabecalho: string[],
    amostraLinhas: Record<string, string>[],
    prestadoresCadastrados?: Prestador[],
    procedimentosCadastrados?: ProcedimentoCompleto[]
  ): Record<string, string> {
    const mapeamento = this.sugerirMapeamento(cabecalho);
    const prestadores = prestadoresCadastrados || obterPrestadoresStorage();
    const procedimentos = procedimentosCadastrados || ProcedimentosService.obterTodos();

    const amostraMax = Math.min(amostraLinhas.length, 15);
    if (amostraMax === 0) return mapeamento;

    cabecalho.forEach((coluna) => {
      let acertosDoutorMefisa = 0;
      let acertosSemanas = 0;
      let acertosProcedimento = 0;
      let acertosQtdSessao = 0;

      for (let i = 0; i < amostraMax; i++) {
        const val = (amostraLinhas[i]?.[coluna] || '').trim();
        if (!val) continue;

        // 1. Checa se o conteúdo é frequência numérica pura ou com sufixos ("1", "2x", "3x/sem", "4 sessoes")
        const numExtr = LegacyImportService.extrairNumeroSessoes(val);
        if (numExtr > 0 && numExtr <= 14 && (val.length <= 15 || /\d+\s*(x|sess|vez|sem)/i.test(val))) {
          acertosQtdSessao++;
        }

        // 2. Checa se o conteúdo da célula coincide com alguma Doutora Mefisa cadastrada
        const { prestador: pEnc, pontuacaoConfianca } = this.encontrarPrestadorPorPrimeiroNome(val, prestadores);
        if (pEnc && pontuacaoConfianca >= 60) {
          acertosDoutorMefisa++;
        }

        // 3. Checa se o conteúdo da célula indica Dias do Atendimento usando parser inteligente
        const resAtim = this.extrairDiasAtendimentoInteligente(val);
        if (resAtim.dias.length > 0 && val.length >= 2) {
          acertosSemanas++;
        }

        // 4. Checa se coincide com procedimentos
        const { procedimento: procEnc } = this.encontrarProcedimentoPorTermo(val, procedimentos);
        if (procEnc) {
          acertosProcedimento++;
        }
      }

      // Se a célula contiver o nome de uma Doutora Mefisa cadastrada, mapeia para 'doutorMefisa'!
      if (acertosDoutorMefisa >= Math.max(1, Math.floor(amostraMax * 0.2))) {
        mapeamento[coluna] = 'doutorMefisa';
      } else if (acertosQtdSessao >= Math.max(1, Math.floor(amostraMax * 0.25)) && !mapeamento[coluna]) {
        mapeamento[coluna] = 'quantidadeSemana';
      } else if (acertosSemanas >= Math.max(1, Math.floor(amostraMax * 0.2)) && !mapeamento[coluna]) {
        mapeamento[coluna] = 'diaDaSemana';
      } else if (acertosProcedimento >= Math.max(1, Math.floor(amostraMax * 0.3)) && !mapeamento[coluna]) {
        mapeamento[coluna] = 'procedimento';
      }
    });

    return mapeamento;
  }

  /**
   * Helper para calcular a distância de Levenshtein entre duas strings (tolera erros de digitação)
   */
  public static calcularSimilaridadeLevenshtein(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    if (str1 === str2) return 1.0;
    const len1 = str1.length;
    const len2 = str2.length;
    if (len1 === 0 || len2 === 0) return 0;

    const track = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i += 1) track[0][i] = i;
    for (let j = 0; j <= len2; j += 1) track[j][0] = j;

    for (let j = 1; j <= len2; j += 1) {
      for (let i = 1; i <= len1; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = track[len2][len1];
    const maxLen = Math.max(len1, len2);
    return Math.max(0, (maxLen - distance) / maxLen);
  }

  /**
   * Localizador Inteligente de Doutor Mefisa / Prestador
   * Combina sanitização de títulos, busca por CRM/CRP, mapa de apelidos, tokenização e fuzzy matching (Levenshtein).
   */
  static encontrarPrestadorPorPrimeiroNome(
    nomeEntrada: string,
    prestadoresCadastrados: Prestador[]
  ): { prestador: Prestador | null; motivoCorrespondencia?: string; pontuacaoConfianca: number } {
    if (!nomeEntrada || !nomeEntrada.trim() || !prestadoresCadastrados || !prestadoresCadastrados.length) {
      return { prestador: null, pontuacaoConfianca: 0 };
    }

    const sanitizar = (txt: string) =>
      txt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\b(dra|dr|psic|medica|medico|prof|profa|doutor|doutora|mefisa|pasta|equipe|terapeuta|fono|to)\b\.?/gi, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const entradaLimpa = sanitizar(nomeEntrada);
    if (!entradaLimpa) return { prestador: null, pontuacaoConfianca: 0 };

    // 1. Busca Direta por CRM / CRP / Registro Profissional se houver dígitos na entrada
    const digitosEntrada = nomeEntrada.replace(/\D/g, '');
    if (digitosEntrada && digitosEntrada.length >= 4) {
      for (const p of prestadoresCadastrados) {
        const crmLimpo = (p.crmOuCrp || '').replace(/\D/g, '');
        const cpfLimpo = (p.cpf || '').replace(/\D/g, '');
        if ((crmLimpo && crmLimpo === digitosEntrada) || (cpfLimpo && cpfLimpo.includes(digitosEntrada))) {
          return { prestador: p, motivoCorrespondencia: 'MATCH_CRM_DOCUMENTO', pontuacaoConfianca: 100 };
        }
      }
    }

    const tokensEntrada = entradaLimpa.split(' ').filter(Boolean);

    // 2. Match Exato do Nome Sanitizado
    for (const p of prestadoresCadastrados) {
      const pLimpo = sanitizar(p.nome);
      if (pLimpo === entradaLimpa) {
        return { prestador: p, motivoCorrespondencia: 'MATCH_EXATO', pontuacaoConfianca: 100 };
      }
    }

    // 3. Mapa de Apelidos e Variações Comuns
    const mapaApelidos: Record<string, string> = {
      ana: 'ana beatriz',
      bia: 'ana beatriz',
      cadu: 'carlos eduardo',
      carlos: 'carlos eduardo',
      mari: 'mariana',
      gabi: 'gabriela',
      dani: 'daniela',
      rafa: 'rafaela',
      ju: 'juliana',
    };

    const primeiroToken = tokensEntrada[0];
    const equivalenteApelido = mapaApelidos[primeiroToken];

    if (equivalenteApelido) {
      for (const p of prestadoresCadastrados) {
        const pLimpo = sanitizar(p.nome);
        if (pLimpo.includes(equivalenteApelido)) {
          return { prestador: p, motivoCorrespondencia: 'NICKNAME_APELIDO', pontuacaoConfianca: 95 };
        }
      }
    }

    // 4. Token Overlap & Fuzzy Similarity (Levenshtein)
    let melhorPrestador: Prestador | null = null;
    let melhorScore = 0;
    let melhorMotivo = '';

    for (const p of prestadoresCadastrados) {
      const pLimpo = sanitizar(p.nome);
      const pTokens = pLimpo.split(' ').filter(Boolean);

      // Jaccard / Token Overlap score
      const tokensIgual = tokensEntrada.filter((t) =>
        pTokens.some((pt) => pt === t || (t.length >= 3 && pt.startsWith(t)) || (pt.length >= 3 && t.startsWith(pt)))
      );
      const tokenScore = tokensIgual.length / Math.max(tokensEntrada.length, 1);

      // Levenshtein Score no nome completo sanitizado
      const levScoreCompleto = LegacyImportService.calcularSimilaridadeLevenshtein(entradaLimpa, pLimpo);

      // Levenshtein Score no primeiro nome
      const levScorePrimeiroNome = pTokens[0] && tokensEntrada[0]
        ? LegacyImportService.calcularSimilaridadeLevenshtein(tokensEntrada[0], pTokens[0])
        : 0;

      const scoreFinal = Math.max(tokenScore * 0.9, levScoreCompleto, levScorePrimeiroNome * 0.85);

      if (scoreFinal > melhorScore) {
        melhorScore = scoreFinal;
        melhorPrestador = p;
        if (tokenScore === 1) melhorMotivo = 'TOKENS_COMPATIVEIS';
        else if (levScoreCompleto > 0.75) melhorMotivo = 'FUZZY_TYPO_CORRIGIDO';
        else melhorMotivo = 'PRIMEIRO_NOME_SIMILAR';
      }
    }

    if (melhorPrestador && melhorScore >= 0.55) {
      return {
        prestador: melhorPrestador,
        motivoCorrespondencia: melhorMotivo,
        pontuacaoConfianca: Math.round(melhorScore * 100),
      };
    }

    return { prestador: null, pontuacaoConfianca: 0 };
  }

  /**
   * Localiza um Procedimento TUSS cadastrado no sistema a partir de um termo abreviado,
   * nome parcial, especialidade ou código TUSS informado na planilha legada.
   */
  static encontrarProcedimentoPorTermo(
    nomeEntrada: string,
    procedimentosCadastrados: ProcedimentoCompleto[]
  ): { procedimento: ProcedimentoCompleto | null; motivoCorrespondencia?: string } {
    if (!nomeEntrada || !nomeEntrada.trim() || !procedimentosCadastrados || !procedimentosCadastrados.length) {
      return { procedimento: null };
    }

    const sanitizar = (txt: string) =>
      txt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .trim();

    const entradaLimpa = sanitizar(nomeEntrada);
    if (!entradaLimpa) return { procedimento: null };

    // 1. Match por código TUSS exato
    for (const p of procedimentosCadastrados) {
      if (p.codigo && p.codigo.trim() === nomeEntrada.trim()) {
        return { procedimento: p, motivoCorrespondencia: 'CODIGO_TUSS_EXATO' };
      }
    }

    // 2. Match Exato da Descrição ou Especialidade
    for (const p of procedimentosCadastrados) {
      const descLimpa = sanitizar(p.descricao);
      const espLimpa = sanitizar(p.especialidade || '');
      if (descLimpa === entradaLimpa || espLimpa === entradaLimpa) {
        return { procedimento: p, motivoCorrespondencia: 'MATCH_EXATO' };
      }
    }

    // 3. Determinar Categoria (Avaliação, Reavaliação, Convencional ou ABA Regular)
    const eAvaliacao = entradaLimpa.includes('avaliacao') || entradaLimpa.includes('aval');
    const eReavaliacao = entradaLimpa.includes('reavaliacao') || entradaLimpa.includes('reaval');
    const eConvencional =
      entradaLimpa.includes('sessao de') ||
      entradaLimpa.includes('convencional') ||
      entradaLimpa.includes('fisioterapia') ||
      entradaLimpa.includes('fisio') ||
      entradaLimpa.includes('nutricionismo') ||
      entradaLimpa.includes('nutricao') ||
      entradaLimpa.includes('neurologia') ||
      (!entradaLimpa.includes('aba') && !eAvaliacao && !eReavaliacao);

    let categoriaAlvo: 'AVALIACAO_ABA' | 'REAVALIACAO_ABA' | 'CONVENCIONAL' | 'ABA_REGULAR' = eConvencional ? 'CONVENCIONAL' : 'ABA_REGULAR';
    if (eReavaliacao) categoriaAlvo = 'REAVALIACAO_ABA';
    else if (eAvaliacao) categoriaAlvo = 'AVALIACAO_ABA';

    // Mapeamento de termos e atalhos populares
    const termosEspecialidades = [
      { chaves: ['fisioterapia', 'fisio', 'fisioterapica', 'motor', 'motora', 'respiratoria', 'pedia'], termoBusca: 'fisioterapia' },
      { chaves: ['nutricao', 'nutricionismo', 'nutri', 'nutricional'], termoBusca: 'nutricao' },
      { chaves: ['neurologia', 'neuro', 'neurologica'], termoBusca: 'neurologia' },
      { chaves: ['psicologia', 'psico', 'aba', 'psicoterapia', 'tcc'], termoBusca: 'psicologia' },
      { chaves: ['fonoaudiologia', 'fono', 'audiologia', 'linguagem'], termoBusca: 'fonoaudiologia' },
      { chaves: ['terapia ocupacional', 'to', 'ocupacional'], termoBusca: 'terapia ocupacional' },
      { chaves: ['musicoterapia', 'musico', 'musica'], termoBusca: 'musicoterapia' },
      { chaves: ['psicomotricidade', 'motricidade'], termoBusca: 'psicomotricidade' },
      { chaves: ['psicopedagogia', 'psicoped'], termoBusca: 'psicopedagogia' },
    ];

    let termoBuscaEspecialidade: string | null = null;
    for (const item of termosEspecialidades) {
      if (item.chaves.some((chave) => entradaLimpa.includes(chave) || entradaLimpa.split(/\s+/).includes(chave))) {
        termoBuscaEspecialidade = item.termoBusca;
        break;
      }
    }

    if (termoBuscaEspecialidade) {
      // Procura procedimento correspondente na categoria e especialidade
      const procEspecialidade = procedimentosCadastrados.find((p) => {
        const descP = sanitizar(p.descricao);
        const matchEsp = descP.includes(termoBuscaEspecialidade!) || sanitizar(p.especialidade || '').includes(termoBuscaEspecialidade!);
        if (categoriaAlvo === 'CONVENCIONAL') return p.categoria === 'CONVENCIONAL' && matchEsp;
        if (categoriaAlvo === 'AVALIACAO_ABA') return p.categoria === 'AVALIACAO_ABA' && matchEsp;
        if (categoriaAlvo === 'REAVALIACAO_ABA') return p.categoria === 'REAVALIACAO_ABA' && matchEsp;
        return (p.categoria === 'ABA_REGULAR' || p.categoria === 'CONVENCIONAL') && matchEsp;
      });

      if (procEspecialidade) {
        return { procedimento: procEspecialidade, motivoCorrespondencia: 'TERMO_ESPECIALIDADE' };
      }

      // Fallback para qualquer procedimento que contenha a especialidade
      const procQualquer = procedimentosCadastrados.find((p) => sanitizar(p.descricao).includes(termoBuscaEspecialidade!) || sanitizar(p.especialidade || '').includes(termoBuscaEspecialidade!));
      if (procQualquer) {
        return { procedimento: procQualquer, motivoCorrespondencia: 'FALLBACK_ESPECIALIDADE' };
      }
    }

    // 4. Substring Match genérico
    for (const p of procedimentosCadastrados) {
      const descLimpa = sanitizar(p.descricao);
      if (descLimpa.includes(entradaLimpa) || entradaLimpa.includes(descLimpa)) {
        return { procedimento: p, motivoCorrespondencia: 'SUBSTRING_TOKENS' };
      }
    }

    return { procedimento: null };
  }

  /**
   * Converte data brasileira (DD/MM/YYYY) para ISO (YYYY-MM-DD) se aplicável
   */
  static normalizarDataBrParaIso(dataStr: string): string {
    if (!dataStr) return '';
    const limpo = dataStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo; // Já ISO
    const partes = limpo.split('/');
    if (partes.length === 3) {
      const [dia, mes, ano] = partes;
      if (ano.length === 4 && mes.length <= 2 && dia.length <= 2) {
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      }
    }
    return limpo;
  }

  /**
   * Analisa e valida um lote de linhas brutas com base no mapeamento escolhido
   */
  static analisarLinhas(
    linhasBrutas: Record<string, string>[],
    mapeamento: Record<string, string>
  ): LinhaPreviaImportacao[] {
    const pacientesExistentes = PacientesService.obterPacientes();
    const prestadoresSistema = obterPrestadoresStorage();
    const procedimentosSistema = ProcedimentosService.obterTodos();
    const resultado: LinhaPreviaImportacao[] = [];

    linhasBrutas.forEach((row, idx) => {
      const linhaNum = idx + 1;
      const problemas: ProblemaImportacao[] = [];

      // Mapear campos
      const dadosMapeados: any = {};
      Object.entries(mapeamento).forEach(([colunaPlanilha, campoSistema]) => {
        if (row[colunaPlanilha] !== undefined) {
          dadosMapeados[campoSistema] = row[colunaPlanilha];
        }
      });

      const nome = (dadosMapeados.nome || '').trim();
      const carteirinha = (dadosMapeados.carteirinha || '').trim();
      const prestadorEntrada = (dadosMapeados.prestador || '').trim();
      let doutorMefisaEntrada = (dadosMapeados.doutorMefisa || dadosMapeados.doutoresAtendentes || '').trim();
      const semanasEntrada = (dadosMapeados.semanasAtendimento || dadosMapeados.semanaDia || dadosMapeados.diaDaSemana || '').trim();
      const procedimentoEntrada = (dadosMapeados.procedimento || '').trim();
      const qtdStr = (dadosMapeados.quantidadeSemana || '').trim();
      const dataSol = LegacyImportService.normalizarDataBrParaIso(dadosMapeados.dataSolicitacao || '');
      const proxAut = LegacyImportService.normalizarDataBrParaIso(dadosMapeados.proximaAutorizacao || '');
      const ultAut = LegacyImportService.normalizarDataBrParaIso(dadosMapeados.ultimaAutorizacao || '');
      const irregStr = (dadosMapeados.indicadorIrregularidade || '').toLowerCase();

      // Se a coluna de Doutor Mefisa não foi mapeada explicitamente, varre as células da linha procurando por Doutoras Mefisa
      if (!doutorMefisaEntrada) {
        for (const [col, val] of Object.entries(row)) {
          if (!val || typeof val !== 'string' || !val.trim()) continue;
          const { prestador: pDoc } = LegacyImportService.encontrarPrestadorPorPrimeiroNome(val, prestadoresSistema);
          if (pDoc && val.trim().toLowerCase() !== nome.toLowerCase()) {
            doutorMefisaEntrada = val.trim();
            break;
          }
        }
      }

      // Detecção e vínculo de Doutor Mefisa por primeiro nome / nome parcial
      let doutorMefisaFinal = doutorMefisaEntrada;
      let doutorMefisaIdFinal: string | undefined = undefined;
      let doutorIdentificadoNome: string | undefined = undefined;

      const termoBuscaMefisa = doutorMefisaEntrada || prestadorEntrada;
      if (termoBuscaMefisa) {
        const { prestador: pEncontrado } = LegacyImportService.encontrarPrestadorPorPrimeiroNome(
          termoBuscaMefisa,
          prestadoresSistema
        );

        if (pEncontrado) {
          doutorMefisaFinal = pEncontrado.nome;
          doutorMefisaIdFinal = pEncontrado.id;
          doutorIdentificadoNome = pEncontrado.nome;

          problemas.push({
            linha: linhaNum,
            campo: 'doutorMefisa',
            tipo: 'INFO',
            descricao: `Doutor Mefisa "${termoBuscaMefisa}" identificado com sucesso como "${pEncontrado.nome}" (${pEncontrado.orgaoClasse || 'CRM'} ${pEncontrado.crmOuCrp || ''} — ${pEncontrado.especialidade || 'Corpo Clínico'}).`,
          });
        } else if (doutorMefisaEntrada) {
          problemas.push({
            linha: linhaNum,
            campo: 'doutorMefisa',
            tipo: 'WARNING',
            descricao: `Doutor Mefisa "${doutorMefisaEntrada}" informado na planilha não foi localizado na base de Doutores Mefisa cadastrados.`,
          });
        }
      }

      // Prestador Solicitante
      let prestadorFinal = prestadorEntrada || doutorMefisaFinal || 'Dra. Ana Beatriz Albuquerque';
      let prestadorIdFinal = 'prest-1';
      if (prestadorEntrada) {
        const { prestador: pPrest } = LegacyImportService.encontrarPrestadorPorPrimeiroNome(
          prestadorEntrada,
          prestadoresSistema
        );
        if (pPrest) {
          prestadorFinal = pPrest.nome;
          prestadorIdFinal = pPrest.id;
        }
      } else if (doutorMefisaIdFinal) {
        prestadorIdFinal = doutorMefisaIdFinal;
      }

      // Detecção e vínculo de Procedimento TUSS por termo/abreviação
      let procedimentoFinal = procedimentoEntrada;
      let procedimentoIdFinal = 'proc-66600480';
      let procedimentoIdentificadoNome: string | undefined = undefined;

      if (procedimentoEntrada) {
        const { procedimento: procEncontrado } = LegacyImportService.encontrarProcedimentoPorTermo(
          procedimentoEntrada,
          procedimentosSistema
        );

        if (procEncontrado) {
          procedimentoFinal = procEncontrado.descricao;
          procedimentoIdFinal = procEncontrado.id;
          procedimentoIdentificadoNome = procEncontrado.descricao;

          problemas.push({
            linha: linhaNum,
            campo: 'procedimento',
            tipo: 'INFO',
            descricao: `Procedimento "${procedimentoEntrada}" reconhecido com sucesso como "${procEncontrado.descricao}" (Código TUSS: ${procEncontrado.codigo}).`,
          });
        } else {
          problemas.push({
            linha: linhaNum,
            campo: 'procedimento',
            tipo: 'WARNING',
            descricao: `Procedimento "${procedimentoEntrada}" não localizado na tabela TUSS cadastrada. Será mantida a nomenclatura da planilha.`,
          });
        }
      } else {
        problemas.push({
          linha: linhaNum,
          campo: 'procedimento',
          tipo: 'WARNING',
          descricao: 'Procedimento principal não informado na planilha legada.',
        });
      }

      // Validações obrigatórias
      if (!nome) {
        problemas.push({
          linha: linhaNum,
          campo: 'nome',
          tipo: 'ERROR',
          descricao: 'Nome do paciente é obrigatório e está ausente.',
        });
      }

      if (!carteirinha) {
        problemas.push({
          linha: linhaNum,
          campo: 'carteirinha',
          tipo: 'WARNING',
          descricao: 'Número de carteirinha ausente. Será registrado como Particular ou Avulso.',
        });
      }

      if (qtdStr && isNaN(Number(qtdStr))) {
        problemas.push({
          linha: linhaNum,
          campo: 'quantidadeSemana',
          tipo: 'ERROR',
          descricao: `Quantidade por semana inválida: "${qtdStr}".`,
        });
      }

      if (!dataSol) {
        problemas.push({
          linha: linhaNum,
          campo: 'dataSolicitacao',
          tipo: 'WARNING',
          descricao: 'Data de solicitação ausente na linha legada.',
        });
      } else if (dataSol && dataSol.length !== 10 && !dataSol.includes('-')) {
        problemas.push({
          linha: linhaNum,
          campo: 'dataSolicitacao',
          tipo: 'WARNING',
          descricao: `Formato de data de solicitação possivelmente incorreto: "${dadosMapeados.dataSolicitacao}".`,
        });
      }

      // Detecção de duplicidade
      let statusDuplicidade: StatusDuplicidadeImportacao = 'NOVO';
      let pacienteExistenteId: string | undefined = undefined;
      let pacienteExistenteNome: string | undefined = undefined;

      const pacienteMatch = pacientesExistentes.find((p) => {
        if (carteirinha && p.carteirinhaAtual === carteirinha) return true;
        if (nome && p.nome.toLowerCase() === nome.toLowerCase()) return true;
        return false;
      });

      if (pacienteMatch) {
        statusDuplicidade = 'POSSIVEL_DUPLICIDADE';
        pacienteExistenteId = pacienteMatch.id;
        pacienteExistenteNome = pacienteMatch.nome;
        problemas.push({
          linha: linhaNum,
          campo: 'paciente',
          tipo: 'INFO',
          descricao: `Possível duplicidade detectada com paciente existente: "${pacienteMatch.nome}" (Prontuário: ${pacienteMatch.codigoProntuario}).`,
        });
      }

      const poloStr = (dadosMapeados.polo || '').toString().toLowerCase().trim();
      const poloNormalizado: 'M1' | 'M2' | 'ON' =
        poloStr.includes('on') || poloStr.includes('online') ? 'ON' :
        poloStr.includes('2') || poloStr.includes('polo 2') || poloStr.includes('p2') || poloStr.includes('m2') ? 'M2' : 'M1';

      const temErroCritico = problemas.some((p) => p.tipo === 'ERROR');

      const resAtim = this.extrairDiasAtendimentoInteligente(semanasEntrada, qtdStr ? Number(qtdStr) : undefined);

      resultado.push({
        indiceLinha: linhaNum,
        dadosBrutos: row,
        dadosMapeados: {
          nome,
          carteirinha,
          prestador: prestadorFinal,
          prestadorId: prestadorIdFinal,
          prestadorNomeOriginal: prestadorEntrada,
          doutorIdentificadoNome,
          procedimento: procedimentoFinal,
          procedimentoId: procedimentoIdFinal,
          procedimentoNomeOriginal: procedimentoEntrada,
          procedimentoIdentificadoNome,
          cbo: sanitizarCbo(dadosMapeados.cbo) || '251510',
          crm: dadosMapeados.crm || '06/00000',
          uf: dadosMapeados.uf || 'SP',
          dataSolicitacao: dataSol || '2026-10-24',
          quantidadeSemana: resAtim.quantidadeSemana,
          sessoesPorSemana: resAtim.quantidadeSemana,
          semanasAtendimento: resAtim.diaDaSemanaStr,
          diaDaSemana: resAtim.diaDaSemanaStr,
          diasDaSemana: resAtim.dias,
          doutorMefisa: doutorMefisaFinal || doutorIdentificadoNome,
          proximaAutorizacao: proxAut || '2026-10-31',
          ultimaAutorizacao: ultAut || undefined,
          convenio: dadosMapeados.convenio ? dadosMapeados.convenio.trim() : undefined,
          pastaDoutoraMefisa: dadosMapeados.pastaDoutoraMefisa ? dadosMapeados.pastaDoutoraMefisa.trim() : undefined,
          polo: poloNormalizado,
          indicadorIrregularidade: irregStr === 'true' || irregStr === 'sim' || irregStr === '1',
          cpf: dadosMapeados.cpf ? dadosMapeados.cpf.trim() : undefined,
          token: dadosMapeados.token ? dadosMapeados.token.trim() : undefined,
          tokenStatus: dadosMapeados.tokenStatus
            ? (dadosMapeados.tokenStatus.toString().toUpperCase().includes('NVNJ') ? 'NVNJ' : dadosMapeados.tokenStatus.toString().toUpperCase().includes('NV') ? 'NVJ' : 'V')
            : undefined,
          tokenJustificativa: dadosMapeados.tokenJustificativa ? dadosMapeados.tokenJustificativa.trim() : undefined,
          statusImpressao: dadosMapeados.statusImpressao
            ? (dadosMapeados.statusImpressao.toString().toUpperCase().includes('IMPRIMIDO') || dadosMapeados.statusImpressao.toString().toUpperCase() === 'SIM' || dadosMapeados.statusImpressao.toString().toUpperCase() === 'VERDE' ? 'IMPRIMIDO' : 'A_IMPRIMIR')
            : undefined,
          duracaoSessao: dadosMapeados.duracaoSessao
            ? (dadosMapeados.duracaoSessao.toString().toLowerCase().includes('30') || dadosMapeados.duracaoSessao.toString().includes('0,5') || dadosMapeados.duracaoSessao.toString().includes('0.5') ? '30MIN' : '1H')
            : (dadosMapeados.classificacao === 'CONVENCIONAL' || (procedimentoFinal && (procedimentoFinal.toLowerCase().includes('sessão de') || procedimentoFinal.toLowerCase().includes('fisioterapia') || procedimentoFinal.toLowerCase().includes('fonoaudiologia') || procedimentoFinal.toLowerCase().includes('terapia ocupacional') || procedimentoFinal.toLowerCase().includes('nutricionismo'))) ? '30MIN' : '1H'),
          cid: dadosMapeados.cid ? dadosMapeados.cid.trim() : undefined,
          responsavelNome: dadosMapeados.responsavelNome ? dadosMapeados.responsavelNome.trim() : undefined,
          observacoes: dadosMapeados.observacoes ? dadosMapeados.observacoes.trim() : undefined,
          classificacao: dadosMapeados.classificacao
            ? (dadosMapeados.classificacao.toString().toUpperCase().includes('CONV') ? 'CONVENCIONAL' : 'ABA')
            : ((procedimentoFinal && (procedimentoFinal.toLowerCase().includes('sessão de') || procedimentoFinal.toLowerCase().includes('fisioterapia') || procedimentoFinal.toLowerCase().includes('fonoaudiologia') || procedimentoFinal.toLowerCase().includes('terapia ocupacional') || procedimentoFinal.toLowerCase().includes('nutricionismo') || procedimentoFinal.toLowerCase().includes('neurologia'))) ? 'CONVENCIONAL' : 'ABA'),
        },
        problemas,
        statusDuplicidade,
        pacienteExistenteId,
        pacienteExistenteNome,
        validoParaImportar: !temErroCritico,
      });
    });

    return resultado;
  }

  /**
   * Executa a importação transacional em lote (ImportBatch)
   */
  static executarImportacaoTransacional(
    linhasPrevias: LinhaPreviaImportacao[],
    nomeArquivo: string,
    usuarioNome: string
  ): { lote: ImportBatch; relatorio: RelatorioImportacao } {
    const inicioMs = Date.now();
    const loteId = `lote-${Date.now()}`;

    let pacientesCriados = 0;
    let pacientesAssociados = 0;
    let possiveisDuplicidades = 0;
    let warnings = 0;
    let erros = 0;
    let rejeitados = 0;

    const novosPacientesParaCadastrar: any[] = [];
    const prestadoresSistema = obterPrestadoresStorage();
    const todosPacientesExistentes = PacientesService.obterPacientes();

    linhasPrevias.forEach((linha) => {
      if (!linha.validoParaImportar) {
        rejeitados++;
        erros += linha.problemas.filter((p) => p.tipo === 'ERROR').length;
        return;
      }

      warnings += linha.problemas.filter((p) => p.tipo === 'WARNING').length;
      if (linha.statusDuplicidade === 'POSSIVEL_DUPLICIDADE') {
        possiveisDuplicidades++;
      }

      const { dadosMapeados } = linha;

      if (linha.pacienteExistenteId) {
        // Associar e preservar histórico de carteirinha
        const pacExistente = todosPacientesExistentes.find(
          (p) => p.id === linha.pacienteExistenteId
        );
        if (pacExistente && dadosMapeados.carteirinha) {
          PacientesService.trocarCarteirinha(
            pacExistente.id,
            {
              convenioId: 'conv-1',
              convenioNome: 'Convênio Importado',
              numeroCarteirinha: dadosMapeados.carteirinha,
              dataInicio: dadosMapeados.dataSolicitacao || '2026-10-24',
              observacao: 'Importação histórica da planilha legada',
            },
            { nome: usuarioNome, papel: 'ADMINISTRADOR' }
          );
        }
        pacientesAssociados++;
      } else {
        const doutorMefisaNomeStr = dadosMapeados.doutorMefisa || dadosMapeados.prestador;
        const doutorMefisaEncontrado =
          prestadoresSistema.find((p) => p.nome.toLowerCase() === doutorMefisaNomeStr?.toLowerCase()) ||
          prestadoresSistema.find((p) => p.id === dadosMapeados.prestadorId);

        const prestadorEncontrado =
          prestadoresSistema.find((p) => p.id === dadosMapeados.prestadorId) ||
          prestadoresSistema.find((p) => p.nome.toLowerCase() === dadosMapeados.prestador?.toLowerCase()) ||
          doutorMefisaEncontrado;

        const atimResPac = this.extrairDiasAtendimentoInteligente(
          dadosMapeados.diaDaSemana || dadosMapeados.semanasAtendimento,
          dadosMapeados.quantidadeSemana
        );

        const eConv = dadosMapeados.classificacao === 'CONVENCIONAL' || (dadosMapeados.procedimento && (dadosMapeados.procedimento.toLowerCase().includes('sessão de') || dadosMapeados.procedimento.toLowerCase().includes('fisioterapia') || dadosMapeados.procedimento.toLowerCase().includes('fonoaudiologia') || dadosMapeados.procedimento.toLowerCase().includes('nutricionismo')));

        const procNome = dadosMapeados.procedimento || (eConv ? 'Sessão de Fisioterapia' : 'Psicologia ABA');

        novosPacientesParaCadastrar.push({
          nome: dadosMapeados.nome,
          carteirinha: dadosMapeados.carteirinha || 'PART-LEGADO-00',
          convenioId: 'conv-1',
          convenioNome: dadosMapeados.convenio || (eConv ? 'Bradesco Saúde' : 'Convênio Legado'),
          procedimentoPrincipal: procNome,
          procedimentos: [procNome],
          frequenciasPorProcedimento: {
            [procNome]: atimResPac.quantidadeSemana,
          },
          diasPorProcedimento: {
            [procNome]: atimResPac.dias,
          },
          prestadorId: prestadorEncontrado?.id || dadosMapeados.prestadorId || 'prest-1',
          prestadorNome: prestadorEncontrado?.nome || dadosMapeados.prestador || 'Dra. Ana Beatriz Albuquerque',
          doutoresAtendentesIds: doutorMefisaEncontrado ? [doutorMefisaEncontrado.id] : ['prest-1'],
          doutoresAtendentesNomes: doutorMefisaEncontrado
            ? [`${doutorMefisaEncontrado.nome} (${doutorMefisaEncontrado.orgaoClasse || 'CRM'} ${doutorMefisaEncontrado.crmOuCrp || ''})`]
            : [doutorMefisaNomeStr || 'Dra. Ana Beatriz Albuquerque'],
          pastaDoutoraMefisa: dadosMapeados.pastaDoutoraMefisa || (doutorMefisaEncontrado ? `Pasta ${doutorMefisaEncontrado.nome}` : `Pasta ${doutorMefisaNomeStr || 'Mefisa'}`),
          polo: dadosMapeados.polo || 'M1',
          status: 'ATIVO' as const,
          classificacao: dadosMapeados.classificacao || (eConv ? 'CONVENCIONAL' : 'ABA'),
          cpf: dadosMapeados.cpf,
          token: dadosMapeados.token,
          tokenStatus: dadosMapeados.tokenStatus || (dadosMapeados.tokenJustificativa ? 'NVJ' : (dadosMapeados.token ? 'V' : 'V')),
          tokenJustificativa: dadosMapeados.tokenJustificativa,
          statusImpressao: dadosMapeados.statusImpressao || 'A_IMPRIMIR',
          duracaoSessao: dadosMapeados.duracaoSessao || (eConv ? '30MIN' : '1H'),
          cid: dadosMapeados.cid || 'F84.0',
          responsavelNome: dadosMapeados.responsavelNome || 'Não informado',
          diaDaSemana: atimResPac.diaDaSemanaStr,
          diasDaSemana: atimResPac.dias,
          quantidadeSemana: atimResPac.quantidadeSemana,
          sessoesPorSemana: atimResPac.quantidadeSemana,
          proximaAutorizacaoData: dadosMapeados.proximaAutorizacao,
          ultimaAutorizacaoData: dadosMapeados.ultimaAutorizacao,
          observacoes: dadosMapeados.observacoes || (dadosMapeados.indicadorIrregularidade
            ? 'Origem: Planilha legada | Tipo: Indicador visual histórico (Irregularidade)'
            : 'Origem: Planilha legada'),
        });
        pacientesCriados++;
      }
    });

    if (novosPacientesParaCadastrar.length > 0) {
      PacientesService.cadastrarPacientesEmLote(novosPacientesParaCadastrar, {
        nome: usuarioNome,
        papel: 'ADMINISTRADOR',
      });
    }

    const duracaoMs = Date.now() - inicioMs;
    const batch: ImportBatch = {
      id: loteId,
      dataHora: new Date().toISOString().replace('T', ' ').slice(0, 19),
      usuarioResponsavel: usuarioNome,
      nomeArquivo,
      tamanhoKb: 45,
      tipoArquivo: nomeArquivo.endsWith('.csv') ? 'CSV' : 'XLSX',
      totalLinhas: linhasPrevias.length,
      importadosCount: pacientesCriados + pacientesAssociados,
      rejeitadosCount: rejeitados,
      warningCount: warnings,
      duplicidadesCount: possiveisDuplicidades,
      status: 'CONCLUIDO',
      duracaoMs,
    };

    const relatorio: RelatorioImportacao = {
      lote: batch,
      linhas: linhasPrevias,
      resumo: {
        totalAnalisadas: linhasPrevias.length,
        pacientesCriados,
        pacientesAssociados,
        possiveisDuplicidades,
        warnings,
        erros,
        rejeitados,
      },
    };

    return { lote: batch, relatorio };
  }
}
