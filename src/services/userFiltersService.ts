/**
 * Serviço de Persistência de Filtros Isolados por Usuário — Clínica Mefisa
 * Garante que TODOS OS FILTROS aplicados em qualquer tela do site sejam salvos e carregados
 * de forma 100% independente por cada usuário (isolamento estrito por usuário/sessão).
 */

export class UserFiltersService {
  private static getKey(viewName: string, usuarioId?: string): string {
    const userId = usuarioId || 'usr-default';
    return `mefisa_filtro_v3_${viewName}_${userId}`;
  }

  /**
   * Obtém os filtros salvos do usuário para uma determinada visualização/tela
   */
  static obterFiltros<T>(viewName: string, usuarioId: string | undefined, padrao: T): T {
    if (typeof window === 'undefined' || !window.localStorage) {
      return padrao;
    }
    try {
      const key = this.getKey(viewName, usuarioId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...padrao, ...parsed };
      }
    } catch (err) {
      console.warn(`[UserFiltersService] Erro ao carregar filtros de ${viewName}:`, err);
    }
    return padrao;
  }

  /**
   * Salva os filtros do usuário para uma determinada visualização/tela
   */
  static salvarFiltros<T>(viewName: string, usuarioId: string | undefined, filtros: T): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = this.getKey(viewName, usuarioId);
      localStorage.setItem(key, JSON.stringify(filtros));
    } catch (err) {
      console.warn(`[UserFiltersService] Erro ao salvar filtros de ${viewName}:`, err);
    }
  }

  /**
   * Limpa os filtros salvos de um usuário específico para uma tela
   */
  static limparFiltros(viewName: string, usuarioId?: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const key = this.getKey(viewName, usuarioId);
      localStorage.removeItem(key);
    } catch (err) {}
  }
}
