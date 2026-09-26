/**
 * Serviço de armazenamento persistente para o arquivo original do formulário.
 * Salva o arquivo real (Blob/File) intacto no IndexedDB, sem qualquer alteração,
 * compressão ou reconstrução de dados.
 */

const DB_NAME = 'mefisa_arquivos_originais_v2';
const DB_VERSION = 1;
const STORE_NAME = 'arquivos_originais';

export interface ArquivoArmazenado {
  pacienteId: string;
  blob: Blob;
  nomeArquivo: string;
  tipoMime: string;
  tamanhoKb: number;
  paginasDataUrl?: string[];
  atualizadoEm: string;
}

// Cache em memória para acesso imediato na mesma sessão
const cacheArquivos = new Map<string, ArquivoArmazenado>();

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'pacienteId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class FormularioStorageService {
  /**
   * Salva o arquivo original (Blob ou File) exatamente como ele foi fornecido
   */
  static async salvarArquivoOriginal(
    pacienteId: string,
    arquivo: Blob | File,
    nomeArquivo: string,
    paginasDataUrl?: string[]
  ): Promise<void> {
    if (!pacienteId || !arquivo) return;

    const registro: ArquivoArmazenado = {
      pacienteId,
      blob: arquivo,
      nomeArquivo,
      tipoMime: arquivo.type || (nomeArquivo.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      tamanhoKb: Math.round(arquivo.size / 1024),
      paginasDataUrl,
      atualizadoEm: new Date().toISOString(),
    };

    cacheArquivos.set(pacienteId, registro);

    try {
      const db = await abrirDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(registro);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('Armazenamento salvo apenas em cache da sessão:', err);
    }
  }

  /**
   * Recupera o arquivo original do paciente
   */
  static async obterArquivoOriginal(pacienteId: string): Promise<ArquivoArmazenado | null> {
    if (!pacienteId) return null;

    if (cacheArquivos.has(pacienteId)) {
      return cacheArquivos.get(pacienteId) || null;
    }

    try {
      const db = await abrirDB();
      const resultado = await new Promise<ArquivoArmazenado | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(pacienteId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (resultado && resultado.blob) {
        cacheArquivos.set(pacienteId, resultado);
        return resultado;
      }
    } catch (err) {
      console.warn('Erro ao ler arquivo original do IndexedDB:', err);
    }

    return null;
  }

  /**
   * Remove o arquivo do IndexedDB
   */
  static async removerArquivoOriginal(pacienteId: string): Promise<void> {
    if (!pacienteId) return;
    cacheArquivos.delete(pacienteId);

    try {
      const db = await abrirDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(pacienteId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('Erro ao remover arquivo:', err);
    }
  }
}
