import {
  Paciente,
  Prestador,
  Procedimento,
  Convenio,
  Autorizacao,
  GuiaDigitacao,
  AnaliseConvenio,
  EventoAuditoria,
  PendenciaOperacional,
  Usuario,
} from '../types/clinic';

export const MOCK_USUARIOS: Usuario[] = [
  {
    id: 'usr-christian',
    nome: 'Christian Gomes',
    email: 'christian29gomes@gmail.com',
    papel: 'ADMINISTRADOR',
    departamento: 'Direção Geral & Tecnologia',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    ativo: true,
    ultimoAcesso: 'Agora mesmo',
    permissoes: ['TODAS_PERMISSOES', 'EDITAR_PRESTADORES', 'GERENCIAR_USUARIOS', 'AUDITORIA_COMPLETA'],
  },
  {
    id: 'usr-ana',
    nome: 'Ana Beatriz Silveira',
    email: 'ana.beatriz@mefisa.com',
    papel: 'FUNCIONARIO_ADMINISTRATIVO',
    departamento: 'Recepção e Guias',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
    ativo: true,
    ultimoAcesso: 'Há 5 minutos',
  },
  {
    id: 'usr-maria',
    nome: 'Maria Clara Fonseca',
    email: 'maria.clara@mefisa.com',
    papel: 'FUNCIONARIO_ADMINISTRATIVO',
    departamento: 'Recepção e Faturamento',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
    ativo: true,
    ultimoAcesso: 'Há 12 minutos',
  },
  {
    id: 'usr-joao',
    nome: 'João Pedro Alves',
    email: 'joao.pedro@mefisa.com',
    papel: 'FUNCIONARIO_ADMINISTRATIVO',
    departamento: 'Atendimento & Guias',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    ativo: true,
    ultimoAcesso: 'Há 1 hora',
  },
  {
    id: 'usr-paula',
    nome: 'Paula Rego Lima',
    email: 'paula.rego@mefisa.com',
    papel: 'FUNCIONARIO_ADMINISTRATIVO',
    departamento: 'Faturamento & Convênios',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
    ativo: true,
    ultimoAcesso: 'Há 20 minutos',
  },
];

const STORAGE_KEY_PRESTADORES = 'clinica_mefisa_prestadores_v2';

export const sanitizarPrestadorExternoCrm = (p: Prestador): Prestador => {
  if (!p) return p;
  const isExterno = p.tipo === 'PRESTADOR' || p.tipo !== 'MEFISA' || (p.pastaAtribuida && p.pastaAtribuida.toLowerCase().includes('externo'));
  if (isExterno && (p.orgaoClasse === 'CRP' || (p.orgaoClasse as string) === 'CRP')) {
    const novoCrmOuCrp = p.crmOuCrp ? p.crmOuCrp.replace(/crp/gi, 'CRM').trim() : p.crmOuCrp;
    const novoTitulo = p.titulo ? p.titulo.replace(/CRP/gi, 'CRM') : p.titulo;
    return {
      ...p,
      orgaoClasse: 'CRM',
      crmOuCrp: novoCrmOuCrp,
      titulo: novoTitulo,
    };
  }
  return p;
};

/**
 * Remove membros duplicados da lista de Doutores/Prestadores com base no CPF,
 * Registro Profissional (Conselho + Número) ou Nome.
 */
