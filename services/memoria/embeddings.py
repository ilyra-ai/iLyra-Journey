"""Índices semânticos locais, com pesos multilíngues em revisão fixa."""

from __future__ import annotations

import asyncio
import json
import os
from collections.abc import Iterable
from pathlib import Path

import numpy as np
import onnxruntime as ort
from graphiti_core.embedder.client import EmbedderClient
from huggingface_hub import snapshot_download
from tokenizers import Tokenizer

MODELO = "minishlab/potion-multilingual-128M"
REPOSITORIO = "minishlab/potion-multilingual-128m-onnx"
REVISAO = "3766c5fca8a199c3d6801461f289f4459719ba31"
DIMENSOES = 256


def pasta_do_modelo() -> Path:
    return Path(os.environ.get("LYRA_MEMORIA_MODELO_PASTA", "/opt/lyra-modelos/potion"))


def preparar_modelo() -> None:
    """Executada no build: só baixa os pesos públicos, sem dados de usuários."""
    snapshot_download(
        repo_id=REPOSITORIO,
        revision=REVISAO,
        local_dir=str(pasta_do_modelo()),
        allow_patterns=["*.json", "model.onnx"],
    )


class EmbeddingsLocais(EmbedderClient):
    def __init__(self) -> None:
        pasta = pasta_do_modelo()
        configuracao = json.loads((pasta / "config.json").read_text(encoding="utf-8"))
        tokenizacao = json.loads(
            (pasta / "tokenizer_config.json").read_text(encoding="utf-8")
        )
        self.tokenizador = Tokenizer.from_file(str(pasta / "tokenizer.json"))
        self.tokenizador.enable_truncation(max_length=tokenizacao["model_max_length"])
        self.tokenizador.enable_padding(
            pad_id=configuracao["pad_token_id"],
            pad_token=tokenizacao["pad_token"],
            direction=tokenizacao["padding_side"],
            length=None,
        )
        opcoes = ort.SessionOptions()
        opcoes.intra_op_num_threads = 2
        opcoes.inter_op_num_threads = 1
        self.modelo = ort.InferenceSession(
            str(pasta / "model.onnx"),
            sess_options=opcoes,
            providers=["CPUExecutionProvider"],
        )
        self.limite = asyncio.Semaphore(2)

    async def create_batch(self, input_data_list: list[str]) -> list[list[float]]:
        if not input_data_list:
            return []

        def calcular() -> list[list[float]]:
            resultado = []
            for inicio in range(0, len(input_data_list), 16):
                codificados = self.tokenizador.encode_batch(
                    input_data_list[inicio : inicio + 16]
                )
                vetores = self.modelo.run(
                    ["embeddings"],
                    {
                        "input_ids": np.asarray(
                            [texto.ids for texto in codificados], dtype=np.int64
                        ),
                        "attention_mask": np.asarray(
                            [texto.attention_mask for texto in codificados],
                            dtype=np.int64,
                        ),
                    },
                )[0]
                if (
                    vetores.shape != (len(codificados), DIMENSOES)
                    or not np.isfinite(vetores).all()
                ):
                    raise ValueError(
                        "O modelo local produziu índices semânticos inválidos."
                    )
                normalizados = vetores / np.maximum(
                    np.linalg.norm(vetores, axis=1, keepdims=True), 1e-12
                )
                resultado.extend(normalizados.tolist())
            return resultado

        async with self.limite:
            return await asyncio.to_thread(calcular)

    async def create(
        self, input_data: str | list[str] | Iterable[int] | Iterable[Iterable[int]]
    ) -> list[float]:
        if isinstance(input_data, str):
            textos = [input_data]
        else:
            valores = list(input_data)
            if not valores or not all(isinstance(valor, str) for valor in valores):
                raise ValueError(
                    "A memória aceita somente textos para gerar índices semânticos."
                )
            textos = [str(valor) for valor in valores]
        return (await self.create_batch(textos))[0]
