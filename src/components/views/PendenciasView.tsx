import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  User,
} from 'lucide-react';
import { MOCK_PENDENCIAS } from '../../data/mockClinicData';
import { useTheme } from '../../context/ThemeContext';

interface PendenciasViewProps {
  onNavigate: (tab: any) => void;
  onOpenCalculator: () => void;
}

export const PendenciasView: React.FC<PendenciasViewProps> = ({
  onNavigate,
  onOpenCalculator,
}) => {
  const { getThemeStrokeStyle } = useTheme();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Painel Central de Pendências Operacionais
            </h1>
            <span className="badge-analise-amarelo px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-400 text-slate-950 border border-yellow-500 shadow-xs">
              {MOCK_PENDENCIAS.length} Pendências Ativas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            Fim das anotações informais em post-its ou células soltas de planilhas: fila auditada com prazos.
          </p>
        </div>
      </div>

      {/* Lista de Pendências */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_PENDENCIAS.map((pend) => (
          <div
            key={pend.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    pend.prioridade === 'CRITICA'
                      ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
                      : pend.prioridade === 'ALTA' || pend.linkModulo === 'analises'
                      ? 'badge-analise-amarelo bg-yellow-400 text-slate-950 font-black border border-yellow-500 shadow-xs'
                      : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                  }`}
                >
                  {pend.linkModulo === 'analises' ? 'EM ANÁLISE' : `PRIORIDADE ${pend.prioridade}`}
                </span>

                <span className="text-[11px] font-mono font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Prazo: {pend.prazoLimite}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white text-base">{pend.titulo}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {pend.descricao}
              </p>

              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-400">Paciente:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{pend.pacienteNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-slate-400">Responsável Indicado:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {pend.responsavelSugerido}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-300">
                Módulo Relacionado: <strong className="text-slate-700 dark:text-slate-100">{pend.linkModulo.toUpperCase()}</strong>
              </span>

              <button
                onClick={() => {
                  if (pend.linkModulo === 'autorizacoes') onOpenCalculator();
                  else onNavigate(pend.linkModulo);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#002172] text-white hover:bg-[#001752] text-xs font-bold transition-colors shadow-2xs"
              >
                <span>Acessar e Resolver</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#91CA0C]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
