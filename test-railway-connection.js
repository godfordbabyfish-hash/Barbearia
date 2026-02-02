// Teste simples para verificar conexão com Railway
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN || 'seu-token-aqui';

async function testRailwayConnection() {
  console.log('🔍 Testando conexão com Railway...');
  
  const query = `
    query {
      projects {
        edges {
          node {
            id
            name
            services {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RAILWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', response.status, errorText);
      return;
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ Erros GraphQL:', data.errors);
      return;
    }

    console.log('✅ Projetos encontrados:');
    for (const projectEdge of data.data?.projects?.edges || []) {
      const project = projectEdge.node;
      console.log(`\n📁 Projeto: ${project.name} (ID: ${project.id})`);
      
      for (const serviceEdge of project.services?.edges || []) {
        const service = serviceEdge.node;
        console.log(`  🔧 Serviço: ${service.name} (ID: ${service.id})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testRailwayConnection();