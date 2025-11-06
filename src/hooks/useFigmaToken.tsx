import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFigmaToken() {
  const [figmaToken, setFigmaToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('figma_access_token')
        .eq('user_id', user.id)
        .maybeSingle() as any;

      if (error) throw error;
      if (data?.figma_access_token) {
        setFigmaToken(data.figma_access_token);
      }
    } catch (error) {
      console.error('Error loading Figma token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First check if settings exist
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_settings')
          .update({ figma_access_token: token } as any)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            figma_access_token: token
          } as any);
        
        if (error) throw error;
      }

      setFigmaToken(token);
      toast.success('Figma token saved for future use!');
      return true;
    } catch (error) {
      console.error('Error saving Figma token:', error);
      toast.error('Failed to save Figma token');
      return false;
    }
  };

  const clearToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_settings')
        .update({ figma_access_token: null } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      setFigmaToken('');
      toast.success('Figma token cleared');
    } catch (error) {
      console.error('Error clearing Figma token:', error);
      toast.error('Failed to clear token');
    }
  };

  const openFigmaTokenPage = () => {
    window.open('https://www.figma.com/developers/api#access-tokens', '_blank');
  };

  return {
    figmaToken,
    setFigmaToken,
    saveToken,
    clearToken,
    openFigmaTokenPage,
    isLoading,
    hasToken: !!figmaToken
  };
}
