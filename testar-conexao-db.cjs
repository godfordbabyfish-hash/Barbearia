// Script simples para testar conexão com o banco
const { Client } = require('pg');

const config = {
  host: 'shuttle.proxy.rlwy.net',
  port: 13461,
  user: 'postgres',
  password: 'liIPIQlnvkkmJjdpGjTPCpBTsDyadeyY',
  database: 'railway'
};

async function testar() {
  console.log('🔍 Testando conexão com PostgreSQL...');
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}\n`);

  try {
    const client = new Client(config);
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Verificar se evolution_db existe
    const dbCheck = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'evolution_db'"
    );
    
    if (dbCheck.rows.length > 0) {
      console.log('✅ Database evolution_db existe!');
    } else {
      console.log('⚠️  Database evolution_db NÃO existe. Criando...');
      await client.query('CREATE DATABASE evolution_db;');
      console.log('✅ Database evolution_db criado!');
    }

    await client.end();
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    if (error.code) console.error('Código:', error.code);
    process.exit(1);
  }
}

testar();
