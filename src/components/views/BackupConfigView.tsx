import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { BackupSyncService } from '../../services/backupSyncService';

export const BackupConfigView: React.FC = () => {
  const [resumo, setResumo] = useState(() => BackupSyncService.obterResumoLocal());
  const [copiado, setCopiado] = useState(false);
  const [importTexto, setImportTexto] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  const isStudio = typeof window !== 'undefined' && window.location.hostname.includes('run.app');

  const handleDownload = () => {
    try {
      BackupSyncService.baixarArquivoBackup();
      setFeedback({ tipo: 'sucesso', texto: 'Arquivo de backup completo baixado com sucesso!' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setFeedback({ tipo: 'erro', texto: `Erro ao gerar download: ${msg}` });
    }
  };

  const handleCopiar = async () => {
    const ok = await BackupSyncService.copiarBackupParaClipboard();
    if (ok) {
      setCopiado(true);
      setFeedback({ tipo: 'sucesso', texto: 'Dados da clínica copiados! Abra o GitHub Pages e clique em "Restaurar Dados".' });
      setTimeout(() => setCopiado(false), 3000);
    } else {
      setModoManual(true);
      const payload = BackupSyncService.gerarBackup();
      setImportTexto(JSON.stringify(payload, null, 2));
    }
  };

  const handleArquivoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = BackupSyncService.restaurarBackup(content);
      if (res.sucesso) {
        setFeedback({ tipo: 'sucesso', texto: res.mensagem });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setFeedback({ tipo: 'erro', texto: res.mensagem });
      }
    };
    reader.readAsText(file);
  };

  const handleRestaurarTexto = () => {
    if (!importTexto.trim()) {
      setFeedback({ tipo: 'erro', texto: 'Cole o código JSON do backup antes de confirmar.' });
      return;
    }

    const res = BackupSyncService.restaurarBackup(importTexto.trim());
    if (res.sucesso) {
      setFeedback({ tipo: 'sucesso', texto: res.mensagem });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Explicativo */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-['Quicksand'] text-slate-900 dark:text-white flex items-center gap-2">
              <span>Sincronização e Migração de Dados da Clínica</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                Studio ↔ GitHub Pages
              </span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Todos os pacientes, médicos, autorizações, prontuários e preferências são gravados com total privacidade no armazenamento local do navegador (LocalStorage). Como navegadores protegem domínios diferentes (o AI Studio e o GitHub Pages não compartilham dados automaticamente), utilize os botões abaixo para migrar seus dados em segundos.
            </p>
          </div>
        </div>

        {/* Status do Ambiente Atual */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-600 dark:text-slate-300">
              Ambiente detectado neste navegador:
            </span>
            <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
              {isGitHubPages ? '🌐 GitHub Pages (Produção)' : isStudio ? '🛠️ Google AI Studio (Desenvolvimento)' : '💻 Navegador'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Origem: <code className="font-mono text-[10px]">{typeof window !== 'undefined' ? window.location.origin : ''}</code>
          </div>
        </div>
      </div>

      {/* Resumo de Dados Presentes */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Dados Salvos Atualmente Neste Navegador:</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-center">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Pacientes</span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{resumo.pacientes}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-center">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Médicos</span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{resumo.prestadores}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-center">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Autorizações</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{resumo.autorizacoes}</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-center">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Guias</span>
            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{resumo.guias}</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 text-center">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Tabela TUSS</span>
            <span className="text-xl font-bold text-purple-700 dark:text-purple-300">{resumo.procedimentos}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Usuários</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{resumo.usuarios}</span>
          </div>
        </div>
      </div>

      {/* Feedback de Operação */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {feedback.tipo === 'sucesso' ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Painéis Passo a Passo de Migração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Passo 1: Exportação */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-base">
            <Download className="w-5 h-5" />
            <span>Passo 1: Exportar Dados (No Studio)</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Se você cadastrou pacientes, médicos ou autorizações aqui no Studio, gere o arquivo de backup para levar para o GitHub Pages.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo Completo (.json)</span>
            </button>

            <button
              type="button"
              onClick={handleCopiar}
              className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiado ? 'Copiado para Área de Transferência!' : 'Copiar Dados para Área de Transferência'}</span>
            </button>
          </div>
        </div>

        {/* Passo 2: Importação */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-base">
            <Upload className="w-5 h-5" />
            <span>Passo 2: Importar Dados (No GitHub Pages)</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Ao abrir o site no GitHub Pages, vá nesta mesma tela (ou clique em "Backup & Dados" no topo) e importe o arquivo.
          </p>

          <div className="space-y-2.5 pt-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleArquivoUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Carregar Arquivo .json</span>
            </button>

            <button
              type="button"
              onClick={() => setModoManual(!modoManual)}
              className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>{modoManual ? 'Fechar Modo Texto' : 'Colar Dados Manualmente (Texto)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Caixa de Texto Manual */}
      {modoManual && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            Cole os dados do backup abaixo:
          </label>
          <textarea
            rows={5}
            value={importTexto}
            onChange={(e) => setImportTexto(e.target.value)}
            placeholder='Cole aqui o código JSON copiado'
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white text-xs font-mono"
          />
          <button
            type="button"
            onClick={handleRestaurarTexto}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Check className="w-4 h-4" />
            <span>Restaurar e Carregar Dados Imediatamente</span>
          </button>
        </div>
      )}
    </div>
  );
};
