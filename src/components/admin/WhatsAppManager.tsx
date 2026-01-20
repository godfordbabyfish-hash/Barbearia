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
  Plus, 
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

export const WhatsAppManager = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('instance-1');
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeInstance, setActiveInstance] = useState<string | null>(null);

  // Carregar instâncias e instância ativa ao montar
  useEffect(() => {
    loadInstances();
    loadActiveInstance();
    
    // Polling para atualizar status a cada 3 segundos (mais frequente para detectar conexão rapidamente)
    const interval = setInterval(() => {
      loadInstances();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

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
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { action: 'list' }
      });

      if (error) throw error;

      if (data?.success && data?.instances) {
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
        // Se for erro de autenticação, mostrar toast apenas uma vez
        if (data.error.includes('Acesso negado') && instances.length === 0) {
          toast.error('Erro de autenticação', {
            description: 'Verifique se EVOLUTION_API_URL e EVOLUTION_API_KEY estão corretos no Supabase',
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar instâncias:', error);
      // Não mostrar toast para evitar spam durante polling
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'create',
          instanceName: newInstanceName.trim()
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Instância criada ou já existe!');
        setNewInstanceName('instance-1');
        await loadInstances();
      } else {
        // Se o erro for 403 mas a instância já existe na lista, considerar sucesso
        if (data?.error?.includes('Forbidden')) {
          // Verificar se a instância já existe na lista
          const currentInstances = instances.filter(i => i.instanceName === newInstanceName.trim());
          if (currentInstances.length > 0) {
            toast.success('Instância já existe!');
            await loadInstances();
            return;
          }
        }
        throw new Error(data?.error || 'Erro ao criar instância');
      }
    } catch (error: any) {
      toast.error('Erro ao criar instância', {
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setCreating(false);
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
        
        // Iniciar polling mais frequente para verificar conexão (a cada 2 segundos)
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        const interval = setInterval(async () => {
          console.log('[WhatsApp Manager] Polling for connection status...');
          await loadInstances();
        }, 2000);
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
          {/* Criar Nova Instância - Opcional */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="instance-name">Nome da Instância (Opcional)</Label>
              <Input
                id="instance-name"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                placeholder="instance-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A instância será criada automaticamente ao conectar. Use este campo apenas para criar instâncias adicionais.
              </p>
            </div>
            <Button onClick={createInstance} disabled={creating} variant="outline">
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Nova
                </>
              )}
            </Button>
          </div>

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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : instances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma instância encontrada</p>
                <p className="text-sm">A instância será criada automaticamente ao tentar conectar</p>
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

          {/* Aviso sobre variáveis de ambiente */}
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Configuração Necessária
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Certifique-se de que as variáveis de ambiente estão configuradas no Supabase:
                    EVOLUTION_API_URL, EVOLUTION_API_KEY
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
