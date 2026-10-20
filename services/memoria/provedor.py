"""Adaptador do Graphiti para os provedores configurados no próprio app."""

from __future__ import annotations

import asyncio
import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from graphiti_core.llm_client.client import LLMClient
from graphiti_core.llm_client.config import LLMConfig, ModelSize
from graphiti_core.prompts.models import Message
from pydantic import BaseModel


def validar_origem_do_app(valor: str) -> str:
    origem = urlsplit(valor)
    if (
        origem.scheme not in {"http", "https"}
        or origem.hostname not in {"host.docker.internal", "localhost", "127.0.0.1"}
        or origem.username
        or origem.password
        or origem.path not in {"", "/"}
        or origem.query
        or origem.fragment
    ):
        raise ValueError("A origem interna da aplicação não é válida.")
    return valor.rstrip("/")


class ProvedorDoApp(LLMClient):
    def __init__(self, usuario_id: str, origem: str) -> None:
        # Não escolhe nem imita um modelo: o servidor do app resolve a
        # conexão real, suas permissões de envio e as alternativas disponíveis.
        super().__init__(LLMConfig(max_tokens=4096, temperature=0), cache=False)
        self.usuario_id = usuario_id
        self.origem = validar_origem_do_app(origem)

    async def _generate_response(
        self,
        messages: list[Message],
        response_model: type[BaseModel] | None = None,
        max_tokens: int = 4096,
        model_size: ModelSize = ModelSize.medium,
        *,
        model: str | None = None,
    ) -> dict:
        corpo = {
            "mensagens": [
                {"papel": mensagem.role, "texto": mensagem.content}
                for mensagem in messages
            ],
            "esquema": response_model.model_json_schema() if response_model else None,
            "maximoDeTokens": min(max_tokens, 8192),
        }

        def gerar() -> dict:
            pedido = Request(
                f"{self.origem}/api/internal/memoria/gerar",
                data=json.dumps(corpo, ensure_ascii=False).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {os.environ['LYRA_MEMORIA_SEGREDO']}",
                    "X-Lyra-Usuario": self.usuario_id,
                },
                method="POST",
            )
            try:
                with urlopen(pedido, timeout=180) as resposta:
                    dados = json.load(resposta)
            except HTTPError as erro:
                # O corpo pode conter conteúdo sensível: somente o status
                # segue para o diagnóstico, nunca prompts ou respostas.
                raise RuntimeError(
                    f"O provedor interno respondeu HTTP {erro.code}."
                ) from None
            except (URLError, TimeoutError):
                raise RuntimeError(
                    "O provedor interno da memória está indisponível."
                ) from None
            if not isinstance(dados, dict) or not isinstance(
                dados.get("resultado"), dict
            ):
                raise TypeError(
                    "O provedor interno não devolveu um objeto estruturado."
                )
            resultado = dados["resultado"]
            if response_model is not None:
                resultado = response_model.model_validate(resultado).model_dump(
                    mode="json"
                )
            return resultado

        return await asyncio.to_thread(gerar)
