import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  QrCode, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Smartphone,
  AlertCircle,
  LogOut
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppInstance {
  instanceName: string;
  status: 'open' | 'close' | 'connecting';
  number?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
}

// Cache keys para localStorage
const CACHE_KEYS = {
  API_STATUS: 'whatsapp_api_status',
  LAST_SUCCESS: 'whatsapp_last_success',
  INSTANCES_CACHE: 'whatsapp_instances_cache',
  API_READY: 'whatsapp_api_ready',
};

// Helper para verificar se API estava funcionando recentemente (últimos 5 minutos)
const wasApiWorkingRecently = (): boolean => {
  try {
    const lastSuccess = localStorage.getItem(CACHE_KEYS.LAST_SUCCESS);
    if (!lastSuccess) return false;
    
    const lastSuccessTime = parseInt(lastSuccess, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos em ms
    
    return (now - lastSuccessTime) < fiveMinutes;
  } catch {
    return false;
  }
};

// Helper para verificar se API já foi confirmada como pronta
const isApiConfirmedReady = (): boolean => {
  try {
    return localStorage.getItem(CACHE_KEYS.API_READY) === 'true';
  } catch {
    return false;
  }
};

// Helper para marcar API como pronta
const markApiAsReady = () => {
  try {
    localStorage.setItem(CACHE_KEYS.API_READY, 'true');
    localStorage.setItem(CACHE_KEYS.LAST_SUCCESS, Date.now().toString());
  } catch {
    // Ignorar erros de localStorage
  }
};

// Helper para marcar sucesso na verificação
const markApiSuccess = () => {
  try {
    localStorage.setItem(CACHE_KEYS.LAST_SUCCESS, Date.now().toString());
    localStorage.setItem(CACHE_KEYS.API_READY, 'true');
  } catch {
    // Ignorar erros de localStorage
  }
};

export const WhatsAppManager = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>(() => {
    // Tentar carregar do cache ao inicializar
    try {
      const cached = localStorage.getItem(CACHE_KEYS.INSTANCES_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Verificar se cache não está muito antigo (mais de 2 minutos)
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 2 * 60 * 1000) {
          return parsed.instances || [];
        }
      }
    } catch {
      // Ignorar erros de cache
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeInstance, setActiveInstance] = useState<string | null>(null);
  const [autoCreated, setAutoCreated] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Carregar instâncias e instância ativa ao montar
  useEffect(() => {
    loadInstances();
    loadActiveInstance();
    
    // Polling MUITO menos frequente para evitar ERR_INSUFFICIENT_RESOURCES
    // Apenas se não houver erro persistente
    let intervalId: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      // Limpar qualquer intervalo anterior
      if (intervalId) clearInterval(intervalId);
      
      // Só fazer polling se não houver erro persistente
      if (!hasError && errorCount < 3) {
        intervalId = setInterval(() => {
          // Só fazer polling se não estiver carregando e não houver erro
          if (!loading && !hasError && errorCount < 3) {
            loadInstances();
          }
        }, 30000); // 30 segundos - muito menos frequente
      }
    };
    
    // Iniciar polling após 5 segundos
    const timeoutId = setTimeout(startPolling, 5000);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [hasError, errorCount]); // Dependências mínimas

  // Criar instância única automaticamente se não existir nenhuma (apenas uma vez)
  useEffect(() => {
    const autoCreateInstance = async () => {
      // Se já tentou criar automaticamente, não tentar novamente
      if (autoCreated) return;
      
      // Aguardar um pouco para carregar as instâncias primeiro
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Se não há instâncias e não está carregando, criar automaticamente
      // Mas só se não houver erro 502 (API não está respondendo)
      if (instances.length === 0 && !loading) {
        const defaultInstanceName = 'evolution-4';
        console.log('[WhatsApp Manager] Nenhuma instância encontrada. Tentando criar automaticamente:', defaultInstanceName);
        
        setAutoCreated(true); // Marcar que já tentou criar
        
        try {
          const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
            body: { 
              action: 'create',
              instanceName: defaultInstanceName
            }
          });

          // Se a API não está respondendo (502), não tentar criar ainda
          if (error || (data?.error && (data.error.includes('502') || data.error.includes('Bad Gateway') || data.error.includes('não está respondendo')))) {
            console.log('[WhatsApp Manager] API ainda não está pronta, aguardando...');
            setAutoCreated(false); // Permitir tentar novamente quando API estiver pronta
            return;
          }

          if (!error && data?.success) {
            console.log('[WhatsApp Manager] Instância criada automaticamente:', defaultInstanceName);
            await loadInstances();
            
            // Após criar, gerar QR code automaticamente após um delay
            setTimeout(async () => {
              await getQRCode(defaultInstanceName);
            }, 2000);
          } else {
            // Se falhou por outro motivo, permitir tentar novamente depois
            setAutoCreated(false);
          }
        } catch (error: any) {
          console.error('[WhatsApp Manager] Erro ao criar instância automaticamente:', error);
          // Se for erro de conexão/timeout, permitir tentar novamente
          if (error.message?.includes('502') || error.message?.includes('timeout') || error.message?.includes('Failed to fetch')) {
            setAutoCreated(false);
          }
        }
      }
    };

    autoCreateInstance();
  }, [instances.length, loading, autoCreated]);

  const loadActiveInstance = async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'whatsapp_active_instance')
        .maybeSingle(); // Usa maybeSingle() ao invés de single() para evitar erro 406 quando não há registro

      if (!error && data?.config_value) {
        const config = data.config_value as any;
        setActiveInstance(config.instanceName || null);
      }
    } catch (error) {
      // Ignorar erros silenciosamente (pode ser que a tabela não exista ainda)
      console.debug('Erro ao carregar instância ativa (pode ser normal se não houver configuração):', error);
    }
  };

  // Parar polling quando componente desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const loadInstances = async () => {
    setLoading(true);
    try {
      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { action: 'list' },
        signal: controller.signal as any
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      if (data?.success && data?.instances) {
        // Resetar contador de erros se conseguir carregar
        setErrorCount(0);
        setHasError(false);
        
        // Marcar API como funcionando
        markApiSuccess();
        
        // Cachear instâncias
        try {
          localStorage.setItem(CACHE_KEYS.INSTANCES_CACHE, JSON.stringify({
            instances: data.instances,
            timestamp: Date.now(),
          }));
        } catch {
          // Ignorar erros de cache
        }
        
        // Verificar se alguma instância mudou de status para 'open'
        const previousInstances = instances;
        const newInstances = data.instances;
        
        console.log('[WhatsApp Manager Frontend] Previous instances:', previousInstances.map(i => ({ name: i.instanceName, status: i.status })));
        console.log('[WhatsApp Manager Frontend] New instances:', newInstances.map((i: WhatsAppInstance) => ({ name: i.instanceName, status: i.status })));
        
        // Comparar status anterior com novo para detectar conexão
        for (const newInstance of newInstances) {
          const previousInstance = previousInstances.find((i: WhatsAppInstance) => i.instanceName === newInstance.instanceName);
          const statusChanged = previousInstance && previousInstance.status !== newInstance.status;
          
          console.log(`[WhatsApp Manager Frontend] Instance ${newInstance.instanceName}:`, {
            previousStatus: previousInstance?.status,
            newStatus: newInstance.status,
            statusChanged,
          });
          
          if (statusChanged && newInstance.status === 'open') {
            // Instância acabou de conectar!
            console.log(`[WhatsApp Manager Frontend] ✅ Instance ${newInstance.instanceName} just connected!`);
            toast.success(`WhatsApp ${newInstance.instanceName} conectado com sucesso!`);
            
            // Se era a instância que estava esperando QR code, limpar
            if (selectedInstance === newInstance.instanceName && qrCode) {
              setQrCode(null);
              setSelectedInstance(null);
              if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
              }
            }
          }
        }
        
        setInstances(newInstances);
        
        // Se há uma instância selecionada, atualizar QR code se necessário
        if (selectedInstance && qrCode) {
          const instance = newInstances.find((i: WhatsAppInstance) => i.instanceName === selectedInstance);
          if (instance?.status === 'open') {
            // Instância conectada, parar polling de QR code
            console.log('[WhatsApp Manager Frontend] Instance connected! Stopping QR code polling');
            setQrCode(null);
            setSelectedInstance(null);
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
            toast.success('WhatsApp conectado com sucesso!');
          } else {
            console.log(`[WhatsApp Manager Frontend] Instance status: ${instance?.status}, still waiting for connection...`);
          }
        }
      } else if (data?.error) {
        // Se houver erro mas não for crítico, apenas logar
        console.warn('Aviso ao carregar instâncias:', data.error);
        
        // Se for erro 502 (API não está respondendo), incrementar contador
        if (data.error.includes('502') || data.error.includes('Bad Gateway') || data.error.includes('não está respondendo')) {
          const newErrorCount = errorCount + 1;
          setErrorCount(newErrorCount);
          
          // Se API já estava funcionando recentemente, não mostrar "inicializando"
          const wasWorking = wasApiWorkingRecently();
          const isConfirmed = isApiConfirmedReady();
          
          if (newErrorCount >= 5) {
            setHasError(true);
            console.log('[WhatsApp Manager] Muitos erros 502 - parando polling.');
            
            // Só mostrar "inicializando" se nunca funcionou ou se passou muito tempo
            if (!wasWorking && !isConfirmed) {
              toast.error('Evolution API ainda está inicializando', {
                description: 'Aguarde alguns minutos e recarregue a página. A instância será criada automaticamente quando a API estiver pronta.',
                duration: 10000
              });
            } else {
              // API estava funcionando, pode ser problema temporário
              toast.warning('Evolution API temporariamente indisponível', {
                description: 'A API estava funcionando recentemente. Pode ser um problema temporário. Tente novamente em alguns segundos.',
                duration: 8000
              });
            }
          } else {
            console.log('[WhatsApp Manager] API com erro 502, aguardando... (tentativa ' + newErrorCount + '/5)');
          }
        } else if (data.error.includes('Acesso negado') && instances.length === 0) {
          // Mostrar toast apenas uma vez para erros de autenticação
          toast.error('Erro de autenticação', {
            description: 'Verifique se EVOLUTION_API_URL e EVOLUTION_API_KEY estão corretos no Supabase',
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar instâncias:', error);
      
      // Detectar FunctionsFetchError (Edge Function não responde)
      const isFunctionsFetchError = error?.name === 'FunctionsFetchError' || 
                                    error?.message?.includes('Failed to send a request to the Edge Function') ||
                                    error?.message?.includes('FunctionsFetchError');
      
      // Se for timeout, erro de conexão ou FunctionsFetchError, incrementar contador
      if (error.name === 'AbortError' || 
          error.message?.includes('timeout') || 
          error.message?.includes('Failed to fetch') ||
          isFunctionsFetchError) {
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
        
        if (newErrorCount >= 5) { // Reduzido para 5 tentativas
          setHasError(true);
          console.log('[WhatsApp Manager] Muitos erros - parando polling. Edge Function não está respondendo.');
          
          if (isFunctionsFetchError) {
            toast.error('Edge Function não está respondendo', {
              description: 'A Edge Function whatsapp-manager não está disponível. Verifique se está deployada no Supabase ou se há problemas de conexão.',
              duration: 10000
            });
          } else {
            toast.error('Evolution API ainda está inicializando', {
              description: 'Aguarde alguns minutos e recarregue a página. A instância será criada automaticamente quando a API estiver pronta.',
              duration: 10000
            });
          }
        } else {
          if (isFunctionsFetchError) {
            console.log('[WhatsApp Manager] Edge Function não responde - aguardando... (tentativa ' + newErrorCount + '/5)');
          } else {
            console.log('[WhatsApp Manager] Timeout ou erro de conexão - API ainda inicializando (tentativa ' + newErrorCount + '/5)');
          }
        }
      } else {
        // Para outros erros, apenas logar
        console.error('[WhatsApp Manager] Erro desconhecido:', error);
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);
        if (newErrorCount >= 5) {
          setHasError(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };


  const getQRCode = async (instanceName: string) => {
    setLoading(true);
    setSelectedInstance(instanceName);
    try {
      // SEMPRE desconectar primeiro para garantir que podemos gerar novo QR code
      toast.info('Desconectando instância para gerar novo QR code...', {
        duration: 2000,
      });
      
      // Desconectar primeiro (mesmo que pareça desconectada na UI)
      const { data: disconnectData, error: disconnectError } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'disconnect',
          instanceName
        }
      });
      
      // Ignorar erros de desconexão (pode já estar desconectada)
      if (disconnectError) {
        console.warn('Erro ao desconectar (pode já estar desconectada):', disconnectError);
      }
      
      // Aguardar desconexão processar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Recarregar lista para atualizar status
      await loadInstances();
      
      // Garantir que a instância existe (criar se necessário)
      const { data: createData, error: createError } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'create',
          instanceName
        }
      });
      
      // Ignorar erro se a instância já existe
      if (createError && !createData?.success) {
        console.warn('Erro ao criar instância (pode já existir):', createError);
      }
      
      // Aguardar um pouco para a instância ser criada
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Agora obter o QR code
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'get-qrcode',
          instanceName
        }
      });

      if (error) throw error;

      console.log('[WhatsApp Manager Frontend] getQRCode response:', data);
      
      if (data?.success && data?.qrcode) {
        console.log('[WhatsApp Manager Frontend] QR code received:', {
          hasBase64: !!data.qrcode.base64,
          hasCode: !!data.qrcode.code,
          qrcodeKeys: Object.keys(data.qrcode),
          qrcodeType: typeof data.qrcode,
        });
        
        // Se o QR code vem em base64
        if (data.qrcode.base64) {
          const base64String = typeof data.qrcode.base64 === 'string' 
            ? data.qrcode.base64 
            : String(data.qrcode.base64);
          
          // Remover espaços em branco e quebras de linha
          const cleanBase64 = base64String.trim().replace(/\s/g, '');
          
          // Garantir que não tem prefixo duplicado
          const qrCodeData = cleanBase64.startsWith('data:image') 
            ? cleanBase64 
            : `data:image/png;base64,${cleanBase64}`;
          
          console.log('[WhatsApp Manager Frontend] Setting QR code as base64 image, length:', qrCodeData.length);
          setQrCode(qrCodeData);
        } else if (data.qrcode.code) {
          // Se vem como código direto (string do QR code)
          console.log('[WhatsApp Manager Frontend] Setting QR code as text code, length:', data.qrcode.code.length);
          setQrCode(String(data.qrcode.code));
        } else {
          console.error('[WhatsApp Manager Frontend] QR code format not recognized:', data.qrcode);
          console.error('[WhatsApp Manager Frontend] Full qrcode object:', JSON.stringify(data.qrcode, null, 2));
          throw new Error('QR code não disponível no formato esperado. Verifique os logs do console.');
        }

        toast.success('QR code gerado! Escaneie com seu WhatsApp.');
        
        // Iniciar polling mais frequente para verificar conexão (a cada 3 segundos quando esperando QR code)
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        const interval = setInterval(async () => {
          console.log('[WhatsApp Manager] Polling for connection status...');
          await loadInstances();
        }, 3000); // 3 segundos quando esperando conexão após QR code
        setPollingInterval(interval);
        
        // Também configurar timeout para parar polling após 5 minutos (caso não conecte)
        const timeoutId = setTimeout(() => {
          if (interval) {
            clearInterval(interval);
            setPollingInterval(null);
            if (qrCode && selectedInstance) {
              toast.info('Tempo de espera esgotado. Tente gerar um novo QR code.');
            }
          }
        }, 5 * 60 * 1000); // 5 minutos
        
        // Limpar timeout quando componente desmontar ou QR code for limpo
        return () => {
          clearTimeout(timeoutId);
        };
      } else {
        console.error('[WhatsApp Manager Frontend] Failed to get QR code:', data);
        throw new Error(data?.error || 'Erro ao obter QR code');
      }
    } catch (error: any) {
      toast.error('Erro ao obter QR code', {
        description: error.message || 'Erro desconhecido',
      });
      setSelectedInstance(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async (instanceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'disconnect',
          instanceName
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Instância desconectada com sucesso!');
        await loadInstances();
        
        // Se era a instância selecionada, limpar QR code
        if (selectedInstance === instanceName) {
          setSelectedInstance(null);
          setQrCode(null);
        }
      } else {
        throw new Error(data?.error || 'Erro ao desconectar instância');
      }
    } catch (error: any) {
      toast.error('Erro ao desconectar instância', {
        description: error.message || 'Erro desconhecido',
      });
    }
  };

  const deleteInstance = async (instanceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'delete',
          instanceName
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Instância deletada com sucesso!');
        await loadInstances();
        
        // Se era a instância selecionada, limpar QR code
        if (selectedInstance === instanceName) {
          setSelectedInstance(null);
          setQrCode(null);
        }
      } else {
        throw new Error(data?.error || 'Erro ao deletar instância');
      }
    } catch (error: any) {
      toast.error('Erro ao deletar instância', {
        description: error.message || 'Erro desconhecido',
      });
    }
  };

  const handleSetActiveInstance = async (instanceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'set-active',
          instanceName
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Instância ativa configurada com sucesso!');
        setActiveInstance(instanceName);
        await loadInstances();
        await loadActiveInstance();
      } else {
        throw new Error(data?.error || 'Erro ao configurar instância ativa');
      }
    } catch (error: any) {
      toast.error('Erro ao configurar instância ativa', {
        description: error.message || 'Erro desconhecido',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'close':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'close':
        return 'Desconectado';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gerenciar WhatsApp
          </CardTitle>
          <CardDescription>
            Configure e gerencie as instâncias do WhatsApp para envio de notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de Instâncias */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Instâncias Disponíveis</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  console.log('[WhatsApp Manager] Manual refresh triggered');
                  loadInstances();
                }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            {loading && instances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Carregando instâncias...</p>
                <p className="text-xs text-muted-foreground mt-1">Aguarde alguns segundos</p>
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma instância encontrada</p>
                {hasError ? (
                  <>
                    {(() => {
                      const wasWorking = wasApiWorkingRecently();
                      const isConfirmed = isApiConfirmedReady();
                      
                      // Se API já funcionou antes, mostrar mensagem diferente
                      if (wasWorking || isConfirmed) {
                        return (
                          <>
                            <p className="text-sm mt-2 text-orange-600 dark:text-orange-400">
                              Evolution API temporariamente indisponível
                            </p>
                            <p className="text-xs mt-1">
                              A API estava funcionando recentemente. Pode ser um problema temporário.
                            </p>
                            <p className="text-xs mt-1">
                              Clique em "Atualizar" para tentar novamente.
                            </p>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <p className="text-sm mt-2 text-yellow-600 dark:text-yellow-400">
                              Evolution API ainda está inicializando
                            </p>
                            <p className="text-xs mt-1">
                              Aguarde alguns minutos e clique em "Atualizar" ou recarregue a página.
                            </p>
                            <p className="text-xs mt-1">
                              A instância será criada automaticamente quando a API estiver pronta.
                            </p>
                          </>
                        );
                      }
                    })()}
                  </>
                ) : (
                  <>
                    <p className="text-sm mt-2">A instância será criada automaticamente quando a API estiver pronta.</p>
                    <p className="text-xs mt-1">Aguarde alguns segundos...</p>
                  </>
                )}
              </div>
            ) : (
              instances.map((instance) => (
                <Card key={instance.instanceName} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{instance.instanceName}</span>
                          {instance.number && (
                            <span className="text-sm text-muted-foreground">
                              ({instance.number})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {instance.status === 'open' ? (
                            <CheckCircle2 className={`h-4 w-4 ${getStatusColor(instance.status)}`} />
                          ) : (
                            <XCircle className={`h-4 w-4 ${getStatusColor(instance.status)}`} />
                          )}
                          <span className={`text-sm ${getStatusColor(instance.status)} font-medium`}>
                            {getStatusText(instance.status)}
                          </span>
                          {instance.number && instance.status === 'open' && (
                            <span className="text-xs text-muted-foreground">
                              ({instance.number})
                            </span>
                          )}
                          {activeInstance === instance.instanceName && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Ativa
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => getQRCode(instance.instanceName)}
                          disabled={loading || (selectedInstance === instance.instanceName && !!qrCode)}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          {loading && selectedInstance === instance.instanceName ? 'Gerando...' : (instance.status === 'open' ? 'Reconectar' : 'Conectar')}
                        </Button>
                        {instance.status === 'open' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => disconnectInstance(instance.instanceName)}
                              disabled={loading}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Desconectar
                            </Button>
                            <Button
                              size="sm"
                              variant={activeInstance === instance.instanceName ? "default" : "outline"}
                              onClick={() => handleSetActiveInstance(instance.instanceName)}
                              disabled={loading}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {activeInstance === instance.instanceName ? 'Ativa' : 'Usar Esta'}
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar Instância</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar a instância "{instance.instanceName}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteInstance(instance.instanceName)}>
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* QR Code Modal */}
          {qrCode && selectedInstance && (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Conectar WhatsApp
                </CardTitle>
                <CardDescription>
                  Escaneie o QR code com o WhatsApp no seu celular
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  {qrCode && qrCode.startsWith('data:image') ? (
                    <img 
                      src={qrCode} 
                      alt="QR Code WhatsApp" 
                      className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs w-64 h-64 object-contain"
                      onError={(e) => {
                        console.error('[WhatsApp Manager] Error loading QR code image:', e);
                        toast.error('Erro ao carregar imagem do QR code. Verifique o formato.');
                      }}
                      onLoad={() => {
                        console.log('[WhatsApp Manager] QR code image loaded successfully');
                      }}
                    />
                  ) : qrCode ? (
                    <div className="border-2 border-primary rounded-lg p-4 bg-white max-w-md">
                      <p className="text-sm text-center font-mono break-all mb-2">
                        {qrCode.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        QR Code em formato texto. Use uma biblioteca de QR code para gerar a imagem a partir deste código.
                      </p>
                    </div>
                  ) : (
                    <div className="w-64 h-64 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Gerando QR code...</p>
                      </div>
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Instruções:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 text-left max-w-md">
                      <li>1. Abra o WhatsApp no seu celular</li>
                      <li>2. Vá em: Configurações → Aparelhos conectados → Conectar um aparelho</li>
                      <li>3. Escaneie o QR code acima</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQrCode(null);
                        setSelectedInstance(null);
                        if (pollingInterval) {
                          clearInterval(pollingInterval);
                          setPollingInterval(null);
                        }
                      }}
                    >
                      Fechar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => getQRCode(selectedInstance)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Atualizar QR Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aviso apenas se houver erro de autenticação */}
          {instances.length === 0 && !loading && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Aguardando Evolution API
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      A Evolution API está inicializando. A instância será criada automaticamente quando a API estiver pronta.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
