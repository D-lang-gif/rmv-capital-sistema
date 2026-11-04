# ============================================================
# RELAY STP / SPEI - Raúl Muñoz Villa · RMV Capital
# Firma la cadena original de registraOrden con RSA-SHA256 y la envía a STP.
# La llave privada NUNCA sale de este servidor: se lee de STP_PRIVATE_KEY_PATH.
# ============================================================
import os, base64
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

app = Flask(__name__)
CORS(app, resources={r"/stp/*": {"origins": ["https://d-lang-gif.github.io"]}})

STP_URLS = {
    'pruebas': os.environ.get('STP_URL_PRUEBAS', ''),
    'produccion': os.environ.get('STP_URL_PRODUCCION', ''),
}
AMBIENTE = os.environ.get('STP_AMBIENTE', 'pruebas')
EMPRESA = os.environ.get('STP_EMPRESA', '')

# Orden de la cadena original según el Manual API STP (https://stpmex.zendesk.com/hc/es)
# y el cliente público stpmex-python (stpmex/auth.py, ORDEN_FIELDNAMES).
ORDEN_CAMPOS = """
    institucionContraparte empresa fechaOperacion folioOrigen claveRastreo institucionOperante
    monto tipoPago tipoCuentaOrdenante nombreOrdenante cuentaOrdenante rfcCurpOrdenante
    tipoCuentaBeneficiario nombreBeneficiario cuentaBeneficiario rfcCurpBeneficiario emailBeneficiario
    tipoCuentaBeneficiario2 nombreBeneficiario2 cuentaBeneficiario2 rfcCurpBeneficiario2
    conceptoPago conceptoPago2 claveCatUsuario1 claveCatUsuario2 clavePago referenciaCobranza
    referenciaNumerica tipoOperacion topologia usuario medioEntrega prioridad iva
""".split()

CAMPOS_REQUERIDOS = ['claveRastreo', 'conceptoPago', 'cuentaBeneficiario', 'nombreBeneficiario',
                     'institucionContraparte', 'monto', 'referenciaNumerica', 'cuentaOrdenante']

_llave = None


def _llave_privada():
    """Carga (una sola vez) la llave privada PEM desde la ruta indicada por variable de entorno."""
    global _llave
    if _llave is None:
        ruta = os.environ['STP_PRIVATE_KEY_PATH']
        frase = os.environ.get('STP_KEY_PASSPHRASE')
        with open(ruta, 'rb') as f:
            _llave = serialization.load_pem_private_key(f.read(), password=frase.encode() if frase else None)
    return _llave


def cadena_original(orden):
    valores = []
    for campo in ORDEN_CAMPOS:
        v = orden.get(campo)
        if v is None:
            v = ''
        elif campo == 'monto':
            v = f'{float(v):.2f}'
        valores.append(str(v))
    return '||' + '|'.join(valores) + '||'


def firmar(cadena):
    firma = _llave_privada().sign(cadena.encode('utf-8'), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(firma).decode('ascii')


@app.route('/stp/registraOrden', methods=['POST'])
def registra_orden():
    datos = request.get_json(silent=True) or {}
    faltan = [c for c in CAMPOS_REQUERIDOS if datos.get(c) in (None, '')]
    if faltan:
        return jsonify({'estado': 'RECHAZADA', 'error': f'faltan campos: {", ".join(faltan)}'}), 400

    orden = {
        'claveRastreo': str(datos['claveRastreo']),
        'conceptoPago': str(datos['conceptoPago'])[:39],
        'cuentaBeneficiario': str(datos['cuentaBeneficiario']),
        'nombreBeneficiario': str(datos['nombreBeneficiario'])[:39],
        'rfcCurpBeneficiario': str(datos.get('rfcCurpBeneficiario') or 'ND'),
        'institucionContraparte': str(datos['institucionContraparte']),
        'institucionOperante': str(datos.get('institucionOperante') or '90646'),
        'monto': round(float(datos['monto']), 2),
        'referenciaNumerica': int(datos['referenciaNumerica']),
        'tipoPago': int(datos.get('tipoPago') or 1),
        'tipoCuentaBeneficiario': int(datos.get('tipoCuentaBeneficiario') or 40),
        'tipoCuentaOrdenante': int(datos.get('tipoCuentaOrdenante') or 40),
        'cuentaOrdenante': str(datos['cuentaOrdenante']),
        'empresa': EMPRESA or str(datos.get('empresa') or ''),
    }
    orden['firma'] = firmar(cadena_original(orden))

    try:
        url = STP_URLS.get(AMBIENTE) or ''
        if not url:
            return jsonify({'estado': 'ERROR_ENVIO', 'error': f'falta la URL de STP para el ambiente {AMBIENTE}'}), 500
        r = requests.put(url, json=orden, timeout=30)
        cuerpo = r.json()
    except Exception as e:  # red, TLS o respuesta no JSON
        return jsonify({'estado': 'ERROR_ENVIO', 'error': str(e)}), 502

    resultado = cuerpo.get('resultado', {}) if isinstance(cuerpo, dict) else {}
    id_stp = resultado.get('id')
    if id_stp and not resultado.get('descripcionError'):
        return jsonify({'id': id_stp, 'estado': 'ENVIADA', 'resultado': resultado})
    return jsonify({'id': None, 'estado': 'RECHAZADA', 'resultado': resultado}), 422


@app.route('/salud')
def salud():
    return jsonify({'ok': True, 'ambiente': AMBIENTE})


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('PORT', 5055)))
