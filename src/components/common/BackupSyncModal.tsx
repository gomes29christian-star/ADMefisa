import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  AlertCircle,
  X,
  Database,
  ArrowRight,
} from 'lucide-react';
import { BackupSyncService } from '../../services/backupSyncService';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const BackupSyncModal: React.FC<BackupSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [resumo, setResumo] = useState(() => BackupSyncService.obterResumoLocal());
  const [copiado, setCopiado] = useState(false);
  const [importTexto, setImportTexto] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setResumo(BackupSyncService.obterResumoLocal());
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  const isStudio = typeof window !== 'undefined' && window.location.hostname.includes('run.app');

  const handleDownload = () => {
    try {
      BackupSyncService.baixarArquivoBackup();
      setFeedback({ tipo: 'sucesso', texto: 'Arquivo de backup baixado com sucesso!' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setFeedback({ tipo: 'erro', texto: `Erro ao baixar: ${msg}` });
    }
  };

  const handleCopiar = async () => {
    const ok = await BackupSyncService.copiarBackupParaClipboard();
    if (ok) {
      setCopiado(true);
      setFeedback({ tipo: 'sucesso', texto: 'Dados copiados para a área de transferência! Cole no outro navegador.' });
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
          if (onDataRestored) onDataRestored();
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
      setFeedback({ tipo: 'erro', texto: 'Cole os dados do backup antes de confirmar.' });
      return;
    }

    const res = BackupSyncService.restaurarBackup(importTexto.trim());
    if (res.sucesso) {
      setFeedback({ tipo: 'sucesso', texto: res.mensagem });
      setTimeout(() => {
        if (onDataRestored) onDataRestored();
        window.location.reload();
      }, 1200);
    } else {
      setFeedback({ tipo: 'erro', texto: res.mensagem });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Quicksand']">
                Backup e Sincronização de Dados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Migre facilmente seus pacientes, autorizações e configurações entre o Studio e o GitHub Pages.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação Contextual de Ambiente */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Por que os dados não aparecem automaticamente no GitHub Pages?</strong> Por segurança e privacidade médica, os navegadores isolam o armazenamento local (LocalStorage) de cada site.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ambiente atual: <span className="font-semibold text-slate-700 dark:text-slate-200">{isGitHubPages ? '🌐 GitHub Pages' : isStudio ? '🛠️ AI Studio' : '💻 Local'}</span>
            </p>
          </div>
        </div>

        {/* Resumo do que está salvo agora */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Pacientes</div>
            <div className="text-base font-bold text-blue-700 dark:text-blue-300">{resumo.pacientes}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Médicos</div>
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">{resumo.prestadores}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Autorizações</div>
            <div className="text-base font-bold text-amber-700 dark:text-amber-300">{resumo.autorizacoes}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Guias</div>
            <div className="text-base font-bold text-indigo-700 dark:text-indigo-300">{resumo.guias}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">Tabela TUSS</div>
            <div className="text-base font-bold text-purple-700 dark:text-purple-300">{resumo.procedimentos}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">Usuários</div>
            <div className="text-base font-bold text-slate-800 dark:text-slate-200">{resumo.usuarios}</div>
          </div>
        </div>

        {/* Feedback visual */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {feedback.tipo === 'sucesso' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.texto}</span>
          </div>
        )}

        {/* Ações: Exportar e Importar lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna 1: Exportar (Fazer no Studio) */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
              <Download className="w-4 h-4" />
              <span>1. Exportar Dados (No Studio)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Gere uma cópia completa de todos os pacientes e dados cadastrados aqui no Studio para transferir ao GitHub.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arquivo de Backup (.json)</span>
              </button>
              <button
                type="button"
                onClick={handleCopiar}
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? 'Dados Copiados!' : 'Copiar Dados para Área de Transferência'}</span>
              </button>
            </div>
          </div>

          {/* Coluna 2: Importar (Fazer no GitHub Pages) */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
              <Upload className="w-4 h-4" />
              <span>2. Importar Dados (No GitHub)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              No GitHub Pages, selecione o arquivo baixado ou cole o código para carregar tudo instantaneamente.
            </p>
            <div className="flex flex-col gap-2 pt-1">
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
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Selecionar Arquivo .json</span>
              </button>
              <button
                type="button"
                onClick={() => setModoManual(!modoManual)}
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{modoManual ? 'Fechar Modo Texto' : 'Colar Dados Manualmente (Texto)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Caixa de Texto Manual caso o usuário queira colar diretamente */}
        {modoManual && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3 animate-in fade-in">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Cole o texto do backup JSON abaixo:
            </label>
            <textarea
              rows={4}
              value={importTexto}
              onChange={(e) => setImportTexto(e.target.value)}
              placeholder='Cole aqui o conteúdo copiado (começa com {"versao": "2.0.0", ...})'
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleRestaurarTexto}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar e Restaurar Dados</span>
            </button>
          </div>
        )}

        {/* Rodapé informativo */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Clínica Mefisa &copy; Sistema Integrado</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
