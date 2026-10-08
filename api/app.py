#!/usr/bin/env python3
"""
RMV CORP - API MAESTRA v3.0
Backend unificado: login, OXXO, firmas, Banxico, pasarela, conciliación
"""
import os, sqlite3, hashlib, secrets, uuid, json, base64, hmac, re
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, request, jsonify, g, send_from_directory

import jwt
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad


# ═════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═════════════════════════════════════════════════════════
# Rutas configurables por variables de entorno (por defecto, las originales de Termux).
RMV = Path(os.environ.get("RMV_HOME", str(Path.home() / "rmv_capital"))).expanduser()
PROD = Path(os.environ.get("RMV_PROD", str(Path.home() / "rmv_produccion"))).expanduser()
DB_PATH = Path(os.environ.get("RMV_DB_PATH", str(RMV / "db" / "rmv.db"))).expanduser()
KEYS_FILE = Path(os.environ.get("RMV_KEYS_FILE", str(PROD / "keys" / "master_keys.json"))).expanduser()
PUBLIC_DIR = Path(os.environ.get("RMV_PUBLIC_DIR", str(RMV / "public"))).expanduser()
# Archivo donde se anota la contraseña inicial de Adminf si se genera automáticamente.
CREDENCIALES_FILE = Path(os.environ.get(
    "RMV_CREDENTIALS_FILE", str(KEYS_FILE.parent / "CREDENCIALES_NO_SUBIR.txt"))).expanduser()

with open(KEYS_FILE) as f:
    KEYS_DATA = json.load(f)

AES_KEY = base64.b64decode(KEYS_DATA["AES_KEY"])
HMAC_KEY = KEYS_DATA["ENCRYPTION_KEY"].encode()

app = Flask(__name__)
app.config['SECRET_KEY'] = KEYS_DATA["SECRET_KEY"]


# CORS mínimo para que el frontend RMV Capital (otro puerto/dominio) pueda llamar a la API.
# Orígenes permitidos: localhost/127.0.0.1 en cualquier puerto + los de RMV_CORS_ORIGINS (separados por coma).
_CORS_EXTRA = {o.strip().rstrip('/') for o in os.environ.get('RMV_CORS_ORIGINS', '').split(',') if o.strip()}
_CORS_LOCAL = re.compile(r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$')


@app.after_request
def _cors(resp):
    origen = request.headers.get('Origin', '')
    if origen and (_CORS_LOCAL.match(origen) or origen in _CORS_EXTRA or '*' in _CORS_EXTRA):
        resp.headers['Access-Control-Allow-Origin'] = origen
        resp.headers['Vary'] = 'Origin'
        resp.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return resp


def ahora():
    return datetime.now(timezone.utc).isoformat()


def encrypt(data):
    if isinstance(data, (dict, list)):
        data = json.dumps(data)
    if not isinstance(data, str):
        data = str(data)
    cipher = AES.new(AES_KEY, AES.MODE_CBC)
    ct = cipher.encrypt(pad(data.encode(), AES.block_size))
    return base64.b64encode(cipher.iv + ct).decode()


def decrypt(enc):
    if isinstance(enc, str):
        enc = enc.encode()
    if not enc:
        return ''
    raw = base64.b64decode(enc)
    iv, ct = raw[:16], raw[16:]
    cipher = AES.new(AES_KEY, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ct), AES.block_size).decode()


def firma_hmac(datos):
    if isinstance(datos, (dict, list)):
        datos = json.dumps(datos, sort_keys=True)
    return hmac.new(HMAC_KEY, str(datos).encode(), hashlib.sha256).hexdigest()


# ═════════════════════════════════════════════════════════
# DB
# ═════════════════════════════════════════════════════════
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(str(DB_PATH))
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db:
        db.close()


def token_requerido(f):
    @wraps(f)
    def w(*a, **kw):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'token requerido'}), 401
        try:
            d = jwt.decode(auth[7:], app.config['SECRET_KEY'], algorithms=['HS256'])
            g.usuario = d['usuario']
        except Exception as e:
            return jsonify({'error': str(e)}), 401
        return f(*a, **kw)
    return w


