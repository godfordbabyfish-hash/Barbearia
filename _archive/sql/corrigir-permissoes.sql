-- Script para corrigir permissões do usuário postgres no evolution_db
-- Execute este script via DBeaver ou online SQL client

-- 1. Garantir que o usuário postgres existe e tem a senha correta
ALTER USER postgres WITH PASSWORD 'liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY';

-- 2. Conectar ao database evolution_db (execute \c evolution_db no psql, ou selecione o database no DBeaver)

-- 3. Garantir que o usuário postgres é o owner do database
ALTER DATABASE evolution_db OWNER TO postgres;

-- 4. Garantir que o usuário postgres tem todas as permissões no database
GRANT ALL PRIVILEGES ON DATABASE evolution_db TO postgres;

-- 5. Garantir que o schema evolution_api existe e tem as permissões corretas
CREATE SCHEMA IF NOT EXISTS evolution_api;
ALTER SCHEMA evolution_api OWNER TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA evolution_api TO postgres;

-- 6. Garantir permissões em todas as tabelas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA evolution_api GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA evolution_api GRANT ALL ON SEQUENCES TO postgres;

-- 7. Verificar permissões (este SELECT deve retornar true para tudo)
SELECT 
    has_database_privilege('postgres', 'evolution_db', 'CREATE') as can_create_db,
    has_schema_privilege('postgres', 'evolution_api', 'USAGE') as can_use_schema,
    has_schema_privilege('postgres', 'evolution_api', 'CREATE') as can_create_in_schema;
