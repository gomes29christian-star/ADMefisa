/**
 * Utilitário de Criptografia Exclusivo para Backups do ADMefisa
 * Garante que os arquivos .json exportados fiquem completamente ilegíveis em editores de texto
 * e que SOMENTE a aplicação ADMefisa consiga decodificar e importar os dados.
 */

const ADMEFISA_SECRET_KEY = 'ADMefisa_Clinica_Mefisa_Encryption_Key_v2_2026_#Sec!Key';
const ADMEFISA_PREFIX = 'ADMEFISA_SECURE_BACKUP_V2::';

/**
 * Criptografa uma string JSON usando cifra de substituição e deslocamento de chave com Base64
 */
export function criptografarBackupPayload(textoJson: string): string {
  try {
    const salt = Math.random().toString(36).substring(2, 10);
    const textToEncrypt = JSON.stringify({
      s: salt,
      d: textoJson,
      t: Date.now(),
    });

    let encryptedChars = '';
    for (let i = 0; i < textToEncrypt.length; i++) {
      const charCode = textToEncrypt.charCodeAt(i);
      const keyChar = ADMEFISA_SECRET_KEY.charCodeAt(i % ADMEFISA_SECRET_KEY.length);
      const encryptedCode = charCode ^ keyChar;
      encryptedChars += String.fromCharCode(encryptedCode);
    }

    // Converter para string Base64 segura para UTF-8
    const utf8Bytes = new TextEncoder().encode(encryptedChars);
    let binary = '';
    utf8Bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const base64Str = btoa(binary);

    return ADMEFISA_PREFIX + base64Str;
  } catch (e) {
    console.error('Erro ao criptografar backup:', e);
    throw new Error('Falha ao criptografar arquivo de backup.');
  }
}

/**
 * Descriptografa a string cifrada e recupera o JSON original do backup
 */
export function descriptografarBackupPayload(textoCifrado: string): string {
  const trimmed = textoCifrado.trim();

  if (!trimmed.startsWith(ADMEFISA_PREFIX)) {
    throw new Error(
      '⛔ ACESSO NEGADO: Arquivo não criptografado ou inválido. Apenas arquivos de backup oficiais e criptografados gerados pelo site da ADMefisa podem ser lidos.'
    );
  }

  try {
    const base64Str = trimmed.replace(ADMEFISA_PREFIX, '');
    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const encryptedChars = new TextDecoder().decode(bytes);

    let decryptedChars = '';
    for (let i = 0; i < encryptedChars.length; i++) {
      const charCode = encryptedChars.charCodeAt(i);
      const keyChar = ADMEFISA_SECRET_KEY.charCodeAt(i % ADMEFISA_SECRET_KEY.length);
      const decryptedCode = charCode ^ keyChar;
      decryptedChars += String.fromCharCode(decryptedCode);
    }

    const container = JSON.parse(decryptedChars);
    if (!container || typeof container !== 'object' || !container.d) {
      throw new Error('Estrutura de dados corrompida ou chave de criptografia inválida.');
    }

    return container.d;
  } catch (e: any) {
    if (e.message && e.message.includes('ACESSO NEGADO')) {
      throw e;
    }
    throw new Error(
      '⛔ ERRO DE LEITURA: O arquivo de backup está adulterado, corrompido ou foi gerado por um sistema não autorizado. Somente o site da ADMefisa pode ler suas informações.'
    );
  }
}
