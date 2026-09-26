import React, { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  PhoneCall,
  Clock,
  ShieldCheck,
  Calendar,
  Filter,
} from 'lucide-react';
import { MOCK_ANALISES } from '../../data/mockClinicData';
import { calcularStatusAnaliseDiasCorridos, formatarDataBr } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';
import { useSecretAchievements } from '../../context/SecretAchievementsContext';

interface AnalisesViewProps {
  onOpenAudit: () => void;
}

export const AnalisesView: React.FC<AnalisesViewProps> = ({ onOpenAudit }) => {
  const { getThemeStrokeStyle, showMonthInitials } = useTheme();
  const { triggerSecretAction } = useSecretAchievements();

  // Data atual de referência do sistema Mefisa (permite testar a virada de dias corridos)
  const [dataAtualReferencia, setDataAtualReferencia] = useState<string>('2026-10-24');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Processos em Análise no Convênio
            </h1>
            <span className="badge-analise-amarelo px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-400 text-slate-950 border border-yellow-500 shadow-xs">
              REGRA 04: Níveis de SLA (Normal &lt;5d | Atenção 5-7d | Atraso &gt;7d)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            Contagem contínua em dias corridos. Alerta preventivo amarelo entre 5 e 7 dias para cobrança proativa, e vermelho após 7 dias corridos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de Data de Referência para Auditoria */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#002172] dark:text-blue-400" />
            <span className="text-slate-500 dark:text-slate-300 text-[11px]">Data Referência:</span>
            <input
              type="date"
              value={dataAtualReferencia}
              onChange={(e) => setDataAtualReferencia(e.target.value)}
              className="font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-hidden text-xs"
            />
          </div>

          <button
            onClick={() => {
              triggerSecretAction('sentinela_7_dias');
              alert('Cobrança preventiva e de atraso disparada aos canais de relacionamento das operadoras.');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Cobrar Convênios em Alerta/Atraso</span>
          </button>
        </div>
      </div>

      {/* Explicação da Regra 2 & 04 Ativa */}
      <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#91CA0C] shrink-0" />
          <span className="text-slate-200">
            <strong>Regra Oficial Mefisa (Dias Corridos + Níveis Preventivos):</strong> Até 4 dias corridos = <strong>🟢 EM PRAZO</strong>; De 5 a 7 dias corridos = <strong className="text-yellow-300 bg-yellow-950/60 px-1 rounded">🟡 ATENÇÃO PREVENTIVA (EM ANÁLISE)</strong>; Mais de 7 dias corridos = <strong>🔴 ATRASADO</strong>.
          </span>
        </div>
        <div className="text-[11px] font-mono bg-white/10 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-blue-200 shrink-0">
          SLA Preventivo (5-7d) + SLA Limite (&gt;7d)
        </div>
      </div>

      {/* Cards de Análises */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_ANALISES.map((proc) => {
          // Aplicação estrita da REGRA 2 e 04 em dias corridos
          const calculoSla = calcularStatusAnaliseDiasCorridos(
            proc.dataEntrada,
            dataAtualReferencia,
            7, // limite máximo de atraso
            5 // limite preventivo de atenção
          );

          const isAtrasado = calculoSla.emAtraso;
          const isAtencao = calculoSla.alertaPreventivo;

          let cardBgBorder = 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs';
          let badgeClass = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700';

          if (isAtrasado) {
            cardBgBorder = 'bg-red-50/60 dark:bg-red-950/20 border-red-300 dark:border-red-900/60 shadow-xs';
            badgeClass = 'bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-100 animate-pulse border border-red-300 dark:border-red-700';
          } else if (isAtencao) {
            cardBgBorder = 'bg-yellow-50/60 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-400/80 shadow-xs';
            badgeClass = 'badge-analise-amarelo bg-yellow-400 text-slate-950 font-black border border-yellow-500 shadow-xs';
          }

          return (
            <div
              key={proc.id}
              className={`p-5 rounded-2xl border transition-all space-y-3 ${cardBgBorder}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-200">
                    ID: {proc.autorizacaoId}
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded font-semibold">
                    {proc.convenioNome}
                  </span>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono flex items-center gap-1 ${badgeClass}`}
                >
                  {calculoSla.statusTexto} ({calculoSla.diasCorridosDecorridos} dias corridos)
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {proc.pacienteNome}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>Data de Entrada: <strong className="text-slate-800 dark:text-slate-100">{formatarDataBr(proc.dataEntrada, showMonthInitials)}</strong></span>
                  <span>·</span>
                  <span>Data Atual: <strong className="text-slate-800 dark:text-slate-100">{formatarDataBr(calculoSla.dataAtual, showMonthInitials)}</strong></span>
                  <span>·</span>
                  <span className="text-slate-400 dark:text-slate-300">{calculoSla.detalheSla}</span>
                </div>
              </div>

              {/* Justificativa / Parecer do Convênio */}
              <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Parecer Técnico / Exigência da Operadora:</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                  "{proc.justificativaConvenio || 'Aguardando parecer conclusivo do auditor médico da operadora.'}"
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-300">
                  Responsável: <strong className="text-slate-800 dark:text-white">{proc.responsavelAcompanhamento}</strong>
                </span>

                <button
                  onClick={() => {
                    triggerSecretAction('sentinela_7_dias');
                    onOpenAudit();
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  Ver Trilha de Auditoria
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
