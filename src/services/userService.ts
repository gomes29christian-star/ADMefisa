import { Usuario } from '../types/clinic';
import { MOCK_USUARIOS } from '../data/mockClinicData';
import { AuditoriaService } from './auditoriaService';
import { CloudSyncService } from './cloudSyncService';

export interface UsuarioDeletado {
  id: string;
  nome: string;
  email: string;
  papel: string;
  departamento?: string;
  systemPassword?: string;
  deletedAt: string;
  deletedBy?: string;
}

export interface NotificacaoAcessoDeletado {
  id: string;
  usuarioDeletadoId: string;
  usuarioDeletadoNome: string;
  usuarioDeletadoEmail: string;
  usuarioDeletadoPapel: string;
  dataHora: string;
  dataIso: string;
  ipTentativa: string;
  lida: boolean;
}

const STORAGE_KEY_USUARIOS = 'clinica_mefisa_usuarios_custom_v1';
const STORAGE_KEY_ACTIVE_USER_ID = 'clinica_mefisa_active_usuario_id_v1';
const STORAGE_KEY_DELETED_USERS = 'clinica_mefisa_usuarios_deletados_v1';
const STORAGE_KEY_ADM_NOTIFICATIONS = 'clinica_mefisa_adm_notif_deleted_access_v1';

// In-memory fallback para ambiente Node.js / CLI de testes
const inMemoryStorage: Record<string, string> = {};

const getStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return inMemoryStorage[key] || null;
};

const setStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
  inMemoryStorage[key] = value;
};

const removeStorageItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
  delete inMemoryStorage[key];
};

export const gerarSenhaExtremamenteLonga = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?~';
  let result = 'mefisa_sys_secure_key_';
  const array = new Uint8Array(128);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < array.length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

export const carregarUsuariosIniciais = (): Usuario[] => {
  try {
    const saved = getStorageItem(STORAGE_KEY_USUARIOS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;

        const normalized = parsed.map((u: Usuario) => {
          if (!u.systemPassword) {
            modified = true;
            return {
              ...u,
              systemPassword: gerarSenhaExtremamenteLonga(),
              personalPasscode: u.personalPasscode || '1234',
            };
          }
          return u;
        });
        if (modified) {
          setStorageItem(STORAGE_KEY_USUARIOS, JSON.stringify(normalized));
        }
        return normalized;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar usuários:', e);
  }

  const initialWithPasswords: Usuario[] = MOCK_USUARIOS.map((u) => ({
    ...u,
    systemPassword: gerarSenhaExtremamenteLonga(),
    personalPasscode: '1234',
  }));

  try {
    setStorageItem(STORAGE_KEY_USUARIOS, JSON.stringify(initialWithPasswords));
  } catch (e) {}

  return initialWithPasswords;
};

export const salvarUsuariosStorage = (usuarios: Usuario[]) => {
  try {
    setStorageItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuarios));
    usuarios.forEach((u) => {
      try {
        CloudSyncService.salvarUsuarioNuvem(u);
      } catch (err) {}
    });
  } catch (e) {
    console.error('Erro ao salvar usuários:', e);
  }
};

export const carregarAtivoIdStorage = (): string | null => {
  try {
    return getStorageItem(STORAGE_KEY_ACTIVE_USER_ID);
  } catch (e) {
    return null;
  }
};

export const salvarAtivoIdStorage = (id: string) => {
  try {
    setStorageItem(STORAGE_KEY_ACTIVE_USER_ID, id);
  } catch (e) {}
};

/**
 * Gestão de Usuários Deletados e Senhas Revogadas
 */
