import React, { useState } from 'react';
import {
  X,
  Layers,
  Database,
  GitBranch,
  Shield,
  History,
  Cpu,
  Layout,
  Palette,
  Milestone,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ArchitectureDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocModal: React.FC<ArchitectureDocModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>('arquitetura');

  if (!isOpen) return null;

  const sections = [
    { id: 'arquitetura', label: '1. Arquitetura Geral', icon: Layers },
    { id: 'dados', label: '2. Modelo de Dados', icon: Database },
    { id: 'fluxo', label: '3. Fluxo de Trabalho', icon: GitBranch },
    { id: 'permissoes', label: '4. Permissões RBAC', icon: Shield },
    { id: 'auditoria', label: '5. Auditoria', icon: History },
    { id: 'regras', label: '6. Motor de Regras', icon: Cpu },
    { id: 'interface', label: '7. Arquitetura UI', icon: Layout },
    { id: 'design', label: '8. Design System', icon: Palette },
    { id: 'roadmap', label: '9. Roadmap V0-V10', icon: Milestone },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#002172] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#91CA0C]" />
            </div>
            <div>
              <h3 className="font-['Quicksand'] font-bold text-base text-white">
                Especificação e Arquitetura Técnica — Clínica Mefisa
              </h3>
              <p className="text-xs text-blue-100/80">
                Documentação estruturada da fundação V0 para transição das planilhas legadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0 text-xs">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveTab(sec.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white text-[#002172] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700 space-y-4 leading-relaxed">
          {activeTab === 'arquitetura' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                1. Arquitetura Geral do Sistema Mefisa
              </h4>
              <p>
                O sistema é estruturado em 4 camadas desacopladas com foco em segurança médica,
                auditoria imutável e isolamento de estado por usuário:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Frontend SPA (React + TypeScript)</span>
                  <p className="text-slate-600">
                    Interface ergonômica de alta densidade sem filtros globais compartilhados. O estado de busca,
                    ordenação e paginação reside na sessão local de cada funcionária.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Backend & API Gateway (Express / Node)</span>
                  <p className="text-slate-600">
                    Centraliza autenticação baseada em sessão/tokens, permissões RBAC e validação matemática de regras
                    antes de persistir qualquer dado.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Camada de Dados & Persistência</span>
                  <p className="text-slate-600">
                    Tabelas normalizadas: Pacientes e Prestadores são entidades independentes. Registros de autorização
                    apontam via chaves estrangeiras, evitando duplicação cadastral.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Log Append-Only de Auditoria</span>
                  <p className="text-slate-600">
                    Toda alteração dispara um registro imutável com autoria, carimbo de tempo, valor anterior, novo valor
                    e justificativa obrigatória.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dados' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                2. Modelo de Dados e Relacionamentos
              </h4>
              <p>
                Ao contrário das planilhas legadas onde cada linha continha cópia repetida de CRM, CBO e UF,
                o sistema Mefisa estabelece uma cadeia relacional centralizada:
              </p>
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto">
                {`PACIENTE (1) ────< AUTORIZACAO (1..N) ────< SESSOES (1..N)
    │                       │                       │
    ▼                       ▼                       ▼
PRESTADOR (1)           CONVÊNIO (1)            GUIA (1) ───< DIGITAÇÃO
    │                       │                       │
    └───────────────────────┴───────────────────────┴───> AUDITORIA (Append-Only)`}
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Prestadores:</strong> CBO, CRM/CRP/CREFITO, UF e pasta física são alterados em um único lugar.</li>
                <li><strong>Ajustes de Quantidade:</strong> Nunca sobrescrevem diretamente; geram registro de ajuste com justificativa.</li>
                <li><strong>Próxima Autorização:</strong> Dado estruturado com garantia de haver exatamente 1 sessão prévia.</li>
              </ul>
            </div>
          )}

          {activeTab === 'fluxo' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                3. Fluxo de Trabalho Estruturado
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <strong className="text-[#002172]">Etapa 1 — Solicitação & Cálculo de Autorização</strong>
                  <p className="text-slate-600 mt-0.5">
                    O sistema computa a quantidade de sessões com base na frequência semanal e semanas do período. Gera a
                    justificativa padrão para o portal SulAmérica/Unimed e verifica limite de 10 MB do arquivo.
                  </p>
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <strong className="text-amber-900">Etapa 2 — Agendamento Proporcional & Próxima Autorização</strong>
                  <p className="text-slate-600 mt-0.5">
                    Datas são distribuídas proporcionalmente de forma que reste exatamente 1 sessão antes da data de renovação.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <strong className="text-emerald-900">Etapa 3 — Rastreabilidade da Pasta e Digitação</strong>
                  <p className="text-slate-600 mt-0.5">
                    Colocação da guia na pasta da doutora responsável &rarr; colheita de assinatura &rarr; digitação no portal após a
                    última sessão realizada.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Pontos com [REGRA A CONFIRMAR]:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11.5px]">
                  <li>
                    <strong>[REGRA A CONFIRMAR 1 - Corte de Semanas]:</strong> Quando o mês vira no meio da semana (ex: quinta-feira),
                    a semana é faturada no mês que se encerra ou no mês seguinte?
                  </li>
                  <li>
                    <strong>[REGRA A CONFIRMAR 2 - Dias de Análise]:</strong> O alerta de &gt; 7 dias deve computar dias corridos ou
                    dias úteis das operadoras?
                  </li>
                  <li>
                    <strong>[REGRA A CONFIRMAR 3 - Sincronização Tivita]:</strong> A alimentação da Tivita no futuro será via CSV ou
                    manual guiada com checklist?
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                4. Matriz de Permissões RBAC
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="font-bold text-[#002172] block">Administrador Chefe</span>
                  <p className="text-slate-500 text-[11px]">
                    Acesso total: cadastramento de funcionários, alteração de regras do sistema, auditoria geral de todas
                    as alterações e desativação de contas.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="font-bold text-[#2A657E] block">Gestor Clínico / Coordenação</span>
                  <p className="text-slate-500 text-[11px]">
                    Supervisão de prazos de autorizações, resolução de pendências críticas, reatribuição de prestadores e
                    relatórios operacionais.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="font-bold text-slate-800 block">Funcionário Administrativo</span>
                  <p className="text-slate-500 text-[11px]">
                    Operação diária: solicitação de autorizações, acompanhamento de análises, registro de guias nas pastas e
                    digitação.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl">
                  <span className="font-bold text-slate-600 block">Visualização (Auditoria / Recepção)</span>
                  <p className="text-slate-500 text-[11px]">
                    Consulta de status de autorizações, guias e pacientes sem permissão de alteração de quantidades ou exclusão.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                5. Sistema de Auditoria Imutável
              </h4>
              <p>
                Ações que geram obrigatoriamente um registro no log de auditoria:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Alteração de quantidade autorizada de sessões (exige motivo).</li>
                <li>Mudança de prestador responsável ou doutora de atendimento.</li>
                <li>Recálculo ou prorrogação da data da próxima autorização.</li>
                <li>Conclusão de digitação de guia no portal.</li>
                <li>Registro de resposta de análise ou recusa de convênio.</li>
                <li>Exclusão ou arquivamento de registros.</li>
              </ul>
            </div>
          )}

          {activeTab === 'regras' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                6. Motor Central de Regras de Negócio
              </h4>
              <p>
                Todas as regras residem em <code>services/businessRules.ts</code> para garantir que cálculos nunca fiquem
                dispersos ou duplicados no código visual:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div><code>calcularSessoesPeriodo()</code>: sessões por semana × semanas do ciclo.</div>
                <div><code>calcularProximaAutorizacaoESessoes()</code>: garantia de 1 sessão prévia.</div>
                <div><code>calcularStatusAnalise()</code>: alerta quando ultrapassa 7 dias.</div>
              </div>
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                7. Arquitetura de Interface & Isolamento de Filtros
              </h4>
              <p>
                <strong>Princípio Fundamental:</strong> O estado de filtros e paginação é <em>estritamente individual por usuário</em>.
                Se a Funcionária Maria filtrar por "Minhas Pendências de Digitação", a tela da Dra. Camila permanece intacta em sua
                própria visão geral.
              </p>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                8. Design System Mefisa
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-xl bg-[#002172] text-white">
                  <div className="text-[10px] opacity-80">Primary</div>
                  <div className="font-bold font-mono">#002172</div>
                  <div className="text-[10px] mt-1">Azul Marinho Mefisa</div>
                </div>
                <div className="p-3 rounded-xl bg-[#2A657E] text-white">
                  <div className="text-[10px] opacity-80">Secondary</div>
                  <div className="font-bold font-mono">#2A657E</div>
                  <div className="text-[10px] mt-1">Slate Teal Blue</div>
                </div>
                <div className="p-3 rounded-xl bg-[#91CA0C] text-slate-900">
                  <div className="text-[10px] opacity-80">Tertiary</div>
                  <div className="font-bold font-mono">#91CA0C</div>
                  <div className="text-[10px] mt-1">Verde Lima Clínica</div>
                </div>
                <div className="p-3 rounded-xl bg-[#6B7A90] text-white">
                  <div className="text-[10px] opacity-80">Neutral</div>
                  <div className="font-bold font-mono">#6B7A90</div>
                  <div className="text-[10px] mt-1">Slate Muted</div>
                </div>
              </div>
              <p className="text-slate-600 mt-2">
                <strong>Tipografia:</strong> Quicksand (Headlines) · Nunito Sans (Corpo & Labels) · JetBrains Mono (Dados Numéricos Tabulares).
              </p>
            </div>
          )}

          {activeTab === 'roadmap' && (
            <div className="space-y-4">
              <h4 className="font-bold text-base text-[#002172] border-b pb-2 font-['Quicksand']">
                9. Roadmap de Desenvolvimento Estruturado
              </h4>
              <div className="space-y-1.5">
                {[
                  { v: 'V0', desc: 'Fundação Arquitetural, Design System e Central de Guias', status: 'Em Execução' },
                  { v: 'V1', desc: 'Módulo de Cadastro Completo de Pacientes e Responsáveis', status: 'Próxima Etapa' },
                  { v: 'V2', desc: 'Módulo Completo de Autorizações e Validador de Formulários', status: 'Planejado' },
                  { v: 'V3', desc: 'Distribuição e Cronograma Automático de Sessões', status: 'Planejado' },
                  { v: 'V4', desc: 'Digitação de Guias e Rastreamento das Pastas das Doutoras', status: 'Planejado' },
                  { v: 'V5', desc: 'Acompanhamento de Análises com Alertas > 7 Dias', status: 'Planejado' },
                  { v: 'V6', desc: 'Dashboard Operacional e Métricas em Tempo Real', status: 'Planejado' },
                  { v: 'V7', desc: 'Auditoria Append-Only e Exportação de Relatórios', status: 'Planejado' },
                  { v: 'V8', desc: 'Gestão de Usuários e Controle de Acesso RBAC', status: 'Planejado' },
                  { v: 'V9', desc: 'Integrações e Pré-formatação para Portais e Tivita', status: 'Planejado' },
                  { v: 'V10', desc: 'Homologação e Entrada em Produção', status: 'Planejado' },
                ].map((item) => (
                  <div key={item.v} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#002172] font-mono">{item.v}</span>
                      <span className="text-slate-700 font-medium">{item.desc}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'Em Execução' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#002172] hover:bg-[#001752] text-white transition-colors"
          >
            Entendido, Fechar Especificação
          </button>
        </div>
      </div>
    </div>
  );
};