export const deduplicarPrestadores = (lista: Prestador[]): Prestador[] => {
  if (!Array.isArray(lista)) return [];

  const unicos: Prestador[] = [];
  const chavesVistas = new Set<string>();

  for (const pBruto of lista) {
    if (!pBruto || !pBruto.nome || typeof pBruto.nome !== 'string') continue;
    const p = sanitizarPrestadorExternoCrm(pBruto);

    const nomeNorm = p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cpfLimpo = (p.cpf || '').replace(/\D/g, '').trim();
    const regLimpo = (p.crmOuCrp || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const orgaoNorm = (p.orgaoClasse || '').toLowerCase().trim();

    const chaveCpf = cpfLimpo ? `cpf_${cpfLimpo}` : null;
    const chaveReg = regLimpo ? `reg_${orgaoNorm}_${regLimpo}` : null;
    const chaveNome = `nome_${nomeNorm}`;

    const jaExiste =
      (chaveCpf && chavesVistas.has(chaveCpf)) ||
      (chaveReg && chavesVistas.has(chaveReg)) ||
      chavesVistas.has(chaveNome);

    if (!jaExiste) {
      if (chaveCpf) chavesVistas.add(chaveCpf);
      if (chaveReg) chavesVistas.add(chaveReg);
      chavesVistas.add(chaveNome);
      unicos.push(p);
    }
  }

  return unicos;
};

const PRESTADORES_PADRAO_INICIAIS: Prestador[] = [
  {
    id: 'prest-angelica',
    nome: 'ANGELICA DA CRUZ',
    cpf: '456.789.012-34',
    titulo: 'CRP 25036 - Psicóloga ABA',
    cbo: '251510',
    crmOuCrp: '25036',
    orgaoClasse: 'CRP',
    uf: 'SP',
    especialidade: 'Psicologia / Análise do Comportamento Aplicada (ABA)',
    procedimentos: ['Psicoterapia ABA / TCC Adulto', 'Psicologia'],
    pastaAtribuida: 'Pasta Corpo Clínico — Mefisa',
    ativo: true,
    tipo: 'MEFISA',
  },
  {
    id: 'prest-1',
    nome: 'Dra. Ana Beatriz Albuquerque',
    cpf: '123.456.789-01',
    titulo: 'CRM 123456 - Médica Neurologista',
    cbo: '225112',
    crmOuCrp: '123456',
    orgaoClasse: 'CRM',
    uf: 'SP',
    especialidade: 'Neurologia Infantil',
    procedimentos: ['Psicologia', 'Terapia ocupacional'],
    pastaAtribuida: 'Pasta Corpo Clínico — Mefisa',
    ativo: true,
    tipo: 'MEFISA',
  },
  {
    id: 'prest-2',
    nome: 'Dr. Carlos Eduardo Neves',
    cpf: '234.567.890-12',
    titulo: 'CRM 234567 - Médico Pediatra',
    cbo: '225124',
    crmOuCrp: '234567',
    orgaoClasse: 'CRM',
    uf: 'SP',
    especialidade: 'Pediatria Geral',
    procedimentos: ['Fonoaudiologia', 'Musicoterapia'],
    pastaAtribuida: 'Pasta Corpo Clínico — Mefisa',
    ativo: true,
    tipo: 'MEFISA',
  },
  {
    id: 'prest-3',
    nome: 'Dra. Mariana Souza',
    cpf: '345.678.901-23',
    titulo: 'CRM 345678 - Médica Clínica Geral',
    cbo: '225125',
    crmOuCrp: '345678',
    orgaoClasse: 'CRM',
    uf: 'SP',
    especialidade: 'Clínica Médica',
    procedimentos: ['Psicomotricidade', 'Terapia ocupacional'],
    pastaAtribuida: 'Pasta Credenciados Externos',
    ativo: true,
    tipo: 'PRESTADOR',
  },
];

const carregarPrestadoresIniciais = (): Prestador[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return deduplicarPrestadores(PRESTADORES_PADRAO_INICIAIS);
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PRESTADORES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Atualiza CBOs legados se pertencerem aos prestadores padrão
        const mapeados = parsed.map((p) => {
          const padrao = PRESTADORES_PADRAO_INICIAIS.find((i) => i.id === p.id);
          if (padrao) {
            return {
              ...p,
              cbo: padrao.cbo,
              titulo: padrao.titulo,
              orgaoClasse: padrao.orgaoClasse,
              crmOuCrp: padrao.crmOuCrp,
            };
          }
          return p;
        });
        const limpos = deduplicarPrestadores(mapeados);
        localStorage.setItem(STORAGE_KEY_PRESTADORES, JSON.stringify(limpos));
        return limpos;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar prestadores do localStorage', e);
  }

  const limposPadrao = deduplicarPrestadores(PRESTADORES_PADRAO_INICIAIS);
  try {
    localStorage.setItem(STORAGE_KEY_PRESTADORES, JSON.stringify(limposPadrao));
  } catch {}
  return limposPadrao;
};

export const obterPrestadoresStorage = (): Prestador[] => {
  if (typeof window === 'undefined') return PRESTADORES_PADRAO_INICIAIS;
  return carregarPrestadoresIniciais();
};

export const MOCK_PRESTADORES: Prestador[] = carregarPrestadoresIniciais();

export const salvarPrestadoresStorage = (prestadores: Prestador[]) => {
  try {
    const limpos = deduplicarPrestadores(prestadores);
    localStorage.setItem(STORAGE_KEY_PRESTADORES, JSON.stringify(limpos));
    MOCK_PRESTADORES.length = 0;
    MOCK_PRESTADORES.push(...limpos);
  } catch (e) {
    console.error('Erro ao salvar prestadores no localStorage', e);
  }
};

export const MOCK_CONVENIOS: Convenio[] = [
  {
    id: 'conv-1',
    nome: 'SULAMÉRICA',
    codigoAns: '006246',
    portalUrl: 'https://saude.sulamerica.com.br/prestador',
    alertaAnaliseDiasPadrao: 7,
  },
];

export const MOCK_PACIENTES: Paciente[] = [];

export const MOCK_AUTORIZACOES: Autorizacao[] = [];

export const MOCK_GUIAS: GuiaDigitacao[] = [];

export const MOCK_ANALISES: AnaliseConvenio[] = [];

export const MOCK_AUDITORIA: EventoAuditoria[] = [];

export const MOCK_PENDENCIAS: PendenciaOperacional[] = [];
