# RMV Capital · Sistema unificado

**Sitio en vivo:** https://d-lang-gif.github.io/rmv-capital-sistema/

**Autor: Raúl Muñoz Villa** · © 2026 · Todos los derechos reservados (ver [LICENSE](LICENSE)).

Sistema web de **Raúl Muñoz Villa** que junta en un solo lugar, con un solo inicio de sesión:

1. **Tesorería Bitcoin**: Mesa (precio BTC, altura de bloque, comisiones y gráfica de 30 días en vivo), Libro, Anotaciones, Explorador, Observatorio e Identidad.
2. **Banca** (RMV Bank · Banca Digital Soberana v4.0): Dashboard, SPEI, Tarjetas, Pagos, Recargas, Token, Certificados y Servidor.
3. **APY Fast**: calculadora de interés compuesto (10,000 a 365 días → 20.28 % · $12,028.01 · $2,028.01).

## Acceso

- Usuario: `soberano`. La contraseña **no está en este repositorio**: el sitio solo guarda una sal y un hash
  PBKDF2-SHA256 (310,000 iteraciones) y la comprueba en el navegador. Raúl la tiene por separado.
- Es una protección de nivel demostración: el sitio es estático y público, y los datos que muestra
  van dentro del código publicado.

## Qué incluye este repositorio

| Carpeta / archivo | Qué es |
|---|---|
| `src/` | Código de la aplicación (React 19 + Tailwind 4): Tesorería Bitcoin (`components/nexus`), Banca (`components/banca`), APY Fast (`components/apy`). |
| `src/lib/banca/datos.ts` | **Saldos y datos de la Banca** (saldo MXN/BTC/ETC, firma, tarjetas con solo los últimos 4 dígitos, servicios, certificados, tasa de APY Fast). |
| `src/lib/nexus/config.ts` | Direcciones Bitcoin (Tesorería Soberana y direcciones observadas). |
| `src/lib/acceso/credencial.ts` | Usuario, sal y hash PBKDF2 de la contraseña (sin la contraseña). |
| `estatico/` | Página de entrada del sitio estático (`index.html` y `main.tsx`). |
| `vite.pages.config.ts` | Configuración del build para `https://d-lang-gif.github.io/rmv-capital-sistema/`. |
| `.github/workflows/publicar.yml` | En cada cambio a `main`: `npm install`, `npm run build` (carpeta `sitio/`) y publica en la rama `gh-pages`. |
| `api/` | Servidor opcional **RMV CORP · API MAESTRA v3.0** (Flask), sin llaves ni base de datos. |
| `herramientas/ofuscar.mjs` | Paso final del build: ofusca el JavaScript publicado y le pone el aviso de derechos de autor. |
| `LICENSE` | Licencia propietaria: © 2026 Raúl Muñoz Villa, todos los derechos reservados. |

### Cómo funciona el sitio en GitHub Pages

- **Sin servidor**: los datos de Bitcoin se consultan directo desde el navegador a fuentes públicas
  (mempool.space, blockstream.info, CoinGecko y blockchain.info/ticker). La gráfica de 30 días usa CoinGecko.
- **Banca en modo local**: SPEI, pagos, recargas y solicitudes de tarjeta se guardan en el navegador
  (localStorage) con su folio en «Movimientos». El botón **Reiniciar** las borra.
- **Servidor (API) apagado por defecto**: la pestaña Banca → Servidor explica que la API corre en el
  teléfono o la PC de Raúl. Solo se conecta si se pulsa «Conectar con mi servidor»; si no responde,
  todo sigue en modo local.
- **Direcciones con `#`** (por ejemplo `#/banca/spei` o `#/apy`): cada sección tiene su enlace y la
  página se puede recargar sin perder la sección. `404.html` es una copia de la página principal, por si
  alguien abre una ruta sin `#`.
