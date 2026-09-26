import React, { useState } from 'react';
import { AlertTriangle, UserCheck, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { Paciente, ResultadoVerificacaoDuplicidadePaciente } from '../../types/clinic';
import { mascararCpf, mascararCarteirinha } from '../../services/pacientesService';
import { formatarDataBr } from '../../services/businessRules';
import { useTheme } from '../../context/ThemeContext';

interface DuplicidadeAlertaModalProps {
  resultado: ResultadoVerificacaoDuplicidadePaciente;
  onFechar: () => void;
  onAbrirExistente: (paciente: Paciente) => void;
  onContinuarMesmoAssim: (justificativa: string) => void;
}

export const DuplicidadeAlertaModal: React.FC<DuplicidadeAlertaModalProps> = ({
  resultado,
  onFechar,
  onAbrirExistente,
  onContinuarMesmoAssim,
}) => {
  const { showMonthInitials } = useTheme();
  const [justificativa, setJustificativa] = useState('');
  const [erroValidacao, setErroValidacao] = useState(false);

  const pac = resultado.pacienteExistente;

  const handleConfirmarContinuacao = () => {
    if (!justificativa.trim()) {
      setErroValidacao(true);
      return;
    }
    onContinuarMesmoAssim(justificativa.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-amber-200 dark:border-amber-800/80 overflow-hidden">
        {/* Topo de Alerta */}
        <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="font-bold text-base font-['Quicksand']">
                ⚠️ POSSÍVEL PACIENTE DUPLICADO
              </h3>
              <p className="text-xs text-amber-100">
                Encontramos um paciente pré-cadastrado com informações semelhantes.
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg hover:bg-amber-600 text-amber-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Motivo do alerta: {resultado.detalhes}</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              O sistema não bloqueia automaticamente o cadastro para garantir o atendimento de possíveis homônimos ou novas contratações, mas exige validação consciente e registro na auditoria da clínica.
            </p>
          </div>

          {/* Dados do Paciente Existente */}
          {pac && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Paciente já cadastrado na Clínica
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                  {pac.codigoProntuario}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Nome Completo</span>
                  <span className="font-bold text-slate-900">{pac.nome}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Data de Nascimento</span>
                  <span className="font-medium text-slate-800">
                    {pac.dataNascimento ? `${formatarDataBr(pac.dataNascimento, showMonthInitials)}${pac.idade ? ` (${pac.idade} anos)` : ''}` : 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">CPF Mascarado</span>
                  <span className="font-mono font-medium text-slate-800">
                    {pac.cpfMascarado || mascararCpf(pac.cpf || '') || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Convênio / Carteirinha</span>
                  <span className="font-medium text-slate-800">
                    {pac.convenioNome} • {mascararCarteirinha(pac.carteirinhaAtual || pac.carteirinha || '')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[11px]">Responsável Legal Principal</span>
                  <span className="font-medium text-slate-800">
                    {pac.responsavelPrincipalNome || pac.responsavelNome || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Seção de Justificativa para Continuar */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Caso decida continuar, informe a justificativa (Obrigatória para Auditoria):
            </label>
            <input
              type="text"
              placeholder="Ex: Trata-se de homônimo com parentesco e documentação confirmados em recepção"
              value={justificativa}
              onChange={(e) => {
                setJustificativa(e.target.value);
                setErroValidacao(false);
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border ${
                erroValidacao ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'
              } focus:outline-[#002172]`}
            />
            {erroValidacao && (
              <p className="text-[11px] text-red-600 font-medium">
                * Para prosseguir com cadastro de dados semelhantes, a justificativa é obrigatória.
              </p>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onFechar}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 border dark:border-slate-700 transition-colors"
          >
            Revisar Dados do Formulário
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {pac && (
              <button
                onClick={() => onAbrirExistente(pac)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#002172] hover:bg-[#001752] text-white rounded-xl shadow-xs transition-colors"
              >
                <UserCheck className="w-4 h-4 text-[#91CA0C]" />
                <span>Abrir Paciente Existente</span>
              </button>
            )}

            <button
              onClick={handleConfirmarContinuacao}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold border border-amber-500 text-amber-900 hover:bg-amber-100 rounded-xl transition-colors"
            >
              <span>Continuar Cadastro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
