import pandas as pd
import sqlite3
import os
import random

DB_PATH = "rh_data.db"

def init_db():
    """Cria banco SQLite com dados de folha de pagamento fictícios caso não exista."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS folha_pagamento (
            id_funcionario INTEGER PRIMARY KEY,
            departamento TEXT,
            salario_base REAL,
            horas_extras REAL,
            descontos REAL,
            encargos_sociais REAL
        )
    ''')
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT
        )
    ''')
    
    # Remove auto-seeding on empty table to allow deletions to persist
    # cur.execute("SELECT count(*) FROM folha_pagamento")
    # if cur.fetchone()[0] == 0:
    #     ...
    
    # Criar usuário padrão se não existir
    cur.execute("SELECT count(*) FROM users WHERE email = ?", ("admin@smarthr.com",))
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
                    ("João Melo", "admin@smarthr.com", "admin123", "Diretor HR"))
    
    conn.commit()
    conn.close()

def extract_folha():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("SELECT * FROM folha_pagamento", conn)
    conn.close()
    return df

