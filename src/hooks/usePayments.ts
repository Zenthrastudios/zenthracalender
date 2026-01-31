import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Payment {
  id: string;
  booking_id: string;
  provider: 'cashfree' | 'razorpay';
  order_id: string;
  payment_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function usePayments(bookingId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['payments', bookingId],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });
}

export function useCreateCashfreeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bookingId: string;
      amount: number;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      returnUrl: string;
      hostId: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('cashfree-payment', {
        body: {
          action: 'create-order',
          ...data,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useVerifyCashfreePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data: result, error } = await supabase.functions.invoke('cashfree-payment', {
        body: {
          action: 'verify-payment',
          orderId,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useCreateRazorpayOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bookingId?: string;
      webinarRegistrationId?: string;
      coursePurchaseId?: string;
      amount: number; // Amount in paise
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      hostId: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('razorpay-payment', {
        body: {
          action: 'create-order',
          ...data,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useVerifyRazorpayPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('razorpay-payment', {
        body: {
          action: 'verify-payment',
          ...data,
        },
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
