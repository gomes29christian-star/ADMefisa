import React, { useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Send,
  Building,
  Scale,
  Clock,
  FileCheck,
  Tag,
  Lock,
  DollarSign,
  Users,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { HolidayService } from '../../services/holidaysService';
import {
  obterNotificacoesAnomalia,
  obterPreferenciasNotificacao,
  salvarPreferenciasNotificacao,
  formatarDataBr,
} from '../../services/businessRules';
import {
  FeriadoConfig,
  TipoFeriado,
  NotificacaoAnomaliaGestao,
  PreferenciasNotificacaoGestao,
  Usuario,
} from '../../types/clinic';
import { Bell, Mail, Globe, Check } from 'lucide-react';
import { GerenciarProcedimentosModal } from '../procedimentos/GerenciarProcedimentosModal';
import { useTheme } from '../../context/ThemeContext';
import { UsuariosConfigView } from './UsuariosConfigView';
import { RegistrosDeletadosView } from './RegistrosDeletadosView';

interface ConfiguracoesRegrasViewProps {
  activeUsuario: Usuario;
  onSelectUsuario: (usr: Usuario) => void;
  onTestarNotificacaoFeriado?: (feriado: FeriadoConfig | null, dataIsoStr: string) => void;
}

export const ConfiguracoesRegrasView: React.FC<ConfiguracoesRegrasViewProps> = ({
  activeUsuario,
  onSelectUsuario,
  onTestarNotificacaoFeriado,
}) => {
  const { showMonthInitials } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'regras' | 'usuarios' | 'deletados'>('regras');
  const [feriados, setFeriados] = useState<FeriadoConfig[]>(HolidayService.obterFeriados());
  const [notificacoesGestao, setNotificacoesGestao] = useState<NotificacaoAnomaliaGestao[]>(
    obterNotificacoesAnomalia()
  );

  // REGRA 05 CONFIRMADA: Configuração de Canais e Gatilhos de Notificação
  const [preferenciasNotificacao, setPreferenciasNotificacao] =
    useState<PreferenciasNotificacaoGestao>(obterPreferenciasNotificacao());
  const [salvoFeedback, setSalvoFeedback] = useState(false);
  const [isModalProcedimentosOpen, setIsModalProcedimentosOpen] = useState(false);

  const handleSalvarPreferencias = (novasPrefs: PreferenciasNotificacaoGestao) => {
    setPreferenciasNotificacao(novasPrefs);
    salvarPreferenciasNotificacao(novasPrefs);
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2000);
  };

  // Form para adicionar feriado
  const [novoNome, setNovoNome] = useState('');
  const [novaData, setNovaData] = useState('2026-10-14');
  const [novoTipo, setNovoTipo] = useState<TipoFeriado>('MUNICIPAL_FERRAZ');
  const [novaRegra, setNovaRegra] = useState('Lei Municipal de Ferraz de Vasconcelos');
  const [mostrarFormFeriado, setMostrarFormFeriado] = useState(false);

  const handleAdicionarFeriado = () => {
    if (!novoNome.trim() || !novaData.trim()) {
      alert('Preencha o nome e a data do feriado.');
      return;
    }

    const criado = HolidayService.adicionarFeriado({
      nome: novoNome.trim(),
      data: novaData.trim(),
      tipo: novoTipo,
      regraDeterminante: novaRegra.trim() || 'Determinação Administrativa',
      bloqueiaAtendimento: true,
    });

    setFeriados(HolidayService.obterFeriados());
    setNovoNome('');
    setMostrarFormFeriado(false);
  };

  const handleRemoverFeriado = (id: string) => {
    if (confirm('Remover este feriado da fonte configurável?')) {
      HolidayService.removerFeriado(id);
      setFeriados(HolidayService.obterFeriados());
    }
  };

  const handleRestaurarPadrao = () => {
    if (confirm('Restaurar o calendário padrão oficial de Ferraz de Vasconcelos e Mefisa?')) {
      const padrao = HolidayService.restaurarPadrao();
      setFeriados(padrao);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Quicksand'] text-slate-900 dark:text-white">
              Painel de Configurações do Sistema
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              ✓ Homologado
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerenciamento central de regras de negócio, feriados municipais e controle de usuários & RBAC.
          </p>
        </div>
      </div>

      {/* Sub-abas de Configuração */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('regras')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'regras'
              ? 'bg-[#002172] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Regras de Negócio & Feriados</span>
        </button>

        <button
          onClick={() => setActiveSubTab('usuarios')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'usuarios'
              ? 'bg-[#002172] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Gestão de Usuários & RBAC (Fotos e Acessos)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deletados')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'deletados'
              ? 'bg-[#002172] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Registros Deletados (Lixeira Anual)</span>
        </button>
      </div>

      {activeSubTab === 'usuarios' ? (
        <UsuariosConfigView
          activeUsuario={activeUsuario}
          onSelectUsuario={onSelectUsuario}
        />
      ) : activeSubTab === 'deletados' ? (
        <RegistrosDeletadosView activeUsuario={activeUsuario} />
      ) : (
        <div className="space-y-6">

      {/* Cartões Síntese das 4 Regras Homologadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Regra 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-[#002172] dark:text-blue-300 font-bold text-[10px]">
              REGRA 1 — ALINHAMENTO
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Dia Real de Atendimento & Exceção de Sábado
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            A próxima autorização respeita estritamente o dia da semana em que o paciente é atendido. Se não coincidir, o sistema <strong>recua para o dia anterior</strong> sem ultrapassar o corte.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            <strong>Exceção de Sábado:</strong> Sem expediente administrativo ao sábado. O sistema sugere a sexta-feira anterior com confirmação.
          </div>
        </div>

        {/* Regra 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 font-bold text-[10px]">
              REGRA 2 — DIAS CORRIDOS
            </span>
            <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            SLA de Análise em Dias Corridos
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Contagem contínua e sem desconto de sábados, domingos ou feriados a partir da data de entrada. Se ultrapassar <strong>7 dias corridos</strong>, assume status crítico: <strong>🔴 ATRASADO</strong>.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            <strong>Exemplo:</strong> Entrada em 01/10 &rarr; 09/10 = 8 dias corridos = 🔴 ATRASADO.
          </div>
        </div>

        {/* Regra 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold text-[10px]">
              REGRA 3 — DUPLICIDADE
            </span>
            <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Chave Composta de Sessão
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            A duplicidade não é restrita ao número da guia. A chave de validação determinística é: <strong>PACIENTE + PROCEDIMENTO + DATA DA SESSÃO</strong>.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            <strong>Proteção:</strong> Dispara <em>"⚠️ POSSÍVEL DUPLICIDADE"</em> mesmo com número de guia diferente.
          </div>
        </div>

        {/* Regra Clínica 4: Tabela ABA & Bloqueio em Digitações */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                TABELA ABA (R$ 91,40)
              </span>
              <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Procedimentos & Bloqueio de Digitação
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              As 5 ABAS regulares (ambas R$ 91,40) são permitidas em digitação. Suas variantes (Avaliações e Reavaliações) <strong>são bloqueadas na digitação</strong> e autorizáveis somente no fluxo prévio.
            </p>
          </div>
          <button
            onClick={() => setIsModalProcedimentosOpen(true)}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Gerenciar 15 Procedimentos</span>
          </button>
        </div>
      </div>

      {/* Calendário Configurável de Feriados (Ferraz de Vasconcelos, SP & Mefisa) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#002172]" />
              <h2 className="text-base font-bold font-['Quicksand'] text-slate-900">
                Calendário Configurável de Feriados (Ferraz de Vasconcelos)
              </h2>
            </div>
            <p className="text-[11px] text-slate-500">
              Fonte externa desacoplada de código fixo. Permite distinguir feriados nacionais, estaduais, municipais de Ferraz de Vasconcelos e administrativos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const checagem = HolidayService.verificarVesperaFeriadoUtil();
                if (checagem.isVespera && checagem.feriado) {
                  onTestarNotificacaoFeriado?.(checagem.feriado, checagem.dataAmanhaIso);
                } else {
                  // Se hoje não for véspera real de um feriado, gera um feriado de teste no próximo dia útil
                  const amanha = new Date();
                  amanha.setDate(amanha.getDate() + 1);
                  const iso = amanha.toISOString().split('T')[0];
                  const feriadoExemplo: FeriadoConfig = {
                    id: 'fer-teste-simulado',
                    data: iso,
                    nome: 'Feriado de Exemplo (Sua folga de amanhã)',
                    tipo: 'NACIONAL',
                    regraDeterminante: 'Regra Mefisa de Véspera de Feriado',
                    bloqueiaAtendimento: true,
                  };
                  onTestarNotificacaoFeriado?.(feriadoExemplo, iso);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Testar Notificação: Exibe a mensagem recebida no login um dia antes de um feriado"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Simular Notificação de Feriado 🥳</span>
            </button>

            <button
              onClick={handleRestaurarPadrao}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Oficial Ferraz</span>
            </button>

            <button
              onClick={() => setMostrarFormFeriado(!mostrarFormFeriado)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#002172] text-white hover:bg-[#001752] text-xs font-bold shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#91CA0C]" />
              <span>+ Adicionar Feriado</span>
            </button>
          </div>
        </div>

        {/* Formulário de Adição */}
        {mostrarFormFeriado && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
            <div className="font-bold text-slate-800 text-xs">Cadastrar Novo Feriado / Data Administrativa</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Data (DD/MM/AAAA):</label>
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Nome do Feriado:</label>
                <input
                  type="text"
                  placeholder="Ex: Aniversário da Cidade"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Tipo de Abrangência:</label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value as TipoFeriado)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="MUNICIPAL_FERRAZ">Municipal (Ferraz de Vasconcelos)</option>
                  <option value="NACIONAL">Nacional (Brasil)</option>
                  <option value="ESTADUAL_SP">Estadual (São Paulo)</option>
                  <option value="ADMINISTRATIVO_MEFISA">Administrativo Interno (Mefisa)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Legislação / Regra:</label>
                <input
                  type="text"
                  placeholder="Ex: Lei Municipal 473/1967"
                  value={novaRegra}
                  onChange={(e) => setNovaRegra(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setMostrarFormFeriado(false)}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdicionarFeriado}
                className="px-4 py-1 bg-[#002172] text-white rounded-lg font-bold"
              >
                Salvar Feriado
              </button>
            </div>
          </div>
        )}

        {/* Tabela de Feriados */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Data</th>
                <th className="p-2.5">Nome do Feriado</th>
                <th className="p-2.5">Tipo</th>
                <th className="p-2.5">Regra / Legislação Determinante</th>
                <th className="p-2.5 text-center">Bloqueia</th>
                <th className="p-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feriados.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/50">
                  <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                    {formatarDataBr(f.data, showMonthInitials)}
                  </td>
                  <td className="p-2.5 font-semibold text-slate-900">
                    {f.nome}
                    {f.descricao && (
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {f.descricao}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        f.tipo === 'MUNICIPAL_FERRAZ'
                          ? 'bg-purple-100 text-purple-900'
                          : f.tipo === 'NACIONAL'
                          ? 'bg-blue-100 text-blue-900'
                          : f.tipo === 'ESTADUAL_SP'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {f.tipo === 'MUNICIPAL_FERRAZ'
                        ? 'Municipal (Ferraz)'
                        : f.tipo === 'NACIONAL'
                        ? 'Nacional'
                        : f.tipo === 'ESTADUAL_SP'
                        ? 'Estadual (SP)'
                        : 'Mefisa'}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                    {f.regraDeterminante}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-emerald-700 font-bold">Sim</span>
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={() => handleRemoverFeriado(f.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGRA 05 CONFIRMADA: Central de Preferências de Notificação para ADM Chefe e CEO */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#002172]" />
              <h2 className="text-base font-bold font-['Quicksand'] text-slate-900">
                Central de Preferências de Notificação (ADM Chefe & CEO)
              </h2>
              <span className="text-[10px] bg-blue-100 text-[#002172] font-bold px-2 py-0.5 rounded-full">
                REGRA 05: Canais & Gatilhos Configuráveis
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Personalize quais canais estão ativos e selecione quais ocorrências operacionais disparam notificações imediatas.
            </p>
          </div>

          {salvoFeedback && (
            <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5" /> Preferências salvas!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seção Canais */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              1. Canais de Envio Ativos
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#002172]" />
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Painel Interno do Sistema</div>
                    <div className="text-[10px] text-slate-500">Exibição nos alertas e badges da interface administrativa</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.canais.painelInterno}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      canais: {
                        ...preferenciasNotificacao.canais,
                        painelInterno: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-[#002172]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800 text-xs">E-mail Executivo Direto</div>
                    <div className="text-[10px] text-slate-500">ceo@clinicamefisa.com.br, admchefe@clinicamefisa.com.br</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.canais.email}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      canais: {
                        ...preferenciasNotificacao.canais,
                        email: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-emerald-600"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Webhook / Push de Integração Externa</div>
                    <div className="text-[10px] text-slate-500">Disparo RESTful JSON para sistemas de auditoria e mensageria</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.canais.webhook}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      canais: {
                        ...preferenciasNotificacao.canais,
                        webhook: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-purple-600"
                />
              </label>
            </div>
          </div>

          {/* Seção Gatilhos */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              2. Ocorrências que Disparam Alertas
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">Remarcação Anormal (&ge; 20 dias / ~30 dias)</div>
                  <div className="text-[10px] text-slate-500">Quando a nova data pula semanas ou vai para o próximo mês</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.gatilhos.remarcacaoAnormal}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      gatilhos: {
                        ...preferenciasNotificacao.gatilhos,
                        remarcacaoAnormal: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-red-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">Duplicidade Excepcional Confirmada (Opção B)</div>
                  <div className="text-[10px] text-slate-500">Gravação justificada com mesma chave Paciente + Procedimento + Data</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.gatilhos.duplicidadeConfirmada}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      gatilhos: {
                        ...preferenciasNotificacao.gatilhos,
                        duplicidadeConfirmada: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-red-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">SLA de Análise Ultrapassado (&gt; 7 dias corridos)</div>
                  <div className="text-[10px] text-slate-500">Notificação imediata para cobrança jurídica ou administrativa</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.gatilhos.analiseAtrasada7Dias}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      gatilhos: {
                        ...preferenciasNotificacao.gatilhos,
                        analiseAtrasada7Dias: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-red-600"
                />
              </label>

              <label className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800 text-xs">Alerta Preventivo de SLA (5 a 7 dias corridos)</div>
                  <div className="text-[10px] text-slate-500">Cobrança proativa antes do vencimento crítico</div>
                </div>
                <input
                  type="checkbox"
                  checked={preferenciasNotificacao.gatilhos.analiseAtencao5Dias}
                  onChange={(e) =>
                    handleSalvarPreferencias({
                      ...preferenciasNotificacao,
                      gatilhos: {
                        ...preferenciasNotificacao.gatilhos,
                        analiseAtencao5Dias: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-amber-600"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Notificações de Anomalia Enviadas à Gestão (ADM CHEFE e CEO) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-red-600" />
              <h2 className="text-base font-bold font-['Quicksand'] text-slate-900">
                Despachos Imediatos à Gestão (ADM Chefe & CEO)
              </h2>
            </div>
            <p className="text-[11px] text-slate-500">
              Auditoria de remarcações anormais (~30 dias) confirmadas excepcionalmente pelos operadores.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {notificacoesGestao.length} registro(s)
          </span>
        </div>

        {notificacoesGestao.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 italic">
            Nenhuma remarcação anormal registrada até o momento. O sistema monitora ativamente saltos &ge; 20 dias.
          </div>
        ) : (
          <div className="space-y-2.5">
            {notificacoesGestao.map((notif) => (
              <div
                key={notif.id}
                className="p-3.5 bg-red-50/50 rounded-xl border border-red-200 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-red-950 flex items-center gap-2">
                    <span>Protocolo: {notif.id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-red-200 text-red-900">
                      +{notif.diasDiferenca} dias de salto
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{notif.dataHora}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                  <div>
                    <strong>Paciente:</strong> {notif.pacienteNome}
                  </div>
                  <div>
                    <strong>Procedimento:</strong> {notif.procedimentoNome}
                  </div>
                  <div>
                    <strong>Operador:</strong> {notif.usuarioNome} ({notif.usuarioPapel})
                  </div>
                </div>

                <div className="text-[11px] text-slate-600">
                  <strong>Alteração:</strong> {formatarDataBr(notif.dataOriginal, showMonthInitials)} &rarr; <strong>{formatarDataBr(notif.novaData, showMonthInitials)}</strong>
                </div>

                <div className="p-2 bg-white rounded-lg border border-red-100 text-[11px] text-red-900 italic">
                  "Justificativa confirmada: {notif.motivoConfirmado}"
                </div>

                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <span>Destinatários notificados:</span>
                  <span className="font-bold text-slate-800">Dr. Roberto Mefisa (ADM CHEFE)</span>
                  <span>·</span>
                  <span className="font-bold text-slate-800">Dra. Camila Rocha (CEO)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Gestão de Procedimentos & Preços ABA */}
      <GerenciarProcedimentosModal
        isOpen={isModalProcedimentosOpen}
        onClose={() => setIsModalProcedimentosOpen(false)}
      />
        </div>
      )}
    </div>
  );
};
