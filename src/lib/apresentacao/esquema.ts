import { z } from 'zod';
export const passoSchema = z.enum([
  'registro',
  'resultado',
  'conversa',
  'perfil',
]);
export type Passo = z.infer<typeof passoSchema>;
export const pedidoSchema = z
  .object({
    versao: z.number().int().nonnegative(),
    acao: z.enum(['iniciar', 'ir', 'dispensar', 'concluir']),
    passo: passoSchema,
  })
  .strict();
export interface EstadoApresentacao {
  estado: 'novo' | 'em_andamento' | 'dispensada' | 'concluida';
  passo: Passo;
  versao: number;
  passos: Passo[];
}
export const conteudoDoPasso: Record<
  Passo,
  { titulo: string; texto: string; acao: string; href: string | null }
> = {
  registro: {
    titulo: 'Registre o que você sabe sobre seu dia',
    texto:
      'Use “Registrar meu dia” para informar sono, energia ou outra medida que você realmente tenha. Campos vazios não apagam registros. Você escolhe o que compartilhar; não precisa preencher tudo. Sem internet, prepare antes o cofre em “Sem internet”.',
    acao: 'Abrir registro do dia',
    href: null,
  },
  resultado: {
    titulo: 'Entenda um resultado no seu painel',
    texto:
      'No Painel, confira a data e os registros que sustentam seus indicadores. Sem dados suficientes, a ausência de resultado é esperada: ela não significa que você está mal. Prontidão e recuperação são estimativas de bem-estar e não substituem avaliação profissional. Registrar mais informações pode ajudar a contextualizar a leitura.',
    acao: 'Ver meu painel',
    href: '/',
  },
  conversa: {
    titulo: 'Converse com a Lyra no seu ritmo',
    texto:
      'Em Lyra AI, escreva no campo de mensagem e escolha Enviar. Conte só o que quiser. A resposta depende do modelo conectado e dos limites do plano; um modelo indisponível deve ser informado, sem inventar resposta. Você pode voltar à ajuda a qualquer momento.',
    acao: 'Abrir conversa com a Lyra',
    href: '/chat',
  },
  perfil: {
    titulo: 'Seu perfil continua sob seu controle',
    texto:
      'O cadastro já foi concluído. Esta ajuda é opcional e não pede novos objetivos nem obriga a fornecer dados de saúde. No Perfil, você pode revisar informações, plano e direitos de privacidade. Os recursos apresentados acompanham as permissões atuais da sua conta.',
    acao: 'Ver meu perfil',
    href: '/profile',
  },
};
