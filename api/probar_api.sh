#!/bin/sh
# Pruebas con curl de la API MAESTRA local. Uso: ADMIN_PASS='...' sh probar_api.sh [http://127.0.0.1:5001]
B="${1:-http://127.0.0.1:5001}"
: "${ADMIN_PASS:?Define ADMIN_PASS con la contraseña de Adminf}"
s() { printf '\n### %s\n' "$1"; }
s "GET /api/health";            curl -s -w '  [HTTP %{http_code}]' "$B/api/health"
s "POST /api/login (mala)";     curl -s -w '  [HTTP %{http_code}]' -H 'Content-Type: application/json' -d '{"usuario":"Adminf","password":"clave-equivocada"}' "$B/api/login"
TOKEN=$(curl -s -H 'Content-Type: application/json' -d "{\"usuario\":\"Adminf\",\"password\":\"$ADMIN_PASS\"}" "$B/api/login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
s "POST /api/login (correcta)"; [ -n "$TOKEN" ] && echo "token OK (${#TOKEN} caracteres)" || echo "SIN TOKEN"
H="Authorization: Bearer $TOKEN"
s "GET /api/cuentas sin token"; curl -s -w '  [HTTP %{http_code}]' "$B/api/cuentas"
s "GET /api/cuentas";           curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/cuentas"
s "GET /api/saldo PRUEBA-0001"; curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/saldo?cuenta=PRUEBA-0001"
s "POST /api/transaccion 1500"; curl -s -w '  [HTTP %{http_code}]' -H "$H" -H 'Content-Type: application/json' -d '{"origen":"PRUEBA-0001","destino":"PRUEBA-0002","monto":1500,"concepto":"Prueba local"}' "$B/api/transaccion"
s "POST /api/transaccion sin saldo"; curl -s -w '  [HTTP %{http_code}]' -H "$H" -H 'Content-Type: application/json' -d '{"origen":"PRUEBA-0002","destino":"PRUEBA-0001","monto":999999,"concepto":"x"}' "$B/api/transaccion"
s "GET /api/saldo PRUEBA-0001 (después)"; curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/saldo?cuenta=PRUEBA-0001"
s "GET /api/saldo PRUEBA-0002 (después)"; curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/saldo?cuenta=PRUEBA-0002"
s "GET /api/transacciones";     curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/transacciones"
s "GET /api/encriptacion";      curl -s -w '  [HTTP %{http_code}]' "$B/api/encriptacion"
s "GET /api/firma/listar";      curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/firma/listar"
s "GET /api/banxico/resumen";   curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/banxico/resumen"
s "GET /api/banxico/udis";      curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/banxico/udis"
s "GET /api/banxico/tipocambio"; curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/banxico/tipocambio"
s "GET /api/convertir";         curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/convertir?de=MXN&a=USD&monto=100"
s "GET /api/bancomer/estado-cuenta"; curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/bancomer/estado-cuenta"
s "GET /api/atm/movimientos";   curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/atm/movimientos"
s "GET /api/pasarela/operaciones"; curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/pasarela/operaciones"
s "GET /api/pasarela/stats";    curl -s -w '  [HTTP %{http_code}]' -H "$H" "$B/api/pasarela/stats"
s "POST /api/pasarela/conciliar (sin folio)"; curl -s -w '  [HTTP %{http_code}]' -H "$H" -H 'Content-Type: application/json' -d '{}' "$B/api/pasarela/conciliar"
s "POST /api/pasarela/conciliar (folio inexistente)"; curl -s -w '  [HTTP %{http_code}]' -H "$H" -H 'Content-Type: application/json' -d '{"folio":"NO-EXISTE"}' "$B/api/pasarela/conciliar"
s "POST /api/conciliar/importar"; curl -s -w '  [HTTP %{http_code}]' -H "$H" -X POST "$B/api/conciliar/importar"
s "CORS preflight desde http://127.0.0.1:8097"; curl -s -o /dev/null -D - -X OPTIONS -H 'Origin: http://127.0.0.1:8097' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type' "$B/api/transaccion" | grep -i 'HTTP/\|access-control'
echo
