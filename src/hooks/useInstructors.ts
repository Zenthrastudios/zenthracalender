import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Instructor {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  specialization: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useInstructors() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Instructor[];
    },
    enabled: !!user,
  });
}

export function useCreateInstructor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (instructorData: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      bio?: string;
      specialization?: string;
    }) => {
      // Use Edge Function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('create-instructor', {
        body: {
          name: instructorData.name,
          email: instructorData.email,
          password: instructorData.password,
          phone: instructorData.phone,
          bio: instructorData.bio,
          specialization: instructorData.specialization,
          created_by: user?.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.instructor as Instructor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
}

export function useUpdateInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Instructor> & { id: string }) => {
      const { data, error } = await supabase
        .from('instructors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Instructor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
}

export function useDeleteInstructor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('instructors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
  });
}