# ═════════════════════════════════════════════════════════
# INIT DB
# ═════════════════════════════════════════════════════════
def init_db():
    """Solo crea tablas NUEVAS. NO toca las existentes."""
    os.makedirs(DB_PATH.parent, exist_ok=True)
    db = sqlite3.connect(str(DB_PATH))
    c = db.cursor()

    # Tablas nuevas (de este sistema)
    c.executescript("""
        CREATE TABLE IF NOT EXISTS usuarios(
            id INTEGER PRIMARY KEY, usuario TEXT UNIQUE,
            password_hash TEXT, rol TEXT, creado TEXT);
        CREATE TABLE IF NOT EXISTS pagos_qr(
            id INTEGER PRIMARY KEY, referencia TEXT UNIQUE,
            monto REAL, concepto TEXT, estado TEXT,
            creado TEXT, pagado TEXT);
        CREATE TABLE IF NOT EXISTS oxxo_pay(
            id INTEGER PRIMARY KEY, folio TEXT UNIQUE,
            referencia TEXT UNIQUE, monto REAL, concepto TEXT,
            titular TEXT, cuenta_destino TEXT, estado TEXT,
            firma TEXT, creado TEXT, expira TEXT,
            pagado TEXT, confirmacion TEXT);
        CREATE TABLE IF NOT EXISTS oxxo_webhooks_log(
            id INTEGER PRIMARY KEY, tipo TEXT, folio TEXT,
            payload TEXT, valido INTEGER, ip TEXT, creado TEXT);
        CREATE TABLE IF NOT EXISTS firmas_oficiales(
            id INTEGER PRIMARY KEY, folio TEXT UNIQUE,
            titular TEXT, rango TEXT, protocolo TEXT,
            valido_desde TEXT, valido_hasta TEXT,
            activo INTEGER DEFAULT 1, creado TEXT);
        CREATE TABLE IF NOT EXISTS cfdi_validados(
            id INTEGER PRIMARY KEY, uuid TEXT UNIQUE,
            rfc_emisor TEXT, rfc_receptor TEXT, total REAL,
            estatus TEXT, es_cancelable TEXT,
            estatus_cancelacion TEXT, validacion_efos TEXT,
            fecha_validacion TEXT);
        CREATE TABLE IF NOT EXISTS conciliacion_bancomer(
            id INTEGER PRIMARY KEY,
            titular_encrypted BLOB, rfc_hash TEXT,
            beneficiario_encrypted BLOB,
            cuenta_corriente_encrypted BLOB,
            cuenta_inversion_encrypted BLOB,
            tarjeta1_encrypted BLOB, tarjeta2_encrypted BLOB,
            saldo_encrypted BLOB, fideicomiso_encrypted BLOB,
            autorizacion_sat_encrypted BLOB,
            fecha_apertura TEXT, archivo_origen TEXT,
            firma_hmac TEXT, importado_at TEXT);
        CREATE TABLE IF NOT EXISTS conciliacion_atm(
            id INTEGER PRIMARY KEY, fecha_original TEXT,
            fecha_iso TEXT, tipo TEXT, monto REAL,
            concepto TEXT, archivo_origen TEXT,
            firma_hmac TEXT, importado_at TEXT);
        CREATE TABLE IF NOT EXISTS pasarela_pagos(
            id INTEGER PRIMARY KEY, folio TEXT UNIQUE,
            origen TEXT, cuenta_origen TEXT, cuenta_destino TEXT,
            monto REAL, moneda TEXT DEFAULT 'MXN', concepto TEXT,
            estado TEXT DEFAULT 'PENDIENTE', metodo TEXT,
            referencia_externa TEXT, firma_hmac TEXT,
            conciliado INTEGER DEFAULT 0,
            fecha_operacion TEXT, fecha_conciliacion TEXT, creado TEXT);
        CREATE TABLE IF NOT EXISTS cuentas(
            id INTEGER PRIMARY KEY, numero_cuenta TEXT UNIQUE,
            beneficiario_encrypted TEXT, saldo_encrypted TEXT,
            moneda TEXT DEFAULT 'MXN', activa INTEGER DEFAULT 1,
            created_at TEXT);
        CREATE TABLE IF NOT EXISTS transacciones(
            id INTEGER PRIMARY KEY, folio TEXT UNIQUE, tipo TEXT,
            origen_encrypted TEXT, destino_encrypted TEXT,
            monto_encrypted TEXT, concepto_encrypted TEXT,
            estado TEXT, firma_digital TEXT, created_at TEXT);
    """)

    # Insertar Adminf si no existe. La contraseña inicial sale de RMV_ADMIN_PASSWORD;
    # si no está definida se genera una al azar y se anota en CREDENCIALES_FILE (chmod 600).
    # (El formato del hash no cambia: SHA-256, igual que en /api/login.)
    if not c.execute("SELECT 1 FROM usuarios WHERE usuario='Adminf'").fetchone():
        clave = os.environ.get('RMV_ADMIN_PASSWORD', '')
        if not clave:
            clave = secrets.token_urlsafe(12)  # 16 caracteres al azar
            CREDENCIALES_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(CREDENCIALES_FILE, 'a', encoding='utf-8') as f:
                f.write(f"\n--- API MAESTRA v3.0 ({ahora()[:10]}) ---\n"
                        f"Usuario API:     Adminf\nContraseña API:  {clave}\n"
                        f"Base de datos:   {DB_PATH}\n")
            os.chmod(CREDENCIALES_FILE, 0o600)
            print(f"🔑 Contraseña inicial de Adminf guardada en {CREDENCIALES_FILE}")
        h = hashlib.sha256(clave.encode()).hexdigest()
        c.execute("INSERT INTO usuarios VALUES(NULL,?,?,?,?)",
                  ('Adminf', h, 'soberano', ahora()))

    db.commit()
    db.close()



