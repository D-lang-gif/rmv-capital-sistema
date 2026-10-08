#!/bin/sh
# Arranca la API MAESTRA en esta computadora con llaves y base de PRUEBA dentro de ../privado
# (no toca ~/rmv_capital ni ~/rmv_produccion). Uso: sh iniciar_local.sh
set -eu
AQUI="$(cd "$(dirname "$0")" && pwd)"
PRIV="$AQUI/../privado"
mkdir -p "$PRIV"; chmod 700 "$PRIV"
export RMV_HOME="${RMV_HOME:-$PRIV/rmv_capital_local}"
export RMV_KEYS_FILE="${RMV_KEYS_FILE:-$PRIV/master_keys_local.json}"
export RMV_DB_PATH="${RMV_DB_PATH:-$PRIV/rmv_local.db}"
export RMV_CREDENTIALS_FILE="${RMV_CREDENTIALS_FILE:-$PRIV/CREDENCIALES_NO_SUBIR.txt}"
export RMV_MODULES_DIR="${RMV_MODULES_DIR:-$AQUI/modules}"
export RMV_API_PORT="${RMV_API_PORT:-5001}"
PY="${PYTHON:-python3}"
[ -x "$AQUI/.venv/bin/python" ] && PY="$AQUI/.venv/bin/python"
[ -f "$RMV_KEYS_FILE" ] || "$PY" "$AQUI/generar_llaves.py" "$RMV_KEYS_FILE"
cd "$AQUI"
exec "$PY" app.py