- No se publican archivos binarios: la fuente Inter va incrustada en el CSS y los íconos son SVG.
- **JavaScript minificado y ofuscado, sin mapas de código**: al construir, Vite minifica y
  `herramientas/ofuscar.mjs` (javascript-obfuscator) ofusca los `.js` publicados y les agrega el aviso de
  derechos de autor. Nota honesta: cualquier código que corre en el navegador se puede volver **difícil**
  de leer, pero no imposible; la protección real es la licencia y no publicar secretos.

## Servidor opcional: API MAESTRA v3.0 (carpeta `api/`)

Backend Flask de Raúl (`api/app.py`) con sus módulos `modules/banxico.py` y `modules/pasarela.py`.
**No incluye llaves, contraseñas ni bases de datos**: las llaves se generan en tu equipo con
`generar_llaves.py` y la contraseña inicial de `Adminf` sale de la variable `RMV_ADMIN_PASSWORD`
(o se genera al azar y se anota en un archivo local con permisos 600).

### En el teléfono (Termux)

```bash
pkg update && pkg install python clang
cd ~/rmv_capital/api                     # copia aquí app.py, requirements.txt y la carpeta modules/
pip install -r requirements.txt
python generar_llaves.py                 # solo si todavía no tienes llaves
export BANXICO_TOKEN="tu-token"          # opcional (token gratis de Banxico)
python app.py                            # -> http://127.0.0.1:5001
```

### En Windows (PowerShell)

```powershell
cd rmv-capital-sistema\api
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:RMV_HOME = "$HOME\rmv_capital"
$env:RMV_KEYS_FILE = "$HOME\rmv_produccion\keys\master_keys.json"
python generar_llaves.py                 # solo la primera vez
python app.py
```

### En Linux / Mac (prueba rápida con llaves y base de prueba en `privado/`)

```bash
cd api && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
sh iniciar_local.sh
```

### Conectar el sitio publicado con tu API

1. Arranca la API en el mismo equipo donde abres el navegador, permitiendo el origen del sitio:
   `export RMV_CORS_ORIGINS=https://d-lang-gif.github.io` (en PowerShell: `$env:RMV_CORS_ORIGINS = "https://d-lang-gif.github.io"`).
2. En el sitio: Banca → Servidor → escribe la dirección (por defecto `http://127.0.0.1:5001`) →
   **Conectar con mi servidor** → entra con el usuario de la API.
3. Para volver al modo local: **Desconectar**.

Variables de entorno: `RMV_HOME`, `RMV_PROD`, `RMV_KEYS_FILE`, `RMV_DB_PATH`, `RMV_MODULES_DIR`,
`RMV_CREDENTIALS_FILE`, `RMV_API_HOST`, `RMV_API_PORT` (5001), `RMV_CORS_ORIGINS`, `RMV_ADMIN_PASSWORD`,
`BANXICO_TOKEN`. Más detalle en [`api/README.md`](api/README.md).

**Nunca subas** `master_keys.json`, bases `.db`, archivos de credenciales ni la carpeta `privado/`.

## Cambiar datos y actualizar el sitio

1. Edita `src/lib/banca/datos.ts` (números sin comas ni signo de pesos, textos entre comillas).
2. Súbelo a `main`: GitHub Actions construye y publica solo (1 a 2 minutos).

Para probarlo antes en tu computadora (Node.js 22):

```bash
npm install
npm run build        # genera sitio/
npm run preview      # abre http://127.0.0.1:8099/rmv-capital-sistema/
```

Las versiones de las librerías están fijas en `package.json`.

## Licencia

Software propietario. © 2026 Raúl Muñoz Villa. Todos los derechos reservados.
Que el repositorio sea público no da permiso de copiarlo, modificarlo ni reutilizarlo: para cualquier uso
se necesita permiso escrito del autor. Texto completo en [LICENSE](LICENSE).

---
RMV Capital Bank © 2026 · Autor: RAÚL MUÑOZ VILLA
