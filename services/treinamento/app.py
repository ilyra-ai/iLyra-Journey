"""Serviço de treinamento da Lyra (tarefa 90).

Treina os PESOS de um modelo aberto com feedback humano dado pelo
administrador no chat e serve a versão aplicada numa API compatível com a
OpenAI (`/v1/chat/completions`), que o app usa como qualquer modelo local.

Mecanismo: KTO (Kahneman-Tversky Optimization, Ethayarajh et al., 2024) com
adaptadores LoRA, pela biblioteca TRL. É um método de alinhamento por
feedback humano da família do RLHF: otimiza a recompensa implícita com
restrição KL em relação ao modelo de referência a partir de respostas
marcadas como desejáveis ou indesejáveis, sem o modelo de recompensa e o PPO
do RLHF clássico. Cada versão guarda métricas antes e depois do treino.
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from pathlib import Path

import torch
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer

MODELO_BASE = os.environ.get("LYRA_TREINO_MODELO", "Qwen/Qwen2.5-0.5B-Instruct")
REVISAO = os.environ.get(
    "LYRA_TREINO_REVISAO", "7ae557604adf67be50417f59c2c2f167def9a775"
)
DADOS = Path(os.environ.get("LYRA_TREINO_DADOS", "/dados"))
NOME = "lyra-treinavel"
SISTEMA_PADRAO = (
    "Você é a Lyra, assistente de bem-estar e autoconhecimento. "
    "Responda em português do Brasil."
)
MINIMO_DE_EXEMPLOS = int(os.environ.get("LYRA_TREINO_MINIMO", "4"))
torch.set_num_threads(max(1, int(os.environ.get("LYRA_TREINO_THREADS", "2"))))

(DADOS / "versoes").mkdir(parents=True, exist_ok=True)
(DADOS / "tarefas").mkdir(parents=True, exist_ok=True)
trava_do_modelo = threading.Lock()
trava_do_treino = threading.Lock()
tokenizador = AutoTokenizer.from_pretrained(MODELO_BASE, revision=REVISAO)
modelo = None
versao_ativa = 0


def _ler_json(caminho: Path, padrao):
    try:
        return json.loads(caminho.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return padrao


def _gravar_json(caminho: Path, valor) -> None:
    # Escrita atômica: uma queda no meio não corrompe o estado.
    temporario = caminho.with_suffix(".tmp")
    temporario.write_text(json.dumps(valor, ensure_ascii=False), encoding="utf-8")
    os.replace(temporario, caminho)


def _carregar(versao: int):
    """Base + adaptadores v1..vN, fundidos em ordem: cada versão foi treinada
    sobre a anterior já aplicada, então todas entram, não só a última."""
    base = AutoModelForCausalLM.from_pretrained(
        MODELO_BASE, revision=REVISAO, torch_dtype=torch.float32
    )
    if versao > 0:
        from peft import PeftModel

        for v in range(1, versao + 1):
            base = PeftModel.from_pretrained(
                base, str(DADOS / "versoes" / f"v{v}")
            ).merge_and_unload()
    base.eval()
    return base


def _trocar(novo, versao: int) -> None:
    global modelo, versao_ativa
    with trava_do_modelo:
        modelo, versao_ativa = novo, versao


def _aplicar(versao: int) -> None:
    _trocar(_carregar(versao), versao)


def _retomar_estado() -> None:
    # Tarefa interrompida por queda do serviço não é dada como concluída.
    for arquivo in (DADOS / "tarefas").glob("*.json"):
        tarefa = _ler_json(arquivo, None)
        if tarefa and tarefa.get("estado") in ("fila", "treinando"):
            tarefa.update(estado="falhou", erro="Treino interrompido pela reinicialização do serviço.")
            _gravar_json(arquivo, tarefa)
    _aplicar(int(_ler_json(DADOS / "ativo.json", {"versao": 0})["versao"]))


_retomar_estado()
app = FastAPI(title="Treinamento da Lyra")


def autorizar(authorization: str | None = Header(default=None)) -> None:
    segredo = os.environ.get("LYRA_TREINO_SEGREDO", "")
    if not segredo or authorization != f"Bearer {segredo}":
        raise HTTPException(status_code=401, detail="Não autorizado.")


def _texto(mensagens: list[dict]) -> str:
    if not any(m.get("role") == "system" for m in mensagens):
        mensagens = [{"role": "system", "content": SISTEMA_PADRAO}, *mensagens]
    return tokenizador.apply_chat_template(
        mensagens, tokenize=False, add_generation_prompt=True
    )


@app.get("/saude")
def saude():
    return {"ok": True, "modelo": MODELO_BASE, "revisao": REVISAO, "versao": versao_ativa}


@app.get("/v1/models")
def modelos():
    return {"object": "list", "data": [{"id": NOME, "object": "model"}]}


class Mensagem(BaseModel):
    role: str
    content: str | list | None = ""


class PedidoDeChat(BaseModel):
    model: str | None = None
    messages: list[Mensagem]
    max_tokens: int | None = None
    temperature: float | None = 0.7


@app.post("/v1/chat/completions")
def conversar(pedido: PedidoDeChat):
    mensagens = [
        {
            "role": m.role,
            "content": m.content
            if isinstance(m.content, str)
            else " ".join(p.get("text", "") for p in (m.content or []) if isinstance(p, dict)),
        }
        for m in pedido.messages
    ]
    entrada = tokenizador(_texto(mensagens), return_tensors="pt")
    limite = max(16, min(pedido.max_tokens or 768, 1536))
    temperatura = max(0.0, min(pedido.temperature or 0.0, 1.5))
    with trava_do_modelo:
        atual, versao = modelo, versao_ativa
        if atual is None:
            # Durante o treino o modelo sai da memória; o app passa ao
            # próximo da ordem (o Motor Lyra) até a nova versão entrar.
            raise HTTPException(
                status_code=503,
                detail="O modelo está em treino; a nova versão entra em instantes.",
            )
        with torch.no_grad():
            saida = atual.generate(
                **entrada,
                max_new_tokens=limite,
                do_sample=temperatura > 0,
                temperature=temperatura if temperatura > 0 else None,
                top_p=0.9 if temperatura > 0 else None,
                pad_token_id=tokenizador.eos_token_id,
            )
    novos = saida[0][entrada["input_ids"].shape[1] :]
    texto = tokenizador.decode(novos, skip_special_tokens=True).strip()
    return JSONResponse(
        {
            "id": f"chatcmpl-{uuid.uuid4().hex}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": f"{NOME}@v{versao}",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": texto},
                    "finish_reason": "length" if len(novos) >= limite else "stop",
                }
            ],
            "usage": {
                "prompt_tokens": int(entrada["input_ids"].shape[1]),
                "completion_tokens": int(len(novos)),
            },
        },
        headers={"X-Lyra-Versao": str(versao)},
    )


class Exemplo(BaseModel):
    pergunta: str = Field(min_length=1, max_length=4000)
    resposta: str = Field(min_length=1, max_length=8000)
    desejavel: bool


class PedidoDeTreino(BaseModel):
    sessao: str = Field(min_length=1, max_length=64)
    exemplos: list[Exemplo] = Field(max_length=500)


def _logprob_media(atual, exemplos: list[Exemplo]) -> float | None:
    """Log-probabilidade média por token das respostas, dado o pedido."""
    if not exemplos:
        return None
    total, tokens = 0.0, 0
    with torch.no_grad():
        for e in exemplos:
            prefixo = _texto([{"role": "user", "content": e.pergunta}])
            ids_p = tokenizador(prefixo, return_tensors="pt")["input_ids"]
            ids = tokenizador(prefixo + e.resposta + tokenizador.eos_token, return_tensors="pt")["input_ids"][:, :768]
            logits = atual(ids).logits[:, :-1]
            alvo = ids[:, 1:]
            lp = torch.log_softmax(logits, dim=-1).gather(-1, alvo.unsqueeze(-1)).squeeze(-1)
            parte = lp[:, ids_p.shape[1] - 1 :]
            total += float(parte.sum())
            tokens += int(parte.numel())
    return total / max(tokens, 1)


def _metricas(atual, exemplos: list[Exemplo]):
    boas = _logprob_media(atual, [e for e in exemplos if e.desejavel])
    ruins = _logprob_media(atual, [e for e in exemplos if not e.desejavel])
    return {
        "logprobDesejaveis": boas,
        "logprobIndesejaveis": ruins,
        "margem": None if boas is None or ruins is None else boas - ruins,
    }


def _treinar(tarefa_id: str, pedido: PedidoDeTreino) -> None:
    arquivo = DADOS / "tarefas" / f"{tarefa_id}.json"
    tarefa = _ler_json(arquivo, {})
    with trava_do_treino:
        try:
            from datasets import Dataset
            from peft import LoraConfig
            from trl import KTOConfig, KTOTrainer

            tarefa.update(estado="treinando", inicio=time.time())
            _gravar_json(arquivo, tarefa)
            proxima = int(_ler_json(DADOS / "ativo.json", {"versao": 0})["versao"]) + 1
            # Libera a cópia que atende o chat: treinar com duas cópias na
            # memória dobra o consumo. O treino parte da versão aplicada, então
            # cada sessão acumula sobre a anterior.
            _trocar(None, proxima - 1)
            base = _carregar(proxima - 1)
            antes = _metricas(base, pedido.exemplos)
            dados = Dataset.from_list(
                [
                    {
                        "prompt": [{"role": "system", "content": SISTEMA_PADRAO}, {"role": "user", "content": e.pergunta}],
                        "completion": [{"role": "assistant", "content": e.resposta}],
                        "label": e.desejavel,
                    }
                    for e in pedido.exemplos
                ]
            )
            pasta = DADOS / "versoes" / f"v{proxima}"
            config = KTOConfig(
                output_dir=str(DADOS / "execucao"),
                per_device_train_batch_size=2,
                num_train_epochs=int(os.environ.get("LYRA_TREINO_EPOCAS", "3")),
                learning_rate=float(os.environ.get("LYRA_TREINO_TAXA", "2e-4")),
                beta=0.1,
                # Os logits (vocabulário x tokens x lote) dominam a memória;
                # 512 tokens cabem em máquinas modestas e é ajustável.
                max_length=int(os.environ.get("LYRA_TREINO_TOKENS", "512")),
                gradient_checkpointing=True,
                logging_steps=1,
                save_strategy="no",
                report_to=[],
                use_cpu=not torch.cuda.is_available(),
                seed=42,
            )
            lora = LoraConfig(
                r=16, lora_alpha=32, lora_dropout=0.05, task_type="CAUSAL_LM",
                target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            )
            treinador = KTOTrainer(
                model=base, args=config, train_dataset=dados,
                processing_class=tokenizador, peft_config=lora,
            )
            resultado = treinador.train()
            treinador.model.save_pretrained(str(pasta))
            treinado = treinador.model.merge_and_unload()
            treinado.eval()
            depois = _metricas(treinado, pedido.exemplos)
            del treinador
            _gravar_json(
                pasta / "lyra.json",
                {"versao": proxima, "sessao": pedido.sessao, "base": MODELO_BASE, "revisao": REVISAO, "exemplos": len(pedido.exemplos), "antes": antes, "depois": depois, "perdaFinal": resultado.training_loss, "criadaEm": time.time()},
            )
            # O modelo recém-treinado (já fundido) passa a atender direto, sem
            # carregar outra cópia; o ponteiro só muda depois da troca.
            _trocar(treinado, proxima)
            _gravar_json(DADOS / "ativo.json", {"versao": proxima})
            tarefa.update(estado="concluida", versao=proxima, antes=antes, depois=depois, perdaFinal=resultado.training_loss, fim=time.time())
        except Exception as erro:  # noqa: BLE001 - o motivo vai para o app
            tarefa.update(estado="falhou", erro=str(erro)[:400], fim=time.time())
            # A versão que estava em uso volta a atender.
            if modelo is None:
                _aplicar(int(_ler_json(DADOS / "ativo.json", {"versao": 0})["versao"]))
        _gravar_json(arquivo, tarefa)


@app.post("/treino", status_code=202, dependencies=[Depends(autorizar)])
def iniciar_treino(pedido: PedidoDeTreino):
    if len(pedido.exemplos) < MINIMO_DE_EXEMPLOS:
        raise HTTPException(status_code=422, detail=f"São necessárias ao menos {MINIMO_DE_EXEMPLOS} avaliações.")
    if not any(e.desejavel for e in pedido.exemplos):
        raise HTTPException(status_code=422, detail="É necessária ao menos uma resposta aprovada ou corrigida.")
    if trava_do_treino.locked():
        raise HTTPException(status_code=409, detail="Já existe um treino em andamento.")
    tarefa_id = uuid.uuid4().hex
    _gravar_json(DADOS / "tarefas" / f"{tarefa_id}.json", {"id": tarefa_id, "sessao": pedido.sessao, "estado": "fila", "exemplos": len(pedido.exemplos)})
    threading.Thread(target=_treinar, args=(tarefa_id, pedido), daemon=True).start()
    return {"tarefa": tarefa_id}


@app.get("/treino/tarefas/{tarefa_id}", dependencies=[Depends(autorizar)])
def ler_tarefa(tarefa_id: str):
    if not tarefa_id.isalnum():
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    tarefa = _ler_json(DADOS / "tarefas" / f"{tarefa_id}.json", None)
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return tarefa


class AvisoDeSessao(BaseModel):
    sessao: str = Field(min_length=1, max_length=64)
    aberta: bool


@app.post("/treino/sessoes", dependencies=[Depends(autorizar)])
def avisar_sessao(aviso: AvisoDeSessao):
    """O app avisa o modelo conectado que o treinamento foi ligado ou
    desligado; a sessão aberta aparece no estado do serviço."""
    _gravar_json(
        DADOS / "sessao.json",
        {"sessao": aviso.sessao if aviso.aberta else None, "em": time.time()},
    )
    return {"sessaoAberta": aviso.sessao if aviso.aberta else None}


@app.get("/treino", dependencies=[Depends(autorizar)])
def estado_do_treino():
    versoes = sorted(
        (_ler_json(p / "lyra.json", None) for p in (DADOS / "versoes").glob("v*")),
        key=lambda v: (v or {}).get("versao", 0),
    )
    return {
        "modelo": MODELO_BASE,
        "revisao": REVISAO,
        "nome": NOME,
        "versaoAtiva": versao_ativa,
        "sessaoAberta": _ler_json(DADOS / "sessao.json", {}).get("sessao"),
        "treinando": trava_do_treino.locked(),
        "minimo": MINIMO_DE_EXEMPLOS,
        "versoes": [v for v in versoes if v],
        "mecanismo": "KTO com LoRA (TRL)",
    }
