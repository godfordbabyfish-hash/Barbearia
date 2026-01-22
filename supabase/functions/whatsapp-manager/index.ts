import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

// List all instances
const listInstances = async (): Promise<{ success: boolean; instances?: any[]; error?: string }> => {
  try {
    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
    
    const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Se for Bad Gateway (502), API não está respondendo
      if (response.status === 502) {
        return { 
          success: false, 
          error: `Evolution API não está respondendo (502 Bad Gateway). A API pode estar inicializando ou indisponível.` 
        };
      }
      
      // Se for Forbidden (403), pode ser API key inválida
      if (response.status === 403) {
        return { 
          success: false, 
          error: `Acesso negado pela Evolution API. Verifique se EVOLUTION_API_KEY está correto.` 
        };
      }
      
      return { 
        success: false, 
        error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    const data = await response.json();
    
    // Transformar o formato da resposta para nosso formato
    // A resposta pode vir como array direto ou como objeto com array
    let instancesArray = [];
    if (Array.isArray(data)) {
      instancesArray = data;
    } else if (data.data && Array.isArray(data.data)) {
      instancesArray = data.data;
    } else if (data.instances && Array.isArray(data.instances)) {
      instancesArray = data.instances;
    }
    
    console.log(`[WhatsApp Manager] Processing ${instancesArray.length} instances from API`);
    
    const instances = instancesArray.map((item: any) => {
      // A Evolution API pode retornar status como 'state' ou 'status', e valores como 'open', 'close', 'connecting'
      // Verificar em múltiplos lugares: item.instance.state, item.instance.status, item.state, item.status
      const rawStatus = item.instance?.state || item.instance?.status || item.state || item.status || 'close';
      const instanceName = item.instance?.instanceName || item.instanceName || item.name;
      const instanceNumber = item.instance?.number || item.number;
      
      // Log detalhado para debug
      console.log(`[WhatsApp Manager] Instance ${instanceName}:`, {
        rawStatus,
        instanceState: item.instance?.state,
        instanceStatus: item.instance?.status,
        itemState: item.state,
        itemStatus: item.status,
        fullItem: JSON.stringify(item, null, 2).substring(0, 200) + '...',
      });
      
      // Normalizar para nosso formato: 'open', 'close', 'connecting'
      let normalizedStatus = 'close';
      const statusLower = String(rawStatus).toLowerCase();
      if (statusLower === 'open' || statusLower === 'connected' || statusLower === 'conectado' || statusLower === 'ready' || statusLower === 'authenticated') {
        normalizedStatus = 'open';
      } else if (statusLower === 'connecting' || statusLower === 'conectando' || statusLower === 'pairing') {
        normalizedStatus = 'connecting';
      } else {
        normalizedStatus = 'close';
      }
      
      console.log(`[WhatsApp Manager] Instance ${instanceName} normalized status: ${normalizedStatus} (from raw: ${rawStatus})`);
      
      return {
        instanceName,
        status: normalizedStatus,
        number: instanceNumber,
      };
    });
    
    console.log(`[WhatsApp Manager] Final instances list:`, instances.map(i => ({ name: i.instanceName, status: i.status })));

    return { success: true, instances };
  } catch (error: any) {
    console.error('[WhatsApp Manager] Error listing instances:', error);
    
    // Detectar timeout ou erro de conexão
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('tempo limite')) {
      return {
        success: false,
        error: 'Evolution API não está respondendo (timeout). A API pode estar inicializando ou indisponível. Considere migrar para Baileys + Railway para uma solução mais confiável.'
      };
    }
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Não foi possível conectar à Evolution API. Verifique se a API está rodando e se EVOLUTION_API_URL está correto. Considere migrar para Baileys + Railway.'
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Erro ao listar instâncias. Verifique se a Evolution API está acessível.' 
    };
  }
};

