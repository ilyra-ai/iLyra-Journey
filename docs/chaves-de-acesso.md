# Chaves de acesso (passkeys)

Tarefa 167. É uma forma **opcional** de entrar, com a biometria ou o PIN do próprio aparelho. E-mail e senha, Google e Apple continuam valendo.

## Para a pessoa

- **Criar:** Perfil → **Chaves de acesso** → "Criar uma chave de acesso". É preciso estar com a sessão aberta.
- **Entrar:** na tela de login, "Entrar com uma chave de acesso". O aparelho escolhe a chave sozinho, sem digitar e-mail. O botão só aparece em navegadores com WebAuthn.
- **Renomear ou revogar:** no mesmo cartão do Perfil. Uma chave revogada deixa de entrar na hora.
- **Perdeu o aparelho:** entre com e-mail e senha (ou Google/Apple) e revogue a chave dele. Cada conta pode ter até 10 chaves ativas.

## Implementação

- **Biblioteca:**
  - `@simplewebauthn/server` 14.1.0 e `@simplewebauthn/browser` 14.0.0, com versão fixa.
  - Serviço em `src/lib/auth/chaves/servico.ts`.
- **Banco (migração 083):**
  - `chaves_de_acesso`:
    - guarda só a chave pública e os metadados do padrão: contador, transportes, tipo de dispositivo, backup e AAGUID;
    - a chave privada e a biometria nunca saem do aparelho;
    - a unicidade é pelo SHA-256 do identificador da credencial.
  - `desafios_de_chave`:
    - cada desafio vale 5 minutos e serve para uma cerimônia só;
    - a primeira tentativa marca o desafio como usado, com ou sem sucesso, então repetir a resposta falha;
    - o desafio de registro fica preso à conta que o pediu.
- **Política:**
  - `residentKey: required` e `userVerification: required`;
  - atestação `none`;
  - a origem e o RP ID saem de `APP_BASE_URL`.
- **Login:**
  - confere a assinatura, o contador (se ele volta, pode ser clone da credencial) e a revogação;
  - lê no banco, na hora, o bloqueio da conta, o papel e a versão da sessão;
  - a sessão nasce igual à do login por senha, e a chave nunca eleva o papel.
- **Rotas:**
  - `POST /api/auth/chave/registro/opcoes` e `POST /api/auth/chave/registro`, só com sessão;
  - `POST /api/auth/chave/login/opcoes` e `POST /api/auth/chave/login`, limitados a 30 por 10 minutos por IP;
  - `GET /api/account/chaves`, `PATCH /api/account/chaves/[id]` e `DELETE /api/account/chaves/[id]`, só na própria conta.
- **Cookie do desafio:** `lyra_chave_de_acesso`, httpOnly, `SameSite=Strict`, caminho `/api/auth/chave`. Leva só o id do desafio.
- **LGPD:** a exportação traz nome, tipo, backup e datas de cada chave. A exclusão da conta apaga as chaves em cascata.

## Testes

`src/app/api/auth/chave.integration.test.ts` usa um autenticador de software (`tests/integration/autenticador.ts`). Ele tem um par P-256 real, monta o `attestationObject` em CBOR e assina as asserções, e a verificação no servidor é a real.

## Homologação

WebAuthn exige HTTPS fora de `localhost` e um aparelho com autenticador: Windows Hello, Touch ID/Face ID, Android ou chave física. A homologação no aparelho real fica com o titular.
