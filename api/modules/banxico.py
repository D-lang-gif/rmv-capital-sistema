# ============================================================
# BANXICO - Indicadores financieros oficiales
# ============================================================
import os, requests

BANXICO_TOKEN = os.environ.get('BANXICO_TOKEN', '')
BX = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series'
HEAD = {'Bmx-Token': BANXICO_TOKEN}

SERIES = {
    'udis':          'SP68257',
    'tipo_cambio':   'SF43718',
    'tasa_objetivo': 'SF61745',
    'cetes_28':      'SF43936',
    'tiie_28':       'SF43783',
}

def consultar(serie_ids, dias=30):
    if not BANXICO_TOKEN:
        return {'error': 'BANXICO_TOKEN no configurado'}
    from datetime import datetime, timedelta
    fi = (datetime.now() - timedelta(days=dias)).strftime('%Y-%m-%d')
    ff = datetime.now().strftime('%Y-%m-%d')
    ids = ','.join(serie_ids)
    url = f'{BX}/{ids}/datos/{fi}/{ff}'
    try:
        r = requests.get(url, headers=HEAD, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {'error': str(e)}

@app.route('/api/banxico/resumen')
@token_requerido
def banxico_resumen():
    data = consultar(list(SERIES.values()), dias=7)
    if 'error' in data:
        return jsonify({'status': 'error', 'detalle': data['error']}), 502
    out = {'consultado_at': ahora(), 'fuente': 'Banxico SIE', 'indicadores': {}}
    try:
        for s in data['bmx']['series']:
            datos = s.get('datos', [])
            ult = datos[-1] if datos else None
            if ult and ult.get('dato') and ult['dato'] != 'N/E':
                try: v = float(ult['dato'])
                except: v = ult['dato']
                out['indicadores'][s['titulo']] = {'valor': v, 'fecha': ult['fecha']}
    except Exception as e:
        return jsonify({'status': 'error', 'detalle': str(e)}), 500
    return jsonify(out)

@app.route('/api/banxico/udis')
@token_requerido
def banxico_udis():
    data = consultar([SERIES['udis']], dias=7)
    try:
        s = data['bmx']['series'][0]
        ult = s['datos'][-1]
        return jsonify({'status': 'ok', 'udis': float(ult['dato']),
                        'fecha': ult['fecha'], 'fuente': 'Banxico SIE'})
    except:
        return jsonify({'status': 'error', 'raw': str(data)[:200]}), 502

@app.route('/api/banxico/tipocambio')
@token_requerido
def banxico_tc():
    data = consultar([SERIES['tipo_cambio']], dias=7)
    try:
        s = data['bmx']['series'][0]
        ult = s['datos'][-1]
        return jsonify({'status': 'ok', 'usd_mxn': float(ult['dato']),
                        'fecha': ult['fecha'], 'fuente': 'Banxico SIE - DOF'})
    except:
        return jsonify({'status': 'error', 'raw': str(data)[:200]}), 502

@app.route('/api/convertir')
@token_requerido
def convertir():
    de = request.args.get('de', 'MXN').upper()
    a = request.args.get('a', 'USD').upper()
    monto = float(request.args.get('monto', 0))

    tc = consultar([SERIES['tipo_cambio']], dias=7)
    ud = consultar([SERIES['udis']], dias=7)
    try:
        usd_mxn = float(tc['bmx']['series'][0]['datos'][-1]['dato'])
        udis = float(ud['bmx']['series'][0]['datos'][-1]['dato'])
    except:
        return jsonify({'error': 'no se pudieron obtener indicadores'}), 502

    if de == 'MXN' and a == 'USD': r = monto / usd_mxn
    elif de == 'USD' and a == 'MXN': r = monto * usd_mxn
    elif de == 'MXN' and a == 'UDIS': r = monto / udis
    elif de == 'UDIS' and a == 'MXN': r = monto * udis
    elif de == 'USD' and a == 'UDIS': r = (monto * usd_mxn) / udis
    elif de == 'UDIS' and a == 'USD': r = (monto * udis) / usd_mxn
    elif de == a: r = monto
    else: return jsonify({'error': f'{de}->{a} no soportada'}), 400

    return jsonify({'de': de, 'a': a, 'monto': monto, 'resultado': round(r, 6),
                    'usd_mxn': usd_mxn, 'udis': udis, 'timestamp': ahora()})