// Create new instance
const createInstance = async (instanceName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`[WhatsApp Manager] Creating instance: ${instanceName}`);
    console.log(`[WhatsApp Manager] API URL: ${evolutionApiUrl}`);
    console.log(`[WhatsApp Manager] Has API Key: ${!!evolutionApiKey}`);
    
    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
    
    const response = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        instanceName,
        token: `token-${instanceName}-${Date.now()}`,
        qrcode: true,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log(`[WhatsApp Manager] Create response status: ${response.status}`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Se a instância já existe (409), retornar sucesso
      if (response.status === 409) {
        console.log(`[WhatsApp Manager] Instance ${instanceName} already exists`);
        return { success: true };
      }
      
      // Se for Bad Gateway (502), API não está respondendo
      if (response.status === 502) {
        console.error(`[WhatsApp Manager] 502 Bad Gateway - Evolution API não está respondendo`);
        return { 
          success: false, 
          error: `Evolution API não está respondendo (502 Bad Gateway). A API pode estar inicializando ou indisponível. Aguarde alguns minutos e tente novamente.` 
        };
      }
      
      // Se for Forbidden (403), pode ser API key inválida ou URL errada
      if (response.status === 403) {
        // Tentar verificar se a instância já existe na lista
        const checkResult = await listInstances();
        if (checkResult.success && checkResult.instances) {
          const exists = checkResult.instances.some(i => i.instanceName === instanceName);
          if (exists) {
            console.log(`[WhatsApp Manager] Instance ${instanceName} exists (403 but found in list)`);
            return { success: true };
          }
        }
        
        // Se não encontrou na lista, retornar erro
        console.error(`[WhatsApp Manager] 403 Forbidden - API Key or URL may be incorrect`);
        return { 
          success: false, 
          error: `Acesso negado pela Evolution API. Verifique se EVOLUTION_API_URL e EVOLUTION_API_KEY estão corretos. Detalhes: ${errorData.message || errorData.error || 'Forbidden'}` 
        };
      }
      
      return { 
        success: false, 
        error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[WhatsApp Manager] Error creating instance:', error);
    
    // Detectar timeout ou erro de conexão
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return { 
        success: false, 
        error: `Timeout ao criar instância. Evolution API não respondeu a tempo. A API pode estar indisponível.` 
      };
    }
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: `Não foi possível conectar à Evolution API. Verifique se a API está rodando e se EVOLUTION_API_URL está correto.` 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Erro ao criar instância. Verifique se a Evolution API está acessível.' 
    };
  }
};

