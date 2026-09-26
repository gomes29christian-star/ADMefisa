export interface DeletedRecord {
  id: string;
  tipo: 'paciente' | 'autorizacao' | 'faturamento';
  titulo: string;
  subtitulo: string;
  detalhes: string;
  dataExclusao: string; // ISO date format spanning the past year
  deletadoPor: string;
  dadosOriginais: any;
}

const STORAGE_KEY_DELETED = 'clinica_mefisa_deleted_records_v1';

// Gerar mock inicial de registros deletados ao longo do último ano (últimos 12 meses)
const gerarRegistrosDeletadosIniciais = (): DeletedRecord[] => {
  const agora = new Date();
  const subtrairDias = (dias: number) => {
    const d = new Date(agora.getTime());
    d.setDate(d.getDate() - dias);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'del-pat-101',
      tipo: 'paciente',
      titulo: 'Carlos Eduardo Silveira',
      subtitulo: 'CPF: 321.456.789-10 • CNS: 700102938475641',
      detalhes: 'Convênio: Unimed Ferraz • Deletado por: Dr. Ricardo (ADM)',
      dataExclusao: subtrairDias(45), // há 45 dias
      deletadoPor: 'Dr. Ricardo (ADM)',
      dadosOriginais: {
        id: 'pac-rest-101',
        nome: 'Carlos Eduardo Silveira',
        cpf: '321.456.789-10',
        cns: '700102938475641',
        convenio: 'Unimed Ferraz',
        idade: 42,
        telefone: '(11) 98765-4321',
        status: 'Inativo'
      }
    },
    {
      id: 'del-aut-202',
      tipo: 'autorizacao',
      titulo: 'Guia #AUT-2026-889 — Ressonância Magnética de Crânio',
      subtitulo: 'Paciente: Maria de Lourdes Oliveira',
      detalhes: 'Valor: R$ 1.250,00 • Deletado por: Dra. Ana (Gestora)',
      dataExclusao: subtrairDias(120), // há 4 meses
      deletadoPor: 'Dra. Ana (Gestora)',
      dadosOriginais: {
        id: 'aut-rest-202',
        codigo: 'AUT-2026-889',
        paciente: 'Maria de Lourdes Oliveira',
        procedimento: 'Ressonância Magnética de Crânio',
        valor: 1250.00,
        status: 'Cancelada',
        data: subtrairDias(125)
      }
    },
    {
      id: 'del-fat-303',
      tipo: 'faturamento',
      titulo: 'Lote de Faturamento #FAT-2025-042',
      subtitulo: 'Competência: Novembro/2025 • 34 Guias',
      detalhes: 'Valor Total: R$ 48.900,00 • Deletado por: Carlos (ADM)',
      dataExclusao: subtrairDias(310), // há 10 meses (ano passado)
      deletadoPor: 'Carlos (ADM)',
      dadosOriginais: {
        id: 'fat-rest-303',
        codigo: 'FAT-2025-042',
        competencia: 'Novembro/2025',
        totalGuias: 34,
        valorTotal: 48900.00,
        status: 'Estornado/Deletado'
      }
    },
    {
      id: 'del-pat-104',
      tipo: 'paciente',
      titulo: 'Juliana Mendes de Souza',
      subtitulo: 'CPF: 112.233.445-56 • CNS: 788990011223344',
      detalhes: 'Convênio: Bradesco Saúde • Deletado por: Christian (ADM)',
      dataExclusao: subtrairDias(15), // há 15 dias
      deletadoPor: 'Christian (ADM)',
      dadosOriginais: {
        id: 'pac-rest-104',
        nome: 'Juliana Mendes de Souza',
        cpf: '112.233.445-56',
        cns: '788990011223344',
        convenio: 'Bradesco Saúde',
        idade: 29,
        telefone: '(11) 91234-5678',
        status: 'Inativo'
      }
    },
    {
      id: 'del-aut-205',
      tipo: 'autorizacao',
      titulo: 'Guia #AUT-2025-512 — Tomografia Computadorizada de Tórax',
      subtitulo: 'Paciente: Roberto Carlos Dias',
      detalhes: 'Valor: R$ 850,00 • Deletado por: Marcos (ADM)',
      dataExclusao: subtrairDias(250), // há ~8 meses
      deletadoPor: 'Marcos (ADM)',
      dadosOriginais: {
        id: 'aut-rest-205',
        codigo: 'AUT-2025-512',
        paciente: 'Roberto Carlos Dias',
        procedimento: 'Tomografia Computadorizada de Tórax',
        valor: 850.00,
        status: 'Cancelada',
        data: subtrairDias(255)
      }
    }
  ];
};

export const DeletedRecordsService = {
  obterRegistrosDeletados: (): DeletedRecord[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    const iniciais = gerarRegistrosDeletadosIniciais();
    try {
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(iniciais));
    } catch (e) {}
    return iniciais;
  },

  salvarRegistrosDeletados: (registros: DeletedRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(registros));
    } catch (e) {
      console.error(e);
    }
  },

  adicionarRegistroDeletado: (registro: Omit<DeletedRecord, 'id' | 'dataExclusao'>) => {
    const atual = DeletedRecordsService.obterRegistrosDeletados();
    const novo: DeletedRecord = {
      ...registro,
      id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataExclusao: new Date().toISOString().split('T')[0],
    };
    const atualizado = [novo, ...atual];
    DeletedRecordsService.salvarRegistrosDeletados(atualizado);
    return atualizado;
  },

  removerRegistroDaLixeira: (id: string): DeletedRecord | null => {
    const atual = DeletedRecordsService.obterRegistrosDeletados();
    const item = atual.find((r) => r.id === id);
    if (!item) return null;
    const filtrado = atual.filter((r) => r.id !== id);
    DeletedRecordsService.salvarRegistrosDeletados(filtrado);
    return item;
  }
};
