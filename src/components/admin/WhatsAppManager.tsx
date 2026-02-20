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
  PowerOff
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
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <Card className="shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            Gerenciar WhatsApp
          </CardTitle>
          <CardDescription className="text-sm">
            Configure e gerencie a conexão do WhatsApp para envio de notificações.
            <br />
            <strong>Modo Manual:</strong> Sem reconexões automáticas - você controla quando conectar/desconectar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="space-y-4 sm:space-y-6">
            {/* Status da Conexão */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <h3 className="text-lg font-semibold">Status da Conexão</h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckStatus}
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Verificar Status</span>
                    <span className="sm:hidden">Status</span>
                  </Button>
                  
                </div>
              </div>
              
              <Card className="border-border w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getStatusIcon(connectionState.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className={`font-semibold ${getStatusColor(connectionState.status)} text-sm sm:text-base`}>
                            {getStatusText(connectionState.status)}
                          </span>
                          {connectionState.number && (
                            <span className="text-sm text-muted-foreground truncate">
                              ({connectionState.number})
                            </span>
                          )}
                        </div>
                        {connectionState.message && (
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {connectionState.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Última atualização: {connectionState.lastUpdate.toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {connectionState.status === 'connected' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleConnect}
                            disabled={loading}
                            title="Gerar novo QR code para trocar número"
                            className="flex-1 sm:flex-none"
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Novo QR Code</span>
                            <span className="sm:hidden">QR Code</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="flex-1 sm:flex-none"
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
                          className="w-full sm:w-auto"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              <span className="hidden sm:inline">Conectando...</span>
                              <span className="sm:hidden">...</span>
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
              <Card className="border-primary bg-primary/5 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                    Conectar WhatsApp
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Escaneie o QR code com o WhatsApp no seu celular
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col items-center gap-3 sm:gap-4">
                      {qrCode.startsWith('data:image') ? (
                        <img 
                          src={qrCode} 
                          alt="QR Code WhatsApp" 
                          className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs w-48 h-48 sm:w-64 sm:h-64 object-contain"
                          onError={(e) => {
                            console.error('[WhatsApp Manager] Error loading QR code image:', e);
                            toast.error('Erro ao carregar imagem do QR code. Verifique o formato.');
                          }}
                          onLoad={() => {
                            console.log('[WhatsApp Manager] QR code image loaded successfully');
                          }}
                        />
                      ) : (
                        <div className="border-2 border-primary rounded-lg p-3 sm:p-4 bg-white max-w-md w-full">
                          <p className="text-sm text-center font-mono break-all mb-2">
                            {qrCode.substring(0, 100)}...
                          </p>
                          <p className="text-xs text-muted-foreground text-center">
                            QR Code em formato texto. Use uma biblioteca de QR code para gerar a imagem a partir deste código.
                          </p>
                        </div>
                      )}
                      
                      <div className="text-center space-y-2 w-full max-w-md">
                        <p className="text-sm font-medium">Instruções:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 text-left">
                          <li>1. Abra o WhatsApp no seu celular</li>
                          <li>2. Vá em: Configurações → Aparelhos conectados → Conectar um aparelho</li>
                          <li>3. Escaneie o QR code acima</li>
                          <li>4. Aguarde a confirmação de conexão</li>
                        </ol>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setQrCode(null);
                            setShowQrModal(false);
                          }}
                          className="w-full sm:w-auto"
                        >
                          Fechar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleConnect}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              <span className="hidden sm:inline">Gerando...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Gerar Novo QR Code</span>
                              <span className="sm:hidden">Novo QR</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações Importantes */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Controle Manual Ativo
                    </p>
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                      <p>• O sistema não fará reconexões automáticas</p>
                      <p>• Você controla quando conectar e desconectar</p>
                      <p>• Use "Verificar Status" para atualizar o estado atual</p>
                      <p>• Se o servidor do WhatsApp travar, reinicie ele manualmente</p>
                      <p>• A conexão será mantida até você desconectar manualmente</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção de Controle do Servidor */}
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Servidor do WhatsApp
                    </p>
                    <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 space-y-1">
                      <p>• Se o servidor estiver offline, inicie o serviço do WhatsApp</p>
                      <p>• Aguarde alguns segundos para o servidor ficar estável</p>
                      <p>• Use "Verificar Status" para confirmar que está online</p>
                      <p>• Se mudar o servidor, atualize a URL da API no Supabase</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
