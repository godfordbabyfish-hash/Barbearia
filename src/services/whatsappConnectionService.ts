import { supabase } from '@/integrations/supabase/client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WhatsAppConnectionState {
  status: ConnectionStatus;
  message?: string;
  lastUpdate: Date;
  instanceId?: string;
  number?: string;
}

export interface WhatsAppInstance {
  instanceName: string;
  status: 'open' | 'close' | 'connecting';
  number?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
}

type StatusChangeCallback = (state: WhatsAppConnectionState) => void;

class WhatsAppConnectionService {
  private currentState: WhatsAppConnectionState = {
    status: 'disconnected',
    lastUpdate: new Date(),
  };
  
  private callbacks: Set<StatusChangeCallback> = new Set();
  private isManualMode = true; // Por padrão, modo manual (sem polling automático)

  constructor() {
    // Carregar estado do localStorage se disponível
    this.loadStateFromStorage();
  }

  private loadStateFromStorage() {
    try {
      const stored = localStorage.getItem('whatsapp_connection_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Verificar se não é muito antigo (mais de 5 minutos)
        const lastUpdate = new Date(parsed.lastUpdate);
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000;
        
        if ((now.getTime() - lastUpdate.getTime()) < fiveMinutes) {
          this.currentState = {
            ...parsed,
            lastUpdate: new Date(parsed.lastUpdate),
          };
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar estado do localStorage:', error);
    }
  }

  private saveStateToStorage() {
    try {
      localStorage.setItem('whatsapp_connection_state', JSON.stringify(this.currentState));
    } catch (error) {
      console.warn('Erro ao salvar estado no localStorage:', error);
    }
  }

  private updateState(newState: Partial<WhatsAppConnectionState>) {
    this.currentState = {
      ...this.currentState,
      ...newState,
      lastUpdate: new Date(),
    };
    
    this.saveStateToStorage();
    
    // Notificar todos os callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Erro ao executar callback de mudança de estado:', error);
      }
    });
  }

  async getStatus(): Promise<WhatsAppConnectionState> {
    // Se está em modo manual, não fazer verificação automática
    if (this.isManualMode) {
      return this.currentState;
    }

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { action: 'list' }
      });

      if (error) throw error;

      if (data?.success && data?.instances) {
        const instances: WhatsAppInstance[] = data.instances;
        const connectedInstance = instances.find(i => i.status === 'open');
        
        if (connectedInstance) {
          this.updateState({
            status: 'connected',
            instanceId: connectedInstance.instanceName,
            number: connectedInstance.number,
            message: `Conectado como ${connectedInstance.number || connectedInstance.instanceName}`,
          });
        } else {
          const connectingInstance = instances.find(i => i.status === 'connecting');
          if (connectingInstance) {
            this.updateState({
              status: 'connecting',
              instanceId: connectingInstance.instanceName,
              message: 'Conectando...',
            });
          } else {
            this.updateState({
              status: 'disconnected',
              message: 'Nenhuma instância conectada',
            });
          }
        }
      } else {
        this.updateState({
          status: 'error',
          message: data?.error || 'Erro ao verificar status',
        });
      }
    } catch (error: any) {
      this.updateState({
        status: 'error',
        message: error.message || 'Erro de conexão',
      });
    }

    return this.currentState;
  }

  async connect(instanceName?: string): Promise<any> {
    const targetInstance = instanceName || 'default';
    
    this.updateState({
      status: 'connecting',
      instanceId: targetInstance,
      message: 'Iniciando conexão...',
    });

    try {
      // Primeiro, criar a instância se não existir
      const { data: createData, error: createError } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'create',
          instanceName: targetInstance
        }
      });

      if (createError) throw createError;

      // Aguardar um pouco para a instância ser criada
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Gerar QR code
      const { data: qrData, error: qrError } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'get-qrcode',
          instanceName: targetInstance
        }
      });

      if (qrError) throw qrError;

      if (qrData?.success && qrData?.qrcode) {
        this.updateState({
          status: 'connecting',
          message: 'QR Code gerado. Escaneie com seu WhatsApp.',
        });
        
        // Retornar o QR code para o componente exibir
        return qrData.qrcode;
      } else {
        throw new Error(qrData?.error || 'Erro ao gerar QR code');
      }
    } catch (error: any) {
      this.updateState({
        status: 'error',
        message: error.message || 'Erro ao conectar',
      });
      throw error;
    }
  }

  async disconnect(instanceName?: string): Promise<void> {
    const targetInstance = instanceName || this.currentState.instanceId || 'default';
    
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
        body: { 
          action: 'disconnect',
          instanceName: targetInstance
        }
      });

      if (error) throw error;

      if (data?.success) {
        this.updateState({
          status: 'disconnected',
          instanceId: undefined,
          number: undefined,
          message: 'Desconectado com sucesso',
        });
      } else {
        throw new Error(data?.error || 'Erro ao desconectar');
      }
    } catch (error: any) {
      this.updateState({
        status: 'error',
        message: error.message || 'Erro ao desconectar',
      });
      throw error;
    }
  }

  onStatusChange(callback: StatusChangeCallback): () => void {
    this.callbacks.add(callback);
    
    // Retornar função para remover o callback
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Método para verificar status uma única vez (sem polling)
  async checkStatusOnce(): Promise<WhatsAppConnectionState> {
    const wasManualMode = this.isManualMode;
    this.isManualMode = false; // Temporariamente permitir verificação
    
    try {
      const status = await this.getStatus();
      return status;
    } finally {
      this.isManualMode = wasManualMode; // Restaurar modo anterior
    }
  }

  // Controle do modo manual
  setManualMode(manual: boolean) {
    this.isManualMode = manual;
  }

  isInManualMode(): boolean {
    return this.isManualMode;
  }

  // Limpar todos os callbacks (útil para cleanup)
  clearCallbacks() {
    this.callbacks.clear();
  }
}

// Instância singleton
export const whatsappConnectionService = new WhatsAppConnectionService();