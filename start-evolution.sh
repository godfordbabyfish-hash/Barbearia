#!/bin/sh
# Script wrapper para iniciar Evolution API sem banco de dados

# Garantir que DATABASE_ENABLED está false
export DATABASE_ENABLED=false
export REDIS_ENABLED=false

# Remover qualquer DATABASE_URL que possa estar configurado
unset DATABASE_URL
unset DATABASE_CONNECTION_URI

# Iniciar o app
cd /evolution
exec node dist/main.js
