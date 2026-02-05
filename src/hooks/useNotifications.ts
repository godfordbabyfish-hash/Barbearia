import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useNotifications = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker não suportado');
        return;
      }

      try {
        console.log('🔧 Registrando Service Worker...');
        
        // Registrar Service Worker
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        console.log('✅ Service Worker registrado:', reg.scope);
        
        // Forçar atualização do service worker
        await reg.update();
        
        // Esperar o service worker estar ativo
        await navigator.serviceWorker.ready;
        
        setRegistration(reg);

        // Solicitar permissão de notificação
        if (Notification.permission === 'default') {
          console.log('⚠️ Solicitando permissão de notificações...');
          const permission = await Notification.requestPermission();
          console.log('✅ Permissão de notificação:', permission);

          if (permission === 'granted') {
            toast.success('Notificações ativadas!', {
              description: 'Você receberá alertas mesmo com a tela bloqueada.',
            });

            // Mostrar notificação de teste DIRETAMENTE via registration
            console.log('📢 Enviando notificação de teste...');
            await reg.showNotification('🎉 Sistema de Notificações Ativo', {
              body: 'Você receberá alertas de novos agendamentos.',
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'test-notification',
              requireInteraction: false,
              silent: false,
            });
            console.log('✅ Notificação de teste enviada!');
          } else {
            toast.error('Permissão de notificações negada', {
              description: 'Ative as notificações nas configurações do navegador.',
            });
          }
        } else if (Notification.permission === 'granted') {
          console.log('✅ Permissão de notificações já concedida');
          toast.success('Notificações ativas');
        }

        setIsReady(true);

        // Implementar keep-alive para manter o SW ativo
        const keepAliveInterval = setInterval(() => {
          if (navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
              console.log('💚 Keep-alive response:', event.data);
            };
            navigator.serviceWorker.controller.postMessage(
              { type: 'KEEP_ALIVE' },
              [messageChannel.port2]
            );
          }
        }, 25000); // A cada 25 segundos

        return () => clearInterval(keepAliveInterval);
      } catch (error) {
        console.error('❌ Erro ao registrar Service Worker:', error);
        toast.error('Erro ao configurar notificações');
      }
    };

    setupServiceWorker();
  }, []);

  const showNotification = async (
    title: string,
    options: NotificationOptions
  ) => {
    console.log('🔔 showNotification chamada:', { title, options, registration, permission: Notification.permission });
    
    if (!registration) {
      console.warn('⚠️ Registration não disponível ainda');
      return;
    }
    
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Permissão de notificações não concedida:', Notification.permission);
      return;
    }

    try {
      console.log('📢 Enviando notificação via Service Worker...');
      
      // Usar diretamente o registration.showNotification
      await registration.showNotification(title, {
        body: options.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        silent: false,
        tag: 'appointment-notification',
        data: options.data,
      });
      
      console.log('✅ Notificação enviada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao mostrar notificação:', error);
    }
  };

  return {
    isReady,
    registration,
    showNotification: (title: string, options: NotificationOptions) => {
      console.log('📞 showNotification wrapper chamado');
      return showNotification(title, options);
    },
  };
};

