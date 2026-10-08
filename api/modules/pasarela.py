# ============================================================
# PASARELA Y CONCILIACIÓN - Endpoints REST
# ============================================================
import os, json, base64
from flask import jsonify, request
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad


def _decrypt(enc):
    """Descifra un campo con AES-256-CBC (misma llave y misma ruta configurable que app.py)."""
    if 'AES_KEY' in globals():
        AES_KEY = globals()['AES_KEY']
    else:
        KEYS_FILE = os.environ.get('RMV_KEYS_FILE',
                                   os.path.expanduser('~/rmv_produccion/keys/master_keys.json'))
        with open(KEYS_FILE) as f:
            k = json.load(f)
        AES_KEY = base64.b64decode(k["AES_KEY"])

    if isinstance(enc, str):
        enc = enc.encode()
    if not enc:
        return ''
    raw = base64.b64decode(enc)
    iv, ct = raw[:16], raw[16:]
    cipher = AES.new(AES_KEY, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(ct), AES.block_size).decode()


# ─── BANCOMER ───
@app.route('/api/bancomer/estado-cuenta')
@token_requerido
def bancomer_estado_cuenta():
    """Devuelve el estado de cuenta descifrado."""
    db = get_db()
    row = db.execute("SELECT * FROM conciliacion_bancomer ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        return jsonify({'error': 'sin datos'}), 404

    r = dict(row)
    return jsonify({
        'id': r['id'],
        'titular': _decrypt(r['titular_encrypted']),
        'beneficiario': _decrypt(r['beneficiario_encrypted']),
        'cuenta_corriente': _decrypt(r['cuenta_corriente_encrypted']),
        'cuenta_inversion': _decrypt(r['cuenta_inversion_encrypted']),
        'tarjeta1': _decrypt(r['tarjeta1_encrypted']),
        'tarjeta2': _decrypt(r['tarjeta2_encrypted']),
        'saldo': _decrypt(r['saldo_encrypted']),
        'fideicomiso': _decrypt(r['fideicomiso_encrypted']),
        'fecha_apertura': r['fecha_apertura'],
        'archivo_origen': r['archivo_origen'],
        'firma_hmac': r['firma_hmac'][:32] + '...',
        'importado_at': r['importado_at']
    })


# ─── ATM ───
@app.route('/api/atm/movimientos')
@token_requerido
def atm_movimientos():
    """Lista todos los movimientos ATM."""
    db = get_db()
    rows = db.execute("""
        SELECT id, fecha_iso, tipo, monto, concepto, archivo_origen, importado_at
        FROM conciliacion_atm ORDER BY id DESC LIMIT 100
    """).fetchall()
    return jsonify([dict(r) for r in rows])


# ─── PASARELA ───
@app.route('/api/pasarela/operaciones')
@token_requerido
def pasarela_operaciones():
    """Lista operaciones de pasarela."""
    estado = request.args.get('estado', '')
    db = get_db()
    if estado:
        rows = db.execute(
            "SELECT * FROM pasarela_pagos WHERE estado=? ORDER BY id DESC LIMIT 100",
            (estado,)).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM pasarela_pagos ORDER BY id DESC LIMIT 100").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/pasarela/conciliar', methods=['POST'])
@token_requerido
def pasarela_conciliar():
    """Marca una operación como conciliada."""
    d = request.json or {}
    folio = d.get('folio', '')
    if not folio:
        return jsonify({'error': 'folio requerido'}), 400

    db = get_db()
    row = db.execute("SELECT * FROM pasarela_pagos WHERE folio=?", (folio,)).fetchone()
    if not row:
        return jsonify({'error': 'folio no existe'}), 404
    if row['conciliado'] == 1:
        return jsonify({'status': 'ya_conciliado', 'folio': folio}), 200

    db.execute("""
        UPDATE pasarela_pagos
        SET conciliado=1, estado='CONCILIADO', fecha_conciliacion=?
        WHERE folio=?
    """, (ahora(), folio))
    db.commit()
    return jsonify({'status': 'ok', 'folio': folio, 'estado': 'CONCILIADO'})


@app.route('/api/pasarela/stats')
@token_requerido
def pasarela_stats():
    """Estadísticas de la pasarela."""
    db = get_db()
    total = db.execute("SELECT COUNT(*) c FROM pasarela_pagos").fetchone()['c']
    pendientes = db.execute("SELECT COUNT(*) c FROM pasarela_pagos WHERE estado='PENDIENTE'").fetchone()['c']
    conciliados = db.execute("SELECT COUNT(*) c FROM pasarela_pagos WHERE conciliado=1").fetchone()['c']
    monto_total = db.execute("SELECT COALESCE(SUM(monto),0) s FROM pasarela_pagos").fetchone()['s']
    return jsonify({
        'total': total,
        'pendientes': pendientes,
        'conciliados': conciliados,
        'monto_total': monto_total,
        'timestamp': ahora()
    })


# ─── CONCILIACIÓN MANUAL ───
@app.route('/api/conciliar/importar', methods=['POST'])
@token_requerido
def conciliar_importar():
    """
    Ejecuta el conciliador (procesa archivos en imports/).
    Requiere que los archivos estén en ~/rmv_capital/imports/.
    """
    import subprocess, sys
    conciliador = os.environ.get('RMV_CONCILIADOR',
                                 str(MODULES_DIR / 'conciliador.py') if 'MODULES_DIR' in globals()
                                 else os.path.expanduser('~/rmv_capital/api/modules/conciliador.py'))
    if not os.path.isfile(conciliador):
        return jsonify({'status': 'error', 'error': 'conciliador.py no encontrado',
                        'ruta': conciliador}), 404
    try:
        r = subprocess.run(
            [sys.executable, conciliador],
            capture_output=True, text=True, timeout=120
        )
        return jsonify({
            'status': 'ok' if r.returncode == 0 else 'error',
            'stdout': r.stdout[-2000:],
            'stderr': r.stderr[-1000:] if r.stderr else ''
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
