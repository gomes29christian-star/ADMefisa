/**
 * Serviço de Sincronização em Tempo Real via Firebase Cloud Firestore — Clínica Mefisa
 * Sincroniza Pacientes, Prestadores, Autorizações e Configurações entre múltiplos dispositivos.
 * Possui mecanismo de proteção contra estouro de cota diária (Resource Exhausted Circuit Breaker).
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Paciente, Prestador } from '../types/clinic';
import { AutorizacaoV2 } from '../types/autorizacao';
import { DeletedRecordsService } from './deletedRecordsService';

type SyncListener = () => void;

const QUOTA_EXHAUSTED_STORAGE_KEY = 'mefisa_firestore_quota_exhausted_date';

class CloudSyncManager {
  private isInitialized = false;
  private listeners: SyncListener[] = [];
  private unsubscribers: Array<() => void> = [];
  private quotaExceeded = false;
  private warnedQuotaThisSession = false;

  constructor() {
    this.checkInitialQuotaState();
  }

  private getHojeIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private checkInitialQuotaState(): void {
    if (typeof window !== 'undefined') {
      try {
        const storedDate = localStorage.getItem(QUOTA_EXHAUSTED_STORAGE_KEY);
        if (storedDate === this.getHojeIso()) {
          this.quotaExceeded = true;
        }
      } catch {}
    }
  }

  public isQuotaExceeded(): boolean {
    if (this.quotaExceeded) return true;
    if (typeof window !== 'undefined') {
      try {
        const storedDate = localStorage.getItem(QUOTA_EXHAUSTED_STORAGE_KEY);
        if (storedDate === this.getHojeIso()) {
          this.quotaExceeded = true;
          return true;
        }
      } catch {}
    }
    return false;
  }

  private handleFirestoreError(error: any): boolean {
    const code = String(error?.code || '');
    const msg = String(error?.message || error || '');
    if (
      code.includes('resource-exhausted') ||
      msg.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded')
    ) {
      this.quotaExceeded = true;
      try {
        localStorage.setItem(QUOTA_EXHAUSTED_STORAGE_KEY, this.getHojeIso());
      } catch {}

      if (!this.warnedQuotaThisSession) {
        this.warnedQuotaThisSession = true;
        console.warn(
          'Sincronização em nuvem pausada: Cota diária gratuita do Firestore esgotada. O sistema opera normalmente através do armazenamento local.'
        );
      }
      this.unsubscribeAll();
      return true;
    }
    return false;
  }

  public unsubscribeAll(): void {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribers = [];
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('Erro em listener do CloudSync:', e);
      }
    });
  }

  /**
   * Inicia os ouvintes em tempo real com Firestore
   */
  public initRealtimeSync(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (this.isQuotaExceeded()) {
      if (!this.warnedQuotaThisSession) {
        this.warnedQuotaThisSession = true;
        console.info(
          'Sincronização em nuvem Firestore em pausa devido à cota diária do projeto. Os dados locais continuam ativos.'
        );
      }
      return;
    }

    try {
      // 1. Sincronização de Pacientes
      const pacientesCol = collection(db, 'pacientes');
      const unsubPacientes = onSnapshot(
        pacientesCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remotos: Paciente[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Paciente;
              if (data && data.id && data.nome) {
                remotos.push(data);
              }
            });

            if (remotos.length > 0) {
              const localRaw = localStorage.getItem('mefisa_pacientes_v2');
              const localList: Paciente[] = localRaw ? JSON.parse(localRaw) : [];

              const deletedRegs = DeletedRecordsService.obterRegistrosDeletados();
              const idsDeletados = new Set(
                deletedRegs
                  .filter((r) => r.tipo === 'paciente' && r.dadosOriginais?.id)
                  .map((r) => r.dadosOriginais.id)
              );

              const map = new Map<string, Paciente>();
              localList.forEach((p) => {
                if (p && p.id && !idsDeletados.has(p.id)) map.set(p.id, p);
              });
              remotos.forEach((p) => {
                if (p && p.id && !idsDeletados.has(p.id)) map.set(p.id, p);
              });

              const merged = Array.from(map.values());
              localStorage.setItem('mefisa_pacientes_v2', JSON.stringify(merged));
              this.notify();
            }
          }
        },
        (error) => {
          if (this.handleFirestoreError(error)) return;
          console.warn('Sync de Pacientes aguardando conectividade:', error.message);
        }
      );
      this.unsubscribers.push(unsubPacientes);

      // 2. Sincronização de Prestadores (Médicos)
      const prestadoresCol = collection(db, 'prestadores');
      const unsubPrestadores = onSnapshot(
        prestadoresCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remotos: Prestador[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Prestador;
              if (data && data.id) {
                remotos.push(data);
              }
            });

            if (remotos.length > 0) {
              const localRaw = localStorage.getItem('clinica_mefisa_prestadores_v2');
              const localList: Prestador[] = localRaw ? JSON.parse(localRaw) : [];

              const map = new Map<string, Prestador>();
              localList.forEach((p) => map.set(p.id, p));
              remotos.forEach((p) => map.set(p.id, p));

              const merged = Array.from(map.values());
              localStorage.setItem('clinica_mefisa_prestadores_v2', JSON.stringify(merged));
              this.notify();
            }
          }
        },
        (error) => {
          if (this.handleFirestoreError(error)) return;
          console.warn('Sync de Prestadores aguardando conectividade:', error.message);
        }
      );
      this.unsubscribers.push(unsubPrestadores);

      // 3. Sincronização de Autorizações
      const autorizacoesCol = collection(db, 'autorizacoes');
      const unsubAutorizacoes = onSnapshot(
        autorizacoesCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remotos: AutorizacaoV2[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as AutorizacaoV2;
              if (data && data.id) {
                remotos.push(data);
              }
            });

            if (remotos.length > 0) {
              const localRaw = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
              const localList: AutorizacaoV2[] = localRaw ? JSON.parse(localRaw) : [];

              const map = new Map<string, AutorizacaoV2>();
              localList.forEach((a) => map.set(a.id, a));
              remotos.forEach((a) => map.set(a.id, a));

              const merged = Array.from(map.values());
              localStorage.setItem('clinica_mefisa_autorizacoes_v2', JSON.stringify(merged));
              this.notify();
            }
          }
        },
        (error) => {
          if (this.handleFirestoreError(error)) return;
          console.warn('Sync de Autorizações aguardando conectividade:', error.message);
        }
      );
      this.unsubscribers.push(unsubAutorizacoes);

      // 4. Sincronização de Usuários e Senhas do Sistema
      const usuariosCol = collection(db, 'usuarios');
      const unsubUsuarios = onSnapshot(
        usuariosCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remotos: any[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.id) {
                remotos.push(data);
              }
            });

            if (remotos.length > 0) {
              const localRaw = localStorage.getItem('clinica_mefisa_usuarios_custom_v1');
              const localList: any[] = localRaw ? JSON.parse(localRaw) : [];

              const map = new Map<string, any>();
              localList.forEach((u) => map.set(u.id, u));
              remotos.forEach((u) => map.set(u.id, u));

              const merged = Array.from(map.values());
              localStorage.setItem('clinica_mefisa_usuarios_custom_v1', JSON.stringify(merged));
              this.notify();
            }
          }
        },
        (error) => {
          if (this.handleFirestoreError(error)) return;
          console.warn('Sync de Usuários aguardando conectividade:', error.message);
        }
      );
      this.unsubscribers.push(unsubUsuarios);

      // 5. Sincronização de Tokens de Backups Inutilizados/Consumidos
      const consumedCol = collection(db, 'consumed_backups');
      const unsubConsumed = onSnapshot(
        consumedCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remotosIds: string[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.backupId) {
                remotosIds.push(data.backupId);
              }
            });

            if (remotosIds.length > 0) {
              const localRaw = localStorage.getItem('mefisa_consumed_backups_v1');
              const localList: string[] = localRaw ? JSON.parse(localRaw) : [];
              const setIds = new Set([...localList, ...remotosIds]);
              localStorage.setItem('mefisa_consumed_backups_v1', JSON.stringify(Array.from(setIds)));
            }
          }
        },
        (error) => {
          if (this.handleFirestoreError(error)) return;
          console.warn('Sync de Backups Consumidos aguardando conectividade:', error.message);
        }
      );
      this.unsubscribers.push(unsubConsumed);

      // Carga inicial leve apenas se a nuvem estiver vazia e quota permitir
      this.uploadDadosLocaisParaNuvemSeNecessario();
    } catch (e) {
      if (!this.handleFirestoreError(e)) {
        console.error('Falha ao iniciar sincronização Firebase:', e);
      }
    }
  }

  /**
   * Sincroniza um paciente individualmente na nuvem
   */
  public async salvarPacienteNuvem(paciente: Paciente): Promise<void> {
    if (this.isQuotaExceeded() || !paciente?.id) return;
    try {
      const ref = doc(db, 'pacientes', paciente.id);
      await setDoc(ref, paciente, { merge: true });
    } catch (e: any) {
      if (this.handleFirestoreError(e)) return;
      console.warn('Erro ao salvar paciente no Firestore:', e);
    }
  }

  /**
   * Deleta paciente da nuvem
   */
  public async removerPacienteNuvem(pacienteId: string): Promise<void> {
    if (this.isQuotaExceeded() || !pacienteId) return;
    try {
      const ref = doc(db, 'pacientes', pacienteId);
      await deleteDoc(ref);
    } catch (e: any) {
      if (this.handleFirestoreError(e)) return;
      console.warn('Erro ao deletar paciente do Firestore:', e);
    }
  }

  /**
   * Sincroniza autorização individualmente na nuvem
   */
  public async salvarAutorizacaoNuvem(autorizacao: AutorizacaoV2): Promise<void> {
    if (this.isQuotaExceeded() || !autorizacao?.id) return;
    try {
      const ref = doc(db, 'autorizacoes', autorizacao.id);
      await setDoc(ref, autorizacao, { merge: true });
    } catch (e: any) {
      if (this.handleFirestoreError(e)) return;
      console.warn('Erro ao salvar autorização no Firestore:', e);
    }
  }

  /**
   * Sincroniza prestador na nuvem
   */
  public async salvarPrestadorNuvem(prestador: Prestador): Promise<void> {
    if (this.isQuotaExceeded() || !prestador?.id) return;
    try {
      const ref = doc(db, 'prestadores', prestador.id);
      await setDoc(ref, prestador, { merge: true });
    } catch (e: any) {
      if (this.handleFirestoreError(e)) return;
      console.warn('Erro ao salvar prestador no Firestore:', e);
    }
  }

  /**
   * Sincroniza usuário e senha na nuvem
   */
  public async salvarUsuarioNuvem(usuario: any): Promise<void> {
    if (this.isQuotaExceeded() || !usuario?.id) return;
    try {
      const ref = doc(db, 'usuarios', usuario.id);
      await setDoc(ref, usuario, { merge: true });
    } catch (e: any) {
      if (this.handleFirestoreError(e)) return;
      console.warn('Erro ao salvar usuário no Firestore:', e);
    }
  }

  /**
   * Sincroniza token de backup inutilizado na nuvem
   */
  public async salvarBackupConsumidoNuvem(backupId: string): Promise<void> {
    if (this.isQuotaExceeded() || !backupId) return;
    try {
      const ref = doc(db, 'consumed_backups', backupId);
      await setDoc(ref, { backupId, consumedAt: new Date().toISOString() }, { merge: true });
    } catch (e: any) {
      if (this.handleFirestoreError(e)) return;
      console.warn('Erro ao registrar backup consumido no Firestore:', e);
    }
  }

  /**
   * Se este navegador já possui dados cadastrados no LocalStorage e a nuvem estiver vazia,
   * sobe os dados locais automaticamente para a nuvem de forma controlada.
   */
  public async uploadDadosLocaisParaNuvemSeNecessario(): Promise<void> {
    if (this.isQuotaExceeded()) return;
    try {
      // 1. Pacientes
      const pacSnap = await getDocs(collection(db, 'pacientes'));
      if (pacSnap.empty) {
        const localPacRaw = localStorage.getItem('mefisa_pacientes_v2');
        if (localPacRaw) {
          const pacientes: Paciente[] = JSON.parse(localPacRaw);
          for (const p of pacientes) {
            if (this.isQuotaExceeded()) break;
            if (p.id) {
              await setDoc(doc(db, 'pacientes', p.id), p, { merge: true });
            }
          }
        }
      }

      if (this.isQuotaExceeded()) return;

      // 2. Prestadores
      const prestSnap = await getDocs(collection(db, 'prestadores'));
      if (prestSnap.empty) {
        const localPrestRaw = localStorage.getItem('clinica_mefisa_prestadores_v2');
        if (localPrestRaw) {
          const prestadores: Prestador[] = JSON.parse(localPrestRaw);
          for (const pr of prestadores) {
            if (this.isQuotaExceeded()) break;
            if (pr.id) {
              await setDoc(doc(db, 'prestadores', pr.id), pr, { merge: true });
            }
          }
        }
      }

      if (this.isQuotaExceeded()) return;

      // 3. Autorizações
      const autSnap = await getDocs(collection(db, 'autorizacoes'));
      if (autSnap.empty) {
        const localAutRaw = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
        if (localAutRaw) {
          const autorizacoes: AutorizacaoV2[] = JSON.parse(localAutRaw);
          for (const a of autorizacoes) {
            if (this.isQuotaExceeded()) break;
            if (a.id) {
              await setDoc(doc(db, 'autorizacoes', a.id), a, { merge: true });
            }
          }
        }
      }
    } catch (err: any) {
      if (!this.handleFirestoreError(err)) {
        console.warn('Seed inicial de dados locais para Firestore:', err);
      }
    }
  }
}

export const CloudSyncService = new CloudSyncManager();
