import React, { useState } from 'react';
import {
  X,
  Calculator,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Clock,
  ShieldAlert,
  Send,
  Building,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  calcularSessoesPeriodo,
  calcularAlinhamentoProximaAutorizacao,
  gerarCronogramaComAuditoriaFeriados,
  validarRemarcacaoSessao,
  gerarNotificacaoAnomaliaGestao,
  identificarDiaSemana,
  formatarDiaSemanaPt,
  DIAS_SEMANA_NOMES,
  formatarDataBr,
  parseIsoDateLocal,
  formatIsoDate,
} from '../../services/businessRules';
import { HolidayService } from '../../services/holidaysService';
import { DiaSemanaIndice, ConflitoFeriadoSessao, ModoAbatimentoFaltas, Prestador } from '../../types/clinic';
import { useTheme } from '../../context/ThemeContext';
import { obterPrestadoresStorage } from '../../data/mockClinicData';

export interface SessaoConvencional {
  numero: number;
  dataIso: string;
  dataBr: string;
  diaSemanaNome: string;
  temConflito: boolean;
  motivoConflito?: string;
  nomeFeriado?: string;
}

export interface ResultadoCronogramaConvencional {
  sessoes: SessaoConvencional[];
  proximaAutorizacao: {
    dataIso: string;
    dataBr: string;
    diaSemanaNome: string;
    temConflito: boolean;
    motivoConflito?: string;
    nomeFeriado?: string;
  };
  totalConflitos: number;
}

export function calcularCronogramaConvencional(
  dataAutorizacaoIso: string,
  quantidade: number,
  duracao: '30MIN' | '1H',
  datasCustomizadas: Record<number, string> = {},
  proximaAutCustomizada?: string,
  guiaAtrasada: boolean = false
): ResultadoCronogramaConvencional {
  const dtRefIso = dataAutorizacaoIso && dataAutorizacaoIso.trim() ? dataAutorizacaoIso.trim() : new Date().toISOString().split('T')[0];
  const sessoes: SessaoConvencional[] = [];
  const dtInicio = new Date(dtRefIso + 'T12:00:00Z');
  const dayOfWeek = dtInicio.getDay();

  const qtdEfetiva = quantidade === 5 ? 5 : 4;
  let totalConflitos = 0;

  const datasCalculadasIso: string[] = [];

  if (guiaAtrasada) {
    // GUIA ATRASADA: Partindo do Dia da Autorização, pula de 1 em 1 dia, pulando domingos e alertando feriados
    const curr = new Date(dtInicio.getTime());
    if (curr.getDay() === 0) {
      curr.setDate(curr.getDate() + 1);
    }

    let safetyAtrasada = 0;
    while (datasCalculadasIso.length < qtdEfetiva && safetyAtrasada++ < 60) {
      if (curr.getDay() !== 0) {
        datasCalculadasIso.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }
  } else if (duracao === '30MIN') {
    if (qtdEfetiva === 4) {
      for (let i = 0; i < 4; i++) {
        const d = new Date(dtInicio.getTime());
        d.setDate(d.getDate() + (i * 7));
        datasCalculadasIso.push(d.toISOString().split('T')[0]);
      }
    } else {
      // 5 SESSÕES (30MIN): 2ª sessão cai na mesma semana da 1ª sessão
      datasCalculadasIso.push(dtInicio.toISOString().split('T')[0]);

      const dSessao2 = new Date(dtInicio.getTime());
      if (dayOfWeek === 6) {
        // Sábado: pular para a próxima semana
        dSessao2.setDate(dSessao2.getDate() + 2);
      } else if (dayOfWeek === 5) {
        // Sexta-feira: vai para sábado
        dSessao2.setDate(dSessao2.getDate() + 1);
      } else if (dayOfWeek === 0) {
        // Domingo: vai para quarta-feira
        dSessao2.setDate(dSessao2.getDate() + 3);
      } else {
        // Segunda, Terça, Quarta, Quinta: +2 dias na mesma semana
        dSessao2.setDate(dSessao2.getDate() + 2);
      }
      datasCalculadasIso.push(dSessao2.toISOString().split('T')[0]);

      // Sessões 3, 4, 5: seguem exatamente o mesmo cálculo semanal da de 4 sessões (+7, +14, +21 dias)
      for (let k = 1; k <= 3; k++) {
        const d = new Date(dtInicio.getTime());
        d.setDate(d.getDate() + (k * 7));
        datasCalculadasIso.push(d.toISOString().split('T')[0]);
      }
    }
  } else {
    // 1H: 2 sessões por semana (para 4 sessões) ou 3 sessões na semana 1 + 2 sessões na semana 2 (para 5 sessões)
    let offsetDias = 2;
    if (dayOfWeek === 5 || dayOfWeek === 1) offsetDias = 3;

    if (qtdEfetiva === 4) {
      datasCalculadasIso.push(dtInicio.toISOString().split('T')[0]);
      const d2 = new Date(dtInicio.getTime());
      d2.setDate(d2.getDate() + offsetDias);
      datasCalculadasIso.push(d2.toISOString().split('T')[0]);

      const d3 = new Date(dtInicio.getTime());
      d3.setDate(d3.getDate() + 7);
      datasCalculadasIso.push(d3.toISOString().split('T')[0]);

      const d4 = new Date(dtInicio.getTime());
      d4.setDate(d4.getDate() + 7 + offsetDias);
      datasCalculadasIso.push(d4.toISOString().split('T')[0]);
    } else {
      // 5 SESSÕES (1H): Primeira semana tem +1 sessão (3 sessões), segunda semana tem 2 sessões
      datasCalculadasIso.push(dtInicio.toISOString().split('T')[0]);

      const d2 = new Date(dtInicio.getTime());
      const d3 = new Date(dtInicio.getTime());

      if (dayOfWeek === 1) { // Segunda
        d2.setDate(d2.getDate() + 2); // Quarta
        d3.setDate(d3.getDate() + 4); // Sexta
      } else if (dayOfWeek === 2) { // Terça
        d2.setDate(d2.getDate() + 2); // Quinta
        d3.setDate(d3.getDate() + 4); // Sábado
      } else if (dayOfWeek === 3) { // Quarta
        d2.setDate(d2.getDate() + 2); // Sexta
        d3.setDate(d3.getDate() + 3); // Sábado
      } else if (dayOfWeek === 4) { // Quinta
        d2.setDate(d2.getDate() + 1); // Sexta
        d3.setDate(d3.getDate() + 2); // Sábado
      } else if (dayOfWeek === 5) { // Sexta
        d2.setDate(d2.getDate() + 1); // Sábado
        d3.setDate(d3.getDate() + 3); // Segunda seguinte
      } else if (dayOfWeek === 6) { // Sábado
        d2.setDate(d2.getDate() + 2); // Segunda
        d3.setDate(d3.getDate() + 4); // Quarta
      } else { // Domingo
        d2.setDate(d2.getDate() + 2); // Terça
        d3.setDate(d3.getDate() + 4); // Quinta
      }

      datasCalculadasIso.push(d2.toISOString().split('T')[0]);
      datasCalculadasIso.push(d3.toISOString().split('T')[0]);

      // Semana 2: Sessões 4 e 5 (as mesmas datas da Semana 2 da opção de 4 sessões)
      const d4 = new Date(dtInicio.getTime());
      d4.setDate(d4.getDate() + 7);
      datasCalculadasIso.push(d4.toISOString().split('T')[0]);

      const d5 = new Date(dtInicio.getTime());
      d5.setDate(d5.getDate() + 7 + offsetDias);
      datasCalculadasIso.push(d5.toISOString().split('T')[0]);
    }
  }

  for (let i = 0; i < qtdEfetiva; i++) {
    let dataIsoCalculada = datasCalculadasIso[i] || dtRefIso;

    if (datasCustomizadas[i + 1]) {
      dataIsoCalculada = datasCustomizadas[i + 1];
    }

    const feriado = HolidayService.verificarFeriado(dataIsoCalculada);
    const diaSem = identificarDiaSemana(dataIsoCalculada);
    const isDomingo = diaSem === 0;
    const temConflito = isDomingo || !!feriado;

    let motivoConflito: string | undefined = undefined;
    let nomeFeriado: string | undefined = undefined;

    if (isDomingo) {
      motivoConflito = 'Domingo — Não há expediente clínico';
      totalConflitos++;
    } else if (feriado) {
      motivoConflito = `Feriado: ${feriado.nome} (${feriado.tipo})`;
      nomeFeriado = feriado.nome;
      totalConflitos++;
    }

    sessoes.push({
      numero: i + 1,
      dataIso: dataIsoCalculada,
      dataBr: formatarDataBr(dataIsoCalculada),
      diaSemanaNome: formatarDiaSemanaPt(diaSem),
      temConflito,
      motivoConflito,
      nomeFeriado,
    });
  }

  let dataProxIso = '';
  if (proximaAutCustomizada) {
    dataProxIso = proximaAutCustomizada;
  } else {
    if (guiaAtrasada) {
      const ultIso = datasCalculadasIso[datasCalculadasIso.length - 1];
      const dtUlt = new Date((ultIso || dtRefIso) + 'T12:00:00Z');
      dtUlt.setDate(dtUlt.getDate() + 1);
      if (dtUlt.getDay() === 0) {
        dtUlt.setDate(dtUlt.getDate() + 1);
      }
      dataProxIso = dtUlt.toISOString().split('T')[0];
    } else if (duracao === '30MIN') {
      // Para 30MIN (4 ou 5 sessões), a autorização subsequente é a 4ª semana (+28 dias)
      const dtNext = new Date(dtInicio.getTime());
      dtNext.setDate(dtNext.getDate() + 28);
      dataProxIso = dtNext.toISOString().split('T')[0];
    } else {
      // Para 1H (4 ou 5 sessões), a autorização subsequente é a 2ª semana (+14 dias)
      const dtNext = new Date(dtInicio.getTime());
      dtNext.setDate(dtNext.getDate() + 14);
      dataProxIso = dtNext.toISOString().split('T')[0];
    }
  }

  const feriadoProx = HolidayService.verificarFeriado(dataProxIso);
  const diaSemProx = identificarDiaSemana(dataProxIso);
  const isDomingoProx = diaSemProx === 0;
  const temConflitoProx = isDomingoProx || !!feriadoProx;

  let motivoConflitoProx: string | undefined = undefined;
  let nomeFeriadoProx: string | undefined = undefined;

  if (isDomingoProx) {
    motivoConflitoProx = 'Domingo — Não há expediente clínico';
    totalConflitos++;
  } else if (feriadoProx) {
    motivoConflitoProx = `Feriado: ${feriadoProx.nome} (${feriadoProx.tipo})`;
    nomeFeriadoProx = feriadoProx.nome;
    totalConflitos++;
  }

  const proximaAutorizacao = {
    dataIso: dataProxIso,
    dataBr: formatarDataBr(dataProxIso),
    diaSemanaNome: formatarDiaSemanaPt(diaSemProx),
    temConflito: temConflitoProx,
    motivoConflito: motivoConflitoProx,
    nomeFeriado: nomeFeriadoProx,
  };

  return {
    sessoes,
    proximaAutorizacao,
    totalConflitos,
  };
}

interface CalculationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCalculation?: (resultado: any) => void;
  usuarioAtualNome?: string;
  usuarioAtualPapel?: string;
}

