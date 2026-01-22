import { useEffect, useState } from 'react';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = (userId: string | undefined) => {
    const [token, setToken] = useState<string | null>(null);

    const registerPush = async () => {
        if (!Capacitor.isNativePlatform()) return;

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            toast.error('User denied permissions!');
            return;
        }

        await PushNotifications.register();
    };

    useEffect(() => {
        if (!userId || !Capacitor.isNativePlatform()) return;

        // Add listeners
        PushNotifications.addListener('registration', (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            setToken(token.value);

            // Save token to Supabase profiles or a dedicated user_push_tokens table
            saveTokenToDatabase(userId, token.value);
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
            toast(notification.title || 'Notification', {
                description: notification.body,
            });
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
        });

        return () => {
            PushNotifications.removeAllListeners();
        };
    }, [userId]);

    const saveTokenToDatabase = async (uid: string, tokenValue: string) => {
        try {
            // Assuming we add a push_token column to profiles or have a tokens table
            // @ts-ignore
            const { error } = await supabase
                .from('profiles')
                .update({ push_token: tokenValue })
                .eq('id', uid);

            if (error) console.error('Error saving push token:', error);
        } catch (err) {
            console.error('Failed to save push token:', err);
        }
    };

    return { registerPush, token };
};
