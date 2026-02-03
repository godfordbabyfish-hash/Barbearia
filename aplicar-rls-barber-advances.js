#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

const projectId = 'wabefmgfsatlusevxyfo';
const supabaseUrl = `https://${projectId}.supabase.co`;

// Ler o arquivo SQL
const sqlContent = fs.readFileSync('aplicar-rls-barber-advances.sql', 'utf-8');

console.log('🔧 Aplicando política RLS para barbeiros solicitarem vales...\n');

// Tentar obter o token
let token = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (match) {
    token = match[1].trim();
  }
}

if (!token) {
  console.error('❌ Token não encontrado!');
  console.error('\nOpções:');
  console.error('1. Adicione SUPABASE_SERVICE_ROLE_KEY ao .env');
  console.error('2. Ou execute manualmente no Supabase Dashboard:');
  console.error(`   https://app.supabase.com/project/${projectId}/sql/new`);
  console.error('\nSQL a executar:');
  console.error(sqlContent);
  process.exit(1);
}

console.log('✅ Token encontrado\n');
console.log('📡 Enviando SQL para o Supabase...\n');

// Executar o SQL via API
const options = {
  hostname: `${projectId}.supabase.co`,
  port: 443,
  path: '/rest/v1/rpc/sql',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Política RLS aplicada com sucesso!\n');
      console.log('📊 Resposta:', data);
      process.exit(0);
    } else {
      console.error('❌ Erro ao executar SQL:');
      console.error(`Status: ${res.statusCode}`);
      console.error('Resposta:', data);
      console.error('\nTente executar manualmente:');
      console.error(`https://app.supabase.com/project/${projectId}/sql/new`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
  console.error('\nTente executar manualmente:');
  console.error(`https://app.supabase.com/project/${projectId}/sql/new`);
  process.exit(1);
});

const body = JSON.stringify({ query: sqlContent });
req.write(body);
req.end();
