/**
 * Serviço de Sincronização em Tempo Real via Firebase Cloud Firestore — Clínica Mefisa
 * Sincroniza Pacientes, Prestadores, Autorizações e Configurações entre múltiplos dispositivos.
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
import { Paciente, Prestador, Usuario } from '../types/clinic';
import { AutorizacaoV2 } from '../types/autorizacao';

type SyncListener = () => void;

class CloudSyncManager {
  private isInitialized = false;
  private listeners: SyncListener[] = [];
  private unsubscribers: Array<() => void> = [];

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

              // Mescla inteligente: adiciona ou atualiza os remotos
              const map = new Map<string, Paciente>();
              localList.forEach((p) => map.set(p.id, p));
              remotos.forEach((p) => map.set(p.id, p));

              const merged = Array.from(map.values());
              localStorage.setItem('mefisa_pacientes_v2', JSON.stringify(merged));
              this.notify();
            }
          }
        },
        (error) => {
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
          console.warn('Sync de Autorizações aguardando conectividade:', error.message);
        }
      );
      this.unsubscribers.push(unsubAutorizacoes);

      // Carga inicial dos dados locais para a nuvem caso a nuvem esteja vazia
      this.uploadDadosLocaisParaNuvemSeNecessario();
    } catch (e) {
      console.error('Falha ao iniciar sincronização Firebase:', e);
    }
  }

  /**
   * Sincroniza um paciente individualmente na nuvem
   */
  public async salvarPacienteNuvem(paciente: Paciente): Promise<void> {
    try {
      if (!paciente.id) return;
      const ref = doc(db, 'pacientes', paciente.id);
      await setDoc(ref, paciente, { merge: true });
    } catch (e) {
      console.warn('Erro ao salvar paciente no Firestore:', e);
    }
  }

  /**
   * Deleta paciente da nuvem
   */
  public async removerPacienteNuvem(pacienteId: string): Promise<void> {
    try {
      if (!pacienteId) return;
      const ref = doc(db, 'pacientes', pacienteId);
      await deleteDoc(ref);
    } catch (e) {
      console.warn('Erro ao deletar paciente do Firestore:', e);
    }
  }

  /**
   * Sincroniza autorização individualmente na nuvem
   */
  public async salvarAutorizacaoNuvem(autorizacao: AutorizacaoV2): Promise<void> {
    try {
      if (!autorizacao.id) return;
      const ref = doc(db, 'autorizacoes', autorizacao.id);
      await setDoc(ref, autorizacao, { merge: true });
    } catch (e) {
      console.warn('Erro ao salvar autorização no Firestore:', e);
    }
  }

  /**
   * Sincroniza prestador na nuvem
   */
  public async salvarPrestadorNuvem(prestador: Prestador): Promise<void> {
    try {
      if (!prestador.id) return;
      const ref = doc(db, 'prestadores', prestador.id);
      await setDoc(ref, prestador, { merge: true });
    } catch (e) {
      console.warn('Erro ao salvar prestador no Firestore:', e);
    }
  }

  /**
   * Se este navegador já possui dados cadastrados no LocalStorage e a nuvem estiver vazia,
   * sobe os dados locais automaticamente para a nuvem.
   */
  public async uploadDadosLocaisParaNuvemSeNecessario(): Promise<void> {
    try {
      // 1. Pacientes
      const pacSnap = await getDocs(collection(db, 'pacientes'));
      if (pacSnap.empty) {
        const localPacRaw = localStorage.getItem('mefisa_pacientes_v2');
        if (localPacRaw) {
          const pacientes: Paciente[] = JSON.parse(localPacRaw);
          for (const p of pacientes) {
            if (p.id) {
              await setDoc(doc(db, 'pacientes', p.id), p, { merge: true });
            }
          }
        }
      }

      // 2. Prestadores
      const prestSnap = await getDocs(collection(db, 'prestadores'));
      if (prestSnap.empty) {
        const localPrestRaw = localStorage.getItem('clinica_mefisa_prestadores_v2');
        if (localPrestRaw) {
          const prestadores: Prestador[] = JSON.parse(localPrestRaw);
          for (const pr of prestadores) {
            if (pr.id) {
              await setDoc(doc(db, 'prestadores', pr.id), pr, { merge: true });
            }
          }
        }
      }

      // 3. Autorizações
      const autSnap = await getDocs(collection(db, 'autorizacoes'));
      if (autSnap.empty) {
        const localAutRaw = localStorage.getItem('clinica_mefisa_autorizacoes_v2');
        if (localAutRaw) {
          const autorizacoes: AutorizacaoV2[] = JSON.parse(localAutRaw);
          for (const a of autorizacoes) {
            if (a.id) {
              await setDoc(doc(db, 'autorizacoes', a.id), a, { merge: true });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Seed inicial de dados locais para Firestore:', err);
    }
  }
}

export const CloudSyncService = new CloudSyncManager();
