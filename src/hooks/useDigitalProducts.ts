import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DigitalProduct = Tables<'digital_products'>;

export function useDigitalProducts() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['digital-products', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('digital_products')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as DigitalProduct[];
        },
        enabled: !!user,
    });
}

export function useDigitalProduct(id: string | undefined) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['digital-product', id],
        queryFn: async () => {
            if (!id || !user) return null;

            const { data, error } = await supabase
                .from('digital_products')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            return data as DigitalProduct;
        },
        enabled: !!id && !!user,
    });
}

export function useProductBySlug(username: string | undefined, slug: string | undefined) {
    return useQuery({
        queryKey: ['public-product', username, slug],
        queryFn: async () => {
            if (!username || !slug) return null;

            // First get profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('user_id, name, avatar_url')
                .eq('username', username)
                .maybeSingle();

            if (profileError || !profile) return null;

            const { data: product, error } = await supabase
                .from('digital_products')
                .select('*')
                .eq('user_id', profile.user_id)
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

            if (error || !product) return null;

            // Fetch branding settings
            const { data: branding } = await supabase
                .from('branding_settings')
                .select('brand_name, brand_logo_url, is_enabled')
                .eq('user_id', profile.user_id)
                .single();

            // Use branding if enabled, otherwise fallback to profile
            const isBrandingEnabled = branding?.is_enabled === true;
            const displayName = isBrandingEnabled && branding?.brand_name?.trim()
                ? branding.brand_name
                : profile.name;
            // Only use brand logo if it exists and is not empty
            const displayLogo = isBrandingEnabled && branding?.brand_logo_url?.trim()
                ? branding.brand_logo_url
                : null; // Use null to show fallback initial instead of profile avatar

            return {
                product: product as DigitalProduct,
                seller: {
                    name: displayName,
                    username,
                    avatar_url: displayLogo,
                    id: profile.user_id
                },
                branding: isBrandingEnabled ? branding : null
            };
        },
        enabled: !!username && !!slug,
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (data: Omit<TablesInsert<'digital_products'>, 'user_id'>) => {
            if (!user) throw new Error('Not authenticated');

            const { data: newProduct, error } = await supabase
                .from('digital_products')
                .insert({
                    ...data,
                    user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return newProduct as DigitalProduct;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['digital-products'] });
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: TablesUpdate<'digital_products'> & { id: string }) => {
            const { data: updated, error } = await supabase
                .from('digital_products')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated as DigitalProduct;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['digital-products'] });
            queryClient.invalidateQueries({ queryKey: ['digital-product'] });
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('digital_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['digital-products'] });
        },
    });
}

export function useUploadProductFile() {
    return useMutation({
        mutationFn: async ({ file, bucket, path }: { file: File, bucket: string, path: string }) => {
            const { error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error) throw error;

            // Get public URL for thumbnails, but standard access for private files
            // NOTE: For the 'digital-products' bucket, we will want Signed URLs usually.
            // But for now we just return the path so it can be stored.
            return path;
        }
    });
}

// Product Stats for Admin Dashboard
export function useProductStats() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['product-stats', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Get total revenue from paid purchases
            const { data: purchases, error: purchasesError } = await supabase
                .from('product_purchases')
                .select('amount, product_id, digital_products!inner(user_id)')
                .eq('status', 'paid')
                .eq('digital_products.user_id', user.id);

            if (purchasesError) throw purchasesError;

            const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            const totalSales = purchases?.length || 0;

            // Get total views from analytics
            const { data: analytics, error: analyticsError } = await supabase
                .from('product_analytics')
                .select('purchase_id, product_purchases!inner(product_id, digital_products!inner(user_id))')
                .eq('product_purchases.digital_products.user_id', user.id);

            if (analyticsError) throw analyticsError;

            const totalViews = analytics?.length || 0;

            return {
                totalRevenue,
                totalSales,
                totalViews
            };
        },
        enabled: !!user,
    });
}

// Customer Purchases
export function useMyPurchases() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['my-purchases', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('product_purchases')
                .select('*, product:digital_products(*)')
                .eq('customer_email', user.email)
                .eq('status', 'paid')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });
}
