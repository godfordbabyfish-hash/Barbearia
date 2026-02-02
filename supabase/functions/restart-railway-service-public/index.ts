import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Recebida requisição para restart Railway (versão CLI automática)')
    
    const { action, serviceName } = await req.json()
    console.log('🔄 Dados recebidos:', { action, serviceName })

    if (action !== 'restart') {
      return new Response(
        JSON.stringify({ success: false, error: 'Ação inválida. Use action: "restart"' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    if (!serviceName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome do serviço é obrigatório' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Verificar se o token existe
    const railwayToken = Deno.env.get('RAILWAY_TOKEN')
    if (!railwayToken) {
      console.error('❌ RAILWAY_TOKEN não configurado')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RAILWAY_TOKEN não configurado nas variáveis de ambiente' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('🔑 Token Railway encontrado, comprimento:', railwayToken.length)

    // Instalar Railway CLI e executar comando de restart
    console.log('📦 Instalando Railway CLI...')
    
    // Baixar e instalar Railway CLI
    const installProcess = new Deno.Command("sh", {
      args: ["-c", "curl -fsSL https://railway.app/install.sh | sh"],
      stdout: "piped",
      stderr: "piped",
    })
    
    const installResult = await installProcess.output()
    
    if (!installResult.success) {
      const installError = new TextDecoder().decode(installResult.stderr)
      console.error('❌ Erro ao instalar Railway CLI:', installError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao instalar Railway CLI: ${installError}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    console.log('✅ Railway CLI instalado com sucesso')
    
    // Configurar token do Railway
    console.log('🔑 Configurando token do Railway...')
    
    const loginProcess = new Deno.Command("railway", {
      args: ["login", "--token", railwayToken],
      stdout: "piped",
      stderr: "piped",
    })
    
    const loginResult = await loginProcess.output()
    
    if (!loginResult.success) {
      const loginError = new TextDecoder().decode(loginResult.stderr)
      console.error('❌ Erro ao fazer login no Railway:', loginError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao fazer login no Railway: ${loginError}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    console.log('✅ Login no Railway realizado com sucesso')
    
    // Listar projetos para encontrar o correto
    console.log('🔍 Listando projetos...')
    
    const listProcess = new Deno.Command("railway", {
      args: ["list"],
      stdout: "piped",
      stderr: "piped",
    })
    
    const listResult = await listProcess.output()
    const listOutput = new TextDecoder().decode(listResult.stdout)
    
    console.log('📋 Projetos encontrados:', listOutput)
    
    // Conectar ao projeto correto (powerful-grace)
    console.log('🔗 Conectando ao projeto powerful-grace...')
    
    const connectProcess = new Deno.Command("railway", {
      args: ["link", "powerful-grace"],
      stdout: "piped",
      stderr: "piped",
    })
    
    const connectResult = await connectProcess.output()
    
    if (!connectResult.success) {
      const connectError = new TextDecoder().decode(connectResult.stderr)
      console.error('❌ Erro ao conectar ao projeto:', connectError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao conectar ao projeto: ${connectError}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    console.log('✅ Conectado ao projeto powerful-grace')
    
    // Reiniciar o serviço específico
    console.log(`🔄 Reiniciando serviço ${serviceName}...`)
    
    const restartProcess = new Deno.Command("railway", {
      args: ["service", "restart", serviceName],
      stdout: "piped",
      stderr: "piped",
    })
    
    const restartResult = await restartProcess.output()
    const restartOutput = new TextDecoder().decode(restartResult.stdout)
    const restartError = new TextDecoder().decode(restartResult.stderr)
    
    console.log('📊 Resultado do restart:', restartOutput)
    
    if (!restartResult.success) {
      console.error('❌ Erro ao reiniciar serviço:', restartError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao reiniciar serviço: ${restartError}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }
    
    console.log(`✅ Serviço ${serviceName} reiniciado com sucesso via Railway CLI!`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Serviço ${serviceName} reiniciado com sucesso via Railway CLI`,
        method: 'Railway CLI',
        output: restartOutput
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro na função restart-railway-service-public:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Erro interno: ${error.message}`,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})