export const CalculationPreviewModal: React.FC<CalculationPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmCalculation,
  usuarioAtualNome = 'Maria Clara Fonseca',
  usuarioAtualPapel = 'FUNCIONARIO_ADMINISTRATIVO',
}) => {
  const { getThemeStrokeStyle, showMonthInitials } = useTheme();

  // Estados dos inputs para o cálculo de autorização
  const [pacienteNome, setPacienteNome] = useState<string>('Maurício Rezende Filho');
  const [procedimentoNome, setProcedimentoNome] = useState<string>('Psicoterapia ABA / TCC Adulto');
  const [diasSemanaHabituais, setDiasSemanaHabituais] = useState<DiaSemanaIndice[]>([4]); // 4 = Quinta-feira (padrão)
  const diaSemanaHabitual = diasSemanaHabituais[0] ?? 4;
  const [sessoesSemana, setSessoesSemana] = useState<number>(1);
  const [dataInicio, setDataInicio] = useState<string>('2026-10-01');

  const handleDataInicioChange = (novaDataIso: string) => {
    setDataInicio(novaDataIso);
    setDatasCustomizadas({}); // Reseta alterações manuais de datas ao mudar início do ciclo
  };

  const toggleDiaSemana = (indice: DiaSemanaIndice) => {
    setDiasSemanaHabituais((prev) => {
      let proximo: DiaSemanaIndice[];
      if (prev.includes(indice)) {
        if (prev.length === 1) return prev;
        proximo = prev.filter((i) => i !== indice);
      } else {
        proximo = [...prev, indice].sort((a, b) => a - b);
      }
      setOverrideQuantidade(null);
      setDatasCustomizadas({});
      return proximo;
    });
  };
  const [opcaoSabado, setOpcaoSabado] = useState<'SEXTA_FEIRA_ANTERIOR' | 'SEGUNDA_FEIRA_SEGUINTE'>('SEXTA_FEIRA_ANTERIOR');
  const [overrideQuantidade, setOverrideQuantidade] = useState<number | null>(null);
  const [copiedJustificativa, setCopiedJustificativa] = useState<boolean>(false);

  // REGRA 02 CONFIRMADA: Decisão do Usuário sobre Faltas Justificadas no Ciclo
  const [temFaltasJustificadas, setTemFaltasJustificadas] = useState<boolean>(false);
  const [quantidadeFaltas, setQuantidadeFaltas] = useState<number>(1);
  const [modoFaltas, setModoFaltas] = useState<ModoAbatimentoFaltas>('DESCONTAR_PROXIMA_AUTORIZACAO');
  const [motivoFaltas, setMotivoFaltas] = useState<string>('Atestado médico da criança');

  // Remanejamento interativo de sessão em conflito ou teste de anomalia
  const [sessaoSendoRemarcada, setSessaoSendoRemarcada] = useState<{
    numero: number;
    dataOriginal: string;
    conflito?: ConflitoFeriadoSessao;
  } | null>(null);
  const [novaDataInput, setNovaDataInput] = useState<string>('');
  const [modalAnomaliaAberto, setModalAnomaliaAberto] = useState<boolean>(false);
  const [diasDiferencaAnomalia, setDiasDiferencaAnomalia] = useState<number>(0);
  const [justificativaAnomalia, setJustificativaAnomalia] = useState<string>('');
  const [notificacaoEnviadaSucesso, setNotificacaoEnviadaSucesso] = useState<string | null>(null);

  // Mapeamento de substituição manual de datas no cronograma
  const [datasCustomizadas, setDatasCustomizadas] = useState<Record<number, string>>({});

  // Seleção de Aba na Calculadora: ABA (Original) vs CONVENCIONAL
  const [abaAtiva, setAbaAtiva] = useState<'ABA' | 'CONVENCIONAL'>('ABA');

  // Estados específicos para a Calculadora CONVENCIONAL
  const prestadoresSistema = React.useMemo(() => obterPrestadoresStorage(), [isOpen]);
  const [prestadorIdConv, setPrestadorIdConv] = useState<string>(() => prestadoresSistema[0]?.id || 'prest-1');
  const [buscaDoutorConv, setBuscaDoutorConv] = useState<string>('');
  const [dropdownDoutorAberto, setDropdownDoutorAberto] = useState<boolean>(false);
  const [dataAutorizacaoConv, setDataAutorizacaoConv] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [qtdSessoesConv, setQtdSessoesConv] = useState<number>(4);
  const [duracaoSessaoConv, setDuracaoSessaoConv] = useState<'30MIN' | '1H'>('30MIN');
  const [guiaAtrasadaConv, setGuiaAtrasadaConv] = useState<boolean>(false);
  const [datasCustomizadasConv, setDatasCustomizadasConv] = useState<Record<number, string>>({});
  const [proximaAutCustomizadaConv, setProximaAutCustomizadaConv] = useState<string>('');
  const [copiedResumoConv, setCopiedResumoConv] = useState<boolean>(false);

  const prestadoresFiltrados = React.useMemo(() => {
    if (!buscaDoutorConv.trim()) return prestadoresSistema;
    const term = buscaDoutorConv.toLowerCase().trim();
    return prestadoresSistema.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        (p.crmOuCrp && p.crmOuCrp.toLowerCase().includes(term)) ||
        (p.especialidade && p.especialidade.toLowerCase().includes(term)) ||
        (p.orgaoClasse && p.orgaoClasse.toLowerCase().includes(term))
    );
  }, [prestadoresSistema, buscaDoutorConv]);

  // Estados para observações e seleção de profissional Mefisa
  const [doutorMefisaId, setDoutorMefisaId] = useState<string>(() => prestadoresSistema[0]?.id || 'prest-angelica');
  const [copiedObsKey, setCopiedObsKey] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Executa o motor central de alinhamento com a REGRA 1 (Sem corte manual)
  const alinhamento = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: diasSemanaHabituais,
    dataInicioCicloStr: dataInicio,
    sessoesPorSemana: sessoesSemana,
    opcaoSabadoEscolhida: opcaoSabado,
  });

  const resultadoFormulario = calcularSessoesPeriodo(
    sessoesSemana,
    dataInicio,
    alinhamento.dataProximaAutorizacaoCalculada,
    2.4, // tamanhoMb padrão válido
    temFaltasJustificadas
      ? {
          modoAbatimento: modoFaltas,
          quantidadeFaltasJustificadas: quantidadeFaltas,
          motivoFaltas,
        }
      : undefined
  );

  const quantidadeEfetiva =
    overrideQuantidade !== null
      ? overrideQuantidade
      : alinhamento.totalSessoesSugeridas;

  // Cronograma com auditoria de feriados em Ferraz de Vasconcelos (ABA)
  const cronograma = gerarCronogramaComAuditoriaFeriados(
    dataInicio,
    quantidadeEfetiva,
    diasSemanaHabituais,
    sessoesSemana
  );

  // Cálculo da Próxima Autorização Posterior (Ciclo Subsequente do Modelo ABA)
  const ultimaSessaoAtualIso =
    datasCustomizadas[quantidadeEfetiva] ||
    cronograma.sessoes[cronograma.sessoes.length - 1]?.data ||
    alinhamento.dataProximaAutorizacaoCalculada;

  const alinhamentoPosterior = calcularAlinhamentoProximaAutorizacao({
    diaSemanaHabitual: diasSemanaHabituais,
    dataInicioCicloStr: ultimaSessaoAtualIso,
    sessoesPorSemana: sessoesSemana,
    opcaoSabadoEscolhida: opcaoSabado,
  });

  // Cronograma Convencional (CONVENCIONAL)
  const cronogramaConv = calcularCronogramaConvencional(
    dataAutorizacaoConv,
    qtdSessoesConv,
    duracaoSessaoConv,
    datasCustomizadasConv,
    proximaAutCustomizadaConv,
    guiaAtrasadaConv
  );

  // Verificação de 2 ou mais sessões na mesma semana no modelo Convencional
  const temMultiplasSessoesNaSemana = guiaAtrasadaConv || duracaoSessaoConv === '1H' || qtdSessoesConv === 5;
  const qtdSessoesSemanaisNum = duracaoSessaoConv === '1H' ? 2 : (qtdSessoesConv === 5 ? 2 : 1);
  const prestadorConvSel = prestadoresSistema.find((p) => p.id === prestadorIdConv) || prestadoresSistema[0];
  const orgaoTexto = prestadorConvSel?.orgaoClasse || 'CRP';
  const conselhoTexto = prestadorConvSel?.crmOuCrp || '';
  const nomePrestadorUpper = prestadorConvSel?.nome?.toUpperCase() || '';

  const observacaoTecnicaTexto = temMultiplasSessoesNaSemana
    ? `Paciente realiza ${qtdSessoesSemanaisNum} sessoes semanais de acordo com avaliacao tecnica. Profissional: ${nomePrestadorUpper}. ${orgaoTexto}: ${conselhoTexto}.`
    : '';

  const doutorMefisaSel = prestadoresSistema.find((p) => p.id === doutorMefisaId) || prestadoresSistema[0];
  const doutorMefisaNomeUpper = doutorMefisaSel?.nome?.toUpperCase() || 'ANGELICA DA CRUZ';
  const doutorMefisaOrgao = doutorMefisaSel?.orgaoClasse || 'CRP';
  const doutorMefisaConselho = doutorMefisaSel?.crmOuCrp || '25036';

  const converterNumeroExtenso = (num: number): string => {
    const mapa: Record<number, string> = {
      1: 'uma',
      2: 'duas',
      3: 'tres',
      4: 'quatro',
      5: 'cinco',
      6: 'seis',
      7: 'sete',
      8: 'oito',
      9: 'nove',
      10: 'dez',
    };
    return mapa[num] || String(num);
  };

  const sessoesExtenso = converterNumeroExtenso(sessoesSemana);

  // Observações sem acentos
  const textoJustificativaPadrao = `Sabemos que a quantidade do formulario e ${sessoesSemana} por semana, porem foi solicitado ${quantidadeEfetiva}, que sera para o mes inteiro.`;

  const textoObsSemanal = `Paciente realiza ${sessoesExtenso} sessoes semanais de acordo com avaliacao tecnica. Profissional: ${doutorMefisaNomeUpper}. ${doutorMefisaOrgao}: ${doutorMefisaConselho}`;

  // Múltiplas sessões no mesmo dia
  const contagemDatasMap: Record<string, number> = {};
  cronograma.sessoes.forEach((s) => {
    const dt = datasCustomizadas[s.numero] || s.data;
    contagemDatasMap[dt] = (contagemDatasMap[dt] || 0) + 1;
  });
  const maxSessoesMesmoDia = Math.max(...Object.values(contagemDatasMap), 1);
  const temMaisDeUmaSessaoMesmoDia = maxSessoesMesmoDia > 1;

  const textoObsMesmoDia = `O paciente realizou, na mesma data em horarios diferentes, ${maxSessoesMesmoDia} sessoes pelo metodo ABA na clinica, conforme orientacao do formulario medico anexo a autorizacao.`;

  const handleCopyText = (texto: string, key: string) => {
    navigator.clipboard.writeText(texto);
    setCopiedObsKey(key);
    setTimeout(() => setCopiedObsKey(null), 2000);
  };

  const handleIniciarRemarcacao = (sessao: { numero: number; data: string; conflito?: ConflitoFeriadoSessao }) => {
    const dataAlvoSugerida = sessao.conflito?.novaDataSugerida || sessao.data;
    setSessaoSendoRemarcada({
      numero: sessao.numero,
      dataOriginal: sessao.data,
      conflito: sessao.conflito,
    });
    setNovaDataInput(dataAlvoSugerida);
  };

  const handleConfirmarNovaDataSessao = () => {
    if (!sessaoSendoRemarcada || !novaDataInput) return;

    // PROTEÇÃO CONTRA REMARCAÇÕES ANORMAIS
    const validacao = validarRemarcacaoSessao(
      sessaoSendoRemarcada.dataOriginal,
      novaDataInput,
      20 // limiar para acionar alerta (~30 dias)
    );

    if (validacao.ehAnomalia) {
      setDiasDiferencaAnomalia(validacao.diasDiferenca);
      setModalAnomaliaAberto(true);
      return;
    }

    // Remanejamento normal
    aplicarRemarcacaoFinal(sessaoSendoRemarcada.numero, novaDataInput, 'Remanejamento normal pelo operador');
  };

  const handleConfirmarAnomaliaComGestao = () => {
    if (!sessaoSendoRemarcada) return;
    if (!justificativaAnomalia.trim()) {
      alert('Por favor, informe a justificativa/razão da confirmação desta remarcação.');
      return;
    }

    // 1. Despacha notificação formal para ADM CHEFE e CEO
    const notif = gerarNotificacaoAnomaliaGestao({
      pacienteNome,
      procedimentoNome,
      dataOriginal: sessaoSendoRemarcada.dataOriginal,
      novaData: novaDataInput,
      diasDiferenca: diasDiferencaAnomalia,
      usuarioNome: usuarioAtualNome,
      usuarioPapel: usuarioAtualPapel,
      motivoConfirmado: justificativaAnomalia,
    });

    setNotificacaoEnviadaSucesso(
      `Notificação formal #${notif.id.substring(0, 12)} transmitida com sucesso ao ADM CHEFE (Dr. Roberto Mefisa) e à CEO (Dra. Camila Rocha).`
    );

    // 2. Aplica a nova data
    aplicarRemarcacaoFinal(sessaoSendoRemarcada.numero, novaDataInput, justificativaAnomalia);
    setModalAnomaliaAberto(false);
    setJustificativaAnomalia('');
  };

  const aplicarRemarcacaoFinal = (numeroSessao: number, novaData: string, motivo: string) => {
    setDatasCustomizadas((prev) => ({
      ...prev,
      [numeroSessao]: novaData,
    }));
    setSessaoSendoRemarcada(null);
  };

  const handleConfirm = () => {
    if (onConfirmCalculation) {
      if (abaAtiva === 'CONVENCIONAL') {
        onConfirmCalculation({
          modelo: 'CONVENCIONAL',
          dataAutorizacao: dataAutorizacaoConv,
          quantidadeConfirmada: qtdSessoesConv,
          duracao: duracaoSessaoConv,
          cronograma: cronogramaConv,
        });
      } else {
        onConfirmCalculation({
          modelo: 'ABA',
          ...resultadoFormulario,
          quantidadeConfirmada: quantidadeEfetiva,
          pacienteNome,
          procedimentoNome,
          alinhamento,
          cronograma,
          datasCustomizadas,
        });
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-[#002172] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#91CA0C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Quicksand'] font-bold text-base text-white">
                  Motor de Regras de Negócio & Cálculo Transparente
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#91CA0C] text-slate-950 tracking-tight shadow-2xs">
                  Regras 1, 2 e 3 Validadas
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Alinhamento ao dia real de atendimento, exceção de sábado, feriados de Ferraz de Vasconcelos e proteção contra anomalias.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notificação de Sucesso de Anomalia */}
        {notificacaoEnviadaSucesso && (
          <div className="bg-amber-100 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-5 py-2.5 flex items-center justify-between text-xs text-amber-950 dark:text-amber-100 font-medium">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>{notificacaoEnviadaSucesso}</span>
            </div>
            <button
              onClick={() => setNotificacaoEnviadaSucesso(null)}
              className="text-amber-800 dark:text-amber-300 hover:text-black dark:hover:text-white font-bold text-[10px] underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-200">
          {/* Navegação entre Abas: ABA vs CONVENCIONAL */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setAbaAtiva('ABA')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                abaAtiva === 'ABA'
                  ? 'bg-[#002172] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4 text-[#91CA0C]" />
              <span>Calculadora ABA</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Modelo ABA
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('CONVENCIONAL')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                abaAtiva === 'CONVENCIONAL'
                  ? 'bg-[#002172] text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Calculadora CONVENCIONAL</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                Modelo Convencional (30MIN / 1H)
              </span>
            </button>
          </div>

          {abaAtiva === 'ABA' ? (
            <>
              {/* Seção 1: Parâmetros do Paciente e Dia Habitual de Atendimento */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3.5 shadow-2xs">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold tracking-tight">
                <Calendar className="w-4 h-4 text-[#002172] dark:text-blue-400" />
                1. Alinhamento ao Dia Real de Atendimento (REGRA 1)
              </span>
              <span className="text-[10px] text-[#002172] dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                Competência: {alinhamento.mesCompetenciaReferencia}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5">
                  Dias Habituais de Atendimento:
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    { indice: 1, rotuloCurto: 'Seg', rotuloLongo: 'Segunda-feira' },
                    { indice: 2, rotuloCurto: 'Ter', rotuloLongo: 'Terça-feira' },
                    { indice: 3, rotuloCurto: 'Qua', rotuloLongo: 'Quarta-feira' },
                    { indice: 4, rotuloCurto: 'Qui', rotuloLongo: 'Quinta-feira' },
                    { indice: 5, rotuloCurto: 'Sex', rotuloLongo: 'Sexta-feira' },
                    { indice: 6, rotuloCurto: 'Sáb', rotuloLongo: 'Sábado' },
                  ].map((dia) => {
                    const estaSelecionado = diasSemanaHabituais.includes(dia.indice as DiaSemanaIndice);
                    return (
                      <button
                        key={dia.indice}
                        type="button"
                        onClick={() => toggleDiaSemana(dia.indice as DiaSemanaIndice)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          estaSelecionado
                            ? 'bg-[#002172] text-white border-[#002172] dark:bg-blue-600 dark:border-blue-500 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={`Clique para selecionar/deselecionar ${dia.rotuloLongo}`}
                      >
                        {dia.rotuloCurto}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">
                  {diasSemanaHabituais.length === 1
                    ? `Dia fixo: ${DIAS_SEMANA_NOMES[diasSemanaHabituais[0]] || 'Quinta-feira'}`
                    : `${diasSemanaHabituais.length} dias selecionados`}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5">
                  Início do Ciclo:
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-[#002172] dark:focus:outline-blue-400"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 block font-medium">
                  {formatarDiaSemanaPt(identificarDiaSemana(dataInicio))}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5">
                  Sessões por Semana:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={sessoesSemana}
                  onChange={(e) => {
                    setSessoesSemana(Number(e.target.value));
                    setOverrideQuantidade(null);
                    setDatasCustomizadas({});
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-extrabold text-[#002172] dark:text-blue-300 focus:outline-[#002172] dark:focus:outline-blue-400"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 block font-medium">
                  Frequência do laudo médica
                </span>
              </div>
            </div>

            {/* REGRA 02 CONFIRMADA: Decisão do Usuário sobre Faltas Justificadas no Ciclo */}
            <div className="mt-3 p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-bold text-xs text-purple-950 dark:text-purple-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temFaltasJustificadas}
                    onChange={(e) => setTemFaltasJustificadas(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-700 focus:ring-purple-500"
                  />
                  <span>Considerar Faltas Justificadas no Ciclo Atual (REGRA 02: Decisão do Usuário)</span>
                </label>
                <span className="text-[10px] bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 font-bold px-2 py-0.5 rounded-md">
                  Opcional / Decisão do Usuário
                </span>
              </div>

              {temFaltasJustificadas && (
                <div className="space-y-3 pt-2 border-t border-purple-200/60 dark:border-purple-800/60 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                        Quantidade de Faltas Justificadas:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={quantidadeFaltas}
                        onChange={(e) => setQuantidadeFaltas(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-950 dark:text-purple-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                        Motivo da(s) Falta(s):
                      </label>
                      <input
                        type="text"
                        value={motivoFaltas}
                        onChange={(e) => setMotivoFaltas(e.target.value)}
                        placeholder="Ex: Atestado médico de saúde da criança"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1.5">
                      Como o sistema deve processar estas faltas?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModoFaltas('DESCONTAR_PROXIMA_AUTORIZACAO')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          modoFaltas === 'DESCONTAR_PROXIMA_AUTORIZACAO'
                            ? 'bg-purple-900 dark:bg-purple-800 text-white border-purple-900 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                        }`}
                      >
                        <div className="font-bold text-[11px]">
                          1. Descontar da Próxima Autorização
                        </div>
                        <div className={`text-[10px] mt-0.5 ${modoFaltas === 'DESCONTAR_PROXIMA_AUTORIZACAO' ? 'text-purple-200' : 'text-slate-500 dark:text-slate-400'}`}>
                          Abate as {quantidadeFaltas} falta(s) da quantidade total solicitada no portal.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModoFaltas('MANTER_INTEGRAL_REPOSICAO_PRONTUARIO')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          modoFaltas === 'MANTER_INTEGRAL_REPOSICAO_PRONTUARIO'
                            ? 'bg-purple-900 dark:bg-purple-800 text-white border-purple-900 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                        }`}
                      >
                        <div className="font-bold text-[11px]">
                          2. Manter Quantidade Integral
                        </div>
                        <div className={`text-[10px] mt-0.5 ${modoFaltas === 'MANTER_INTEGRAL_REPOSICAO_PRONTUARIO' ? 'text-purple-200' : 'text-slate-500 dark:text-slate-400'}`}>
                          Solicita quantidade integral do laudo. Reposição clínica controlada em prontuário.
                        </div>
                      </button>
                    </div>
                  </div>

                  {resultadoFormulario.observacaoFaltasAuditoria && (
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-[10px] text-purple-950 dark:text-purple-200 font-mono">
                      ✓ Auditoria: {resultadoFormulario.observacaoFaltasAuditoria}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ALERTA ESPECIAL — EXCEÇÃO DE SÁBADO */}
          {alinhamento.excecaoSabado.detectada && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
                <h4 className="font-bold text-amber-950 dark:text-amber-200 text-xs">
                  REGRA ESPECIAL DE SÁBADO — Sem Expediente Administrativo
                </h4>
              </div>

              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                Esta autorização caiu em um <strong>sábado ({formatarDataBr(alinhamento.excecaoSabado.dataSabadoOriginal, showMonthInitials)})</strong>, quando não há operação administrativa de digitação/autorização na Clínica Mefisa.
              </p>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Nova data sugerida pelo sistema:</div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Sexta-feira, {formatarDataBr(alinhamento.excecaoSabado.dataSugeridaDeslocamento, showMonthInitials)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpcaoSabado('SEXTA_FEIRA_ANTERIOR')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      opcaoSabado === 'SEXTA_FEIRA_ANTERIOR'
                        ? 'bg-[#002172] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    [ACEITAR SEXTA-FEIRA]
                  </button>

                  <button
                    onClick={() => setOpcaoSabado('SEGUNDA_FEIRA_SEGUINTE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      opcaoSabado === 'SEGUNDA_FEIRA_SEGUINTE'
                        ? 'bg-[#002172] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    [ESCOLHER OUTRO DIA]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cronograma de Sessões com Auditoria de Feriados (Ferraz de Vasconcelos) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Cronograma de Sessões & Monitor de Feriados (Ferraz de Vasconcelos)
                </h4>
                <p className="text-[10px] text-slate-500">
                  Verificação contra o calendário oficial de feriados nacionais, estaduais e municipais de Ferraz de Vasconcelos.
                </p>
              </div>

              {cronograma.totalConflitos > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 animate-pulse">
                  ⚠️ {cronograma.totalConflitos} Feriado(s) em Ferraz Detectado(s)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ✓ Sem conflitos de feriados
                </span>
              )}
            </div>

            {/* Grid de Sessões */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {cronograma.sessoes.map((s) => {
                const dataEfetiva = datasCustomizadas[s.numero] || s.data;
                const foiRemarcada = !!datasCustomizadas[s.numero];

                return (
                  <div
                    key={s.numero}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                      s.temConflitoFeriado && !foiRemarcada
                        ? 'bg-red-50/60 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-950 dark:text-red-100'
                        : foiRemarcada
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400">
                          Sessão #{s.numero}
                        </span>
                        {s.temConflitoFeriado && !foiRemarcada && (
                          <span className="text-[9px] font-bold bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 px-1.5 py-0.2 rounded">
                            FERIADO
                          </span>
                        )}
                        {foiRemarcada && (
                          <span className="text-[9px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.2 rounded">
                            REMANEJADA
                          </span>
                        )}
                      </div>

                      <div className="font-extrabold text-xs mt-1">
                        {formatarDataBr(dataEfetiva, showMonthInitials)} ({formatarDiaSemanaPt(identificarDiaSemana(dataEfetiva))})
                      </div>

                      {s.temConflitoFeriado && !foiRemarcada && s.conflito && (
                        <div className="mt-1 text-[10px] text-red-700 dark:text-rose-300 font-medium">
                          {s.conflito.feriado.nome} ({s.conflito.feriado.tipo})
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <button
                        onClick={() => handleIniciarRemarcacao(s)}
                        className={`text-[10px] font-extrabold underline cursor-pointer transition-colors ${
                          s.temConflitoFeriado && !foiRemarcada
                            ? 'text-red-700 dark:text-rose-300 hover:text-red-900 dark:hover:text-rose-200'
                            : 'text-blue-700 dark:text-sky-300 hover:text-blue-900 dark:hover:text-sky-200'
                        }`}
                      >
                        {s.temConflitoFeriado ? 'Remanejar Sessão' : 'Alterar / Testar Remarcação'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Painel de Remanejamento Ativo de Sessão */}
          {sessaoSendoRemarcada && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  Remanejamento da Sessão #{sessaoSendoRemarcada.numero} (Original: {formatarDataBr(sessaoSendoRemarcada.dataOriginal, showMonthInitials)})
                </span>
                <button
                  onClick={() => setSessaoSendoRemarcada(null)}
                  className="text-amber-800 hover:text-black text-xs font-bold"
                >
                  ✕ Cancelar
                </button>
              </div>

              {sessaoSendoRemarcada.conflito && (
                <div className="text-[11px] text-amber-900 bg-white p-2.5 rounded-xl border border-amber-200 space-y-1">
                  <div className="font-bold text-red-700">
                    ⚠️ {sessaoSendoRemarcada.conflito.motivoConflito}
                  </div>
                  <div>
                    <strong>Impacto no Cronograma:</strong> {sessaoSendoRemarcada.conflito.impactoCronograma}
                  </div>
                  <div>
                    <strong>Impacto na Próxima Autorização:</strong> {sessaoSendoRemarcada.conflito.impactoProximaAutorizacao}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-slate-600 font-medium text-[11px] mb-1">
                    Nova data para esta sessão:
                  </label>
                  <input
                    type="date"
                    value={novaDataInput}
                    onChange={(e) => setNovaDataInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div className="flex items-end gap-2 pt-4 sm:pt-0 w-full sm:w-auto">
                  <button
                    onClick={handleConfirmarNovaDataSessao}
                    className="w-full sm:w-auto px-4 py-2 bg-[#002172] text-white rounded-xl font-bold hover:bg-[#001752] transition-colors"
                  >
                    Validar e Salvar Remanejamento
                  </button>

                  {/* Atalho para testar Proteção de Anomalia de 30 dias */}
                  <button
                    onClick={() => {
                      const d = new Date(sessaoSendoRemarcada.dataOriginal);
                      d.setDate(d.getDate() + 30);
                      const iso30 = d.toISOString().split('T')[0];
                      setNovaDataInput(iso30);
                    }}
                    className="text-[10px] text-amber-800 hover:underline px-2 py-1 bg-amber-100 rounded-lg whitespace-nowrap"
                    title="Simula erro de digitação colocando a sessão 30 dias depois"
                  >
                    Simular +30 dias (Anomalia)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resultado do Alinhamento da Próxima Autorização (Posicionado Abaixo do Cronograma) */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/90 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#002172] dark:text-blue-300 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Cálculo de Alinhamento da Próxima Autorização
              </span>
              <span className="text-[10px] font-mono font-bold bg-[#002172] dark:bg-blue-900 text-white px-2 py-0.5 rounded-full">
                {alinhamento.semanasCicloCalculadas} semanas no ciclo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block font-bold">Próxima Autorização Posterior:</span>
                <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm">
                  {formatarDiaSemanaPt(identificarDiaSemana(alinhamento.dataProximaAutorizacaoCalculada))},{' '}
                  {formatarDataBr(alinhamento.dataProximaAutorizacaoCalculada, showMonthInitials)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Total de Sessões no Ciclo:</span>
                <span className="font-extrabold text-[#91CA0C] text-xs sm:text-sm bg-slate-900 px-2 py-0.5 rounded-md inline-block">
                  {quantidadeEfetiva} sessões autorizadas
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-blue-100/60 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-100">Regra de Negócio:</strong> {alinhamento.regraDescritiva}
              {alinhamento.adicionouOcorrenciaSemanal && (
                <span className="text-emerald-800 dark:text-emerald-400 font-bold block mt-1">
                  ✓ Considerada mais uma ocorrência semanal no ciclo para garantir a integridade do tratamento.
                </span>
              )}
            </p>
          </div>

          {/* Observações e Justificativas para o Portal (Sem Acentos) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-amber-200/70 dark:border-amber-800/70 pb-2">
              <span className="font-extrabold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                Observações para o Convênio
              </span>
            </div>

            {/* Seletor de Profissional Mefisa (Limpo e Espaçoso) */}
            {sessoesSemana > 1 && (
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-amber-950 dark:text-amber-200 shrink-0">
                  Profissional Mefisa:
                </label>
                <select
                  value={doutorMefisaId}
                  onChange={(e) => setDoutorMefisaId(e.target.value)}
                  className="w-full sm:w-auto flex-1 max-w-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-[#002172]"
                >
                  {prestadoresSistema.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome.toUpperCase()} ({p.orgaoClasse || 'CRP'}: {p.crmOuCrp || '25036'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2.5">
              {/* Observação 1: Múltiplas Sessões na Semana (Se sessoesSemana > 1) */}
              {sessoesSemana > 1 && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      Observação de Sessões Semanais ({sessoesSemana}x por semana):
                    </span>
                    <button
                      onClick={() => handleCopyText(textoObsSemanal, 'semanal')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#002172] text-white hover:bg-[#001750] text-[11px] font-bold transition-all cursor-pointer"
                    >
                      {copiedObsKey === 'semanal' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-white" />
                          <span>Copiar Observação</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 select-all">
                    "{textoObsSemanal}"
                  </p>
                </div>
              )}

              {/* Observação 2: Múltiplas Sessões no Mesmo Dia (Se houver) */}
              {temMaisDeUmaSessaoMesmoDia && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                      Observação de Múltiplas Sessões na Mesma Data ({maxSessoesMesmoDia}x no mesmo dia):
                    </span>
                    <button
                      onClick={() => handleCopyText(textoObsMesmoDia, 'mesmoDia')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#002172] text-white hover:bg-[#001750] text-[11px] font-bold transition-all cursor-pointer"
                    >
                      {copiedObsKey === 'mesmoDia' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-white" />
                          <span>Copiar Observação</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 select-all">
                    "{textoObsMesmoDia}"
                  </p>
                </div>
              )}

              {/* Observação 3: Justificativa Padrão do Formulário */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    Justificativa do Formulário de Solicitacao:
                  </span>
                  <button
                    onClick={() => handleCopyText(textoJustificativaPadrao, 'padrao')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#002172] text-white hover:bg-[#001750] text-[11px] font-bold transition-all cursor-pointer"
                  >
                    {copiedObsKey === 'padrao' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-white" />
                        <span>Copiar Justificativa</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 font-mono text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 select-all">
                  "{textoJustificativaPadrao}"
                </p>
              </div>
            </div>
          </div>
            </>
          ) : (
            /* CONTEÚDO DA CALCULADORA CONVENCIONAL */
            <div className="space-y-5">
              {/* Seção 1: Formulário de Parâmetros Convencionais */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-2xs">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold tracking-tight">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Parâmetros do Cronograma Convencional
                  </span>
                  <span className="text-[10px] text-amber-900 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                    Modelo Convencional ({duracaoSessaoConv})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* 1. Data da Autorização */}
                  <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5">
                      1. Data da Autorização *
                    </label>
                    <input
                      type="date"
                      value={dataAutorizacaoConv}
                      onChange={(e) => {
                        setDataAutorizacaoConv(e.target.value);
                        setDatasCustomizadasConv({});
                        setProximaAutCustomizadaConv('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-[#002172]"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 block font-medium">
                      Preenchimento manual do operador (sem automação)
                    </span>
                  </div>

                  {/* 2. Quantidade Total de Sessões (Apenas 4 ou 5) */}
                  <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5">
                      2. Quantidade Total de Sessões *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setQtdSessoesConv(4);
                          setDatasCustomizadasConv({});
                          setProximaAutCustomizadaConv('');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          qtdSessoesConv === 4
                            ? 'bg-[#002172] text-white border-[#002172] shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        4 SESSÕES
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setQtdSessoesConv(5);
                          setDatasCustomizadasConv({});
                          setProximaAutCustomizadaConv('');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          qtdSessoesConv === 5
                            ? 'bg-[#002172] text-white border-[#002172] shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        5 SESSÕES
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 block font-medium">
                      {qtdSessoesConv === 4 ? 'Padrão: 4 sessões (1 por semana)' : '5ª sessão alocada na mesma semana da autorização'}
                    </span>
                  </div>

                  {/* 3. Duração das Sessões */}
                  <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5">
                      3. Duração das Sessões *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDuracaoSessaoConv('30MIN');
                          setDatasCustomizadasConv({});
                          setProximaAutCustomizadaConv('');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          duracaoSessaoConv === '30MIN'
                            ? 'bg-[#002172] text-white border-[#002172] shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        30 MIN
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDuracaoSessaoConv('1H');
                          setDatasCustomizadasConv({});
                          setProximaAutCustomizadaConv('');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          duracaoSessaoConv === '1H'
                            ? 'bg-[#002172] text-white border-[#002172] shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        1 HORA
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 block font-medium">
                      {duracaoSessaoConv === '30MIN' ? '1 sessão por semana' : '2 sessões por semana (proporcional)'}
                    </span>
                  </div>

                  {/* 4. Profissional / Doutor Mefisa (Pesquisável) */}
                  <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 relative">
                    <label className="block text-slate-700 dark:text-slate-200 font-bold text-xs mb-1.5 flex items-center justify-between">
                      <span>4. Profissional / Doutor Mefisa *</span>
                      <span className="text-[10px] text-[#002172] dark:text-blue-400 font-extrabold bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        🔍 Pesquisável
                      </span>
                    </label>

                    <div className="relative">
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Digite para pesquisar por nome ou conselho..."
                          value={
                            dropdownDoutorAberto
                              ? buscaDoutorConv
                              : prestadorConvSel
                              ? `${prestadorConvSel.nome.toUpperCase()} (${prestadorConvSel.orgaoClasse || 'CRP'}: ${prestadorConvSel.crmOuCrp})`
                              : ''
                          }
                          onFocus={() => {
                            setBuscaDoutorConv('');
                            setDropdownDoutorAberto(true);
                          }}
                          onChange={(e) => {
                            setBuscaDoutorConv(e.target.value);
                            setDropdownDoutorAberto(true);
                          }}
                          className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-[#002172]"
                        />
                        {dropdownDoutorAberto && (
                          <button
                            type="button"
                            onClick={() => setDropdownDoutorAberto(false)}
                            className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown de Opções Filtradas em Tempo Real */}
                      {dropdownDoutorAberto && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto p-1 space-y-1">
                          {prestadoresFiltrados.length > 0 ? (
                            prestadoresFiltrados.map((p) => {
                              const isSel = p.id === prestadorIdConv;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setPrestadorIdConv(p.id);
                                    setDropdownDoutorAberto(false);
                                    setBuscaDoutorConv('');
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                    isSel
                                      ? 'bg-[#002172] text-white shadow-2xs'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-extrabold">{p.nome.toUpperCase()}</div>
                                    <div className={`text-[10px] font-medium ${isSel ? 'text-blue-200' : 'text-slate-400'}`}>
                                      {p.especialidade} • {p.orgaoClasse || 'CRP'}: {p.crmOuCrp}
                                    </div>
                                  </div>
                                  {isSel && <Check className="w-4 h-4 text-[#91CA0C] shrink-0" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">
                              Nenhum Doutor Mefisa encontrado para "{buscaDoutorConv}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 block font-medium">
                      Incluso na observação quando &ge; 2 sessões/semana
                    </span>
                  </div>
                </div>

                {/* Opção Especial: Guia Atrasada */}
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${guiaAtrasadaConv ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-950 dark:text-amber-100">
                          Guia Atrasada
                        </span>
                        {guiaAtrasadaConv && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-600 text-white">
                            Ativada (1 em 1 dia)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-amber-800/90 dark:text-amber-300 font-medium">
                        Partindo do Dia da Autorização, pula de 1 em 1 dia (pula domingos e alerta feriados em amarelo) até completar as {qtdSessoesConv} sessões.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setGuiaAtrasadaConv(!guiaAtrasadaConv);
                      setDatasCustomizadasConv({});
                      setProximaAutCustomizadaConv('');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                      guiaAtrasadaConv
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs hover:bg-amber-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {guiaAtrasadaConv ? '✓ Guia Atrasada Ativada' : 'Ativar Guia Atrasada'}
                  </button>
                </div>
              </div>

              {/* Seção 2: Cronograma Calculado & Detector de Conflitos */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Cronograma Convencional Gerado ({duracaoSessaoConv})
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Primeira sessão iniciada na Data da Autorização. {duracaoSessaoConv === '30MIN' ? 'Pula 1 semana para cada sessão.' : 'Proporcional em 2 sessões por semana.'}
                    </p>
                  </div>

                  {cronogramaConv.totalConflitos > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>⚠️ {cronogramaConv.totalConflitos} Data(s) em Feriado/Domingo</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                      ✓ Sem conflitos de feriados/domingos
                    </span>
                  )}
                </div>

                {/* Grid das Sessões Convencionais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                  {cronogramaConv.sessoes.map((s) => (
                    <div
                      key={s.numero}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        s.temConflito
                          ? 'bg-amber-50/90 dark:bg-amber-950/80 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 shadow-amber-500/10 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Sessão #{s.numero}
                          </span>
                          {s.temConflito && (
                            <span className="text-[9px] font-extrabold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>ATENÇÃO</span>
                            </span>
                          )}
                        </div>

                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {s.dataBr}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {s.diaSemanaNome}
                        </div>

                        {s.temConflito && s.motivoConflito && (
                          <div className="mt-1.5 p-1.5 rounded-md bg-amber-100/90 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-[10px] text-amber-900 dark:text-amber-200 font-semibold">
                            ⚠️ {s.motivoConflito}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400">Alterar Data:</label>
                        <input
                          type="date"
                          value={s.dataIso}
                          onChange={(e) => {
                            if (e.target.value) {
                              setDatasCustomizadasConv((prev) => ({
                                ...prev,
                                [s.numero]: e.target.value,
                              }));
                            }
                          }}
                          className="w-full px-1.5 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-800 dark:text-white focus:outline-[#002172]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card Especial da Próxima Autorização Posterior */}
                <div className={`p-4 rounded-2xl border-2 transition-all mt-3 space-y-2.5 ${
                  cronogramaConv.proximaAutorizacao.temConflito
                    ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 shadow-md'
                    : 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Previsão do Portal do Convênio (Convencional)
                      </span>
                      <h4 className="font-bold text-sm flex items-center gap-2 flex-wrap">
                        <span>📅 Data da Próxima Autorização Posterior:</span>
                        <strong className="font-mono text-base font-extrabold text-[#002172] dark:text-blue-200">
                          {cronogramaConv.proximaAutorizacao.dataBr}
                        </strong>
                        <span className="text-xs font-normal">({cronogramaConv.proximaAutorizacao.diaSemanaNome})</span>
                      </h4>
                    </div>

                    {cronogramaConv.proximaAutorizacao.temConflito && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-200 text-amber-950 border border-amber-400 flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Cai em Domingo/Feriado — Altere abaixo</span>
                      </span>
                    )}
                  </div>

                  {cronogramaConv.proximaAutorizacao.temConflito && cronogramaConv.proximaAutorizacao.motivoConflito && (
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-xs font-semibold text-amber-900 dark:text-amber-200">
                      ⚠️ {cronogramaConv.proximaAutorizacao.motivoConflito}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      Alterar Data da Próxima Autorização:
                    </label>
                    <input
                      type="date"
                      value={cronogramaConv.proximaAutorizacao.dataIso}
                      onChange={(e) => setProximaAutCustomizadaConv(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-slate-900 dark:text-white"
                    />
                    {proximaAutCustomizadaConv && (
                      <button
                        type="button"
                        onClick={() => setProximaAutCustomizadaConv('')}
                        className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                      >
                        Restaurar Data Padrão
                      </button>
                    )}
                  </div>
                </div>

                {/* Observação Técnica quando houver 2 ou mais sessões na mesma semana */}
                {temMultiplasSessoesNaSemana && (
                  <div className="p-3.5 bg-blue-50/90 dark:bg-blue-950/60 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#002172] dark:text-blue-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#002172] dark:text-blue-400" />
                        Observação Técnica Exigida para Convênio (&ge; 2 sessões/semana)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(observacaoTecnicaTexto);
                          setCopiedResumoConv(true);
                          setTimeout(() => setCopiedResumoConv(false), 2000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#002172] text-white text-[11px] font-bold hover:bg-[#001752] transition-colors cursor-pointer"
                      >
                        {copiedResumoConv ? (
                          <>
                            <Check className="w-3 h-3 text-[#91CA0C]" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar Observação</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-mono font-semibold text-slate-800 dark:text-slate-100 border border-blue-100 dark:border-blue-900 leading-relaxed select-all">
                      {observacaoTecnicaTexto}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border dark:border-slate-700 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#002172] hover:bg-[#001752] text-white flex items-center gap-2 shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-[#91CA0C]" />
            <span>Confirmar e Registrar ({quantidadeEfetiva} sessões alinhadas)</span>
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE ANOMALIA (PROTEÇÃO CONTRA ERRO DE DIGITAÇÃO) */}
      {modalAnomaliaAberto && sessaoSendoRemarcada && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-red-500 dark:border-red-900 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-['Quicksand'] font-bold text-base text-red-950 dark:text-red-200">
                  ⚠️ REMARCAÇÃO FORA DO INTERVALO ESPERADO
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                  Possível anomalia ou erro de digitação detectado pelo sistema
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/60 text-xs text-red-950 dark:text-red-200 space-y-2">
              <p>
                A nova data está aproximadamente <strong>{diasDiferencaAnomalia} dias</strong> após a data original ({formatarDataBr(sessaoSendoRemarcada.dataOriginal, showMonthInitials)} &rarr; {formatarDataBr(novaDataInput, showMonthInitials)}).
              </p>
              <p className="font-bold">
                Isso pode indicar um erro de digitação. Deseja realmente confirmar?
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-700 dark:text-slate-200 font-bold">
                Justificativa / Razão Obrigatória da Confirmação:
              </label>
              <textarea
                rows={3}
                placeholder="Informe o motivo para a liberação da remarcação anormal (ex: afastamento médico do paciente, viagem ao exterior com atestado)..."
                value={justificativaAnomalia}
                onChange={(e) => setJustificativaAnomalia(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-[#002172]"
              />
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 space-y-1 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                Despacho Imediato de Notificação:
              </div>
              <p>
                A confirmação registrará o evento na auditoria e enviará notificação formal instantânea para o <strong>ADM CHEFE</strong> e para a <strong>CEO</strong> com os dados completos do paciente, datas, usuário e motivo.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAnomaliaAberto(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border dark:border-slate-700"
              >
                [CANCELAR]
              </button>

              <button
                onClick={handleConfirmarAnomaliaComGestao}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-xs"
              >
                [CONFIRMAR REMARCAÇÃO]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
