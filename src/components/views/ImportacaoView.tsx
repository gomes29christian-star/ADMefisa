/**
 * Módulo de Pré-visualização, Mapeamento e Importação Transacional de Planilhas Legadas — Clínica Mefisa
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  FileText,
  Layers,
  Check,
  HelpCircle,
  Sparkles,
  Pencil,
  Edit3,
  X,
} from 'lucide-react';
import { LegacyImportService, DADOS_FICTICIOS_EXEMPLO_CSV } from '../../services/legacyImportService';
import { LinhaPreviaImportacao, ImportBatch, RelatorioImportacao } from '../../types/import';
import { useTheme } from '../../context/ThemeContext';
import { useSecretAchievements } from '../../context/SecretAchievementsContext';
import { TopScrollTableWrapper } from '../common/TopScrollTableWrapper';
import { Usuario } from '../../types/clinic';
import { obterPrestadoresStorage } from '../../data/mockClinicData';
import { ProcedimentosService } from '../../services/procedimentosService';

interface ImportacaoViewProps {
  onOpenAudit: () => void;
  usuarioAtualNome?: string;
  usuarioAtual?: Usuario;
}

export const ImportacaoView: React.FC<ImportacaoViewProps> = ({
  onOpenAudit,
  usuarioAtualNome = 'Maria Clara Fonseca',
  usuarioAtual,
}) => {
  const { getThemeStrokeStyle } = useTheme();
  const { triggerSecretAction } = useSecretAchievements();

  const isAdmin = usuarioAtual?.papel === 'ADMINISTRADOR';

  if (!isAdmin) {
    return (
      <div className="p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto my-12 space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
            Acesso Restrito a Administradores
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            A importação de planilhas de doutores e pacientes é uma operação restrita exclusivamente a usuários com papel de <strong className="text-slate-800 dark:text-slate-200">Administrador (ADM)</strong>.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
            Seu nível de acesso atual: {usuarioAtual?.papel || 'Funcionário'}
          </span>
        </div>
      </div>
    );
  }

  // Etapas do Wizard de Importação (1: Upload/Fixture -> 2: Mapeamento -> 3: Pré-visualização/Validação -> 4: Relatório Final)
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

  // Estados de dados
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [conteudoBrutoTexto, setConteudoBrutoTexto] = useState<string>('');
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [linhasBrutas, setLinhasBrutas] = useState<Record<string, string>[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});
  const [linhasPrevias, setLinhasPrevias] = useState<LinhaPreviaImportacao[]>([]);
  const [relatorioFinal, setRelatorioFinal] = useState<RelatorioImportacao | null>(null);

  // Estados de edição no preview da importação
  const [modoEdicaoDireta, setModoEdicaoDireta] = useState<boolean>(true);
  const [linhaEmEdicaoModal, setLinhaEmEdicaoModal] = useState<LinhaPreviaImportacao | null>(null);

  // Atualizador em tempo real dos campos da linha da pré-visualização
  const handleUpdateCampoLinha = (
    indiceLinha: number,
    campo: keyof LinhaPreviaImportacao['dadosMapeados'],
    valor: any
  ) => {
    setLinhasPrevias((prev) =>
      prev.map((l) => {
        if (l.indiceLinha !== indiceLinha) return l;

        const dadosMapeadosAtualizados = {
          ...l.dadosMapeados,
          [campo]: valor,
        };

        const novosProblemas: LinhaPreviaImportacao['problemas'] = [];
        const nomeVal = (dadosMapeadosAtualizados.nome || '').trim();

        if (!nomeVal) {
          novosProblemas.push({
            linha: indiceLinha,
            campo: 'nome',
            tipo: 'ERROR',
            descricao: 'Nome do paciente é obrigatório.',
          });
        }

        const temErroCritico = novosProblemas.some((p) => p.tipo === 'ERROR');

        return {
          ...l,
          dadosMapeados: dadosMapeadosAtualizados,
          problemas: novosProblemas,
          validoParaImportar: !temErroCritico,
        };
      })
    );
  };

  // Carregar fixture fictícia de teste
  const handleCarregarFixtureFicticia = () => {
    setNomeArquivo('planilha_legada_ficticia_mefisa.csv');
    setConteudoBrutoTexto(DADOS_FICTICIOS_EXEMPLO_CSV);
    const parsed = LegacyImportService.parseCsv(DADOS_FICTICIOS_EXEMPLO_CSV);
    setCabecalho(parsed.cabecalho);
    setLinhasBrutas(parsed.linhas);
    const prestadores = obterPrestadoresStorage();
    const procedimentos = ProcedimentosService.obterTodos();
    const sugestao = LegacyImportService.sugerirMapeamentoComDados(
      parsed.cabecalho,
      parsed.linhas,
      prestadores,
      procedimentos
    );
    setMapeamento(sugestao);
    setEtapa(2); // Ir para mapeamento
  };

  // Upload manual de arquivo CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setConteudoBrutoTexto(text);
        const parsed = LegacyImportService.parseCsv(text);
        setCabecalho(parsed.cabecalho);
        setLinhasBrutas(parsed.linhas);
        const prestadores = obterPrestadoresStorage();
        const procedimentos = ProcedimentosService.obterTodos();
        const sugestao = LegacyImportService.sugerirMapeamentoComDados(
          parsed.cabecalho,
          parsed.linhas,
          prestadores,
          procedimentos
        );
        setMapeamento(sugestao);
        setEtapa(2);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Executar análise e validação após confirmar mapeamento
  const handleAvancarParaPrevia = () => {
    const analise = LegacyImportService.analisarLinhas(linhasBrutas, mapeamento);
    setLinhasPrevias(analise);
    setEtapa(3);
  };

  // Confirmar importação transacional
  const handleConfirmarImportacao = () => {
    triggerSecretAction('importador_legado');
    const { relatorio } = LegacyImportService.executarImportacaoTransacional(
      linhasPrevias,
      nomeArquivo,
      usuarioAtualNome
    );
    setRelatorioFinal(relatorio);
    setEtapa(4);
  };

  return (
    <div className="space-y-6 text-xs text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 font-bold mb-2 text-xs border border-blue-200 dark:border-blue-800">
            <Sparkles className="w-3.5 h-3.5 text-[#002172] dark:text-blue-400" />
            <span>Módulo V0.5 — Importação e Migração Segura de Planilhas Legadas</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Quicksand'] text-slate-900 dark:text-white tracking-tight">
            Migração & Importação de Dados
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl font-['Nunito_Sans']">
            Converta planilhas legadas em cadastros mestre estruturados com pré-visualização transacional, validação estrita, preservação de histórico e detecção de duplicidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAudit}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            Ver Trilha de Auditoria
          </button>
        </div>
      </div>

      {/* Indicador de Etapas do Wizard */}
      <div className="grid grid-cols-4 gap-2">
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 1 ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002172] text-[#002172] dark:text-blue-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          1. Seleção de Arquivo
        </div>
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 2 ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002172] text-[#002172] dark:text-blue-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          2. Mapeamento de Colunas
        </div>
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 3 ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002172] text-[#002172] dark:text-blue-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          3. Validação & Pré-visualização
        </div>
        <div className={`p-3 rounded-xl border text-center transition-all ${etapa === 4 ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
          4. Relatório Concluído
        </div>
      </div>

      {/* ETAPA 1: Seleção de Arquivo ou Fixture Fictícia */}
      {etapa === 1 && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-[#002172] dark:text-blue-300 flex items-center justify-center mx-auto shadow-inner">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Selecione o arquivo de planilha legada (.csv ou .xlsx)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              O arquivo será processado localmente com total segurança LGPD. Nenhum dado será enviado a servidores externos ou APIs de IA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <label className="px-5 py-3 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold shadow-md cursor-pointer transition-colors inline-flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#91CA0C]" />
              <span>Escolher Arquivo do Computador</span>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleCarregarFixtureFicticia}
              className="px-5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Carregar Planilha Fictícia de Teste (Exemplo Mefisa)</span>
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: Mapeamento de Colunas */}
      {etapa === 2 && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold font-['Quicksand'] text-slate-900 dark:text-white">
                Mapeamento de Colunas da Planilha ({nomeArquivo})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                O sistema sugeriu correspondências automaticamente. Confirme ou ajuste conforme necessário antes de analisar.
              </p>
            </div>
            <button
              onClick={() => setEtapa(1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ← Voltar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cabecalho.map((colunaPlanilha) => (
              <div key={colunaPlanilha} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">{colunaPlanilha}</div>
                  <div className="text-[10px] text-slate-400">Ex: {linhasBrutas[0]?.[colunaPlanilha] || '(vazio)'}</div>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={mapeamento[colunaPlanilha] || 'ignorar'}
                    onChange={(e) => setMapeamento({ ...mapeamento, [colunaPlanilha]: e.target.value })}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-[#002172]"
                  >
                    <option value="ignorar">-- Ignorar Coluna --</option>
                    <option value="nome">Nome do Paciente *</option>
                    <option value="cpf">CPF</option>
                    <option value="convenio">Convênio Principal</option>
                    <option value="carteirinha">Número da Carteirinha</option>
                    <option value="doutorMefisa">Doutor(a) Mefisa</option>
                    <option value="prestador">Prestador / Médico Solicitante</option>
                    <option value="procedimento">Procedimento Terapêutico</option>
                    <option value="diaDaSemana">Dias em que passa (ex: seg., ter., qua., qui., sex., sáb.)</option>
                    <option value="quantidadeSemana">Quantidade de Sessões por Semana (ex: 1x/sem, 2x/sem, 3x/sem)</option>
                    <option value="pastaDoutoraMefisa">Pasta do Doutor Mefisa</option>
                    <option value="polo">M (M1 / M2)</option>
                    <option value="dataSolicitacao">Data da Solicitação</option>
                    <option value="proximaAutorizacao">Próxima Autorização</option>
                    <option value="ultimaAutorizacao">Última Autorização</option>
                    <option value="cbo">CBO</option>
                    <option value="crm">CRM / CRP / Conselho</option>
                    <option value="uf">UF</option>
                    <option value="indicadorIrregularidade">Indicador Visual de Irregularidade</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={handleAvancarParaPrevia}
              className="px-6 py-2.5 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-2"
            >
              <span>Analisar e Validar Dados</span>
              <ArrowRight className="w-4 h-4 text-[#91CA0C]" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Pré-visualização e Validação */}
      {etapa === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Analisado</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">{linhasPrevias.length}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Válidos para Importar</div>
              <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 font-mono">
                {linhasPrevias.filter((l) => l.validoParaImportar).length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Possíveis Duplicidades</div>
              <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 font-mono">
                {linhasPrevias.filter((l) => l.statusDuplicidade === 'POSSIVEL_DUPLICIDADE').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 shadow-2xs">
              <div className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase">Erros / Rejeitados</div>
              <div className="text-2xl font-extrabold text-red-900 dark:text-red-200 mt-1 font-mono">
                {linhasPrevias.filter((l) => !l.validoParaImportar).length}
              </div>
            </div>
          </div>

          {/* Banner de Controle do Modo de Edição */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#002172] dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Edição em Tempo Real
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Altere qualquer dado diretamente nas células da tabela abaixo ou clique em "Detalhes" para editar todos os campos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModoEdicaoDireta(!modoEdicaoDireta)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  modoEdicaoDireta
                    ? 'bg-[#002172] text-white border border-[#002172]'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Pencil className="w-3.5 h-3.5 text-[#91CA0C]" />
                <span>{modoEdicaoDireta ? '⚡ Edição Direta na Tabela: ATIVA' : '👁️ Modo Somente Leitura'}</span>
              </button>
            </div>
          </div>

          <TopScrollTableWrapper tableTitle="Pré-visualização e Edição dos Registros Mapeados">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3 font-bold">Linha</th>
                  <th className="py-3 px-3 font-bold min-w-[170px]">Nome Mapeado *</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">Carteirinha</th>
                  <th className="py-3 px-3 font-bold text-center min-w-[80px]">M (M1/M2)</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Doutor(a) Mefisa</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Prestador Solicitante</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Procedimento TUSS</th>
                  <th className="py-3 px-3 font-bold min-w-[150px]">Dias em que passa</th>
                  <th className="py-3 px-3 font-bold text-center min-w-[100px]">Qtd. / Semana</th>
                  <th className="py-3 px-3 font-bold min-w-[110px]">Última Aut.</th>
                  <th className="py-3 px-3 font-bold text-[#002172] dark:text-blue-300 min-w-[110px]">Próxima Aut.</th>
                  <th className="py-3 px-3 font-bold min-w-[130px]">Status Duplicidade</th>
                  <th className="py-3 px-3 font-bold min-w-[100px]">Validação</th>
                  <th className="py-3 px-3 font-bold text-right min-w-[90px]">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {linhasPrevias.map((linha) => (
                  <tr key={linha.indiceLinha} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">#{linha.indiceLinha}</td>
                    
                    {/* Nome Mapeado */}
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.nome || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'nome', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172] focus:ring-1 focus:ring-[#002172]"
                          placeholder="Nome do paciente..."
                        />
                      ) : (
                        <span>{linha.dadosMapeados.nome || '(Sem Nome)'}</span>
                      )}
                    </td>

                    {/* Carteirinha */}
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.carteirinha || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'carteirinha', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="Carteirinha..."
                        />
                      ) : (
                        <span>{linha.dadosMapeados.carteirinha || 'Particular'}</span>
                      )}
                    </td>

                    {/* Polo M1 / M2 */}
                    <td className="py-2 px-3 text-center">
                      {modoEdicaoDireta ? (
                        <select
                          value={linha.dadosMapeados.polo === 'M2' || linha.dadosMapeados.polo === 'Polo 2' ? 'M2' : 'M1'}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'polo', e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172]"
                        >
                          <option value="M1">M1</option>
                          <option value="M2">M2</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          linha.dadosMapeados.polo === 'M2' || linha.dadosMapeados.polo === 'Polo 2'
                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950 dark:text-teal-300'
                        }`}>
                          {linha.dadosMapeados.polo === 'M2' || linha.dadosMapeados.polo === 'Polo 2' ? 'M2' : 'M1'}
                        </span>
                      )}
                    </td>

                    {/* Doutor(a) Mefisa */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <div className="space-y-1">
                          <select
                            value={
                              obterPrestadoresStorage().find(
                                (p) => p.nome.toLowerCase() === (linha.dadosMapeados.doutorMefisa || '').toLowerCase()
                              )?.nome || linha.dadosMapeados.doutorMefisa || ''
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCampoLinha(linha.indiceLinha, 'doutorMefisa', val);
                              const pEnc = obterPrestadoresStorage().find((p) => p.nome === val);
                              if (pEnc) {
                                handleUpdateCampoLinha(linha.indiceLinha, 'prestadorId', pEnc.id);
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-slate-900 dark:text-white focus:outline-[#002172]"
                          >
                            <option value="">-- Selecionar Doutor(a) Mefisa --</option>
                            {obterPrestadoresStorage().map((p) => (
                              <option key={p.id} value={p.nome}>
                                {p.nome} ({p.orgaoClasse || 'CRM'} {p.crmOuCrp || ''})
                              </option>
                            ))}
                            {linha.dadosMapeados.doutorMefisa &&
                              !obterPrestadoresStorage().some(
                                (p) => p.nome.toLowerCase() === (linha.dadosMapeados.doutorMefisa || '').toLowerCase()
                              ) && (
                                <option value={linha.dadosMapeados.doutorMefisa}>
                                  📝 {linha.dadosMapeados.doutorMefisa} (Digitado / Não cadastrado)
                                </option>
                              )}
                          </select>
                          {obterPrestadoresStorage().some(
                            (p) => p.nome.toLowerCase() === (linha.dadosMapeados.doutorMefisa || '').toLowerCase()
                          ) ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> Cadastrado no Mefisa
                            </span>
                          ) : (
                            linha.dadosMapeados.doutorMefisa && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                ⚠️ Não cadastrado
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="font-bold text-slate-900 dark:text-white">
                          {linha.dadosMapeados.doutorMefisa || (linha.dadosMapeados.doutorIdentificadoNome) || 'Não informado'}
                        </div>
                      )}
                    </td>

                    {/* Prestador Solicitante */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.prestador || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'prestador', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="Prestador solicitante..."
                        />
                      ) : (
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {linha.dadosMapeados.prestador || 'Mesmo do Doutor Mefisa'}
                        </div>
                      )}
                    </td>

                    {/* Procedimento TUSS */}
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.procedimento || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'procedimento', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-purple-900 dark:text-purple-300 focus:outline-[#002172]"
                          placeholder="Procedimento..."
                        />
                      ) : (
                        <div className="font-bold text-purple-900 dark:text-purple-300">
                          {linha.dadosMapeados.procedimento || 'Psicologia ABA'}
                        </div>
                      )}
                    </td>

                    {/* Dias em que passa */}
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.diaDaSemana || linha.dadosMapeados.semanasAtendimento || ''}
                          onChange={(e) => {
                            handleUpdateCampoLinha(linha.indiceLinha, 'diaDaSemana', e.target.value);
                            handleUpdateCampoLinha(linha.indiceLinha, 'semanasAtendimento', e.target.value);
                          }}
                          className="w-36 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-medium text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="Ex: seg., ter., qua., sex."
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-[10px]">
                          {linha.dadosMapeados.diaDaSemana || linha.dadosMapeados.semanasAtendimento || 'seg., ter., qua., sex.'}
                        </span>
                      )}
                    </td>

                    {/* Quantidade por Semana */}
                    <td className="py-2 px-3 text-center">
                      {modoEdicaoDireta ? (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={linha.dadosMapeados.quantidadeSemana || 2}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'quantidadeSemana', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-xs text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-bold text-[#002172] dark:text-blue-300 focus:outline-[#002172]"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-[#002172] dark:bg-blue-950 dark:text-blue-300 font-extrabold text-[10px] font-mono">
                          {linha.dadosMapeados.quantidadeSemana || 2}x/sem
                        </span>
                      )}
                    </td>

                    {/* Última Autorização */}
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.ultimaAutorizacao || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'ultimaAutorizacao', e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono text-slate-900 dark:text-white focus:outline-[#002172]"
                          placeholder="DD/MM/AAAA"
                        />
                      ) : (
                        <span>{linha.dadosMapeados.ultimaAutorizacao || '—'}</span>
                      )}
                    </td>

                    {/* Próxima Autorização */}
                    <td className="py-2 px-3 font-mono text-blue-800 dark:text-blue-300 font-bold">
                      {modoEdicaoDireta ? (
                        <input
                          type="text"
                          value={linha.dadosMapeados.proximaAutorizacao || ''}
                          onChange={(e) => handleUpdateCampoLinha(linha.indiceLinha, 'proximaAutorizacao', e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded font-mono font-bold text-blue-800 dark:text-blue-300 focus:outline-[#002172]"
                          placeholder="DD/MM/AAAA"
                        />
                      ) : (
                        <span>{linha.dadosMapeados.proximaAutorizacao || '—'}</span>
                      )}
                    </td>

                    {/* Status Duplicidade */}
                    <td className="py-3 px-3">
                      {linha.statusDuplicidade === 'POSSIVEL_DUPLICIDADE' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-[10px] font-bold border border-amber-300">
                          ⚠️ Possível Duplicidade ({linha.pacienteExistenteNome})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold border border-emerald-300">
                          ✓ Novo Paciente
                        </span>
                      )}
                    </td>

                    {/* Validação */}
                    <td className="py-3 px-3">
                      {linha.validoParaImportar ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                        </span>
                      ) : (
                        <span className="text-red-700 dark:text-red-400 font-semibold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Erro Crítico
                        </span>
                      )}
                    </td>

                    {/* Ação Modal Detalhes */}
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setLinhaEmEdicaoModal(linha)}
                        title="Editar todos os campos detalhados deste registro"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#002172] dark:text-blue-400" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TopScrollTableWrapper>

          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <button
              onClick={() => setEtapa(2)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              ← Ajustar Mapeamento
            </button>

            <button
              onClick={handleConfirmarImportacao}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-white" />
              <span>Confirmar e Executar Importação Transacional</span>
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: Relatório Final */}
      {etapa === 4 && relatorioFinal && (
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Importação Concluída com Sucesso!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Lote ID: {relatorioFinal.lote.id} · Duração: {relatorioFinal.lote.duracaoMs}ms
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Pacientes Criados</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{relatorioFinal.resumo.pacientesCriados}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Associados (Histórico)</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{relatorioFinal.resumo.pacientesAssociados}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Possíveis Duplicidades</div>
              <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">{relatorioFinal.resumo.possiveisDuplicidades}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Registros Rejeitados</div>
              <div className="text-xl font-extrabold text-red-700 dark:text-red-400 font-mono">{relatorioFinal.resumo.rejeitados}</div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setEtapa(1);
                setRelatorioFinal(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#002172] text-white text-xs font-bold shadow-md hover:bg-[#001752] transition-colors"
            >
              Realizar Nova Importação
            </button>
            <button
              onClick={onOpenAudit}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              Visualizar Trilha de Auditoria
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edição Detalhada de Registro */}
      {linhaEmEdicaoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#002172] dark:text-blue-400" />
                <h3 className="text-base font-bold font-['Quicksand'] text-slate-900 dark:text-white">
                  Editar Registro #{linhaEmEdicaoModal.indiceLinha} — {linhaEmEdicaoModal.dadosMapeados.nome || '(Sem Nome)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLinhaEmEdicaoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Paciente *
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.nome || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, nome: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                  placeholder="Nome do paciente..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Número da Carteirinha
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.carteirinha || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, carteirinha: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-[#002172]"
                  placeholder="Carteirinha..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  M (Polo)
                </label>
                <select
                  value={
                    linhaEmEdicaoModal.dadosMapeados.polo === 'M2' || linhaEmEdicaoModal.dadosMapeados.polo === 'Polo 2'
                      ? 'M2'
                      : 'M1'
                  }
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, polo: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                >
                  <option value="M1">M1</option>
                  <option value="M2">M2</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doutor(a) Mefisa
                </label>
                <select
                  value={
                    obterPrestadoresStorage().find(
                      (p) => p.nome.toLowerCase() === (linhaEmEdicaoModal.dadosMapeados.doutorMefisa || '').toLowerCase()
                    )?.nome || linhaEmEdicaoModal.dadosMapeados.doutorMefisa || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const pEnc = obterPrestadoresStorage().find((p) => p.nome === val);
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: {
                        ...linhaEmEdicaoModal.dadosMapeados,
                        doutorMefisa: val,
                        prestadorId: pEnc?.id || linhaEmEdicaoModal.dadosMapeados.prestadorId,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-[#002172]"
                >
                  <option value="">-- Selecionar Doutor(a) Mefisa --</option>
                  {obterPrestadoresStorage().map((p) => (
                    <option key={p.id} value={p.nome}>
                      {p.nome} ({p.orgaoClasse || 'CRM'} {p.crmOuCrp || ''})
                    </option>
                  ))}
                  {linhaEmEdicaoModal.dadosMapeados.doutorMefisa &&
                    !obterPrestadoresStorage().some(
                      (p) => p.nome.toLowerCase() === (linhaEmEdicaoModal.dadosMapeados.doutorMefisa || '').toLowerCase()
                    ) && (
                      <option value={linhaEmEdicaoModal.dadosMapeados.doutorMefisa}>
                        📝 {linhaEmEdicaoModal.dadosMapeados.doutorMefisa} (Texto livre)
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prestador / Médico Solicitante
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.prestador || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, prestador: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-[#002172]"
                  placeholder="Prestador externo..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Procedimento Terapêutico
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.procedimento || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, procedimento: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-300 font-bold focus:outline-[#002172]"
                  placeholder="Procedimento..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Última Autorização
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.ultimaAutorizacao || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, ultimaAutorizacao: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-[#002172]"
                  placeholder="DD/MM/AAAA"
                />
              </div>

              <div>
                <label className="block font-bold text-[#002172] dark:text-blue-300 mb-1">
                  Próxima Autorização
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.proximaAutorizacao || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, proximaAutorizacao: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-200 font-mono font-bold focus:outline-[#002172]"
                  placeholder="DD/MM/AAAA"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Convênio Principal
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.convenio || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, convenio: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-[#002172]"
                  placeholder="Ex: Bradesco Saúde, Amil..."
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pasta do Doutor Mefisa
                </label>
                <input
                  type="text"
                  value={linhaEmEdicaoModal.dadosMapeados.pastaDoutoraMefisa || ''}
                  onChange={(e) =>
                    setLinhaEmEdicaoModal({
                      ...linhaEmEdicaoModal,
                      dadosMapeados: { ...linhaEmEdicaoModal.dadosMapeados, pastaDoutoraMefisa: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-[#002172]"
                  placeholder="Ex: Pasta Dra. Ana Beatriz..."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinhaEmEdicaoModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateCampoLinha(
                    linhaEmEdicaoModal.indiceLinha,
                    'nome',
                    linhaEmEdicaoModal.dadosMapeados.nome
                  );
                  setLinhasPrevias((prev) =>
                    prev.map((l) =>
                      l.indiceLinha === linhaEmEdicaoModal.indiceLinha
                        ? {
                            ...linhaEmEdicaoModal,
                            validoParaImportar: Boolean(linhaEmEdicaoModal.dadosMapeados.nome?.trim()),
                          }
                        : l
                    )
                  );
                  setLinhaEmEdicaoModal(null);
                }}
                className="px-6 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white font-bold shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-[#91CA0C]" />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