# ═════════════════════════════════════════════════════════
# RUTAS BASE
# ═════════════════════════════════════════════════════════
@app.route('/')
@app.route('/panel')
def panel():
    return send_from_directory(str(PUBLIC_DIR), 'index.html')


@app.route('/oxxo')
def oxxo_panel():
    return send_from_directory(str(PUBLIC_DIR), 'oxxo.html')


@app.route('/static/<path:f>')
def static_files(f):
    return send_from_directory(str(PUBLIC_DIR), f)


@app.route('/api/health')
def health():
    db = get_db()
    return jsonify({
        'status': 'online',
        'version': '3.0.0',
        'modo': 'PRODUCCION',
        'encriptacion': 'AES-256-CBC',
        'cuentas_registradas': db.execute("SELECT COUNT(*) c FROM cuentas").fetchone()['c'],
        'transacciones_totales': db.execute("SELECT COUNT(*) c FROM transacciones").fetchone()['c'],
        'firma': 'SINCRO-SVR-99X-ALPHA',
        'timestamp': ahora()
    })


# ═════════════════════════════════════════════════════════
# AUTH
# ═════════════════════════════════════════════════════════
@app.route('/api/login', methods=['POST'])
def login():
    d = request.json or {}
    h = hashlib.sha256(d.get('password', '').encode()).hexdigest()
    row = get_db().execute(
        "SELECT * FROM usuarios WHERE usuario=? AND password_hash=?",
        (d.get('usuario', ''), h)).fetchone()
    if not row:
        return jsonify({'error': 'credenciales invalidas'}), 401
    t = jwt.encode({
        'usuario': row['usuario'],
        'rol': row['rol'],
        'exp': datetime.now(timezone.utc) + timedelta(hours=12)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': t, 'usuario': row['usuario'], 'rol': row['rol']})


# ═════════════════════════════════════════════════════════
# CUENTAS / TRANSACCIONES (adaptadas a esquema cifrado existente)
# ═════════════════════════════════════════════════════════
@app.route('/api/saldo')
@token_requerido
def saldo():
    cuenta = request.args.get('cuenta', '')
    db = get_db()
    row = db.execute("SELECT * FROM cuentas WHERE numero_cuenta=?", (cuenta,)).fetchone()
    if not row:
        return jsonify({'error': 'cuenta no existe'}), 404

    r = dict(row)
    saldo_val = 0
    try:
        if r.get('saldo_encrypted'):
            saldo_val = float(decrypt(r['saldo_encrypted']))
    except Exception:
        saldo_val = 0

    return jsonify({
        'id': r['id'],
        'numero': r['numero_cuenta'],
        'titular': decrypt(r['beneficiario_encrypted']) if r.get('beneficiario_encrypted') else '',
        'saldo': saldo_val,
        'moneda': r.get('moneda', 'MXN'),
        'activa': r.get('activa', 1),
        'creada': r.get('created_at', '')
    })


@app.route('/api/cuentas')
@token_requerido
def cuentas():
    db = get_db()
    rows = db.execute("SELECT * FROM cuentas").fetchall()
    result = []
    for row in rows:
        r = dict(row)
        try:
            titular = decrypt(r['beneficiario_encrypted']) if r.get('beneficiario_encrypted') else ''
        except Exception:
            titular = ''
        try:
            saldo_val = float(decrypt(r['saldo_encrypted'])) if r.get('saldo_encrypted') else 0
        except Exception:
            saldo_val = 0
        result.append({
            'id': r['id'],
            'numero': r['numero_cuenta'],
            'titular': titular,
            'saldo': saldo_val,
            'moneda': r.get('moneda', 'MXN'),
            'activa': r.get('activa', 1),
            'creada': r.get('created_at', '')
        })
    return jsonify(result)


@app.route('/api/transacciones')
@token_requerido
def transacciones():
    lim = int(request.args.get('limite', 20))
    db = get_db()
    rows = db.execute(
        "SELECT * FROM transacciones ORDER BY id DESC LIMIT ?", (lim,)).fetchall()
    result = []
    for row in rows:
        r = dict(row)
        monto = 0
        concepto = ''
        try:
            if r.get('monto_encrypted'):
                monto = float(decrypt(r['monto_encrypted']))
        except Exception:
            monto = 0
        try:
            if r.get('concepto_encrypted'):
                concepto = decrypt(r['concepto_encrypted'])
        except Exception:
            concepto = ''
        result.append({
            'id': r['id'],
            'folio': r.get('folio', ''),
            'tipo': r.get('tipo', ''),
            'monto': monto,
            'concepto': concepto,
            'estado': r.get('estado', ''),
            'firma': (r.get('firma_digital', '')[:16] + '...') if r.get('firma_digital') else '',
            'fecha': r.get('created_at', '')
        })
    return jsonify(result)


@app.route('/api/transaccion', methods=['POST'])
@token_requerido
def transaccion():
    d = request.json or {}
    o, dst = d.get('origen'), d.get('destino')
    m = float(d.get('monto', 0))
    db = get_db()

    co = db.execute("SELECT * FROM cuentas WHERE numero_cuenta=?", (o,)).fetchone()
    cd = db.execute("SELECT * FROM cuentas WHERE numero_cuenta=?", (dst,)).fetchone()
    if not co or not cd:
        return jsonify({'error': 'cuenta invalida'}), 404

    try:
        saldo_actual = float(decrypt(co['saldo_encrypted'])) if co['saldo_encrypted'] else 0
    except Exception:
        saldo_actual = 0

    if saldo_actual < m:
        return jsonify({'error': 'saldo insuficiente'}), 400

    folio = 'TX-' + uuid.uuid4().hex[:12].upper()
    firma = hashlib.sha256(f"{o}{dst}{m}{folio}".encode()).hexdigest()[:32]

    nuevo_saldo_o = encrypt(str(saldo_actual - m))
    try:
        saldo_dst = float(decrypt(cd['saldo_encrypted'])) if cd['saldo_encrypted'] else 0
    except Exception:
        saldo_dst = 0
    nuevo_saldo_d = encrypt(str(saldo_dst + m))

    db.execute("UPDATE cuentas SET saldo_encrypted=? WHERE numero_cuenta=?", (nuevo_saldo_o, o))
    db.execute("UPDATE cuentas SET saldo_encrypted=? WHERE numero_cuenta=?", (nuevo_saldo_d, dst))
    db.execute("""
        INSERT INTO transacciones
            (folio, tipo, origen_encrypted, destino_encrypted,
             monto_encrypted, concepto_encrypted, estado, firma_digital, created_at)
        VALUES (?, 'TRANSFERENCIA', ?, ?, ?, ?, 'CONFIRMADA', ?, ?)
    """, (folio, encrypt(o), encrypt(dst), encrypt(str(m)),
          encrypt(d.get('concepto', '')), firma, ahora()))
    db.commit()

    return jsonify({'status': 'ok', 'folio': folio, 'firma': firma, 'monto': m})


@app.route('/api/encriptacion')
def encriptacion():
    return jsonify({'algoritmo': 'AES-256-CBC', 'longitud_llave': 256,
                    'modo': 'PRODUCCION', 'firma': 'SINCRO-SVR-99X-ALPHA'})



# ═════════════════════════════════════════════════════════
# FIRMAS
# ═════════════════════════════════════════════════════════
@app.route('/api/firma/validar')
@token_requerido
def firma_validar():
    folio = request.args.get('folio', '').strip().upper()
    if not folio:
        return jsonify({'valido': False, 'error': 'folio vacío'}), 400
    db = get_db()
    row = db.execute("SELECT * FROM firmas_oficiales WHERE folio=? AND activo=1",
                     (folio,)).fetchone()
    if not row:
        return jsonify({'valido': False, 'folio': folio,
                        'mensaje': '❌ Folio no encontrado o inactivo'}), 404
    return jsonify({'valido': True, 'folio': row['folio'],
                    'titular': row['titular'], 'rango': row['rango'],
                    'protocolo': row['protocolo'],
                    'mensaje': '✅ Firma auténtica y vigente',
                    'timestamp': ahora()})


@app.route('/api/firma/listar')
@token_requerido
def firma_listar():
    rows = get_db().execute(
        "SELECT folio, titular, rango, protocolo, valido_hasta, activo FROM firmas_oficiales"
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# ═════════════════════════════════════════════════════════
# CARGAR MÓDULOS EXTERNOS (OXXO, Pasarela, Banxico)
# ═════════════════════════════════════════════════════════
MODULES_DIR = Path(os.environ.get("RMV_MODULES_DIR", str(RMV / "api" / "modules"))).expanduser()
if "RMV_MODULES_DIR" not in os.environ and not MODULES_DIR.exists():
    MODULES_DIR = Path(__file__).resolve().parent / "modules"   # módulos junto a este app.py

for mod in ['oxxo.py', 'banxico.py', 'pasarela.py', 'recargas.py']:
    mod_path = MODULES_DIR / mod
    if mod_path.exists():
        try:
            with open(mod_path) as f:
                exec(f.read(), globals())
            print(f"✅ Módulo cargado: {mod}")
        except Exception as e:
            print(f"❌ Error cargando {mod}: {e}")


@app.route('/api/modulos')
def modulos():
    """Qué módulos opcionales están cargados (lo usa el frontend para no llamar rutas inexistentes)."""
    return jsonify({
        'banxico': 'banxico_resumen' in globals(),
        'banxico_token': bool(globals().get('BANXICO_TOKEN')),
        'pasarela': 'pasarela_stats' in globals(),
        'oxxo': 'oxxo_panel' in globals() and (MODULES_DIR / 'oxxo.py').exists(),
        'recargas': (MODULES_DIR / 'recargas.py').exists(),
    })


# ═════════════════════════════════════════════════════════
if __name__ == '__main__':
    init_db()
    HOST = os.environ.get('RMV_API_HOST', '127.0.0.1')
    PORT = int(os.environ.get('RMV_API_PORT', '5001'))
    print(f"RMV CORP API v3.0 -> http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=False)
