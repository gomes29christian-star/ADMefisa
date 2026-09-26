import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  Clock,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useSecretAchievements, ConquistaSecreta } from '../../context/SecretAchievementsContext';

export const SecretAchievementsModal: React.FC = () => {
  const {
    isSystemUnlocked,
    modalAberto,
    setModalAberto,
    conquistas,
    revelarDescricaoNevoa,
    ultimaConquistaNotificada,
    fecharNotificacao,
  } = useSecretAchievements();

  // Estado de segurar o card por 5 segundos
  const [holdingCardId, setHoldingCardId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Se o sistema não foi desbloqueado com duplo clique, não exibe nada
  if (!isSystemUnlocked) {
    return null;
  }

  const startHold = (id: string, jaRevelada: boolean) => {
    if (jaRevelada) return;

    setHoldingCardId(id);
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 5000; // 5 segundos estritos conforme instrução

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);
    }, 50);

    holdTimerRef.current = window.setTimeout(() => {
      revelarDescricaoNevoa(id);
      stopHold();
    }, duration);
  };

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setHoldingCardId(null);
    setHoldProgress(0);
  };

  return (
    <>
      {/* Toast de Notificação de Conquista Secreta Desbloqueada */}
      {ultimaConquistaNotificada && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#002172] text-white p-4 rounded-2xl shadow-2xl border-2 border-amber-400/80 flex items-center gap-3.5 max-w-md">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Conquista Secreta Desbloqueada!
              </div>
              <div className="text-sm font-bold text-white truncate">
                {ultimaConquistaNotificada.titulo}
              </div>
              <div className="text-xs text-slate-300 leading-tight">
                {ultimaConquistaNotificada.descricaoSecreta}
              </div>
            </div>
            <button
              onClick={fecharNotificacao}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Vault das Conquistas Secretas */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal com Atmosfera de Mistério */}
            <div className="bg-gradient-to-r from-slate-950 via-[#002172] to-slate-900 text-white p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-['Quicksand'] font-bold text-lg text-white">
                      Cofre de Conquistas Secretas · Mefisa
                    </h3>
                    <p className="text-xs text-slate-300">
                      Compartimento revelado por duplo clique no logotipo oficial
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalAberto(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-xs">
                <span>Total Desbloqueadas:</span>
                <span className="font-bold text-amber-300 font-mono">
                  {conquistas.filter((c) => c.desbloqueada).length} / {conquistas.length}
                </span>
              </div>
            </div>

            {/* Lista de Conquistas com a Regra da Névoa (Segurar por 5 segundos) */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-xs text-slate-500 bg-blue-50/80 p-3 rounded-xl border border-blue-200/50 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Instrução da Névoa:</strong> As descrições das conquistas bloqueadas
                  ficam invisíveis. Pressione e <strong>segure o card por 5 segundos</strong> para
                  dissipar a névoa e revelar o requisito secreto.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conquistas.map((conquista) => {
                  const isHoldingThis = holdingCardId === conquista.id;
                  const isUnlocked = conquista.desbloqueada;
                  const isRevealed = conquista.reveladaPorNévoa || isUnlocked;

                  return (
                    <div
                      key={conquista.id}
                      onMouseDown={() => startHold(conquista.id, isRevealed)}
                      onMouseUp={stopHold}
                      onMouseLeave={stopHold}
                      onTouchStart={() => startHold(conquista.id, isRevealed)}
                      onTouchEnd={stopHold}
                      className={`relative select-none rounded-2xl border p-4 transition-all overflow-hidden ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-amber-50/50 to-white border-amber-300 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 cursor-pointer active:scale-[0.99]'
                      }`}
                    >
                      {/* Barra de Progresso de Segurar por 5 Segundos */}
                      {isHoldingThis && (
                        <div
                          className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-75"
                          style={{ width: `${holdProgress}%` }}
                        />
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isUnlocked
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isUnlocked ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {conquista.categoria}
                          </span>
                        </div>

                        {isUnlocked ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Conquistado
                          </span>
                        ) : isRevealed ? (
                          <span className="text-[10px] text-blue-700 font-semibold flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Revelado
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Bloqueado</span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-800 mb-1">
                        {conquista.titulo}
                      </h4>

                      {/* Descrição: Visível ou Oculta pela Névoa com segurar 5 segundos */}
                      <div className="relative min-h-[48px] rounded-lg overflow-hidden flex items-center">
                        {isRevealed ? (
                          <p className="text-xs text-slate-600 leading-snug">
                            {conquista.descricaoSecreta}
                          </p>
                        ) : (
                          <div className="absolute inset-0 secret-fog-overlay flex flex-col items-center justify-center p-2 text-center text-white">
                            {isHoldingThis ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[11px] font-bold text-amber-300">
                                  Dissipando névoa... {Math.round(holdProgress)}%
                                </span>
                                <span className="text-[9px] text-slate-300">
                                  Mantenha pressionado!
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Segure 5s para revelar</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {conquista.dataDesbloqueio && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>Desbloqueado: {conquista.dataDesbloqueio}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              >
                Fechar Cofre
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
