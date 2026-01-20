import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppNotificationPayload {
  appointmentId: string;
  clientName: string;
  phone: string;
  action: 'created' | 'updated' | 'cancelled';
  appointmentDate?: string;
  appointmentTime?: string;
  serviceName?: string;
  barberName?: string;
}

/**
 * Send WhatsApp notification manually (fallback if trigger doesn't work)
 */
export const sendWhatsAppNotification = async (
  payload: WhatsAppNotificationPayload
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('whatsapp-notify', {
      body: payload,
    });

    if (error) {
      console.error('Error calling WhatsApp function:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Process notification queue manually
 * This can be called periodically or manually to process pending notifications
 */
export const processWhatsAppQueue = async (): Promise<{ processed: number; failed?: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke('whatsapp-notify', {
      body: { action: 'process-queue' },
    });

    if (error) {
      console.error('Error processing queue:', error);
      return { processed: 0 };
    }

    return { 
      processed: data?.processed || 0,
      failed: data?.failed || 0
    };
  } catch (error) {
    console.error('Error processing WhatsApp queue:', error);
    return { processed: 0 };
  }
};

/**
 * Helper function to format appointment data for WhatsApp notification
 */
export const formatAppointmentForWhatsApp = (appointment: any, action: 'created' | 'updated' | 'cancelled'): WhatsAppNotificationPayload => {
  return {
    appointmentId: appointment.id,
    clientName: appointment.profiles?.name || appointment.client?.name || 'Cliente',
    phone: appointment.profiles?.phone || appointment.client?.phone || '',
    action,
    appointmentDate: appointment.appointment_date,
    appointmentTime: appointment.appointment_time,
    serviceName: appointment.services?.title || appointment.service?.title,
    barberName: appointment.barbers?.name || appointment.barber?.name,
  };
};
