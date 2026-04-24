import { supabase } from '@/integrations/supabase/client';

export type WhatsAppEventType = 'customer' | 'instructor' | 'cancellation' | 'reschedule' | 'reschedule_instructor' | 'payment_failed' | 'reminder' | 'reminder_instructor' | 'product_purchase';


export async function sendWhatsAppNotification(
    userId: string,
    type: WhatsAppEventType,
    recipientPhone: string,
    bookingData: any
) {
    try {
        // We no longer fetch settings on the client side to avoid exposing API keys 
        // and to bypass RLS issues for guest users.
        // The edge function will fetch the settings securely using the Service Role key.

        console.log('Triggering WhatsApp notification via Edge Function for user:', userId);

        const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
                type,
                recipient_phone: recipientPhone,
                userId: userId, // Pass userId so the function can fetch settings
                booking: bookingData
            }
        });

        if (error) {
            console.error('Edge Function returned error:', error);
        } else {
            console.log('WhatsApp notification request sent successfully:', data);
        }

    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
    }
}
