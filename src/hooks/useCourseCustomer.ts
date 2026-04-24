import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCourseCustomer() {
  const { user } = useAuth();
  const [hasPurchases, setHasPurchases] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkCourseCustomer() {
      if (!user?.email) {
        setHasPurchases(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has any course purchases
        const { data, error } = await (supabase as any)
          .from('course_purchases')
          .select('id')
          .eq('customer_email', user.email)
          .eq('status', 'paid')
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasPurchases(true);
        } else {
          setHasPurchases(false);
        }
      } catch (error) {
        console.error('Error checking course purchases:', error);
        setHasPurchases(false);
      }

      setIsLoading(false);
    }

    checkCourseCustomer();
  }, [user?.email]);

  return { hasPurchases, isLoading };
}

// Helper function to check if an email has course purchases (for use during signup)
export async function checkEmailForCoursePurchases(email: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any)
      .from('course_purchases')
      .select('id')
      .eq('customer_email', email)
      .eq('status', 'paid')
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Error checking email for course purchases:', error);
    return false;
  }
}
