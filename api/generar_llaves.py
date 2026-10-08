#!/usr/bin/env python3
"""
Genera un archivo NUEVO de llaves para la API MAESTRA (master_keys.json):
  AES_KEY        -> 32 bytes aleatorios en base64 (AES-256)
  ENCRYPTION_KEY -> llave HMAC (hex)
  SECRET_KEY     -> llave para firmar los JWT (hex)

Uso:
  python generar_llaves.py                      # escribe en $RMV_KEYS_FILE o ~/rmv_produccion/keys/master_keys.json
  python generar_llaves.py ruta/master_keys.json
  python generar_llaves.py ruta --forzar        # sobrescribe (¡los datos cifrados con la llave anterior ya no se podrán leer!)

El archivo queda con permisos 600. NUNCA lo subas a GitHub ni lo compartas.
"""
import base64, json, os, secrets, sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith('--')]
forzar = '--forzar' in sys.argv
destino = Path(args[0] if args else os.environ.get(
    'RMV_KEYS_FILE', str(Path.home() / 'rmv_produccion' / 'keys' / 'master_keys.json'))).expanduser()

if destino.exists() and not forzar:
    sys.exit(f"Ya existe {destino}. No se sobrescribe (usa --forzar solo si sabes lo que haces).")

destino.parent.mkdir(parents=True, exist_ok=True)
try:
    os.chmod(destino.parent, 0o700)
except OSError:
    pass
llaves = {
    'AES_KEY': base64.b64encode(secrets.token_bytes(32)).decode(),
    'ENCRYPTION_KEY': secrets.token_hex(32),
    'SECRET_KEY': secrets.token_hex(32),
}
fd = os.open(destino, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    json.dump(llaves, f, indent=2)
os.chmod(destino, 0o600)
print(f"Llaves nuevas guardadas en {destino} (permisos 600).")
