#!/usr/bin/env python3
"""
Cambia la contraseña de un usuario de la API MAESTRA (por defecto Adminf).
Mantiene el mismo formato de hash que usa /api/login (SHA-256), así que el login sigue igual.
Usa las mismas variables de entorno que app.py (RMV_HOME / RMV_DB_PATH).

Uso:  python cambiar_clave_admin.py            (pide la nueva contraseña sin mostrarla)
      python cambiar_clave_admin.py OtroUsuario
"""
import getpass, hashlib, os, sqlite3, sys
from pathlib import Path

RMV = Path(os.environ.get("RMV_HOME", str(Path.home() / "rmv_capital"))).expanduser()
DB_PATH = Path(os.environ.get("RMV_DB_PATH", str(RMV / "db" / "rmv.db"))).expanduser()
usuario = sys.argv[1] if len(sys.argv) > 1 else "Adminf"

if not DB_PATH.exists():
    sys.exit(f"No existe la base {DB_PATH}")
p1 = getpass.getpass(f"Nueva contraseña para {usuario}: ")
p2 = getpass.getpass("Repítela: ")
if not p1 or p1 != p2:
    sys.exit("Las contraseñas no coinciden.")
db = sqlite3.connect(str(DB_PATH))
n = db.execute("UPDATE usuarios SET password_hash=? WHERE usuario=?",
               (hashlib.sha256(p1.encode()).hexdigest(), usuario)).rowcount
db.commit()
db.close()
print("Contraseña actualizada." if n else f"No existe el usuario {usuario}.")
