import { supabase } from '@/integrations/supabase/client';

export type WhatsAppEventType = 'customer' | 'instructor' | 'cancellation' | 'reschedule' | 'reschedule_instructor' | 'payment_failed' | 'reminder' | 'reminder_instructor';


export async function sendWhatsAppNotification(
    userId: string,
    type: WhatsAppEventType,
    recipientPhone: string,
    bookingData: any
) {
    try {
        // Fetch WhatsApp settings
        const { data: settings } = await (supabase as any)
            .from('whatsapp_settings')
            .select('*')
            .eq('user_id', userId)
            .eq('is_enabled', true)
            .maybeSingle();

        if (!settings || !settings.api_key || !settings.phone_number_id) {
            return;
        }

        // Fetch branding settings to get the primary domain
        const { data: branding } = await (supabase as any)
            .from('branding_settings')
            .select('site_url')
            .eq('user_id', userId)
            .maybeSingle();

        // Add branding domain to settings
        const settingsWithDomain = {
            ...settings,
            site_url: branding?.site_url
        };

        await supabase.functions.invoke('send-whatsapp-message', {
            body: {
                type,
                recipient_phone: recipientPhone,
                settings: settingsWithDomain,
                booking: bookingData
            }
        });
    } catch (error) {
        console.error('Failed to send WhatsApp notification:', error);
    }
}
