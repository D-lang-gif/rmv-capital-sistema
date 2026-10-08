# RMV CORP · API MAESTRA v3.0 (Flask)

Servidor opcional de la Banca de RMV Capital. El sitio publicado funciona sin él (modo local).

| Archivo | Para qué |
|---|---|
| `app.py` | API principal: `/api/health`, `/api/login`, `/api/cuentas`, `/api/saldo`, `/api/transaccion`, `/api/transacciones`, `/api/modulos`… |
| `modules/banxico.py` | Indicadores oficiales de Banxico (necesita `BANXICO_TOKEN`). |
| `modules/pasarela.py` | Pasarela y conciliación (`/api/pasarela/*`, `/api/bancomer/estado-cuenta`, `/api/conciliar/importar`). |
| `generar_llaves.py` | Crea un `master_keys.json` NUEVO (AES, HMAC y JWT) con permisos 600. |
| `crear_cuentas_prueba.py` | Crea dos cuentas de prueba (PRUEBA-0001 y PRUEBA-0002). |
| `cambiar_clave_admin.py` | Cambia la contraseña de `Adminf` (la pide sin mostrarla). |
| `iniciar_local.sh` | Arranca en esta computadora con llaves y base de prueba dentro de `../privado/`. |
| `probar_api.sh` | Pruebas con curl (`ADMIN_PASS='...' sh probar_api.sh`). |

Notas:
- **No incluye llaves ni base de datos.** Con las rutas por defecto usa `~/rmv_capital/db/rmv.db` y
  `~/rmv_produccion/keys/master_keys.json` (las de Termux).
- La contraseña inicial de `Adminf` sale de `RMV_ADMIN_PASSWORD`; si no está, se genera al azar y se anota
  en el archivo de credenciales local (permisos 600). Si tu base ya tiene a `Adminf`, no se toca: cámbiala con
  `python cambiar_clave_admin.py`.
- CORS: solo `localhost`/`127.0.0.1` y los orígenes de `RMV_CORS_ORIGINS` (para el sitio publicado:
  `https://d-lang-gif.github.io`).
- `/api/conciliar/importar` responde «conciliador.py no encontrado» si ese archivo no está (no se incluye aquí).
- Banxico: token gratis en https://www.banxico.org.mx/SieAPIRest/service/v1/token
