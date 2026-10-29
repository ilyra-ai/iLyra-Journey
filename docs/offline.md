# Registros sem internet

A entrada é **Sem internet**, na seção Pessoal, e a página pública `/offline`.
A preparação precisa de HTTPS (localhost também é aceito), sessão real, cadastro
concluído, armazenamento IndexedDB, Web Crypto e service worker. É necessário
executar `pnpm build`: o build gera `public/offline-assets.json`, que não vai ao Git.
O build e a pasta `public` devem ser publicados juntos.

## Preparação e uso

1. Conectada à conta original, a pessoa escolhe check-in, reflexão ou ambos.
   Nenhuma categoria vem marcada. O servidor copia apenas as categorias escolhidas
   e disponíveis no plano. As datas são as mesmas permitidas nos registros online.
2. A pessoa cria e confirma uma frase local de pelo menos 12 caracteres e autoriza
   explicitamente a cópia neste dispositivo. A frase nunca vai ao servidor.
3. A página pública e os arquivos estáticos do build são baixados. Nenhuma resposta
   de API ou página privada é armazenada no CacheStorage pelo service worker.
4. Com ou sem rede, a frase abre o cofre. Apenas os dados preparados estão
   disponíveis. O check-in aceita as mesmas 15 métricas e limites do formulário
   online; campos vazios preservam as métricas existentes. A reflexão mantém três
   escalas e a nota completa de até 280 caracteres.
5. Salvar primeiro confirma a transação local criptografada. Uma indicação de
   armazenamento local não significa gravação no servidor. Há no máximo 32
   operações retidas; atingir o limite não descarta pendências.
6. Com rede e cofre aberto, a reconexão inicia conferência. Também há um botão de
   conferência manual. Fechado o navegador ou bloqueado o cofre, nenhum envio em
   segundo plano ocorre: a chave não fica disponível ao service worker.

## Proteção e ciclo de vida

O IndexedDB contém somente o envelope `id`, `versao`, `titularTag`, `salt`, `iv` e `cifra`. A etiqueta de titular é um hash SHA-256 do UUID com o salt aleatório, sem UUID legível, usado apenas para não apagar o cofre de outra conta na exclusão.
PBKDF2-HMAC-SHA256, 600.000 iterações e salt aleatório de 16 bytes derivam uma
chave AES-GCM de 256 bits não extraível. Cada gravação usa IV aleatório de 12 bytes
com autenticação do formato. A chave fica apenas na memória do cofre aberto.
Titular, nome, referências preparadas, permissão, métricas, notas e fila estão
cifrados. O limite do conteúdo cifrado é de 512.000 bytes. Não são gravados em
localStorage, URLs ou logs.

A versão do envelope é comparada dentro da mesma transação IndexedDB da escrita.
Uma alteração em outra aba bloqueia cofres abertos; uma gravação obsoleta é
recusada. Sair ou trocar de conta pelo aplicativo também bloqueia as abas. A
cópia cifrada permanece após logout, conforme consentimento, para não eliminar
rascunhos ainda não enviados. Uma frase esquecida ou conteúdo corrompido não é
recuperável pela Lyra. Limpar dados do navegador, perda do dispositivo ou remoção
pelo sistema podem apagar a cópia local. A preparação não é um backup remoto.

A remoção exige digitar REMOVER. Excluir a conta tenta remover também o cofre no
navegador atual, após confirmar a exclusão no servidor; uma falha local é avisada
separadamente. Outros dispositivos, especialmente desconectados, precisam ser
limpos manualmente. A exclusão da conta não promete apagar remotamente um aparelho
sem conexão. O cache público não contém dados pessoais e pode permanecer.

## Sincronização, conflitos e recibos

As APIs `/api/offline/contexto` e `/api/offline/sincronizar` exigem sessão real e
respondem sem cache. A permissão assinada do cofre dura 24 horas e usa chave e
público de destino distintos dos tokens de login. Não autentica ninguém. Antes
do envio, uma nova preparação confirma sessão e mesmo titular, renovando essa
permissão. Uma sessão inválida ou conta diferente impede a escrita. Plano, recurso
e janela atual de edição são revalidados; um rascunho vencido fica local com erro.

Cada operação possui UUID, data, conteúdo, instante local e hash da versão
preparada. Antes da primeira tentativa, seu identificador e conteúdo tornam-se
imutáveis. Perda de resposta é tratada como falta de confirmação: a retentativa
usa o mesmo pedido. Não há sobrescrita automática de conflito.

No MySQL, o recibo e o registro são escritos na mesma transação. A versão do dia
inclui o ID da linha e todos os campos editáveis daquela categoria. A comparação
usa bloqueio de linha. Se mudou desde a preparação, nada é aplicado e a versão
atual é devolvida para revisão. A pessoa pode manter o servidor ou criar um novo
pedido com seus campos locais, baseado explicitamente na versão apresentada.
Nova mudança pode gerar novo conflito. Metas e indicadores são recalculados após
confirmar o dado; falha nesses recálculos aparece separadamente, sem reaplicar o
registro. O recibo permite repetir os recálculos idempotentes.

A migração `053_recibos_offline.sql` mantém recibos sem notas ou métricas em texto.
O mesmo UUID e conteúdo devolvem a confirmação anterior; conteúdo diferente com
o mesmo UUID é recusado. Confirmar um recibo já aplicado não reescreve dados,
mesmo após vencer a janela original, mas ainda exige sessão e permissão válidas.
Recibos integram a exportação LGPD e são eliminados com a conta por FK cascade.
Rascunhos locais não enviados não existem no servidor nem na exportação remota.

Sem conexão não há chat em nuvem, interpretação por modelo, atualização de alertas
ou confirmação de sessão. O indicador do navegador não comprova acesso ao servidor;
a confirmação de cada pedido depende de resposta real da API.

## Referências oficiais consultadas

- [Next.js: Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
  e documentação correspondente instalada em `next/dist/docs`.
- [Web Crypto: deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey).
- [Service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
