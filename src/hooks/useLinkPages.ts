import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LinkItem {
    id: string;
    title: string;
    url: string;
    icon?: string;
    isActive: boolean;
    clicks: number;
}

export interface LinkPageTheme {
    backgroundType: 'color' | 'gradient' | 'image';
    backgroundColor: string;
    backgroundGradient: string;
    backgroundImage: string;
    buttonStyle: 'rounded' | 'square' | 'outline' | 'shadow';
    buttonColor: string;
    buttonTextColor: string;
    font: string;
    textColor: string;
}

export interface LinkPage {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    bio: string | null;
    avatar_url: string | null;
    links: LinkItem[];
    theme: LinkPageTheme;
    published: boolean;
    view_count: number;
    created_at: string;
    updated_at: string;
}

export function useLinkPage(slugOrId?: string) {
    // If no arg is passed, it might try to fetch the first one for the user?
    // For now, let's assume we pass an ID or Slug.
    // Actually, for the editor default view, we might want "get my link page".
    // Let's support fetching by ID (editor) or Slug (public).

    // BUT, for the dashboard, we usually just want "the" link page if it's 1:1, or a list.
    // Let's assume 1 user can have multiple pages, so useLinkPages (list) and useLinkPage (single).

    const { user } = useAuth();

    return useQuery({
        queryKey: ['linkPage', slugOrId],
        queryFn: async () => {
            if (!slugOrId) return null;

            // Check if it's a UUID (Editor) or Slug (Public)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

            let query = supabase.from('link_pages').select('*');
            if (isUuid) {
                query = query.eq('id', slugOrId);
            } else {
                query = query.eq('slug', slugOrId); // Public lookup
            }

            const { data, error } = await query.single();
            if (error) throw error;
            return data as LinkPage;
        },
        enabled: !!slugOrId
    });
}

export function useMyLinkPages() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['myLinkPages', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('link_pages')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as LinkPage[];
        },
        enabled: !!user
    });
}

export function useCreateLinkPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (vars: { title: string, slug: string }) => {
            const { data, error } = await supabase
                .from('link_pages')
                .insert({
                    user_id: user?.id,
                    title: vars.title,
                    slug: vars.slug,
                    links: [],
                    theme: {
                        backgroundType: 'color',
                        backgroundColor: '#ffffff',
                        buttonStyle: 'rounded',
                        buttonColor: '#000000',
                        buttonTextColor: '#ffffff',
                        textColor: '#000000',
                        font: 'Inter'
                    }
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myLinkPages'] });
        }
    });
}

export function useUpdateLinkPage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (vars: Partial<LinkPage> & { id: string }) => {
            const { id, ...updates } = vars;
            const { data, error } = await supabase
                .from('link_pages')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['linkPage', data.id] });
            queryClient.invalidateQueries({ queryKey: ['linkPage', data.slug] });
            queryClient.invalidateQueries({ queryKey: ['myLinkPages'] });
        }
    });
}

export function useTrackLinkEvent() {
    return useMutation({
        mutationFn: async (vars: { pageId: string, type: 'view' | 'click', linkId?: string, metadata?: any }) => {
            const { error } = await supabase
                .from('link_events')
                .insert({
                    link_page_id: vars.pageId,
                    type: vars.type,
                    link_id: vars.linkId,
                    metadata: vars.metadata || {}
                });

            // Also increment view count on main table for fast access
            if (vars.type === 'view') {
                await supabase.rpc('increment_page_view', { page_id: vars.pageId });
                // Note: Need to create this RPC or just do strict generic update (less safe for concurrency but okay for MVP)
                // Or simple: 
                // await supabase.from('link_pages').update({ view_count: view_count + 1 })... 
                // No, can't refer to self easily without RPC. 
                // We will skip the counter update for now and rely on events table count or do a simple fetch-update.
            }

            if (error) throw error;
        }
    });
}
