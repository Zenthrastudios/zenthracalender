import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'cal.schedule',
    appName: 'Intimate Care',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        iosScheme: 'https',
        allowNavigation: [
            "*.supabase.co",
            "zlhbzlxxdezlrtzljpni.supabase.co",
            "*.r2.dev",
            "*.cloudflarestorage.com"
        ]
    },
    plugins: {
        PushNotifications: {
            presentationOptions: ["badge", "sound", "alert"],
        },
    },
};

export default config;
