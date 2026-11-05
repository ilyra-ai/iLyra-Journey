#!/usr/bin/env bash
# Instalador do runtime local da Lyra. Nunca instala driver NVIDIA nem usa sudo.
set -Eeuo pipefail

raiz="$(cd -- "$(dirname -- "$0")/.." && pwd)"
destino="$raiz/.lyra-run/llama.cpp"
binario="$destino/build/bin/llama-server"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "ERRO: a compilação automática é exclusiva de Linux/WSL2." >&2
  exit 2
fi
if [[ -x "$binario" ]]; then
  echo "Motor de inferência local já instalado em $binario"
  exit 0
fi

for programa in git cmake c++ nvcc nvidia-smi; do
  if ! command -v "$programa" >/dev/null 2>&1; then
    echo "ERRO: '$programa' não encontrado. Instale as dependências no Ubuntu; nunca instale o driver NVIDIA dentro do WSL2." >&2
    exit 3
  fi
done

versao="$(nvcc --version | sed -n 's/.*release \([0-9]*\)\.\([0-9]*\).*/\1 \2/p' | tail -n 1)"
read -r major minor <<< "$versao"
if [[ -z "$major" || -z "$minor" ]]; then
  echo "ERRO: não foi possível determinar a versão do CUDA Toolkit pelo nvcc." >&2
  exit 4
fi
if (( major < 12 || (major == 12 && minor < 8) )); then
  echo "ERRO: CUDA Toolkit 12.8+ é necessário para compilar sm_120. Detectado: $major.$minor" >&2
  exit 5
fi
if ! nvidia-smi >/dev/null 2>&1; then
  echo "ERRO: GPU NVIDIA não acessível a partir do Linux/WSL2. Verifique o driver no Windows e a integração WSL, sem instalar driver no Ubuntu." >&2
  exit 6
fi

mkdir -p "$raiz/.lyra-run"
chmod 700 "$raiz/.lyra-run"
if [[ ! -d "$destino/.git" ]]; then
  if [[ -e "$destino" ]]; then
    echo "ERRO: já há um diretório '$destino', mas não é um checkout Git. Nenhum arquivo foi apagado." >&2
    exit 7
  fi
  echo "Baixando código-fonte oficial do ggml-org/llama.cpp"
  git clone --depth 1 --single-branch https://github.com/ggml-org/llama.cpp.git "$destino"
fi

echo "Compilando CUDA com arquitetura Blackwell sm_120"
cmake -S "$destino" -B "$destino/build" \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=120 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build "$destino/build" --target llama-server --config Release --parallel 4
if [[ ! -x "$binario" ]]; then
  echo "ERRO: compilação terminou sem o binário executável esperado." >&2
  exit 8
fi
echo "Motor da Lyra instalado: $binario"
"$binario" --version
