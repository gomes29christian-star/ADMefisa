export interface CboOption {
  codigo: string;
  descricao: string;
  label: string;
}

export const LISTA_CBOS_OPCOES: CboOption[] = [
  { codigo: '225125', descricao: 'MEDICO CLINICO', label: '225125 - MEDICO CLINICO' },
  { codigo: '225124', descricao: 'MEDICO PEDIATRA', label: '225124 - MEDICO PEDIATRA' },
  { codigo: '225112', descricao: 'MEDICO NEUROLOGISTA', label: '225112 - MEDICO NEUROLOGISTA' },
  { codigo: '225133', descricao: 'MEDICO PSIQUIATRA', label: '225133 - MEDICO PSIQUIATRA' },
  { codigo: '225260', descricao: 'MEDICO NEUROCIRURGIAO', label: '225260 - MEDICO NEUROCIRURGIAO' },
  { codigo: '225285', descricao: 'MEDICO UROLOGISTA', label: '225285 - MEDICO UROLOGISTA' },
  { codigo: '225130', descricao: 'MEDICO DE FAMILIA E COMUNIDADE', label: '225130 - MEDICO DE FAMILIA E COMUNIDADE' },
  { codigo: '225135', descricao: 'MEDICO DERMATOLOGISTA', label: '225135 - MEDICO DERMATOLOGISTA' },
  { codigo: '225120', descricao: 'MEDICO CARDIOLOGISTA', label: '225120 - MEDICO CARDIOLOGISTA' },
  { codigo: '225155', descricao: 'MEDICO ENDOCRINOLOGISTA E METABOLOGISTA', label: '225155 - MEDICO ENDOCRINOLOGISTA E METABOLOGISTA' },
  { codigo: '225170', descricao: 'MEDICO GENERALISTA', label: '225170 - MEDICO GENERALISTA' },
  { codigo: '225195', descricao: 'MEDICO HOMEOPATA', label: '225195 - MEDICO HOMEOPATA' },
  { codigo: '225225', descricao: 'MEDICO CIRURGIAO GERAL', label: '225225 - MEDICO CIRURGIAO GERAL' },
  { codigo: '225275', descricao: 'MEDICO OTORRINOLARINGOLOGISTA', label: '225275 - MEDICO OTORRINOLARINGOLOGISTA' },
  { codigo: '225151', descricao: 'MEDICO ANESTESIOLOGISTA', label: '225151 - MEDICO ANESTESIOLOGISTA' },
  { codigo: '225220', descricao: 'MEDICO CIRURGIAO DO APARELHO DIGESTIVO', label: '225220 - MEDICO CIRURGIAO DO APARELHO DIGESTIVO' },
  { codigo: '251510', descricao: 'PSICOLOGO CLINICO', label: '251510 - PSICOLOGO CLINICO' },
  { codigo: '223810', descricao: 'FONOAUDIOLOGO', label: '223810 - FONOAUDIOLOGO' },
  { codigo: '223605', descricao: 'FISIOTERAPEUTA GERAL', label: '223605 - FISIOTERAPEUTA GERAL' },
  { codigo: '223905', descricao: 'TERAPEUTA OCUPACIONAL', label: '223905 - TERAPEUTA OCUPACIONAL' },
  { codigo: '226305', descricao: 'MUSICOTERAPEUTA', label: '226305 - MUSICOTERAPEUTA' },
  { codigo: '223710', descricao: 'NUTRICIONISTA', label: '223710 - NUTRICIONISTA' },
];

export const obterDescricaoCbo = (codigo?: string): string => {
  if (!codigo) return 'Não informado';
  const codLimpo = codigo.replace(/\D/g, '');
  const item = LISTA_CBOS_OPCOES.find(c => c.codigo === codLimpo || c.codigo === codigo);
  if (item) return item.label;
  return `CBO ${codigo}`;
};
