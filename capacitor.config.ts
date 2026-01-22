import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.zenthracalendar.app',
    appName: 'Zenthra Calendar',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        allowNavigation: [
            "*.supabase.co",
            "zlhbzlxxdezlrtzljpni.supabase.co"
        ]
    },
    plugins: {
        PushNotifications: {
            presentationOptions: ["badge", "sound", "alert"],
        },
    },
};

export default config;
