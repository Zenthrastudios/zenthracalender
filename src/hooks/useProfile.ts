import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  timezone: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      if (!username) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!username,
  });
}

export function useProfileById(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-by-id', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      // Store in a folder named after the user ID to match RLS policies
      const filePath = `${userId}/${fileName}`;

      // Delete old avatar files for this user (optional cleanup)
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile-by-id'] });
    },
  });
}

export function useUserBranding(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-branding', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await (supabase as any)
        .from('branding_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching branding:', error);
        return null;
      }
      return data;
    },
    enabled: !!userId,
  });
}
