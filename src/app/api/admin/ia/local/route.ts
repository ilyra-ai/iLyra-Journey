import { spawn } from 'node:child_process';
import path from 'node:path';
import { platform } from 'node:os';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  adicionarPasta,
  descobrirModelosLocais,
  estadoDaInferencia,
  navegarPasta,
  salvarAjustesDaInferencia,
} from '@/lib/ai/inferencia-integrada';
import { requireAdminSession } from '@/lib/mysql/server-auth';
import { respostaDeErro } from '@/lib/http/api';

export const runtime = 'nodejs';

const cabecalhos = { 'Cache-Control': 'private, no-store' };
const pedidoSchema = z.discriminatedUnion('acao', [
  z
    .object({
      acao: z.literal('pasta'),
      caminho: z.string().trim().min(1).max(1200),
    })
    .strict(),
  z.object({ acao: z.literal('instalar') }).strict(),
  z
    .object({
      acao: z.literal('configurar'),
      contexto: z.number().int().min(1024).max(32768),
      camadasGpu: z.number().int().min(0).max(999),
      threads: z.number().int().min(1).max(32),
    })
    .strict(),
]);

type Instalacao = {
  estado: 'inativa' | 'executando' | 'concluida' | 'erro';
  mensagem: string;
  iniciadaEm: string | null;
  terminadaEm: string | null;
};

let instalacao: Instalacao = {
  estado: 'inativa',
  mensagem: '',
  iniciadaEm: null,
  terminadaEm: null,
};

function erroDaOperacao(erro: unknown) {
  const mensagem =
    erro instanceof Error ? erro.message : 'Operação local indisponível.';
  return NextResponse.json(
    { error: mensagem },
    { status: 400, headers: cabecalhos }
  );
}

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const params = new URL(request.url).searchParams;
    const acao = params.get('acao') || 'pastas';
    if (acao === 'status') {
      return NextResponse.json(
        { ...(await estadoDaInferencia()), instalacao },
        { headers: cabecalhos }
      );
    }
    if (acao === 'modelos') {
      return NextResponse.json(
        { modelos: await descobrirModelosLocais() },
        { headers: cabecalhos }
      );
    }
    if (acao === 'pastas') {
      return NextResponse.json(
        await navegarPasta(params.get('diretorio') || undefined),
        { headers: cabecalhos }
      );
    }
    return NextResponse.json(
      { error: 'Operação desconhecida.' },
      { status: 400 }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Falha na descoberta de modelos locais.');
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const dados = pedidoSchema.safeParse(await request.json());
    if (!dados.success)
      return NextResponse.json(
        { error: 'Informe uma ação local válida.' },
        { status: 400, headers: cabecalhos }
      );
    if (dados.data.acao === 'pasta') {
      try {
        return NextResponse.json(
          { pasta: await adicionarPasta(dados.data.caminho) },
          { headers: cabecalhos }
        );
      } catch (erro) {
        return erroDaOperacao(erro);
      }
    }

    if (dados.data.acao === 'configurar') {
      try {
        const ajustes = {
          contexto: dados.data.contexto,
          camadasGpu: dados.data.camadasGpu,
          threads: dados.data.threads,
        };
        return NextResponse.json(
          { ajustes: await salvarAjustesDaInferencia(ajustes) },
          { headers: cabecalhos }
        );
      } catch (erro) {
        return erroDaOperacao(erro);
      }
    }

    if (platform() !== 'linux')
      return NextResponse.json(
        {
          error:
            'Instalação nativa suportada no Ubuntu/WSL2. O servidor não está em Linux.',
        },
        { status: 409, headers: cabecalhos }
      );
    if (instalacao.estado === 'executando')
      return NextResponse.json(
        { instalacao },
        { status: 409, headers: cabecalhos }
      );
    const script = path.resolve(
      process.cwd(),
      'scripts',
      'instalar-inferencia-local.sh'
    );
    instalacao = {
      estado: 'executando',
      mensagem: '',
      iniciadaEm: new Date().toISOString(),
      terminadaEm: null,
    };
    const processo = spawn('bash', [script], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: process.env,
    });
    const registrar = (texto: string) => {
      instalacao.mensagem = (instalacao.mensagem + texto).slice(-5000);
    };
    processo.stdout?.on('data', (parte: Buffer) =>
      registrar(parte.toString('utf8'))
    );
    processo.stderr?.on('data', (parte: Buffer) =>
      registrar(parte.toString('utf8'))
    );
    processo.once('error', (erro) => {
      registrar('\n' + erro.message);
      instalacao.estado = 'erro';
      instalacao.terminadaEm = new Date().toISOString();
    });
    processo.once('exit', (codigo) => {
      if (instalacao.estado === 'executando') {
        instalacao.estado = codigo === 0 ? 'concluida' : 'erro';
        instalacao.terminadaEm = new Date().toISOString();
        if (codigo !== 0)
          registrar('\nInstalação terminou com código ' + codigo);
      }
    });
    return NextResponse.json(
      { instalacao },
      { status: 202, headers: cabecalhos }
    );
  } catch (erro) {
    return respostaDeErro(erro, 'Falha ao configurar a inferência integrada.');
  }
}
