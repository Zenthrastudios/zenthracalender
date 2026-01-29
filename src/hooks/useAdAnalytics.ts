
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdAnalytics() {

    const trackAdEvent = async (
        lessonId: string,
        eventType: 'view' | 'click',
        metadata: any = {}
    ) => {
        try {
            const { error } = await supabase
                .from('lesson_ad_events')
                .insert({
                    lesson_id: lessonId,
                    event_type: eventType,
                    metadata: {
                        ...metadata,
                        url: window.location.href,
                        referrer: document.referrer,
                        userAgent: navigator.userAgent
                    }
                });

            if (error) {
                console.error('Failed to track ad event:', error);
            }
        } catch (err) {
            console.error('Exception tracking ad event:', err);
        }
    };

    return { trackAdEvent };
}
