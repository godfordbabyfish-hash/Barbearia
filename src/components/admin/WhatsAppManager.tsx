import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  HelpCircle,
  Copy,
  Mail,
  Clock,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { 
  whatsappConnectionService, 
  WhatsAppConnectionState, 
  ConnectionStatus 
} from '@/services/whatsappConnectionService';
import { supabase } from '@/integrations/supabase/client';
import WhatsAppMessages from '@/components/admin/WhatsAppMessages';
import WhatsAppDailyReportSettings from '@/components/admin/WhatsAppDailyReportSettings';

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
  const [autoAttempted, setAutoAttempted] = useState(false);

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

  // Removido auto-QR: reconexão só ocorre via ação do usuário

  // Ocultar QR automaticamente ao conectar
  useEffect(() => {
    if (connectionState.status === 'connected' && showQrModal) {
      setShowQrModal(false);
      setQrCode(null);
    }
  }, [connectionState.status, showQrModal]);

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência');
    } catch {
      toast.error('Falha ao copiar');
    }
  };

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
        return <CheckCircle2 className={`h-6 w-6 sm:h-7 sm:w-7 ${getStatusColor(status)}`} />;
      case 'connecting':
        return <Loader2 className={`h-6 w-6 sm:h-7 sm:w-7 ${getStatusColor(status)} animate-spin`} />;
      case 'disconnected':
        return <XCircle className={`h-6 w-6 sm:h-7 sm:w-7 ${getStatusColor(status)}`} />;
      case 'error':
        return <AlertCircle className={`h-6 w-6 sm:h-7 sm:w-7 ${getStatusColor(status)}`} />;
      default:
        return <XCircle className={`h-6 w-6 sm:h-7 sm:w-7 ${getStatusColor(status)}`} />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="connection" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Conexão
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <Mail className="h-4 w-4" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="daily-report" className="gap-2">
            <Clock className="h-4 w-4" />
            Relatório automático
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <WhatsAppMessages />
        </TabsContent>

        <TabsContent value="daily-report">
          <WhatsAppDailyReportSettings />
        </TabsContent>

        <TabsContent value="connection">
      <Card className="shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            Gerenciar WhatsApp
          </CardTitle>
          <CardDescription className="text-sm">
            Controle manual: use Verificar Status para checar, Reconectar para gerar QR e Desconectar para encerrar a sessão.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                      >
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Tutorial
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Tutorial de Configuração</DialogTitle>
                        <DialogDescription>Passo a passo para preparar Supabase e servidor WhatsApp</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-sm font-semibold">1) Secrets no Supabase</h4>
                          <ol className="text-sm text-muted-foreground list-decimal ml-5 mt-2 space-y-1">
                            <li>Abra Supabase → Settings → Secrets</li>
                            <li>Adicione as variáveis abaixo com seus valores</li>
                          </ol>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                              <code className="text-xs">EVOLUTION_API_URL</code>
                              <Button size="sm" variant="outline" onClick={() => handleCopy('EVOLUTION_API_URL')}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                              </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                              <code className="text-xs">EVOLUTION_API_KEY</code>
                              <Button size="sm" variant="outline" onClick={() => handleCopy('EVOLUTION_API_KEY')}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 space-y-2">
                            <p>
                              EVOLUTION_API_URL: é o link público gerado quando você publica/abre o serviço da sua Evolution API.
                              Para servidor local, exponha via Cloudflare (Workers/Tunnel/Zero Trust) e use a URL pública gerada.
                            </p>
                            <ul className="list-disc ml-5 space-y-1">
                              <li>Cloudflare Workers/Tunnel: <code>https://seu-servico.workers.dev</code> ou <code>https://api.seudominio.com</code></li>
                              <li>Servidor local + Tunnel: <code>https://seu-tunnel.cloudflare.com</code> apontando para <code>http://localhost:PORTA</code></li>
                              <li>VPS/EC2: <code>https://seu-servidor.exemplo.com</code></li>
                            </ul>
                            <p>
                              Use apenas a raiz da API (sem caminhos adicionais). O sistema adiciona os endpoints automaticamente.
                              Exemplos corretos: <code>https://seu-servico.workers.dev</code> ou <code>https://api.seudominio.com</code> (via Cloudflare).
                            </p>
                            <p>
                              Dica: abra o painel do Cloudflare (Workers/Tunnel), copie a URL pública exibida pelo serviço/túnel e cole em <code>EVOLUTION_API_URL</code>.
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">2) Edge Functions</h4>
                          <ol className="text-sm text-muted-foreground list-decimal ml-5 mt-2 space-y-1">
                            <li>Publique as funções do projeto no Supabase</li>
                            <li>Garanta que a função <code>whatsapp-manager</code> esteja ativa</li>
                            <li>Opcional: <code>whatsapp-notify</code>, <code>whatsapp-reminder</code></li>
                          </ol>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                              <code className="text-xs">whatsapp-manager</code>
                              <Button size="sm" variant="outline" onClick={() => handleCopy('whatsapp-manager')}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                              </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                              <code className="text-xs">whatsapp-notify</code>
                              <Button size="sm" variant="outline" onClick={() => handleCopy('whatsapp-notify')}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                              </Button>
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                              <code className="text-xs">whatsapp-reminder</code>
                              <Button size="sm" variant="outline" onClick={() => handleCopy('whatsapp-reminder')}>
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">3) Servidor do WhatsApp</h4>
                          <ol className="text-sm text-muted-foreground list-decimal ml-5 mt-2 space-y-1">
                            <li>No Windows, inicie a Evolution API local (ex.: porta <code>8081</code>)</li>
                            <li>Abra o Cloudflare Tunnel/Workers apontando para <code>http://localhost:8081</code></li>
                            <li>Copie a URL pública gerada e defina em <code>EVOLUTION_API_URL</code></li>
                            <li>Se a URL pública mudar, atualize o Secret no Supabase</li>
                          </ol>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">4) Testar</h4>
                          <ol className="text-sm text-muted-foreground list-decimal ml-5 mt-2 space-y-1">
                            <li>Clique em <strong>Verificar Status</strong></li>
                            <li>Se desconectado, use <strong>Conectar</strong> e escaneie o QR</li>
                            <li>Ao conectar, o status muda para <strong>Conectado</strong></li>
                          </ol>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                              {connectionState.number}
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
                    
                    <div className="hidden">
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

            
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Ações</h3>
              <Card className="border-border w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <CardContent className="p-3 sm:p-4 space-y-3">
                  {connectionState.status === 'connected' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDisconnect}
                        disabled={loading}
                      >
                        <PowerOff className="h-4 w-4 mr-1" />
                        Desconectar
                      </Button>
                    </div>
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
                          Reconectando...
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-1" />
                          Reconectar
                        </>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Para reconectar, clique em “Reconectar” e escaneie o QR.
                  </p>

                  {showQrModal && qrCode && (
                    <div className="space-y-3">
                      {qrCode.startsWith('data:image') ? (
                        <img
                          src={qrCode}
                          alt="QR Code WhatsApp"
                          className="border-2 border-primary rounded-lg p-2 bg-white max-w-xs w-48 h-48 sm:w-64 sm:h-64 object-contain mx-auto"
                          onError={(e) => {
                            console.error('[WhatsApp Manager] Error loading QR code image:', e);
                            toast.error('Erro ao carregar imagem do QR code.');
                          }}
                        />
                      ) : (
                        <div className="border-2 border-primary rounded-lg p-3 sm:p-4 bg-white max-w-md w-full mx-auto">
                          <p className="text-sm text-center font-mono break-all mb-2">
                            {qrCode.substring(0, 100)}...
                          </p>
                        </div>
                      )}
                      <div className="text-center space-y-2 w-full max-w-md mx-auto">
                        <p className="text-sm font-medium">Instruções:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 text-left">
                          <li>1. Abra o WhatsApp no seu celular</li>
                          <li>2. Vá em: Configurações → Aparelhos conectados → Conectar um aparelho</li>
                          <li>3. Escaneie o QR code acima</li>
                          <li>4. Aguarde a confirmação de conexão</li>
                        </ol>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setQrCode(null);
                            setShowQrModal(false);
                          }}
                        >
                          Fechar
                        </Button>
                        <Button variant="outline" onClick={handleConnect} disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Reconectando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reconectar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
                      <p>• Use servidor local: inicie a Evolution API (Windows) e mantenha rodando</p>
                      <p>• Exponha via Cloudflare Tunnel/Workers e use a URL pública gerada</p>
                      <p>• Aguarde alguns segundos para o serviço estabilizar</p>
                      <p>• Use "Verificar Status" para confirmar que está online</p>
                      <p>• Se a URL pública mudar, atualize <code>EVOLUTION_API_URL</code> nos Secrets do Supabase</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
