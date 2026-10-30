import type { Metadata } from 'next';
import Link from 'next/link';

import {
  DocumentoLegal,
  type SecaoDoDocumento,
} from '@/components/lgpd/DocumentoLegal';
import {
  ROTA_TERMOS_DE_USO,
  VERSAO_POLITICA_DE_PRIVACIDADE,
  emailDoEncarregado,
} from '@/lib/lgpd/documentos';

export const metadata: Metadata = {
  // O modelo do layout raiz acrescenta "| Lyra MetaCare".
  title: 'Política de privacidade',
  description:
    'Como a Lyra MetaCare trata dados pessoais e dados de saúde, com base na LGPD.',
};

// O canal do encarregado vem do ambiente (LGPD_CONTATO_EMAIL), lido a cada
// requisição.
export const dynamic = 'force-dynamic';

export default function PoliticaDePrivacidadePage() {
  const contato = emailDoEncarregado();

  const secoes: SecaoDoDocumento[] = [
    {
      id: 'quem-somos',
      titulo: 'Quem somos e a quem esta política se aplica',
      conteudo: (
        <>
          <p>
            A Lyra MetaCare é uma plataforma de bem-estar, longevidade e
            autoconhecimento. Ela combina dados fisiológicos, hábitos e contexto
            pessoal com motores de cálculo próprios, inteligência artificial e
            uma camada de sabedoria integrativa (astrologia moderna e tradição
            védica).{' '}
            <strong>
              A Lyra não é um serviço médico e nenhuma informação da plataforma
              substitui avaliação profissional de saúde.
            </strong>
          </p>
          <p>
            Esta política explica, conforme a Lei Geral de Proteção de Dados
            Pessoais (Lei 13.709/2018, LGPD), quais dados pessoais tratamos, por
            quê, com quem os compartilhamos, por quanto tempo os guardamos e
            como você exerce os seus direitos.
          </p>
        </>
      ),
    },
    {
      id: 'dados',
      titulo: 'Quais dados tratamos',
      conteudo: (
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, sobrenome, e-mail e senha. A senha
            é guardada só como hash (bcrypt) e nunca pode ser lida por ninguém.
          </li>
          <li>
            <strong>Perfil:</strong> data, hora e cidade de nascimento, cidade
            onde mora (com as coordenadas e o fuso da cidade), idade, gênero,
            nível de atividade, metas e foto.
          </li>
          <li>
            <strong>Coach diário:</strong> o &quot;Seu dia&quot; preparado todos
            os dias a partir do seu mapa védico, do céu da sua cidade e das suas
            métricas, a sua resposta a &quot;isso te ajudou?&quot;, a reflexão
            da noite, as sessões de respiração guiada, o link privado da agenda
            no calendário (guardado como resumo criptográfico e cifrado) e as
            notificações do sino, os lembretes pessoais, seus dias, horários,
            fuso, silêncio e adiamentos. Esses lembretes ficam na sua conta e
            não são enviados por e-mail ou push. Horários e recomendações são
            calculados nos motores da própria Lyra; a leitura védica do dia pode
            ser escrita pelo modelo de IA escolhido pela Lyra, só com dados
            astrológicos (veja &quot;Com quem compartilhamos&quot;).
          </li>
          <li>
            <strong>Dados de saúde e bem-estar (dados sensíveis):</strong>{' '}
            métricas diárias (passos, sono, frequência cardíaca, HRV,
            oxigenação, glicose, peso, pressão, entre outras), ciclo menstrual,
            avaliações de humor e bem-estar, hábitos, metas, planos gerados,
            agenda e profissionais cadastrados por você.
          </li>
          <li>
            <strong>Conversas e memória opcional:</strong> mensagens e respostas
            ficam no histórico da sua conta. Se você ativar a memória, relatos
            das suas mensagens também podem ser organizados em lembranças,
            relações e datas para personalizar outras conversas. Esses relatos
            podem conter dados sensíveis que você escrever; não representam
            diagnósticos ou confirmação independente. Mensagens enviadas no modo
            privado não entram na memória, inclusive em importações futuras.
          </li>
          <li>
            <strong>Assinatura e compras:</strong> plano, período e faturas e
            seus pagamentos, cancelamentos e reembolsos (valores, datas, estados
            e identificadores). As faturas pagas também guardam os dados do
            comprador informados no pagamento. Os dados do cartão são tratados
            pela Stripe e não chegam à Lyra.
          </li>
          <li>
            <strong>Registros de consentimento:</strong> qual documento você
            aceitou, a versão, a data e o navegador usado.
          </li>
          <li>
            <strong>Segurança:</strong> contadores de tentativas de login e de
            cadastro, guardados como resumo criptográfico (sem o e-mail ou o IP
            em texto).
          </li>
        </ul>
      ),
    },
    {
      id: 'finalidades',
      titulo: 'Para que usamos e com qual base legal',
      conteudo: (
        <ul>
          <li>
            <strong>Criar e manter a sua conta e o seu plano</strong> (execução
            de contrato, art. 7º, V).
          </li>
          <li>
            <strong>
              Calcular indicadores, gerar planos e orientações de bem-estar com
              os seus dados de saúde
            </strong>{' '}
            (consentimento específico e destacado, art. 11, I, pedido no
            primeiro acesso).
          </li>
          <li>
            <strong>Guardar os registros fiscais das compras</strong>{' '}
            (cumprimento de obrigação legal, art. 7º, II).
          </li>
          <li>
            <strong>Proteger a plataforma e as contas</strong> contra fraude e
            abuso (art. 7º, IX, e art. 11, II, g).
          </li>
        </ul>
      ),
    },
    {
      id: 'acesso',
      titulo: 'Quem acessa os seus dados',
      conteudo: (
        <>
          <p>
            <strong>
              Só você acessa os seus dados de saúde, o seu perfil sensível e o
              seu histórico de compras.
            </strong>{' '}
            Isso é garantido pela própria plataforma, e não só por regra
            interna: as contas de administração não conseguem ler, filtrar,
            alterar nem apagar esses dados.
          </p>
          <p>
            Os administradores veem apenas o necessário para gerir contas e
            planos: nome, e-mail, papel, status do primeiro acesso e plano. Eles
            também consultam os registros fiscais, porque a guarda desses
            documentos é uma obrigação legal da empresa.
          </p>
        </>
      ),
    },
    {
      id: 'compartilhamento',
      titulo: 'Com quem compartilhamos',
      conteudo: (
        <>
          <p>Não vendemos dados pessoais. Os únicos compartilhamentos são:</p>
          <ul>
            <li>
              <strong>Stripe</strong>, para processar pagamentos de planos pagos
              (nome, e-mail, dados de pagamento e plano escolhido).
            </li>
            <li>
              <strong>Google Gemini</strong>, somente quando você informa a sua
              própria chave de IA no chat e o modo privacidade está desligado: a
              sua pergunta e a análise local dos seus indicadores seguem para o
              Gemini para compor a resposta. Sem essa escolha, provedores em
              nuvem só recebem mensagens, lembranças e contexto pessoal quando
              você autoriza explicitamente o uso de nuvem nos controles de
              memória do chat. Essa autorização permite tanto gerar respostas
              quanto extrair lembranças com os provedores configurados pela
              plataforma. O padrão é local; os índices semânticos da memória são
              calculados localmente. O modo privado usa apenas o Motor Lyra e
              não consulta nem acrescenta lembranças.
            </li>
            <li>
              <strong>
                Provedor do modelo de IA escolhido pela Lyra, para a leitura
                védica do &quot;Seu dia&quot;
              </strong>{' '}
              (execução do serviço contratado, art. 7º, V): quando o modelo roda
              fora da infraestrutura da Lyra (por exemplo, um serviço em nuvem),
              seguem só dados astrológicos: os fatos do céu do dia, o seu mapa
              natal já calculado (signo do ascendente, signo e nakshatra da Lua,
              dasha, Tara e trânsitos) e os horários dos períodos do dia. Não
              seguem o seu nome, e-mail, data, hora ou cidade de nascimento,
              métricas, ciclo menstrual nem sinais do corpo. Com um modelo
              local, nada sai da Lyra.
            </li>
            <li>
              <strong>
                O app de calendário que você escolher, quando você assina a
                agenda védica
              </strong>{' '}
              (Google, Apple, Outlook ou outro): ele lê pelo link privado os
              horários das janelas do dia (hora do silêncio, horário mais forte
              do dia, pausa para começos e pôr do sol) e o nome da sua cidade.
              Nenhum dado de saúde vai no link. Você troca ou desativa o link
              quando quiser no &quot;Meu dia&quot;.
            </li>
            <li>
              <strong>Monitoramento de erros (Sentry)</strong>, quando
              configurado: só informações técnicas de falhas, sem dados de
              saúde.
            </li>
            <li>
              Autoridades, quando houver obrigação legal ou ordem judicial.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'retencao',
      titulo: 'Por quanto tempo guardamos',
      conteudo: (
        <>
          <p>
            Os seus dados ficam guardados enquanto a sua conta existir. Ao
            excluir a conta, os dados do perfil e de saúde são apagados
            imediatamente, junto com as fotos enviadas.
          </p>
          <p>
            Alterações manuais dos seus registros guardam os campos, valores
            anteriores e novos, data e autoria da própria conta. As versões
            ficam consultáveis por até 90 dias, dentro do histórico do plano; as
            vencidas são removidas ao gravar, consultar ou exportar esse
            histórico. Excluir o registro ou a conta elimina também suas
            versões. O recurso não recupera dados excluídos definitivamente nem
            envia os valores a um serviço externo para desfazer uma alteração.
          </p>
          <p>
            Acompanhamentos pessoais (nome, descrição, escalas, frequência,
            respostas e notas) pertencem à sua conta e são relatos pessoais, não
            medições clínicas. Mudar a escala guarda uma nova versão sem
            converter respostas anteriores. Arquivar preserva as respostas;
            excluir o acompanhamento remove todas as suas versões e respostas, e
            excluir a conta remove tudo. Eles entram na exportação dos seus
            dados e no relatório pessoal somente quando você os seleciona, e não
            são enviados a serviços externos.
          </p>
          <p>
            Anexos do chat são privados e vinculados à conversa. TXT UTF-8 e
            imagens estáticas PNG, JPEG e WebP podem ser guardados; imagens são
            convertidas em PNG sem metadados. Só os arquivos selecionados são
            enviados a modelos autorizados após sua confirmação em cada
            pergunta. Respostas podem guardar trechos citados. Excluir apenas o
            arquivo não apaga esses trechos: exclua também a conversa quando
            desejar removê-los. A exclusão da conta remove os anexos, e a
            exportação inclui seus arquivos em base64. Eles não entram no cache
            offline nem em leituras futuras sem nova seleção.
          </p>

          <p>
            O &quot;Seu dia&quot; do coach e as notificações do sino ficam
            guardados por 90 dias e são apagados automaticamente depois disso.
          </p>
          <p>
            Você pode pausar ou apagar a memória sem apagar as conversas. Ao
            apagar, ela deixa de participar das respostas imediatamente. Se o
            serviço estiver indisponível ou uma atualização ainda estiver
            terminando, mostramos a exclusão pendente até confirmar a remoção do
            grafo e dos relatos. A exclusão da conta também depende dessa
            confirmação; não informamos que os dados foram apagados antes disso.
            Um marcador técnico com o identificador da conta e a geração da
            memória, sem conversas ou perfil, é mantido por até 24 horas para
            impedir que requisições antigas reponham lembranças apagadas.
          </p>
          <p>
            <strong>Exceção: registros fiscais.</strong> As faturas pagas não
            são excluídas pela plataforma, porque a legislação tributária obriga
            a guarda dos comprovantes até a prescrição dos créditos tributários
            (Código Tributário Nacional, art. 195, parágrafo único). Na exclusão
            da conta, esses registros deixam de ter qualquer ligação com o seu
            perfil e com os seus dados de saúde.
          </p>
          <p>
            Também preservamos o histórico mínimo das operações financeiras para
            conferir cobranças, cancelamentos e reembolsos: identificadores do
            provedor, valores, estados e datas. Esses registros não contêm
            cartão, conteúdo de conversas ou dados de saúde. A autoria de uma
            operação deixa de apontar para a conta do administrador excluído.
          </p>
        </>
      ),
    },
    {
      id: 'direitos',
      titulo: 'Os seus direitos e como exercê-los',
      conteudo: (
        <>
          <p>
            Você tem os direitos do art. 18 da LGPD. Na página{' '}
            <strong>Perfil → Privacidade e dados</strong>, você pode, sem
            depender de ninguém:
          </p>
          <ul>
            <li>
              <strong>Acessar e levar os seus dados</strong> (portabilidade):
              baixe um arquivo com todos os seus dados.
            </li>
            <li>
              <strong>Corrigir</strong> os dados do perfil e do primeiro acesso,
              e trocar o e-mail de login.
            </li>
            <li>
              <strong>Consultar, corrigir e apagar lembranças</strong> no botão
              Memória do chat, além de desativar sua utilização entre conversas
              e escolher se permite provedores em nuvem. A exportação dos dados
              inclui os relatos e o grafo da memória.
            </li>
            <li>
              <strong>Ver os consentimentos</strong> que você deu, com a versão
              e a data.
            </li>
            <li>
              <strong>Excluir a conta</strong> e, com ela, revogar o
              consentimento de dados de saúde. Sem esses dados a plataforma não
              consegue funcionar, por isso a revogação é feita pela exclusão.
            </li>
          </ul>
          <p>
            {contato ? (
              <>
                Para qualquer outro pedido ou dúvida, fale com o encarregado
                pelo tratamento de dados:{' '}
                <a
                  href={`mailto:${contato}`}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  {contato}
                </a>
                .
              </>
            ) : (
              <>
                Para qualquer outro pedido ou dúvida, use os canais de
                atendimento informados pela empresa que opera a sua instância da
                Lyra.
              </>
            )}{' '}
            Você também pode apresentar reclamação à Autoridade Nacional de
            Proteção de Dados (ANPD).
          </p>
        </>
      ),
    },
    {
      id: 'seguranca',
      titulo: 'Como protegemos os dados',
      conteudo: (
        <ul>
          <li>
            Senhas com hash bcrypt; sessão em cookie inacessível ao JavaScript.
          </li>
          <li>
            Confirmação da senha para ações sensíveis, como trocar o e-mail ou
            excluir a conta, e limite de tentativas de login.
          </li>
          <li>
            Separação técnica entre os dados do titular e as funções de
            administração.
          </li>
          <li>Proteção contra requisições de outros sites (CSRF).</li>
        </ul>
      ),
    },
    {
      id: 'navegador',
      titulo: 'Cookies e armazenamento no navegador',
      conteudo: (
        <div className="space-y-3">
          <p>
            Usamos um cookie essencial para a sessão de login. No navegador
            também ficam preferências suas, como o modo privacidade e, se você
            informar, a chave pessoal de IA. Não usamos cookies de publicidade
            nem de rastreamento.
          </p>
          <p>
            Em “Sem internet”, somente após sua escolha e autorização, o
            navegador pode manter uma cópia criptografada de check-ins e
            reflexões e seus envios pendentes. Uma frase local, que não chega
            aos servidores e não pode ser recuperada pela Lyra, protege essa
            cópia. A chave fica na memória enquanto o cofre está aberto. A
            página pública e arquivos do aplicativo podem ser armazenados sem
            dados pessoais para abrir a interface sem rede.
          </p>
          <p>
            Sair da conta bloqueia o cofre e preserva os rascunhos cifrados.
            Você pode removê-los na página “Sem internet”. Excluir a conta
            remove também seu cofre no navegador atual quando o armazenamento
            permite; se falhar, avisamos. Outros dispositivos precisam ser
            limpos separadamente. Limpeza do navegador, perda do dispositivo ou
            frase esquecida podem tornar os rascunhos irrecuperáveis. Dados
            ainda não enviados não estão na exportação do servidor.
          </p>
          <p>
            A sincronização exige conexão, sessão válida da conta original e
            direitos atuais do plano. Alterações concorrentes exigem sua
            revisão, sem sobrescrita silenciosa. Os recibos de confirmação
            integram sua exportação e são removidos com a conta.
          </p>
        </div>
      ),
    },
    {
      id: 'menores',
      titulo: 'Crianças e adolescentes',
      conteudo: (
        <p>
          A Lyra MetaCare não se destina a crianças. Pessoas com menos de 18
          anos só devem usar a plataforma com o consentimento e o acompanhamento
          de um dos pais ou do responsável legal.
        </p>
      ),
    },
    {
      id: 'alteracoes',
      titulo: 'Alterações desta política',
      conteudo: (
        <p>
          Quando esta política mudar, a versão no topo da página muda junto, e o
          registro de consentimento mostra qual versão você aceitou e quando.
          Veja também os{' '}
          <Link
            href={ROTA_TERMOS_DE_USO}
            className="font-medium text-primary underline underline-offset-2"
          >
            termos de uso
          </Link>
          .
        </p>
      ),
    },
  ];

  return (
    <DocumentoLegal
      titulo="Política de privacidade"
      resumo="Os seus dados de saúde são seus: só você os acessa, você pode baixá-los a qualquer momento e, ao excluir a conta, eles são apagados. Permanecem os registros fiscais exigidos por lei e o histórico financeiro mínimo, sem ligação com a sua saúde."
      versao={VERSAO_POLITICA_DE_PRIVACIDADE}
      secoes={secoes}
    />
  );
}
