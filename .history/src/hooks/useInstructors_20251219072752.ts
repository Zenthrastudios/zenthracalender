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
      bio?: string;
      specialization?: string;
    }) => {
      // First create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: instructorData.email,
        password: instructorData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: instructorData.name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create instructor record
      const { data, error } = await supabase
        .from('instructors')
        .insert({
          user_id: authData.user.id,
          name: instructorData.name,
          email: instructorData.email,
          bio: instructorData.bio || null,
          specialization: instructorData.specialization || null,
          created_by: user?.id,
        })
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
