# Relay STP / SPEI · RMV Capital

Servidor mínimo (Flask) que recibe las órdenes registradas en **Banca Soberana → Pasarela y conciliación → STP / SPEI**, arma la *cadena original* de `registraOrden`, la firma con **RSA-SHA256** y la envía a STP (`PUT /speiws/rest/ordenPago/registra`).

La llave privada de STP **solo vive en este servidor**. Nunca se sube al repositorio, a Firestore ni al navegador.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `STP_PRIVATE_KEY_PATH` | Ruta al archivo PEM de la llave privada registrada ante STP |
| `STP_KEY_PASSPHRASE` | Frase de la llave privada |
| `STP_EMPRESA` | Empresa asignada por STP (si se define, prevalece sobre la enviada por el navegador) |
| `STP_AMBIENTE` | `pruebas` o `produccion` (por omisión `pruebas`) |
| `STP_URL_PRUEBAS` | URL completa de `…/speiws/rest/ordenPago/registra` del ambiente de pruebas que te asigne STP |
| `STP_URL_PRODUCCION` | URL completa de `…/speiws/rest/ordenPago/registra` de producción (p. ej. `https://prod.stpmex.com/speiws/rest/ordenPago/registra`) |
| `PORT` | Puerto local (por omisión 5055) |

## Arranque

```bash
cd servidor_stp
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export STP_PRIVATE_KEY_PATH=/ruta/segura/llave_stp.pem
export STP_KEY_PASSPHRASE='…'
export STP_EMPRESA=MI_EMPRESA
python app.py
```

Publícalo detrás de HTTPS (nginx, Cloudflare Tunnel, etc.) y captura esa URL en **Conexión STP → URL del relay**.

## Endpoint

`POST /stp/registraOrden` — cuerpo JSON con los campos de la orden (claveRastreo, conceptoPago, cuentaBeneficiario, nombreBeneficiario, rfcCurpBeneficiario, institucionContraparte, monto, referenciaNumerica, cuentaOrdenante, empresa…).
Respuesta: `{ "id": <id STP>, "estado": "ENVIADA" }` o `{ "estado": "RECHAZADA", ... }`.

CORS restringido a `https://d-lang-gif.github.io`.

## Seguridad

- No guardes la llave en el repositorio (`*.pem`, `*.key` y `.env` están en `.gitignore`).
- Agrega autenticación (por ejemplo, verificar el ID token de Firebase del soberano) antes de exponerlo públicamente.

Raúl Muñoz Villa · RMV Capital © 2026
