import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface County {
    id: number;
    name: string;
    code: number;
    region: string;
}

export function useCounties() {
    return useQuery({
        queryKey: ['counties_master_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('counties')
                .select('*')
                .order('name');

            if (error) {
                console.error('Error fetching counties:', error);
                throw error;
            }

            return data as County[];
        },
        staleTime: Infinity
    });
}
