
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdAnalytics() {

    const trackAdEvent = async (
        lessonId: string,
        eventType: 'view' | 'click',
        context?: {
            purchaseId?: string;
            customerEmail?: string;
            courseId?: string;
            metadata?: any;
        }
    ) => {
        try {
            const { error } = await supabase
                .from('lesson_ad_events')
                .insert({
                    lesson_id: lessonId,
                    event_type: eventType,
                    purchase_id: context?.purchaseId,
                    customer_email: context?.customerEmail,
                    course_id: context?.courseId,
                    metadata: {
                        ...context?.metadata,
                        url: window.location.href,
                        referrer: document.referrer,
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        screen: `${window.screen.width}x${window.screen.height}`,
                        timestamp: new Date().toISOString()
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
