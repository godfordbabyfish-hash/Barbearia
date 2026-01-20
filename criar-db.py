# Script Python para criar database e schema no PostgreSQL

import sys
import psycopg2
from psycopg2 import sql

print('=== Criando Database evolution_db e Schema evolution_api ===\n')

# Configurações
config = {
    'host': 'shuttle.proxy.rlwy.net',
    'port': 13461,
    'user': 'postgres',
    'password': 'liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY',
    'database': 'railway'
}

try:
    # Conectar
    print('Conectando ao PostgreSQL...')
    conn = psycopg2.connect(**config)
    conn.autocommit = True  # Necessário para criar database
    print('✅ Conectado!\n')
    
    # Criar database
    print('Criando database "evolution_db"...')
    try:
        cursor = conn.cursor()
        cursor.execute('CREATE DATABASE evolution_db;')
        print('✅ Database "evolution_db" criado!\n')
    except psycopg2.errors.DuplicateDatabase:
        print('✅ Database já existe, continuando...\n')
    
    cursor.close()
    conn.close()
    
    # Conectar no novo database
    new_config = config.copy()
    new_config['database'] = 'evolution_db'
    
    print('Conectando ao database "evolution_db"...')
    conn2 = psycopg2.connect(**new_config)
    conn2.autocommit = True
    print('✅ Conectado!\n')
    
    # Criar schema
    print('Criando schema "evolution_api"...')
    try:
        cursor2 = conn2.cursor()
        cursor2.execute('CREATE SCHEMA IF NOT EXISTS evolution_api;')
        print('✅ Schema "evolution_api" criado!\n')
    except Exception as e:
        if 'already exists' in str(e):
            print('✅ Schema já existe!\n')
        else:
            raise
    
    cursor2.close()
    conn2.close()
    
    print('=== ✅ CONCLUIDO ===\n')
    print('Agora atualize DATABASE_URL no Railway para:')
    print('postgresql://postgres:liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY@shuttle.proxy.rlwy.net:13461/evolution_db?schema=evolution_api')
    
except ImportError:
    print('❌ Biblioteca psycopg2 não encontrada!')
    print('Instale com: pip install psycopg2-binary')
    sys.exit(1)
except Exception as e:
    print(f'❌ Erro: {e}')
    sys.exit(1)