export const carregarUsuariosDeletados = (): UsuarioDeletado[] => {
  try {
    const saved = getStorageItem(STORAGE_KEY_DELETED_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao carregar usuários deletados:', e);
  }

  const initialDeleted: UsuarioDeletado[] = [
    {
      id: 'usr-del-901',
      nome: 'Dr. Roberto M. Silveira (Ex-Funcionário)',
      email: 'roberto.ex@clinicamefisa.com.br',
      papel: 'GESTOR',
      departamento: 'Coordenação Médica Externa',
      systemPassword: 'mefisa_sys_secure_key_REVOKED_DELETED_USER_ROBERTO_SILVEIRA_901_OLD_SECRET_PASS',
      deletedAt: '2026-08-10 14:20:00',
      deletedBy: 'Christian Gomes (ADM)',
    },
    {
      id: 'usr-del-902',
      nome: 'Patricia Albuquerque (Ex-Atendente)',
      email: 'patricia.ex@clinicamefisa.com.br',
      papel: 'FUNCIONARIO_ADMINISTRATIVO',
      departamento: 'Recepção e Guias',
      systemPassword: 'mefisa_sys_secure_key_REVOKED_DELETED_USER_PATRICIA_ALBUQUERQUE_902_OLD_SECRET_PASS',
      deletedAt: '2026-09-01 09:15:30',
      deletedBy: 'Christian Gomes (ADM)',
    },
  ];

  try {
    setStorageItem(STORAGE_KEY_DELETED_USERS, JSON.stringify(initialDeleted));
  } catch (e) {}

  return initialDeleted;
};

export const salvarUsuarioDeletado = (usr: Usuario, deletedBy: string = 'Administrador do Sistema'): UsuarioDeletado => {
  const deletadosAtuais = carregarUsuariosDeletados();
  const agora = new Date();
  const dataFormatada = `${agora.toLocaleDateString('pt-BR')} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`;

  const novoDeletado: UsuarioDeletado = {
    id: usr.id,
    nome: usr.nome,
    email: usr.email,
    papel: usr.papel,
    departamento: usr.departamento,
    systemPassword: usr.systemPassword,
    deletedAt: dataFormatada,
    deletedBy,
  };

  const atualizado = [novoDeletado, ...deletadosAtuais.filter((d) => d.id !== usr.id)];
  try {
    setStorageItem(STORAGE_KEY_DELETED_USERS, JSON.stringify(atualizado));
  } catch (e) {
    console.error('Erro ao salvar usuário deletado:', e);
  }
  return novoDeletado;
};

export const verificarSenhaUsuarioDeletado = (senhaTentativa: string): UsuarioDeletado | null => {
  if (!senhaTentativa || !senhaTentativa.trim()) return null;
  const trimmed = senhaTentativa.trim();
  const deletados = carregarUsuariosDeletados();
  return deletados.find((u) => u.systemPassword && u.systemPassword.trim() === trimmed) || null;
};

/**
 * Notificações de Segurança para os ADMs quando uma senha de usuário deletado é usada
 */
export const carregarNotificacoesAdmAcessoDeletado = (): NotificacaoAcessoDeletado[] => {
  try {
    const saved = getStorageItem(STORAGE_KEY_ADM_NOTIFICATIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Erro ao carregar notificações de ADM:', e);
  }
  return [];
};

export const notificarAdmsTentativaAcessoDeletado = (usrDeletado: UsuarioDeletado): NotificacaoAcessoDeletado => {
  const agora = new Date();
  const dataHora = `${agora.toLocaleDateString('pt-BR')} ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`;

  const novaNotificacao: NotificacaoAcessoDeletado = {
    id: `notif-sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    usuarioDeletadoId: usrDeletado.id,
    usuarioDeletadoNome: usrDeletado.nome,
    usuarioDeletadoEmail: usrDeletado.email,
    usuarioDeletadoPapel: usrDeletado.papel,
    dataHora,
    dataIso: agora.toISOString(),
    ipTentativa: '192.168.1.104 (Sessão Bloqueada)',
    lida: false,
  };

  const notificacoesAtuais = carregarNotificacoesAdmAcessoDeletado();
  const atualizadas = [novaNotificacao, ...notificacoesAtuais];

  try {
    setStorageItem(STORAGE_KEY_ADM_NOTIFICATIONS, JSON.stringify(atualizadas));
  } catch (e) {
    console.error('Erro ao salvar notificação para ADMs:', e);
  }

  // Registrar também no log geral de Auditoria do Sistema
  try {
    AuditoriaService.registrarAcao({
      usuario: {
        id: 'sys-firewall',
        nome: 'SISTEMA DE SEGURANÇA (FIREWALL)',
        papel: 'ADMINISTRADOR',
        email: 'seguranca@clinicamefisa.com.br',
      },
      acao: 'TENTATIVA_ACESSO_SENHA_DELETADA',
      entidade: 'USUARIO',
      registroId: usrDeletado.id,
      descricaoRegistro: `Tentativa de login com senha de usuário deletado: ${usrDeletado.nome} (${usrDeletado.email})`,
      campoAlterado: 'Acesso Negado & Notificação aos Administradores',
      valorAnterior: `Conta Deletada em ${usrDeletado.deletedAt}`,
      valorNovo: 'ACESSO NEGADO — Notificação de Alerta enviada para os ADMs',
      motivo: `Tentativa de login não autorizada utilizando senha revogada de usuário excluído`,
      tipoAcao: 'ACESSO',
    });
  } catch (e) {
    console.error('Erro ao registrar auditoria de segurança:', e);
  }

  return novaNotificacao;
};

export const marcarNotificacaoComoLida = (id: string): void => {
  const notificacoes = carregarNotificacoesAdmAcessoDeletado();
  const atualizadas = notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n));
  try {
    setStorageItem(STORAGE_KEY_ADM_NOTIFICATIONS, JSON.stringify(atualizadas));
  } catch (e) {}
};

export const limparNotificacoesAdmAcessoDeletado = (): void => {
  try {
    removeStorageItem(STORAGE_KEY_ADM_NOTIFICATIONS);
  } catch (e) {}
};
