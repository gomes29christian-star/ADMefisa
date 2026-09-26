import React, { createContext, useContext, useState, useEffect } from 'react';

export type ModoMes = 'numero' | 'extenso';

interface DateFormatContextType {
  modoMes: ModoMes;
  toggleModoMes: () => void;
  formatarData: (data: string | Date | undefined | null) => string;
  formatarPeriodo: (inicio: string | undefined | null, fim: string | undefined | null) => string;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

const MESES_INICIAIS: Record<number, string> = {
  1: 'jan.',
  2: 'fev.',
  3: 'mar.',
  4: 'abr.',
  5: 'mai.',
  6: 'jun.',
  7: 'jul.',
  8: 'ago.',
  9: 'set.',
  10: 'out.',
  11: 'nov.',
  12: 'dez.',
};

/**
 * Converte qualquer formato de data (ISO YYYY-MM-DD, DD/MM/AAAA, Date)
 * para o formato brasileiro estrito:
 * - 'numero': 24/10/2026
 * - 'extenso': 24/out./2026
 */
export function formatarDataBrHelper(
  data: string | Date | undefined | null,
  modo: ModoMes = 'numero'
): string {
  if (!data) return '-';

  let dia = '';
  let mes = 0;
  let ano = '';
  let extraHora = '';

  if (data instanceof Date) {
    if (isNaN(data.getTime())) return '-';
    dia = String(data.getDate()).padStart(2, '0');
    mes = data.getMonth() + 1;
    ano = String(data.getFullYear());
  } else if (typeof data === 'string') {
    const limpo = data.trim();
    if (!limpo) return '-';

    // Formato ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
    const matchIso = limpo.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}(?::\d{2})?))?/);
    if (matchIso) {
      ano = matchIso[1];
      mes = parseInt(matchIso[2], 10);
      dia = matchIso[3];
      if (matchIso[4]) extraHora = ` ${matchIso[4]}`;
    } else {
      // Formato brasileiro já existente: DD/MM/AAAA ou DD/extenso/AAAA
      const matchBr = limpo.match(/^(\d{1,2})\/(\d{1,2}|[a-zA-Zç.]+)\/(\d{4})(?:[T\s](\d{2}:\d{2}(?::\d{2})?))?/);
      if (matchBr) {
        dia = matchBr[1].padStart(2, '0');
        const mesPart = matchBr[2].toLowerCase().replace('.', '');
        ano = matchBr[3];
        if (matchBr[4]) extraHora = ` ${matchBr[4]}`;

        if (/^\d+$/.test(mesPart)) {
          mes = parseInt(mesPart, 10);
        } else {
          // Converte texto para número de mês
          const mesesBusca: Record<string, number> = {
            jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
            jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
          };
          mes = mesesBusca[mesPart.slice(0, 3)] || 1;
        }
      } else {
        // Tenta parse nativo se for formato compreensível
        const d = new Date(limpo);
        if (!isNaN(d.getTime())) {
          dia = String(d.getDate()).padStart(2, '0');
          mes = d.getMonth() + 1;
          ano = String(d.getFullYear());
        } else {
          return limpo;
        }
      }
    }
  }

  if (!dia || !mes || !ano) return String(data);

  if (modo === 'extenso') {
    const mesExt = MESES_INICIAIS[mes] || String(mes).padStart(2, '0');
    return `${dia}/${mesExt}/${ano}${extraHora}`;
  }

  const mesNum = String(mes).padStart(2, '0');
  return `${dia}/${mesNum}/${ano}${extraHora}`;
}

export const DateFormatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modoMes, setModoMes] = useState<ModoMes>(() => {
    try {
      const salvo = localStorage.getItem('mefisa_formato_data_v1');
      if (salvo === 'extenso' || salvo === 'numero') return salvo;
    } catch {}
    return 'numero'; // Padrão brasileiro numérico: DD/MM/AAAA
  });

  useEffect(() => {
    try {
      localStorage.setItem('mefisa_formato_data_v1', modoMes);
    } catch {}
  }, [modoMes]);

  const toggleModoMes = () => {
    setModoMes((prev) => (prev === 'numero' ? 'extenso' : 'numero'));
  };

  const formatarData = (data: string | Date | undefined | null): string => {
    return formatarDataBrHelper(data, modoMes);
  };

  const formatarPeriodo = (
    inicio: string | undefined | null,
    fim: string | undefined | null
  ): string => {
    if (!inicio && !fim) return '-';
    if (!fim) return formatarData(inicio);
    if (!inicio) return formatarData(fim);
    return `${formatarData(inicio)} até ${formatarData(fim)}`;
  };

  return (
    <DateFormatContext.Provider
      value={{
        modoMes,
        toggleModoMes,
        formatarData,
        formatarPeriodo,
      }}
    >
      {children}
    </DateFormatContext.Provider>
  );
};

export function useDateFormat() {
  const context = useContext(DateFormatContext);
  if (!context) {
    // Fallback gracioso se usado fora do provider
    return {
      modoMes: 'numero' as ModoMes,
      toggleModoMes: () => {},
      formatarData: (d: string | Date | undefined | null) => formatarDataBrHelper(d, 'numero'),
      formatarPeriodo: (i: string | undefined | null, f: string | undefined | null) =>
        `${formatarDataBrHelper(i, 'numero')} até ${formatarDataBrHelper(f, 'numero')}`,
    };
  }
  return context;
}
