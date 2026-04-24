import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Webinar {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    price: number;
    currency: string;
    is_paid: boolean;
    meet_link: string | null;
    google_event_id: string | null;
    max_attendees: number | null;
    cover_image_url: string | null;
    content: string | null;
    speakers: any[];
    faq: any[];
    theme_color: string | null;
    mode: 'online' | 'in-person'; // Added mode
    location: string | null; // Added location
    created_at: string;
    updated_at: string;
}

export function useWebinars() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['webinars', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('webinars')
                .select('*')
                .eq('user_id', user.id)
                .order('start_time', { ascending: true });

            if (error) throw error;
            return data as Webinar[];
        },
        enabled: !!user,
    });
}

export function useWebinar(id: string) {
    return useQuery({
        queryKey: ['webinar', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('webinars')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Webinar;
        },
        enabled: !!id,
    });
}

export function useCreateWebinar() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (webinar: Omit<Webinar, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('webinars')
                .insert({ ...webinar, user_id: user.id })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webinars'] });
        },
    });
}

export function useUpdateWebinar() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Webinar> & { id: string }) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('webinars')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['webinars'] });
            queryClient.invalidateQueries({ queryKey: ['webinar', data.id] });
        },
    });
}

export function useDeleteWebinar() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('webinars')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webinars'] });
        },
    });
}

export function useRegisterWebinar() {
    return useMutation({
        mutationFn: async (data: {
            webinar_id: string;
            attendee_name: string;
            attendee_email: string;
            attendee_phone?: string;
            payment_status?: string;
            payment_id?: string;
        }) => {
            const { data: registration, error } = await supabase
                .from('webinar_registrations')
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            return registration;
        },
    });
}

export function useWebinarRegistrations(webinarId: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['webinar_registrations', webinarId],
        queryFn: async () => {
            if (!user) return [];
            // Only host can verify this via RLS
            const { data, error } = await supabase
                .from('webinar_registrations')
                .select('*')
                .eq('webinar_id', webinarId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user && !!webinarId,
    });
}
