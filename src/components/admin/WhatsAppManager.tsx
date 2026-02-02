import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  QrCode, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  Power,
  PowerOff,
  RotateCcw,
  Server
} from 'lucide-react';
import { 
  whatsappConnectionService, 
  WhatsAppConnectionState, 
  ConnectionStatus 
} from '@/services/whatsappConnectionService';
import { supabase } from '@/integrations/supabase/client';

// Componente refatorado para controle manual - sem polling automático
export const WhatsAppManager = () => {
  const [connectionState, setConnectionState] = useState<WhatsAppConnectionState>({
    status: 'disconnected',
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [restartingRailway, setRestartingRailway] = useState(false);

  // Carregar estado inicial e configurar listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeService = async () => {
      // Configurar listener para mudanças de estado
      unsubscribe = whatsappConnectionService.onStatusChange((newState) => {
        console.log('[WhatsApp Manager] Estado alterado:', newState);
        setConnectionState(newState);
      });

      // Carregar estado inicial (sem polling automático)
      const initialState = await whatsappConnectionService.getStatus();
      setConnectionState(initialState);
    };

    initializeService();

    // Cleanup ao desmontar componente
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      whatsappConnectionService.clearCallbacks();
    };
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setQrCode(null);
    
    try {
      console.log('[WhatsApp Manager] Iniciando conexão manual...');
      const qrCodeData = await whatsappConnectionService.connect();
      
      if (qrCodeData && typeof qrCodeData === 'object') {
        // Processar QR code
        let qrCodeString = '';
        
        if ('base64' in qrCodeData && qrCodeData.base64) {
          const base64String = typeof qrCodeData.base64 === 'string' 
            ? qrCodeData.base64 
            : String(qrCodeData.base64);
          
          const cleanBase64 = base64String.trim().replace(/\s/g, '');
          qrCodeString = cleanBase64.startsWith('data:image') 
            ? cleanBase64 
            : `data:image/png;base64,${cleanBase64}`;
        } else if ('code' in qrCodeData && qrCodeData.code) {
          qrCodeString = String(qrCodeData.code);
        }
        
        if (qrCodeString) {
          setQrCode(qrCodeString);
          setShowQrModal(true);
          toast.success('QR code gerado! Escaneie com seu WhatsApp.');
        } else {
          throw new Error('QR code não disponível no formato esperado');
        }
      }
    } catch (error: any) {
      console.error('[WhatsApp Manager] Erro ao conectar:', error);
      toast.error('Erro ao conectar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    
    try {
      console.log('[WhatsApp Manager] Desconectando manualmente...');
      await whatsappConnectionService.disconnect();
      setQrCode(null);
      setShowQrModal(false);
      toast.success('WhatsApp desconectado com sucesso!');
    } catch (error: any) {
      console.error('[WhatsApp Manager] Erro ao desconectar:', error);
      toast.error('Erro ao desconectar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    
    try {
      console.log('[WhatsApp Manager] Verificando status manualmente...');
      await whatsappConnectionService.checkStatusOnce();
      toast.success('Status atualizado!');
    } catch (error: any) {
      console.error('[WhatsApp Manager] Erro ao verificar status:', error);
      toast.error('Erro ao verificar status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartRailway = async () => {
    setRestartingRailway(true);
    
    try {
      console.log('[WhatsApp Manager] Abrindo Railway Dashboard...');
      
      // Abrir Railway Dashboard diretamente no projeto correto
      const railwayUrl = 'https://railway.app/project/powerful-grace';
      window.open(railwayUrl, '_blank');
      
      toast.success('Railway Dashboard aberto!', {
        description: 'Clique no serviço "whatsapp-bot-barbearia" e depois no botão "Restart" para reiniciar o servidor.',
        duration: 10000,
      });
      
      // Aguardar um pouco e então verificar status
      setTimeout(async () => {
        await handleCheckStatus();
      }, 60000); // 1 minuto para dar tempo de reiniciar manualmente
      
    } catch (error: any) {
      console.error('[WhatsApp Manager] Erro ao abrir Railway:', error);
      toast.error('Erro ao abrir Railway Dashboard', {
        description: 'Tente acessar manualmente: https://railway.app/project/powerful-grace',
        duration: 8000,
      });
    } finally {
      setRestartingRailway(false);
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-gray-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className={`h-5 w-5 ${getStatusColor(status)}`} />;
      case 'connecting':
        return <Loader2 className={`h-5 w-5 ${getStatusColor(status)} animate-spin`} />;
      case 'disconnected':
        return <XCircle className={`h-5 w-5 ${getStatusColor(status)}`} />;
      case 'error':
        return <AlertCircle className={`h-5 w-5 ${getStatusColor(status)}`} />;
      default:
        return <XCircle className={`h-5 w-5 ${getStatusColor(status)}`} />;
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
            Configure e gerencie a conexão do WhatsApp para envio de notificações.
            <br />
            <strong>Modo Manual:</strong> Sem reconexões automáticas - você controla quando conectar/desconectar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status da Conexão */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Status da Conexão</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCheckStatus}
                  disabled={loading || restartingRailway}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Verificar Status
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRestartRailway}
                  disabled={loading || restartingRailway}
                  title="Reiniciar servidor WhatsApp no Railway"
                >
                  {restartingRailway ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Reiniciando...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reiniciar Railway
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://railway.app/dashboard', '_blank')}
                  title="Abrir Railway Dashboard para reiniciar manualmente"
                >
                  <Server className="h-4 w-4 mr-1" />
                  Abrir Railway
                </Button>
              </div>
            </div>
            
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(connectionState.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${getStatusColor(connectionState.status)}`}>
                          {getStatusText(connectionState.status)}
                        </span>
                        {connectionState.number && (
                          <span className="text-sm text-muted-foreground">
                            ({connectionState.number})
                          </span>
                        )}
                      </div>
                      {connectionState.message && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {connectionState.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Última atualização: {connectionState.lastUpdate.toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {connectionState.status === 'connected' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleConnect}
                          disabled={loading || restartingRailway}
                          title="Gerar novo QR code para trocar número"
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Novo QR Code
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleDisconnect}
                          disabled={loading || restartingRailway}
                        >
                          <PowerOff className="h-4 w-4 mr-1" />
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleConnect}
                        disabled={loading || restartingRailway}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-1" />
                            Conectar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QR Code Modal */}
          {showQrModal && qrCode && (
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
                  {qrCode.startsWith('data:image') ? (
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
                  ) : (
                    <div className="border-2 border-primary rounded-lg p-4 bg-white max-w-md">
                      <p className="text-sm text-center font-mono break-all mb-2">
                        {qrCode.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        QR Code em formato texto. Use uma biblioteca de QR code para gerar a imagem a partir deste código.
                      </p>
                    </div>
                  )}
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Instruções:</p>
                    <ol className="text-sm text-muted-foreground space-y-1 text-left max-w-md">
                      <li>1. Abra o WhatsApp no seu celular</li>
                      <li>2. Vá em: Configurações → Aparelhos conectados → Conectar um aparelho</li>
                      <li>3. Escaneie o QR code acima</li>
                      <li>4. Aguarde a confirmação de conexão</li>
                    </ol>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQrCode(null);
                        setShowQrModal(false);
                      }}
                    >
                      Fechar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleConnect}
                      disabled={loading || restartingRailway}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Gerar Novo QR Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações Importantes */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Controle Manual Ativo
                  </p>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <p>• O sistema não fará reconexões automáticas</p>
                    <p>• Você controla quando conectar e desconectar</p>
                    <p>• Use "Verificar Status" para atualizar o estado atual</p>
                    <p>• Use "Reiniciar Railway" se o servidor estiver com problemas</p>
                    <p>• A conexão será mantida até você desconectar manualmente</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção de Controle do Servidor */}
          <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Server className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Reiniciar Servidor Railway
                  </p>
                  <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 space-y-1">
                    <p>• Clique "Reiniciar Railway" para abrir o dashboard automaticamente</p>
                    <p>• No Railway: clique no serviço "whatsapp-bot-barbearia"</p>
                    <p>• Clique no botão "Restart" (ícone de seta circular)</p>
                    <p>• Aguarde 1-2 minutos para o serviço reiniciar completamente</p>
                    <p>• Use "Verificar Status" para confirmar que voltou online</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};