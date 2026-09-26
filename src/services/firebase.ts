import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigRaw from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseConfigRaw.apiKey,
  authDomain: firebaseConfigRaw.authDomain,
  projectId: firebaseConfigRaw.projectId,
  storageBucket: firebaseConfigRaw.storageBucket,
  messagingSenderId: firebaseConfigRaw.messagingSenderId,
  appId: firebaseConfigRaw.appId,
  measurementId: firebaseConfigRaw.measurementId,
};

// Inicializa o app Firebase (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Conecta ao Firestore usando o Database ID provisionado
export const db = firebaseConfigRaw.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigRaw.firestoreDatabaseId)
  : getFirestore(app);

// Validação de conexão inicial (conforme especificação da integração)
export async function testConnection(): Promise<boolean> {
  try {
    const hojeIso = new Date().toISOString().split('T')[0];
    if (typeof window !== 'undefined' && localStorage.getItem('mefisa_firestore_quota_exhausted_date') === hojeIso) {
      return false;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    const msg = String(error?.message || '');
    const code = String(error?.code || '');
    if (code.includes('resource-exhausted') || msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded')) {
      const hojeIso = new Date().toISOString().split('T')[0];
      try {
        localStorage.setItem('mefisa_firestore_quota_exhausted_date', hojeIso);
      } catch {}
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is unreachable.');
    }
    // Conexão iniciada mesmo que doc não exista
    return true;
  }
}

// Testa na inicialização
testConnection().catch((err) => {
  console.debug('Verificação inicial Firebase:', err);
});
