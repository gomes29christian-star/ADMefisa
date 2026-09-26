import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Camera,
  Upload,
  Check,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Lock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Usuario, PapelUsuario } from '../../types/clinic';
import { carregarUsuariosIniciais, salvarUsuariosStorage, gerarSenhaExtremamenteLonga, salvarUsuarioDeletado } from '../../services/userService';

interface UsuariosConfigViewProps {
  activeUsuario: Usuario;
  onSelectUsuario: (usr: Usuario) => void;
}

export const UsuariosConfigView: React.FC<UsuariosConfigViewProps> = ({
  activeUsuario,
  onSelectUsuario,
}) => {
  const { getThemeStrokeStyle } = useTheme();
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => carregarUsuariosIniciais());

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Password visibility & passcode states
  const [revealedUserId, setRevealedUserId] = useState<string | null>(null);
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [passcodeTargetUser, setPasscodeTargetUser] = useState<Usuario | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for modal
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDepartamento, setFormDepartamento] = useState('');
  const [formPapel, setFormPapel] = useState<PapelUsuario>('GESTOR');
  const [formAvatar, setFormAvatar] = useState('');
  const [formPersonalPasscode, setFormPersonalPasscode] = useState('');

  const isAdminActive = activeUsuario.papel === 'ADMINISTRADOR';

  useEffect(() => {
    salvarUsuariosStorage(usuarios);
  }, [usuarios]);

  const handleOpenEdit = (usr: Usuario) => {
    const isOtherAdmin = usr.papel === 'ADMINISTRADOR' && usr.id !== activeUsuario.id;
    if (isOtherAdmin) {
      alert('Acesso negado: Administradores não podem editar o perfil de outros administradores.');
      return;
    }
    setEditingUser(usr);
    setFormNome(usr.nome);
    setFormEmail(usr.email);
    setFormDepartamento(usr.departamento || '');
    setFormPapel(usr.papel);
    setFormAvatar(usr.avatar || '');
    setFormPersonalPasscode(usr.personalPasscode || '1234');
    setIsAddingUser(false);
  };

  const handleOpenAdd = () => {
    if (!isAdminActive) {
      alert('Acesso negado: Somente administradores podem adicionar novos usuários.');
      return;
    }
    setEditingUser(null);
    setFormNome('');
    setFormEmail('');
    setFormDepartamento('');
    setFormPapel('GESTOR');
    setFormAvatar('');
    setFormPersonalPasscode('1234');
    setIsAddingUser(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim()) {
      alert('Nome e E-mail são obrigatórios.');
      return;
    }

    if (isAddingUser) {
      if (!isAdminActive) {
        alert('Acesso negado: Somente administradores podem adicionar novos usuários.');
        return;
      }
      const newUser: Usuario = {
        id: `usr-${Date.now()}`,
        nome: formNome.trim(),
        email: formEmail.trim(),
        papel: formPapel,
        departamento: formDepartamento.trim() || 'Geral',
        avatar: formAvatar || formNome.slice(0, 2).toUpperCase(),
        ativo: true,
        ultimoAcesso: 'Agora mesmo',
        systemPassword: gerarSenhaExtremamenteLonga(),
        personalPasscode: formPersonalPasscode.trim() || '1234',
        permissoes: formPapel === 'ADMINISTRADOR' ? ['Acesso Total', 'Configurações', 'Gestão de Usuários'] : ['Acesso aos Módulos', 'Visualização de Dados']
      };
      const updated = [...usuarios, newUser];
      setUsuarios(updated);
    } else if (editingUser) {
      const isOtherAdmin = editingUser.papel === 'ADMINISTRADOR' && editingUser.id !== activeUsuario.id;
      if (isOtherAdmin) {
        alert('Acesso negado: Administradores não podem editar outros administradores.');
        return;
      }
      const updated = usuarios.map((u) => {
        if (u.id === editingUser.id) {
          const newUsr: Usuario = {
            ...u,
            nome: formNome.trim(),
            email: formEmail.trim(),
            departamento: formDepartamento.trim(),
            papel: formPapel,
            avatar: formAvatar || u.avatar,
            personalPasscode: formPersonalPasscode.trim() || u.personalPasscode || '1234',
            permissoes: formPapel === 'ADMINISTRADOR' ? ['Acesso Total', 'Configurações', 'Gestão de Usuários'] : u.permissoes
          };
          if (activeUsuario.id === editingUser.id) {
            onSelectUsuario(newUsr);
          }
          return newUsr;
        }
        return u;
      });
      setUsuarios(updated);
    }

    setEditingUser(null);
    setIsAddingUser(false);
  };

  const confirmDeleteUser = (userId: string) => {
    if (usuarios.length <= 1) {
      alert('Não é possível excluir o único usuário do sistema.');
      return;
    }
    if (userId === activeUsuario.id) {
      alert('Você não pode excluir sua própria sessão ativa.');
      return;
    }
    const target = usuarios.find((u) => u.id === userId);
    if (target?.papel === 'ADMINISTRADOR') {
      alert('Acesso negado: Administradores não podem excluir outros administradores.');
      setDeletingUserId(null);
      return;
    }
    if (target) {
      salvarUsuarioDeletado(target, activeUsuario.nome);
    }
    const updated = usuarios.filter((u) => u.id !== userId);
    setUsuarios(updated);
    setDeletingUserId(null);
  };

  const handleCopyPassword = (password: string, userId: string) => {
    navigator.clipboard.writeText(password);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRequestViewPassword = (usr: Usuario) => {
    const isOtherAdmin = usr.papel === 'ADMINISTRADOR' && usr.id !== activeUsuario.id;
    if (isOtherAdmin) {
      alert('Acesso negado: Administradores não podem visualizar a senha de outros administradores.');
      return;
    }

    if (isAdminActive) {
      // Admins can see/copy immediately without passcode for non-other-admin
      setRevealedUserId(revealedUserId === usr.id ? null : usr.id);
    } else {
      // Non-admin can only see their own password and needs personal passcode
      if (usr.id !== activeUsuario.id) {
        alert('Acesso negado: Usuários não-administradores só podem visualizar sua própria senha do sistema.');
        return;
      }
      setPasscodeTargetUser(usr);
      setPasscodeAttempt('');
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeTargetUser) return;

    if (passcodeAttempt.trim() === (passcodeTargetUser.personalPasscode || '1234')) {
      setRevealedUserId(passcodeTargetUser.id);
      setPasscodeTargetUser(null);
      setPasscodeAttempt('');
    } else {
      alert('Segunda senha (passcode pessoal) incorreta.');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Controle de Acesso RBAC & Senhas de Sistema
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#002172] dark:bg-blue-900/50 dark:text-blue-200">
              Segurança Criptográfica Avançada
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administradores gerenciam usuários, porém ADMs não podem interagir com, editar, excluir ou ver a senha de outros usuários que também são ADMs.
          </p>
        </div>

        {isAdminActive && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#91CA0C]" />
            <span>+ Adicionar Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Modal de Verificação da Segunda Senha (Passcode) para Não-Admins */}
      {passcodeTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#002172] dark:text-blue-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmação de Segurança</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Digite sua segunda senha (passcode pessoal) para revelar sua senha extremamente longa do sistema.
              </p>
            </div>
            <form onSubmit={handleVerifyPasscode} className="space-y-3">
              <input
                type="password"
                required
                autoFocus
                value={passcodeAttempt}
                onChange={(e) => setPasscodeAttempt(e.target.value)}
                placeholder="Digite sua segunda senha"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold tracking-widest text-slate-800 dark:text-slate-100"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasscodeTargetUser(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white font-bold transition-colors shadow-xs"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Exclusão</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Tem certeza de que deseja remover este usuário do sistema? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDeleteUser(deletingUserId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição / Edição Completa (ADM) */}
      {(editingUser || isAddingUser) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isAddingUser ? 'Cadastrar Novo Usuário' : `Editar Perfil de ${editingUser?.nome}`}
              </h3>
              <button
                onClick={() => { setEditingUser(null); setIsAddingUser(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              {/* Foto / Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#002172] text-white flex items-center justify-center font-bold text-base shadow-sm overflow-hidden shrink-0">
                  {formAvatar && (formAvatar.startsWith('http') || formAvatar.startsWith('data:')) ? (
                    <img src={formAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(formNome || 'US')
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">Foto de Perfil (Avatar)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 cursor-pointer text-slate-700 dark:text-slate-200 font-semibold shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Importar Imagem Otimizada</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                  </label>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Dra. Ana Beatriz"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">E-mail Profissional</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="exemplo@clinicamefisa.com.br"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Departamento / Cargo */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Cargo / Departamento / Especialidade</label>
                <input
                  type="text"
                  value={formDepartamento}
                  onChange={(e) => setFormDepartamento(e.target.value)}
                  placeholder="Ex: Coordenação de Auditoria Médica"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Papel no Sistema (RBAC) */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Papel no Sistema (Nível de Acesso)</label>
                <select
                  value={formPapel}
                  onChange={(e) => setFormPapel(e.target.value as PapelUsuario)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                >
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Acesso Total & Gestão de Usuários)</option>
                  <option value="GESTOR">GESTOR (Coordenação e Regras)</option>
                  <option value="FUNCIONARIO_ADMINISTRATIVO">FUNCIONÁRIO ADMINISTRATIVO (Guias e Autorizações)</option>
                  <option value="VISUALIZACAO">VISUALIZAÇÃO (Somente Leitura)</option>
                </select>
              </div>

              {/* Segunda Senha (Passcode Pessoal) */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Segunda Senha (Passcode Pessoal p/ Ver Senha do Sistema)</label>
                <input
                  type="text"
                  required
                  value={formPersonalPasscode}
                  onChange={(e) => setFormPersonalPasscode(e.target.value)}
                  placeholder="Ex: 1234 ou senha pessoal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditingUser(null); setIsAddingUser(false); }}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002172] hover:bg-[#001752] text-white font-bold transition-colors shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid de Usuários */}
      {usuarios.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
          <p className="text-xs text-slate-500 font-medium">
            Não há usuários cadastrados na gestão.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usuarios.map((usr) => {
            const isActive = usr.id === activeUsuario.id;
            const isAdmin = usr.papel === 'ADMINISTRADOR';
            const isOtherAdmin = isAdmin && !isActive;
            const isRevealed = revealedUserId === usr.id;

            return (
              <div
                key={usr.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  isActive
                    ? 'bg-blue-50/40 dark:bg-blue-950/30 border-[#002172] dark:border-blue-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#002172] text-white flex items-center justify-center font-bold text-sm shadow-xs overflow-hidden shrink-0">
                      {usr.avatar && (usr.avatar.startsWith('http') || usr.avatar.startsWith('data:')) ? (
                        <img src={usr.avatar} alt={usr.nome} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(usr.nome)
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{usr.nome}</h3>
                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            ADM
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{usr.email}</div>
                      <div className="text-[11px] text-[#2A657E] dark:text-blue-300 font-medium mt-0.5">
                        {usr.departamento}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                        Sua Sessão
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectUsuario(usr)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Alternar
                      </button>
                    )}
                  </div>
                </div>

                {/* Exibição da Senha Extremamente Longa do Sistema */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>Senha do Sistema (Extremamente Longa):</span>
                    </span>
                    {isOtherAdmin ? (
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Protegido (Outro ADM)</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequestViewPassword(usr)}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isRevealed ? 'Ocultar' : isAdminActive ? 'Ver / Copiar' : 'Ver com 2ª Senha'}</span>
                      </button>
                    )}
                  </div>

                  {isRevealed && !isOtherAdmin ? (
                    <div className="space-y-1.5">
                      <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-800 dark:text-slate-200 break-all select-all">
                        {usr.systemPassword}
                      </div>
                      <button
                        onClick={() => handleCopyPassword(usr.systemPassword || '', usr.id)}
                        className="w-full py-1.5 rounded bg-[#002172] hover:bg-[#001752] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {copiedId === usr.id ? <Check className="w-3.5 h-3.5 text-[#91CA0C]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === usr.id ? 'Senha Copiada para a Área de Transferência!' : 'Copiar Senha do Sistema'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic overflow-hidden text-ellipsis whitespace-nowrap">
                      ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                    </div>
                  )}
                </div>

                {/* Botões de Ação do Administrador (Editar Perfil Completo & Excluir) */}
                {isAdminActive && !isOtherAdmin && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/80 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(usr)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Perfil</span>
                      </button>

                      {!isActive && (
                        <button
                          onClick={() => setDeletingUserId(usr.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors shadow-2xs"
                          title="Excluir Usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      Acesso: {usr.papel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
