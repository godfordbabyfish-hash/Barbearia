import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationTester = () => {
  const testNotification = async () => {
    console.log('🧪 Testando notificação manual...');
    
    // Verificar se o Service Worker está ativo
    if (!navigator.serviceWorker.controller) {
      toast.error('Service Worker não está ativo');
      console.error('❌ Service Worker não está ativo');
      return;
    }
    
    // Verificar permissão
    if (Notification.permission !== 'granted') {
      toast.error('Permissão de notificações não concedida');
      console.error('❌ Permissão:', Notification.permission);
      
      // Tentar solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }
    }
    
    try {
      // Obter o registration
      const registration = await navigator.serviceWorker.ready;
      
      console.log('📢 Enviando notificação de teste via registration...');
      
      // Enviar notificação diretamente via registration
      await registration.showNotification('🧪 Teste de Notificação', {
        body: 'Esta é uma notificação de teste.\nSe você viu isso, o sistema está funcionando!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification',
        requireInteraction: true,
        silent: false,
      });
      
      console.log('✅ Notificação de teste enviada com sucesso!');
      toast.success('Notificação de teste enviada!', {
        description: 'Verifique se a notificação apareceu no seu dispositivo.',
      });
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error);
      toast.error('Erro ao enviar notificação de teste');
    }
  };

  const checkStatus = () => {
    console.log('🔍 Status do sistema de notificações:');
    console.log('- Service Worker suportado:', 'serviceWorker' in navigator);
    console.log('- Service Worker ativo:', !!navigator.serviceWorker.controller);
    console.log('- Permissão de notificações:', Notification.permission);
    console.log('- API de Notificações disponível:', 'Notification' in window);
    
    toast.info('Status verificado', {
      description: `Permissão: ${Notification.permission}\nService Worker: ${navigator.serviceWorker.controller ? 'Ativo' : 'Inativo'}`,
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Teste de Notificações
        </CardTitle>
        <CardDescription>
          Use estes botões para testar o sistema de notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button onClick={testNotification} className="w-full" variant="default">
          <Bell className="w-4 h-4 mr-2" />
          Enviar Notificação de Teste
        </Button>
        <Button onClick={checkStatus} className="w-full" variant="outline">
          Verificar Status do Sistema
        </Button>
      </CardContent>
    </Card>
  );
};