// Get QR code for instance
const getQRCode = async (instanceName: string): Promise<{ success: boolean; qrcode?: any; error?: string }> => {
  try {
    // Primeiro, verificar o status da instância
    const instancesResult = await listInstances();
    let instance = null;
    if (instancesResult.success && instancesResult.instances) {
      instance = instancesResult.instances.find((i: any) => i.instanceName === instanceName);
      if (instance) {
        // Se a instância já está conectada (open), precisamos desconectar primeiro para gerar novo QR code
        if (instance.status === 'open') {
          console.log(`[WhatsApp Manager] Instance ${instanceName} is already connected. Disconnecting to generate new QR code...`);
          try {
            const disconnectResponse = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
              method: 'DELETE',
              headers: {
                'apikey': evolutionApiKey,
              },
            });
            console.log('[WhatsApp Manager] Logout response status:', disconnectResponse.status);
            // Aguardar um pouco para a desconexão processar
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e) {
            console.warn('[WhatsApp Manager] Error during logout (may be OK):', e);
          }
        }
      }
    }

    // Agora tentar conectar e obter QR code
    const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Se for Forbidden (403), pode ser API key inválida
      if (response.status === 403) {
        return { 
          success: false, 
          error: `Acesso negado pela Evolution API. Verifique se EVOLUTION_API_KEY está correto. Detalhes: ${errorData.message || errorData.error || 'Forbidden'}` 
        };
      }
      
      // Se for Not Found (404), a instância não existe
      if (response.status === 404) {
        return { 
          success: false, 
          error: `Instância "${instanceName}" não encontrada. Crie a instância primeiro.` 
        };
      }
      
      return { 
        success: false, 
        error: errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    const data = await response.json();
    console.log('[WhatsApp Manager] connect response raw:', JSON.stringify(data, null, 2));
    
    // O QR code pode vir em diferentes formatos ou aninhado em "instance"
    let qrcode = null;

    // Verificar se a instância já está conectada na resposta
    if (data.instance?.state === 'open' || data.instance?.status === 'open') {
      console.log('[WhatsApp Manager] Instance is already connected, cannot generate QR code');
      return { 
        success: false, 
        error: 'A instância já está conectada. Desconecte primeiro para gerar novo QR code.' 
      };
    }

    // Tentar encontrar QR code em diferentes formatos
    // Formato 1: { qrcode: { base64: "...", code: "..." } }
    if (data.qrcode) {
      qrcode = data.qrcode;
      console.log('[WhatsApp Manager] Found QR code in data.qrcode');
    } 
    // Formato 2: { base64: "..." }
    else if (data.base64) {
      qrcode = { base64: data.base64 };
      console.log('[WhatsApp Manager] Found QR code in data.base64');
    } 
    // Formato 3: { code: "..." }
    else if (data.code) {
      qrcode = { code: data.code };
      console.log('[WhatsApp Manager] Found QR code in data.code');
    } 
    // Formato 4: { instance: { qrcode: { base64: "...", code: "..." } } }
    else if (data.instance?.qrcode) {
      qrcode = data.instance.qrcode;
      console.log('[WhatsApp Manager] Found QR code in data.instance.qrcode');
    } 
    // Formato 5: { instance: { qrcode_base64: "..." } }
    else if (data.instance?.qrcode_base64) {
      qrcode = { base64: data.instance.qrcode_base64 };
      console.log('[WhatsApp Manager] Found QR code in data.instance.qrcode_base64');
    } 
    // Formato 6: { qrcode: { base64: "..." } }
    else if (data.qrcode?.base64) {
      qrcode = { base64: data.qrcode.base64 };
      console.log('[WhatsApp Manager] Found QR code in data.qrcode.base64');
    } 
    // Formato 7: { qrcode: { code: "..." } }
    else if (data.qrcode?.code) {
      qrcode = { code: data.qrcode.code };
      console.log('[WhatsApp Manager] Found QR code in data.qrcode.code');
    }
    // Formato 8: Verificar se há algum campo que contenha "qr" ou "code"
    else {
      // Procurar por qualquer campo que possa conter o QR code
      const allKeys = Object.keys(data);
      console.log('[WhatsApp Manager] All response keys:', allKeys);
      
      for (const key of allKeys) {
        if (key.toLowerCase().includes('qr') || key.toLowerCase().includes('code')) {
          console.log(`[WhatsApp Manager] Found potential QR code field: ${key}`, data[key]);
          if (typeof data[key] === 'string') {
            qrcode = { base64: data[key] };
            break;
          } else if (data[key] && typeof data[key] === 'object') {
            qrcode = data[key];
            break;
          }
        }
      }
    }

    if (!qrcode) {
      console.error('[WhatsApp Manager] QR code not found in response structure');
      console.error('[WhatsApp Manager] Full response structure:', JSON.stringify(data, null, 2));
      console.error('[WhatsApp Manager] Response keys:', Object.keys(data));
      if (data.instance) {
        console.error('[WhatsApp Manager] Instance keys:', Object.keys(data.instance));
      }
      
      return { 
        success: false, 
        error: 'QR code não disponível na resposta da API. Verifique os logs do Supabase para mais detalhes.' 
      };
    }

    console.log('[WhatsApp Manager] QR code extracted successfully:', {
      hasBase64: !!qrcode.base64,
      hasCode: !!qrcode.code,
      keys: Object.keys(qrcode),
    });

    return { success: true, qrcode };
  } catch (error: any) {
    console.error('[WhatsApp Manager] Error getting QR code:', error);
    return { 
      success: false, 
      error: error.message || 'Erro ao obter QR code. Verifique se a Evolution API está acessível.' 
    };
  }
};

// Disconnect/logout instance
const disconnectInstance = async (instanceName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`[WhatsApp Manager] Disconnecting instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Se for 404, pode ser que a instância não esteja conectada (isso é OK)
      if (response.status === 404) {
        console.log(`[WhatsApp Manager] Instance ${instanceName} not found or already disconnected`);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: errorData.message || errorData.error || `HTTP ${response.status}` 
      };
    }

    console.log(`[WhatsApp Manager] Instance ${instanceName} disconnected successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`[WhatsApp Manager] Error disconnecting instance:`, error);
    return { 
      success: false, 
      error: error.message || 'Erro ao desconectar instância' 
    };
  }
};

// Delete instance
const deleteInstance = async (instanceName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || errorData.error || `HTTP ${response.status}` 
      };
    }

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Erro ao deletar instância' 
    };
  }
};

