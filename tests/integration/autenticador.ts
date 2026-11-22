import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
} from 'node:crypto';

/**
 * Autenticador WebAuthn de software para os testes da tarefa 167. Gera um
 * par de chaves P-256 de verdade, monta o attestationObject ("none") em
 * CBOR e assina as asserções como um aparelho faria. Não é mock: a
 * verificação no servidor é a real do SimpleWebAuthn.
 */

const b64url = (dados: Uint8Array) => Buffer.from(dados).toString('base64url');
const sha256 = (dados: Uint8Array | string) =>
  createHash('sha256').update(dados).digest();

// --- CBOR mínimo (inteiros, bytes, texto e mapas) -------------------------
function cabecalho(tipo: number, valor: number) {
  if (valor < 24) return Buffer.from([(tipo << 5) | valor]);
  if (valor < 0x100) return Buffer.from([(tipo << 5) | 24, valor]);
  if (valor < 0x10000) {
    const b = Buffer.alloc(3);
    b[0] = (tipo << 5) | 25;
    b.writeUInt16BE(valor, 1);
    return b;
  }
  const b = Buffer.alloc(5);
  b[0] = (tipo << 5) | 26;
  b.writeUInt32BE(valor, 1);
  return b;
}

type Cbor = number | string | Uint8Array | Map<Cbor, Cbor>;

function cbor(valor: Cbor): Buffer {
  if (typeof valor === 'number')
    return valor >= 0 ? cabecalho(0, valor) : cabecalho(1, -1 - valor);
  if (typeof valor === 'string') {
    const texto = Buffer.from(valor, 'utf8');
    return Buffer.concat([cabecalho(3, texto.length), texto]);
  }
  if (valor instanceof Uint8Array)
    return Buffer.concat([cabecalho(2, valor.length), Buffer.from(valor)]);
  const partes = [cabecalho(5, valor.size)];
  for (const [chave, item] of valor) partes.push(cbor(chave), cbor(item));
  return Buffer.concat(partes);
}

// Flags do authenticatorData.
const UP = 0x01;
const UV = 0x04;
const AT = 0x40;

export interface Autenticador {
  credencialId: Buffer;
  chavePrivada: KeyObject;
  contador: number;
  usuario: Buffer | null;
}

export function novoAutenticador(): Autenticador {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    credencialId: randomBytes(32),
    chavePrivada: privateKey,
    contador: 0,
    usuario: null,
  };
}

function chavePublicaCose(a: Autenticador) {
  const jwk = a.chavePrivada.export({ format: 'jwk' });
  return cbor(
    new Map<Cbor, Cbor>([
      [1, 2], // kty: EC2
      [3, -7], // alg: ES256
      [-1, 1], // crv: P-256
      [-2, Buffer.from(jwk.x!, 'base64url')],
      [-3, Buffer.from(jwk.y!, 'base64url')],
    ])
  );
}

function contador(valor: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(valor);
  return b;
}

/** Resposta de navigator.credentials.create() para as opções recebidas. */
export function registrar(
  a: Autenticador,
  opcoes: { challenge: string; rp: { id?: string }; user: { id: string } },
  origem: string,
  { verificarUsuario = true }: { verificarUsuario?: boolean } = {}
) {
  a.usuario = Buffer.from(opcoes.user.id, 'base64url');
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: 'webauthn.create',
      challenge: opcoes.challenge,
      origin: origem,
      crossOrigin: false,
    })
  );
  const comprimento = Buffer.alloc(2);
  comprimento.writeUInt16BE(a.credencialId.length);
  const authData = Buffer.concat([
    sha256(opcoes.rp.id!),
    Buffer.from([UP | AT | (verificarUsuario ? UV : 0)]),
    contador(a.contador),
    Buffer.alloc(16), // AAGUID zerado: autenticador sem atestação
    comprimento,
    a.credencialId,
    chavePublicaCose(a),
  ]);
  const attestationObject = cbor(
    new Map<Cbor, Cbor>([
      ['fmt', 'none'],
      ['attStmt', new Map()],
      ['authData', authData],
    ])
  );
  return {
    id: b64url(a.credencialId),
    rawId: b64url(a.credencialId),
    type: 'public-key',
    response: {
      clientDataJSON: b64url(clientDataJSON),
      attestationObject: b64url(attestationObject),
      transports: ['internal'],
    },
    clientExtensionResults: {},
  };
}

/** Resposta de navigator.credentials.get() assinada com a chave privada. */
export function assinar(
  a: Autenticador,
  opcoes: { challenge: string; rpId?: string },
  origem: string,
  { contadorForcado }: { contadorForcado?: number } = {}
) {
  a.contador = contadorForcado ?? a.contador + 1;
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: 'webauthn.get',
      challenge: opcoes.challenge,
      origin: origem,
      crossOrigin: false,
    })
  );
  const authenticatorData = Buffer.concat([
    sha256(opcoes.rpId!),
    Buffer.from([UP | UV]),
    contador(a.contador),
  ]);
  const assinatura = sign(
    'sha256',
    Buffer.concat([authenticatorData, sha256(clientDataJSON)]),
    a.chavePrivada
  );
  return {
    id: b64url(a.credencialId),
    rawId: b64url(a.credencialId),
    type: 'public-key',
    response: {
      clientDataJSON: b64url(clientDataJSON),
      authenticatorData: b64url(authenticatorData),
      signature: b64url(assinatura),
      userHandle: a.usuario ? b64url(a.usuario) : undefined,
    },
    clientExtensionResults: {},
  };
}
