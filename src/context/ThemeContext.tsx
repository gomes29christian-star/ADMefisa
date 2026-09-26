import React, { createContext, useContext, useState, useEffect } from 'react';
import { formatarDataBr } from '../services/businessRules';

export type ThemePreset = {
  id: string;
  name: string;
  color: string;
  secondary: string;
  accent: string;
};

// TEMA ÚNICO INSTITUCIONAL DA CLÍNICA MEFISA (Sem temas alternativos que quebram contraste)
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'mefisa-oficial',
    name: 'Azul Institucional Mefisa (Único Oficial)',
    color: '#002172',
    secondary: '#2A657E',
    accent: '#91CA0C',
  },
];

interface ThemeContextType {
  activePreset: ThemePreset;
  // Modo Escuro
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // Acessibilidade: Modo Suave (Leitura relaxada anti-fadiga)
  isSuaveFont: boolean;
  toggleSuaveFont: () => void;
  // Acessibilidade: Escala de Tamanho da Fonte (A- / A+)
  fontScale: number; // Porcentagem: 90, 100, 110, 120, 130
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  // Acessibilidade: Alto Contraste
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  // Opção de Formato de Mês: Números vs Iniciais
  showMonthInitials: boolean;
  toggleMonthInitials: () => void;
  formatarData: (dataStr: string | undefined | null) => string;
  // Métodos legados mantidos para retrocompatibilidade sem causar perda de contraste
  setThemePreset: (presetId: string) => void;
  enableStrokeEffect: boolean;
  setEnableStrokeEffect: (enabled: boolean) => void;
  getThemeStrokeStyle: (type?: 'text' | 'icon' | 'badge') => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tema único e fixo
  const activePreset = THEME_PRESETS[0];

  // Estado de Modo Escuro
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem('mefisa_dark_mode');
      return salvo ? JSON.parse(salvo) : false;
    } catch {
      return false;
    }
  });

  // Estado de Modo Suave
  const [isSuaveFont, setIsSuaveFont] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem('mefisa_suave_font');
      return salvo ? JSON.parse(salvo) : true; // Por padrão ativo como no print
    } catch {
      return true;
    }
  });

  // Estado de Escala de Fonte (100% padrão)
  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const salvo = localStorage.getItem('mefisa_font_scale');
      return salvo ? Number(salvo) : 100;
    } catch {
      return 100;
    }
  });

  // Estado de Alto Contraste
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem('mefisa_high_contrast');
      return salvo ? JSON.parse(salvo) : false;
    } catch {
      return false;
    }
  });

  // Estado de Iniciais dos Meses nas Datas
  const [showMonthInitials, setShowMonthInitials] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem('mefisa_month_initials');
      return salvo ? JSON.parse(salvo) : false;
    } catch {
      return false;
    }
  });

  // Sincroniza classes no elemento HTML / Raiz
  useEffect(() => {
    const root = document.documentElement;

    // Variáveis CSS da cor tema única oficial
    root.style.setProperty('--theme-color', activePreset.color);
    root.style.setProperty('--mefisa-navy', '#002172');
    root.style.setProperty('--mefisa-teal', '#2A657E');
    root.style.setProperty('--mefisa-lime', '#91CA0C');

    // Modo Escuro
    if (isDarkMode) {
      root.classList.add('dark');
      try {
        localStorage.setItem('mefisa_dark_mode', 'true');
      } catch {}
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('mefisa_dark_mode', 'false');
      } catch {}
    }

    // Modo Suave
    if (isSuaveFont) {
      root.classList.add('font-suave');
      try {
        localStorage.setItem('mefisa_suave_font', 'true');
      } catch {}
    } else {
      root.classList.remove('font-suave');
      try {
        localStorage.setItem('mefisa_suave_font', 'false');
      } catch {}
    }

    // Escala de Fonte
    root.style.setProperty('--app-font-scale', `${fontScale}%`);
    try {
      localStorage.setItem('mefisa_font_scale', String(fontScale));
    } catch {}

    // Alto Contraste
    if (isHighContrast) {
      root.classList.add('high-contrast');
      try {
        localStorage.setItem('mefisa_high_contrast', 'true');
      } catch {}
    } else {
      root.classList.remove('high-contrast');
      try {
        localStorage.setItem('mefisa_high_contrast', 'false');
      } catch {}
    }

    // Iniciais de Meses
    try {
      localStorage.setItem('mefisa_month_initials', JSON.stringify(showMonthInitials));
    } catch {}
  }, [isDarkMode, isSuaveFont, fontScale, isHighContrast, showMonthInitials, activePreset]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const toggleSuaveFont = () => setIsSuaveFont((prev) => !prev);
  const toggleHighContrast = () => setIsHighContrast((prev) => !prev);
  const toggleMonthInitials = () => setShowMonthInitials((prev) => !prev);

  const increaseFontSize = () => {
    setFontScale((prev) => Math.min(prev + 10, 130)); // Máximo 130%
  };

  const decreaseFontSize = () => {
    setFontScale((prev) => Math.max(prev - 10, 80)); // Mínimo 80%
  };

  const resetFontSize = () => {
    setFontScale(100);
  };

  // Compatibilidade legada
  const setThemePreset = (_presetId: string) => {
    // Tema único institucional — não altera a cor para evitar textos invisíveis
  };

  const getThemeStrokeStyle = (_type: 'text' | 'icon' | 'badge' = 'text'): string => {
    // Retorna vazio para garantir que nenhum texto perca contraste ou fique invisível
    return '';
  };

  const formatarData = (dataStr: string | undefined | null): string => {
    return formatarDataBr(dataStr, showMonthInitials);
  };

  return (
    <ThemeContext.Provider
      value={{
        activePreset,
        isDarkMode,
        toggleDarkMode,
        isSuaveFont,
        toggleSuaveFont,
        fontScale,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        isHighContrast,
        toggleHighContrast,
        showMonthInitials,
        toggleMonthInitials,
        formatarData,
        setThemePreset,
        enableStrokeEffect: false,
        setEnableStrokeEffect: () => {},
        getThemeStrokeStyle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
