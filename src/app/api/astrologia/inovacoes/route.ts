import { NextResponse } from 'next/server';
import { requireFeatureEnabled } from '@/lib/plans/service';
import { requireServerSession } from '@/lib/mysql/server-auth';
import { carregarNatalDoTitular } from '@/lib/astrology/persistencia-natal';
import { HttpError } from '@/lib/http-error';
import { respostaDeErro } from '@/lib/http/api';
import { calcularMapaDivisional } from '@/lib/astrology/inovacoes/divisionais';
import {
  calcularTransitosNatais,
  type ZodiacoDeInovacoes,
} from '@/lib/astrology/inovacoes/transitos';
import { calcularRetornos } from '@/lib/astrology/inovacoes/retornos';
import {
  calcularLinhasAstrocartograficas,
  compararAscendentesRelocados,
} from '@/lib/astrology/inovacoes/astrocartografia';
import { calcularCalendarioDeEclipses } from '@/lib/astrology/inovacoes/eclipses';
import { DIA_MS, limitarLocal } from '@/lib/astrology/inovacoes/numerica';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tipos = [
  'd9',
  'd10',
  'transitos',
  'astrocartografia',
  'retornos',
  'eclipses',
] as const;

function dataInicio(parametro: string | null): Date {
  if (parametro === null)
    return new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parametro))
    throw new HttpError('Data inválida. Use AAAA-MM-DD.', 400);
  const data = new Date(parametro + 'T00:00:00Z');
  if (
    !Number.isFinite(data.getTime()) ||
    data.toISOString().slice(0, 10) !== parametro ||
    data.getUTCFullYear() < 1900 ||
    data.getUTCFullYear() > 2100
  ) {
    throw new HttpError(
      'Data fora do intervalo astronômico suportado (1900–2100).',
      400
    );
  }
  return data;
}

function periodo(parametros: URLSearchParams, tipo: string) {
  const inicio = dataInicio(parametros.get('inicio'));
  const limite = tipo === 'transitos' ? 31 : 370;
  const padrao = tipo === 'transitos' ? 14 : 365;
  const bruto = parametros.get('dias');
  const dias = bruto === null ? padrao : Number(bruto);
  if (!Number.isInteger(dias) || dias < 1 || dias > limite)
    throw new HttpError('Período deve conter de 1 a ' + limite + ' dias.', 400);
  return { inicio, fim: new Date(inicio.getTime() + dias * DIA_MS) };
}

/** Rota autenticada e protegida pelo plano; cálculo exclusivo do motor local. */
export async function GET(request: Request) {
  try {
    const session = await requireServerSession();
    await requireFeatureEnabled(session, 'vedic_insights');
    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipo');
    if (!tipos.some((valor) => valor === tipo))
      throw new HttpError('Selecione uma inovação astrológica válida.', 400);
    const valorZodiaco = url.searchParams.get('zodiaco');
    if (
      valorZodiaco !== null &&
      valorZodiaco !== 'sideral' &&
      valorZodiaco !== 'tropical'
    ) {
      throw new HttpError('Zodíaco não reconhecido.', 400);
    }
    const zodiaco: ZodiacoDeInovacoes =
      valorZodiaco === 'tropical' ? 'tropical' : 'sideral';

    const { perfil, mapa } = await carregarNatalDoTitular(session.user.id);
    const nascimento = perfil.nascimento;
    const local = perfil.localDoDia ?? nascimento.local;
    if (!local)
      throw new HttpError(
        'Informe uma cidade válida no perfil para os cálculos geográficos.',
        422
      );

    let dados: unknown;
    if (tipo === 'eclipses') {
      const { inicio, fim } = periodo(url.searchParams, tipo);
      dados = calcularCalendarioDeEclipses(
        inicio,
        fim,
        local.latitude,
        local.longitude
      );
    } else {
      if (!mapa || !nascimento.data || !nascimento.hora || !nascimento.local)
        throw new HttpError(
          'Informe data, hora e cidade de nascimento para executar este cálculo.',
          422
        );

      if (tipo === 'd9' || tipo === 'd10') {
        dados = calcularMapaDivisional(mapa, tipo === 'd9' ? 9 : 10);
      } else if (tipo === 'transitos') {
        const { inicio, fim } = periodo(url.searchParams, tipo);
        dados = calcularTransitosNatais(mapa, zodiaco, inicio, fim);
      } else if (tipo === 'retornos') {
        const { inicio, fim } = periodo(url.searchParams, tipo);
        const corpo = url.searchParams.get('corpo') ?? 'sol';
        if (corpo !== 'sol' && corpo !== 'lua')
          throw new HttpError('Retorno deve ser solar ou lunar.', 400);
        dados = calcularRetornos(mapa, corpo, zodiaco, inicio, fim, {
          latitude: local.latitude,
          longitude: local.longitude,
          nome: local.rotulo,
        });
      } else if (tipo === 'astrocartografia') {
        const linhas = calcularLinhasAstrocartograficas(mapa.nascimentoUtc);
        const textoLatitude = url.searchParams.get('latitude');
        const textoLongitude = url.searchParams.get('longitude');
        const coordenadas =
          textoLatitude === null && textoLongitude === null
            ? { latitude: local.latitude, longitude: local.longitude }
            : textoLatitude !== null &&
                textoLongitude !== null &&
                textoLatitude.trim() !== '' &&
                textoLongitude.trim() !== ''
              ? limitarLocal(Number(textoLatitude), Number(textoLongitude))
              : null;
        if (!coordenadas)
          throw new HttpError('Informe latitude e longitude juntas.', 400);
        dados = {
          ...linhas,
          comparacao: compararAscendentesRelocados(
            mapa.nascimentoUtc,
            {
              latitude: nascimento.local.latitude,
              longitude: nascimento.local.longitude,
            },
            coordenadas,
            zodiaco
          ),
        };
      }
    }
    return NextResponse.json(
      { tipo, zodiaco, dados },
      {
        headers: {
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (erro) {
    return respostaDeErro(
      erro instanceof RangeError ? new HttpError(erro.message, 422) : erro,
      'Não foi possível realizar o cálculo astrológico.'
    );
  }
}
