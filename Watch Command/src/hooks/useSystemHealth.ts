import { supabase } from '@/integrations/supabase/client';
import { SystemHealth } from '@/types/incident';
import { useEffect, useState } from 'react';

export function useSystemHealth() {
    const [health, setHealth] = useState<SystemHealth>({
        api: 'healthy',
        database: 'healthy',
        websocket: 'connected',
        avgResponseTime: 45,
        errorRate: 0,
        uptime: 99.98
    });

    useEffect(() => {
        const checkHealth = async () => {
            const start = performance.now();
            try {
                // Ping database with a lightweight query
                const { error } = await supabase.from('incidents').select('count', { count: 'exact', head: true });
                const end = performance.now();
                const latency = Math.round(end - start);

                if (error) throw error;

                setHealth(prev => ({
                    ...prev,
                    database: 'healthy',
                    api: 'healthy',
                    websocket: (supabase as any).realtime?.isConnected?.() ? 'connected' : 'disconnected',
                    avgResponseTime: latency,
                    errorRate: 0
                }));
            } catch (err) {
                setHealth(prev => ({
                    ...prev,
                    database: 'degraded',
                    api: 'degraded',
                    errorRate: prev.errorRate + 1
                }));
            }
        };

        // Initial check
        checkHealth();

        // High-frequency polling for command center responsiveness
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    return health;
}
