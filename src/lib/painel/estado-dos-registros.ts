/** Estado da leitura dos registros; não é uma avaliação de saúde. */
export function estadoDosRegistros(entrada: {
  carregando: boolean;
  erro: string | null;
  registrado: boolean;
}) {
  if (entrada.carregando)
    return {
      variante: 'info' as const,
      rotulo: 'Atualizando registros',
      descricao: 'Consultando os registros disponíveis da sua conta.',
    };
  if (entrada.erro)
    return {
      variante: 'warning' as const,
      rotulo: 'Atualização incompleta',
      descricao: entrada.erro,
    };
  if (!entrada.registrado)
    return {
      variante: 'secondary' as const,
      rotulo: 'Sem registros hoje',
      descricao:
        'Comece registrando como está. Ainda não há dados de hoje para apresentar uma avaliação.',
    };
  return {
    variante: 'secondary' as const,
    rotulo: 'Registros de hoje disponíveis',
    descricao:
      'Este estado indica a leitura dos registros, não uma avaliação de saúde. Cada indicador informa sua própria disponibilidade.',
  };
}
