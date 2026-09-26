/**
 * Testes Unitários de Segurança — Gestão de Usuários Deletados e Bloqueio de Senhas Revogadas
 */

import { describe, it, expect } from 'vitest';
import {
  carregarUsuariosIniciais,
  salvarUsuarioDeletado,
  verificarSenhaUsuarioDeletado,
  notificarAdmsTentativaAcessoDeletado,
  carregarNotificacoesAdmAcessoDeletado,
  marcarNotificacaoComoLida,
  limparNotificacoesAdmAcessoDeletado,
  UsuarioDeletado,
} from './userService';
import { Usuario } from '../types/clinic';

interface TestResult {
  nome: string;
  passou: boolean;
  detalhe?: string;
}

const resultados: TestResult[] = [];

function assert(condicao: boolean, nome: string, detalheFalha?: string) {
  if (condicao) {
    resultados.push({ nome, passou: true });
    console.log(`  ✓ [PASSOU] ${nome}`);
  } else {
    resultados.push({ nome, passou: false, detalhe: detalheFalha || 'Afirmação retornou falsa' });
    console.error(`  ✗ [FALHOU] ${nome} — ${detalheFalha}`);
  }
}

describe('Testes de Segurança de Usuários', () => {
  it('deve executar e validar testes de usuários deletados', () => {
    console.log('\n======================================================');
    console.log('CLÍNICA MEFISA — TESTES UNITÁRIOS DE SEGURANÇA (USUÁRIOS DELETADOS)');
    console.log('======================================================\n');

// 1. Teste de Senhas Pré-cadastradas de Usuários Deletados
const usuarioDeletadoConhecido = verificarSenhaUsuarioDeletado('mefisa_sys_secure_key_REVOKED_DELETED_USER_ROBERTO_SILVEIRA_901_OLD_SECRET_PASS');
assert(
  usuarioDeletadoConhecido !== null && usuarioDeletadoConhecido.email === 'roberto.ex@clinicamefisa.com.br',
  '1.1 Deve identificar corretamente a senha de um usuário previamente deletado'
);

// 2. Teste de Exclusão de Usuário Ativo e Revogação da Senha
const usuarioAtivoSimulado: Usuario = {
  id: 'usr-test-delete-999',
  nome: 'Lucas Silveira Teste',
  email: 'lucas.teste@clinicamefisa.com.br',
  papel: 'GESTOR',
  departamento: 'Auditoria Externa',
  systemPassword: 'mefisa_sys_secure_key_LUCAS_TEST_SECRET_PASS_999',
  ativo: true,
  avatar: 'LS',
  ultimoAcesso: 'Hoje',
};

const deletadoSalvo = salvarUsuarioDeletado(usuarioAtivoSimulado, 'Christian (ADM)');
assert(
  deletadoSalvo.id === 'usr-test-delete-999' && deletadoSalvo.deletedBy === 'Christian (ADM)',
  '2.1 Deve registrar o usuário ativo na lista de usuários deletados com autor da exclusão'
);

const verificacaoPosDelecao = verificarSenhaUsuarioDeletado('mefisa_sys_secure_key_LUCAS_TEST_SECRET_PASS_999');
assert(
  verificacaoPosDelecao !== null && verificacaoPosDelecao.nome === 'Lucas Silveira Teste',
  '2.2 A senha do usuário recém-deletado deve ser reconhecida para bloqueio de acesso'
);

// 3. Teste de Disparo de Notificação para os ADMs
limparNotificacoesAdmAcessoDeletado();
const notificacaoGerada = notificarAdmsTentativaAcessoDeletado(deletadoSalvo);
assert(
  notificacaoGerada.usuarioDeletadoNome === 'Lucas Silveira Teste' && !notificacaoGerada.lida,
  '3.1 Deve gerar notificação não lida para os ADMs com dados do usuário deletado'
);

const notificacoesAdm = carregarNotificacoesAdmAcessoDeletado();
assert(
  notificacoesAdm.length === 1 && notificacoesAdm[0].usuarioDeletadoEmail === 'lucas.teste@clinicamefisa.com.br',
  '3.2 A notificação deve ser persistida para visualização no painel dos ADMs'
);

// 4. Teste de Marcação como Lida e Limpeza
marcarNotificacaoComoLida(notificacaoGerada.id);
const notificacoesAtualizadas = carregarNotificacoesAdmAcessoDeletado();
assert(
  notificacoesAtualizadas[0].lida === true,
  '4.1 Deve atualizar o status da notificação para LIDA'
);

limparNotificacoesAdmAcessoDeletado();
assert(
  carregarNotificacoesAdmAcessoDeletado().length === 0,
  '4.2 Deve limpar as notificações de segurança dos ADMs'
);

    console.log('\n======================================================');
    const total = resultados.length;
    const passaram = resultados.filter((r) => r.passou).length;
    console.log(`TOTAL DE TESTES DE SEGURANÇA: ${total} | PASSARAM: ${passaram} | FALHARAM: ${total - passaram}`);
    if (passaram === total) {
      console.log('🎉 TODOS OS TESTES DE SEGURANÇA PASSARAM COM SUCESSO!');
    }
    console.log('======================================================\n');
    expect(passaram).toBe(total);
  });
});
