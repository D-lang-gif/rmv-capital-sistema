#!/usr/bin/env python3
"""
Crea dos cuentas de PRUEBA en la base local (solo si no existen) para probar
/api/cuentas, /api/saldo y /api/transaccion. Usa las mismas variables de
entorno que app.py (RMV_HOME, RMV_DB_PATH, RMV_KEYS_FILE...).

Uso:  python crear_cuentas_prueba.py
"""
import sqlite3
import app as api

api.init_db()
CUENTAS = [
    ("PRUEBA-0001", "CUENTA DE PRUEBA A", "10000.00"),
    ("PRUEBA-0002", "CUENTA DE PRUEBA B", "0.00"),
]
db = sqlite3.connect(str(api.DB_PATH))
for numero, titular, saldo in CUENTAS:
    if db.execute("SELECT 1 FROM cuentas WHERE numero_cuenta=?", (numero,)).fetchone():
        print(f"Ya existe {numero}")
        continue
    db.execute(
        "INSERT INTO cuentas(numero_cuenta, beneficiario_encrypted, saldo_encrypted, moneda, activa, created_at)"
        " VALUES(?,?,?,?,?,?)",
        (numero, api.encrypt(titular), api.encrypt(saldo), "MXN", 1, api.ahora()))
    print(f"Creada {numero} ({titular}) saldo {saldo}")
db.commit()
db.close()
