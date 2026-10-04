/**
 * Utilitário central de estilização por cores para Procedimentos e Tabela Listrada na Mefisa.
 */

export function obterBadgeColorProcedimento(proc: string): string {
  if (!proc) return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  const p = proc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (p.includes('avaliacao') || p.includes('reavaliacao')) {
    return 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800';
  }
  if (p.includes('psicologia') || p.includes('psicoterapia') || p.includes('tcc')) {
    return 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-800';
  }
  if (p.includes('fonoaudiologia') || p.includes('fono') || p.includes('linguagem')) {
    return 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-800';
  }
  if (p.includes('terapia ocupacional') || p.includes('ocupacional') || p.includes(' to') || p.startsWith('to ')) {
    return 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800';
  }
  if (p.includes('psicomotricidade') || p.includes('fisioterapia') || p.includes('motora')) {
    return 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800';
  }
  if (p.includes('musicoterapia') || p.includes('musico')) {
    return 'bg-pink-100 text-pink-950 border-pink-300 dark:bg-pink-950/80 dark:text-pink-200 dark:border-pink-800';
  }
  if (p.includes('nutricionismo') || p.includes('nutricao')) {
    return 'bg-teal-100 text-teal-950 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-800';
  }
  if (p.includes('neurologia') || p.includes('neuro')) {
    return 'bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800';
  }

  return 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800';
}

/**
 * Classe padrão Tailwind para linhas de tabela com visual zebra/listrado e transição suave ao passar o mouse.
 */
export const CLASS_TABELA_LISTRADA_ROW =
  'odd:bg-white even:bg-slate-50/90 dark:odd:bg-slate-900/90 dark:even:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 transition-colors';