// Set active instance (store in database)
const setActiveInstance = async (instanceName: string, supabase: any): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verificar se a instância existe e está conectada
    const instancesResult = await listInstances();
    if (!instancesResult.success || !instancesResult.instances) {
      return { 
        success: false, 
        error: 'Erro ao verificar instâncias' 
      };
    }

    const instance = instancesResult.instances.find(i => i.instanceName === instanceName);
    if (!instance) {
      return { 
        success: false, 
        error: 'Instância não encontrada' 
      };
    }

    if (instance.status !== 'open') {
      return { 
        success: false, 
        error: 'A instância precisa estar conectada (status: open) para ser ativada' 
      };
    }

    // Salvar a instância ativa no banco de dados (site_config)
    const { error: upsertError } = await supabase
      .from('site_config')
      .upsert({
        config_key: 'whatsapp_active_instance',
        config_value: {
          instanceName,
          number: instance.number,
          status: instance.status,
          updatedAt: new Date().toISOString()
        }
      }, {
        onConflict: 'config_key'
      });

    if (upsertError) {
      console.error('[WhatsApp Manager] Error saving active instance:', upsertError);
      return { 
        success: false, 
        error: 'Erro ao salvar instância ativa no banco de dados' 
      };
    }
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Erro ao configurar instância ativa' 
    };
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Check if environment variables are set
    if (!evolutionApiUrl || !evolutionApiKey) {
      console.error('[WhatsApp Manager] Missing environment variables:', {
        hasUrl: !!evolutionApiUrl,
        hasKey: !!evolutionApiKey
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Variáveis de ambiente não configuradas. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no Supabase.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log para debug (sem expor valores sensíveis)
    console.log('[WhatsApp Manager] Environment check:', {
      hasUrl: !!evolutionApiUrl,
      hasKey: !!evolutionApiKey,
      urlPrefix: evolutionApiUrl?.substring(0, 30) + '...'
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const body = await req.json().catch(() => ({}));
    const { action, instanceName } = body;

    let result;

    switch (action) {
      case 'health':
        // Endpoint simples para testar se a função está respondendo
        result = { success: true, message: 'whatsapp-manager ok' };
        break;

      case 'debug-fetch':
        // Diagnóstico bruto da Evolution API: não usar em produção final
        try {
          const debugResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
              'apikey': evolutionApiKey,
              'Accept': 'application/json',
            },
          });

          const text = await debugResponse.text();

          result = {
            success: debugResponse.ok,
            status: debugResponse.status,
            statusText: debugResponse.statusText,
            rawBody: text,
          };
        } catch (err: any) {
          result = {
            success: false,
            error: err?.message || 'Erro ao chamar Evolution API em debug-fetch',
          };
        }
        break;

      case 'list':
        result = await listInstances();
        // Se não houver instâncias E não houver erro (API está funcionando), tentar criar instance-1 automaticamente
        if (result.success && (!result.instances || result.instances.length === 0) && !result.error) {
          console.log('[WhatsApp Manager] No instances found, attempting to create instance-1 automatically');
          const createResult = await createInstance('instance-1');
          if (createResult.success) {
            // Aguardar um pouco e recarregar lista após criar
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await listInstances();
          } else {
            // Se falhar ao criar, ainda retornar lista vazia (não é erro crítico)
            console.warn('[WhatsApp Manager] Failed to auto-create instance-1:', createResult.error);
            // Se o erro for 502 ou timeout, não tentar criar novamente
            if (createResult.error?.includes('502') || createResult.error?.includes('timeout')) {
              result.error = createResult.error;
            }
          }
        }
        break;

      case 'create':
        if (!instanceName) {
          return new Response(
            JSON.stringify({ success: false, error: 'instanceName é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Verificar se a instância já existe antes de tentar criar
        const existingCheck = await listInstances();
        if (existingCheck.success && existingCheck.instances) {
          const alreadyExists = existingCheck.instances.some((i: any) => i.instanceName === instanceName);
          if (alreadyExists) {
            console.log(`[WhatsApp Manager] Instance ${instanceName} already exists, skipping create`);
            result = { success: true };
          } else {
            result = await createInstance(instanceName);
          }
        } else {
          result = await createInstance(instanceName);
        }
        break;

      case 'get-qrcode':
        if (!instanceName) {
          return new Response(
            JSON.stringify({ success: false, error: 'instanceName é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await getQRCode(instanceName);
        break;

      case 'disconnect':
        if (!instanceName) {
          return new Response(
            JSON.stringify({ success: false, error: 'instanceName é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await disconnectInstance(instanceName);
        break;

      case 'delete':
        if (!instanceName) {
          return new Response(
            JSON.stringify({ success: false, error: 'instanceName é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await deleteInstance(instanceName);
        break;

      case 'set-active':
        if (!instanceName) {
          return new Response(
            JSON.stringify({ success: false, error: 'instanceName é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await setActiveInstance(instanceName, supabase);
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Ação não reconhecida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[WhatsApp Manager] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
