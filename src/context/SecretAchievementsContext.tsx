import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ConquistaSecreta {
  id: string;
  titulo: string;
  descricaoSecreta: string;
  categoria: 'Operacional' | 'Segurança' | 'Auditoria' | 'Mestria';
  desbloqueada: boolean;
  dataDesbloqueio?: string;
  reveladaPorNévoa?: boolean;
}

interface SecretAchievementsContextType {
  isSystemUnlocked: boolean;
  conquistas: ConquistaSecreta[];
  modalAberto: boolean;
  setModalAberto: (aberto: boolean) => void;
  unlockWithLogoDoubleClick: () => void;
  triggerSecretAction: (achievementId: string) => void;
  revelarDescricaoNevoa: (achievementId: string) => void;
  ultimaConquistaNotificada: ConquistaSecreta | null;
  fecharNotificacao: () => void;
}

const CONQUISTAS_INICIAIS: ConquistaSecreta[] = [
  {
    id: 'despertar_arquivo',
    titulo: 'O Despertar do Arquivo Oculto',
    descricaoSecreta: 'Você descobriu o compartimento secreto da Clínica Mefisa dando duplo-clique no logotipo oficial!',
    categoria: 'Mestria',
    desbloqueada: false,
    reveladaPorNévoa: false,
  },
  {
    id: 'mestre_semanas',
    titulo: 'Mestre dos Cálculos Semanais',
    descricaoSecreta: 'Simular e aprovar com clareza o cálculo de sessões multiplicadas pelas semanas do período sem divergência.',
    categoria: 'Operacional',
    desbloqueada: false,
    reveladaPorNévoa: false,
  },
  {
    id: 'sentinela_7_dias',
    titulo: 'O Sentinela dos 7 Dias',
    descricaoSecreta: 'Localizar uma análise em atraso de convênio com mais de 7 dias e registrar cobrança estruturada.',
    categoria: 'Operacional',
    desbloqueada: false,
    reveladaPorNévoa: false,
  },
  {
    id: 'guardiao_lgpd',
    titulo: 'Guardião da Privacidade LGPD',
    descricaoSecreta: 'Nenhum dado real foi violado nas planilhas: todos os prontuários e carteirinhas permanecem estritamente mascarados.',
    categoria: 'Segurança',
    desbloqueada: false,
    reveladaPorNévoa: false,
  },
  {
    id: 'rastreabilidade_plena',
    titulo: 'Rastreabilidade Absoluta',
    descricaoSecreta: 'Inspecionar a trilha de auditoria completa verificando autoria, data/hora, valor anterior, novo valor e justificativa.',
    categoria: 'Auditoria',
    desbloqueada: false,
    reveladaPorNévoa: false,
  },
  {
    id: 'pasta_da_doutora',
    titulo: 'A Doutora Agradece',
    descricaoSecreta: 'Colocar a guia na pasta correta da profissional responsável garantindo tempo hábil para assinatura e digitação.',
    categoria: 'Operacional',
    desbloqueada: false,
    reveladaPorNévoa: false,
  },
];

const SecretAchievementsContext = createContext<SecretAchievementsContextType | undefined>(undefined);

export const SecretAchievementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicialmente falso e sem NENHUM indício no sistema
  const [isSystemUnlocked, setIsSystemUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('mefisa_secret_unlocked') === 'true';
  });

  const [conquistas, setConquistas] = useState<ConquistaSecreta[]>(() => {
    const salvo = localStorage.getItem('mefisa_secret_achievements');
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch {
        return CONQUISTAS_INICIAIS;
      }
    }
    return CONQUISTAS_INICIAIS;
  });

  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [ultimaConquistaNotificada, setUltimaConquistaNotificada] = useState<ConquistaSecreta | null>(null);

  useEffect(() => {
    localStorage.setItem('mefisa_secret_unlocked', String(isSystemUnlocked));
  }, [isSystemUnlocked]);

  useEffect(() => {
    localStorage.setItem('mefisa_secret_achievements', JSON.stringify(conquistas));
  }, [conquistas]);

  // Regra Estrita: Desbloqueios e animações só acontecem após o duplo-clique na logo!
  const unlockWithLogoDoubleClick = () => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setIsSystemUnlocked(true);

    setConquistas((prev) =>
      prev.map((c) => {
        if (c.id === 'despertar_arquivo') {
          return {
            ...c,
            desbloqueada: true,
            dataDesbloqueio: `Hoje às ${timestamp}`,
            reveladaPorNévoa: true,
          };
        }
        return c;
      })
    );

    const primeira = {
      ...CONQUISTAS_INICIAIS[0],
      desbloqueada: true,
      dataDesbloqueio: `Hoje às ${timestamp}`,
      reveladaPorNévoa: true,
    };
    setUltimaConquistaNotificada(primeira);
  };

  const triggerSecretAction = (achievementId: string) => {
    // Se o sistema secreto ainda não foi desbloqueado com double-click na logo, NÃO FAZ NADA!
    if (!isSystemUnlocked) {
      return;
    }

    setConquistas((prev) => {
      const target = prev.find((c) => c.id === achievementId);
      if (!target || target.desbloqueada) return prev;

      const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const updated = prev.map((c) =>
        c.id === achievementId
          ? { ...c, desbloqueada: true, dataDesbloqueio: `Hoje às ${timestamp}`, reveladaPorNévoa: true }
          : c
      );

      const novaConquista = updated.find((c) => c.id === achievementId);
      if (novaConquista) {
        setUltimaConquistaNotificada(novaConquista);
      }

      return updated;
    });
  };

  const revelarDescricaoNevoa = (achievementId: string) => {
    setConquistas((prev) =>
      prev.map((c) => (c.id === achievementId ? { ...c, reveladaPorNévoa: true } : c))
    );
  };

  const fecharNotificacao = () => {
    setUltimaConquistaNotificada(null);
  };

  return (
    <SecretAchievementsContext.Provider
      value={{
        isSystemUnlocked,
        conquistas,
        modalAberto,
        setModalAberto,
        unlockWithLogoDoubleClick,
        triggerSecretAction,
        revelarDescricaoNevoa,
        ultimaConquistaNotificada,
        fecharNotificacao,
      }}
    >
      {children}
    </SecretAchievementsContext.Provider>
  );
};

export const useSecretAchievements = () => {
  const context = useContext(SecretAchievementsContext);
  if (!context) {
    throw new Error('useSecretAchievements must be used within a SecretAchievementsProvider');
  }
  return context;
};
