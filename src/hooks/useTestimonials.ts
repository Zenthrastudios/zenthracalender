import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Testimonial {
  id: string;
  event_type_id: string;
  author_name: string;
  author_title: string | null;
  avatar_url: string | null;
  rating: number | null;
  content: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useTestimonials(eventTypeId: string | undefined, opts?: { includeHidden?: boolean }) {
  const includeHidden = opts?.includeHidden ?? false;

  return useQuery({
    queryKey: ['testimonials', eventTypeId, includeHidden],
    queryFn: async () => {
      if (!eventTypeId) return [];

      let query = supabase
        .from('testimonials')
        .select('*')
        .eq('event_type_id', eventTypeId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeHidden) query = query.eq('is_visible', true);

      const { data, error } = await query;
      if (error) throw error;
      return data as Testimonial[];
    },
    enabled: !!eventTypeId,
  });
}

export function useCreateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      event_type_id: string;
      author_name: string;
      author_title?: string | null;
      avatar_url?: string | null;
      rating?: number | null;
      content: string;
      sort_order?: number;
      is_visible?: boolean;
    }) => {
      const { data: created, error } = await supabase
        .from('testimonials')
        .insert({
          event_type_id: data.event_type_id,
          author_name: data.author_name,
          author_title: data.author_title ?? null,
          avatar_url: data.avatar_url ?? null,
          rating: data.rating ?? null,
          content: data.content,
          sort_order: data.sort_order ?? 0,
          is_visible: data.is_visible ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return created as Testimonial;
    },
    onSuccess: (_created, vars) => {
      queryClient.invalidateQueries({ queryKey: ['testimonials', vars.event_type_id] });
    },
  });
}

export function useUpdateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Testimonial> & { id: string }) => {
      const { data, error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Testimonial;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['testimonials', updated.event_type_id] });
    },
  });
}

export function useDeleteTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; event_type_id: string }) => {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['testimonials', vars.event_type_id] });
    },
  });
}
