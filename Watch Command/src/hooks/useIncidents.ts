import { FilterState } from "@/components/dialogs/FilterSheet";
import { supabase } from '@/integrations/supabase/client';
import { Incident, IncidentCategory, IncidentStats } from '@/types/incident';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useIncidents(filters?: FilterState, options?: { refreshInterval?: number, limit?: number }) {
    const queryClient = useQueryClient();

    const calculateTrend = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return parseFloat(((curr - prev) / prev * 100).toFixed(1));
    };

    const { data: rawIncidents = [], isLoading, error } = useQuery({
        queryKey: ['incidents', filters],
        queryFn: async () => {
            let query = supabase
                .from('incidents')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters?.dateRange && filters.dateRange !== 'all') {
                const now = new Date();
                let startDate = new Date();

                if (filters.dateRange === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                    startDate.setDate(now.getDate() - 1); // Get today + yesterday
                } else if (filters.dateRange === 'week') {
                    startDate.setDate(now.getDate() - 14); // Get 2 weeks
                } else if (filters.dateRange === 'month') {
                    startDate.setDate(now.getDate() - 60); // Get 2 months
                } else if (filters.dateRange === '90d') {
                    startDate.setDate(now.getDate() - 180); // Get 180 days
                } else if (filters.dateRange === 'year') {
                    startDate.setFullYear(now.getFullYear() - 2); // Get 2 years
                }

                query = query.gte('created_at', startDate.toISOString());
            }

            if (filters?.categories?.length) {
                query = query.in('category', filters.categories);
            }
            if (filters?.severities?.length) {
                query = query.in('severity', filters.severities);
            }
            if (filters?.statuses?.length) {
                query = query.in('status', filters.statuses);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        refetchInterval: options?.refreshInterval ? options.refreshInterval * 1000 : false,
    });

    const { data: reporterCount = 0 } = useQuery({
        queryKey: ['reporter_count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            if (error) throw error;
            return count || 0;
        }
    });

    const { data: prevReporterCount = 0 } = useQuery({
        queryKey: ['prev_reporter_count', filters?.dateRange],
        queryFn: async () => {
            const now = new Date();
            const cutoff = new Date();
            if (filters?.dateRange === 'week') cutoff.setDate(now.getDate() - 7);
            else if (filters?.dateRange === 'month') cutoff.setDate(now.getDate() - 30);
            else if (filters?.dateRange === '90d') cutoff.setDate(now.getDate() - 90);
            else if (filters?.dateRange === 'year') cutoff.setFullYear(now.getFullYear() - 1);
            else return 0;

            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .lt('created_at', cutoff.toISOString());
            if (error) throw error;
            return count || 0;
        }
    });

    const { data: rawTimeline = [] } = useQuery({
        queryKey: ['dashboard_timeline'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('incident_timeline')
                .select('*, incidents(title, severity, category)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data;
        },
    });

    // Realtime subscription for instant updates
    useEffect(() => {
        const channel = supabase
            .channel('dashboard_incidents_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'incidents'
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['incidents'] });
            })
            .subscribe();

        const timelineChannel = supabase
            .channel('dashboard_timeline_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'incident_timeline'
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['dashboard_timeline'] });
            })
            .subscribe();

        const profilesChannel = supabase
            .channel('profiles_sync')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles'
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['reporter_count'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(timelineChannel);
            supabase.removeChannel(profilesChannel);
        };
    }, [queryClient]);

    const mapCategory = (cat: string): IncidentCategory => {
        const c = cat?.toLowerCase() || '';
        if (c.includes('water')) return 'water';
        if (c.includes('road') || c.includes('struct')) return 'roads';
        if (c.includes('power') || c.includes('utility') || c.includes('elect')) return 'power';
        if (c.includes('health') || c.includes('medic')) return 'health';
        if (c.includes('security') || c.includes('crime') || c.includes('police')) return 'security';
        if (c.includes('corruption')) return 'corruption';
        if (c.includes('environment')) return 'environment';
        return 'other';
    };

    const mapRowToIncident = (row: any): Incident => {
        // Standardize status: capitalize first letter, rest lowercase if it's a known string status
        let status = row.status || 'Submitted';
        if (typeof status === 'string' && status.length > 0) {
            status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        }

        return {
            id: row.id,
            title: row.title || 'Untitled Incident',
            description: row.description || 'No description provided.',
            category: mapCategory(row.category),
            severity: (row.severity?.toLowerCase() as any) || 'low',
            status: status as any,
            location: {
                county: row.county || row.location || 'Unknown',
                address: row.location_name || row.location || 'N/A',
                coordinates: row.lat && row.lng ? {
                    lat: row.lat,
                    lng: row.lng
                } : undefined
            },
            reporter: {
                id: row.user_id || 'system',
                name: 'Citizen Reporter',
                type: 'citizen',
                verified: true
            },
            assignedTeamId: row.assigned_team_id,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
            views: row.views || 0,
            updates: 0
        };
    };

    let incidents = rawIncidents.map(mapRowToIncident);

    // Generate Monthly Trends (Last 6 months)
    const generateMonthlyTrends = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();

        return months.map((month, index) => {
            const monthIncidents = incidents.filter(inc => {
                const d = new Date(inc.createdAt);
                return d.getMonth() === index && d.getFullYear() === currentYear;
            });
            const resolved = monthIncidents.filter(i => ['Resolved', 'Closed', 'Rejected'].includes(i.status)).length;
            return {
                month,
                incidents: monthIncidents.length,
                resolved,
                critical: monthIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length
            };
        });
    };

    const monthlyData = generateMonthlyTrends();

    // Calculate Actual Response Times from Timeline
    const generateRealResponseTimes = () => {
        const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];

        return hours.map(h => {
            const hour = parseInt(h.split(':')[0]);

            // Filter incidents created in this hour block (last 30 days for better average)
            const hourIncidents = incidents.filter(inc => {
                const d = new Date(inc.createdAt);
                return d.getHours() >= hour && d.getHours() < hour + 4;
            });

            if (hourIncidents.length === 0) return { hour: h, time: 0 };

            // Find matching timeline entries for these incidents
            const relevantTimeline = rawTimeline.filter(t =>
                hourIncidents.some(i => i.id === t.incident_id) &&
                (t.title === 'Status Updated' || t.title === 'Resolved')
            );

            let totalResponseMinutes = 0;
            let count = 0;

            hourIncidents.forEach(inc => {
                const incTimeline = relevantTimeline.find(t => t.incident_id === inc.id);
                if (incTimeline) {
                    const diff = (new Date(incTimeline.created_at).getTime() - new Date(inc.createdAt).getTime()) / 60000;
                    if (diff > 0) {
                        totalResponseMinutes += diff;
                        count++;
                    }
                }
            });

            return {
                hour: h,
                time: count > 0 ? Math.round(totalResponseMinutes / count) : 0
            };
        });
    };

    const responseTimeData = generateRealResponseTimes();

    const categoryBreakdown = incidents.reduce((acc: any[], incident) => {
        const existing = acc.find(a => a.category === incident.category);
        if (existing) {
            existing.count++;
        } else {
            acc.push({ category: incident.category, count: 1, percentage: 0, trend: 0 });
        }
        return acc;
    }, []).map(cat => {
        // Calculate category trend using current vs prev periods
        const cutoffDate = filters?.dateRange === 'week' ? 7 : filters?.dateRange === 'month' ? 30 : 0;
        const now = new Date();
        const startOfCurrent = new Date();
        if (cutoffDate) startOfCurrent.setDate(now.getDate() - cutoffDate);
        else startOfCurrent.setFullYear(2000);

        const startOfPrev = new Date();
        if (cutoffDate) startOfPrev.setDate(now.getDate() - (cutoffDate * 2));
        else startOfPrev.setFullYear(2000);

        const currentCount = incidents.filter(i => i.category === cat.category && new Date(i.createdAt) >= startOfCurrent).length;
        const prevCount = incidents.filter(i => i.category === cat.category && new Date(i.createdAt) >= startOfPrev && new Date(i.createdAt) < startOfCurrent).length;

        return {
            ...cat,
            percentage: incidents.length > 0 ? parseFloat(((cat.count / incidents.length) * 100).toFixed(2)) : 0,
            trend: calculateTrend(currentCount, prevCount)
        };
    });

    // Fetch list of all counties for "Zero Reporting" support
    const { data: allCounties = [] } = useQuery({
        queryKey: ['counties_master_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('counties' as any)
                .select('name')
                .order('name');
            if (error) {
                console.error('Error fetching counties:', (error as any).message);
                return [];
            }
            return data as unknown as { name: string }[];
        },
        staleTime: Infinity
    });
    const countyStats = allCounties?.length > 0 ? allCounties.map(c => {
        const countyName = (c as any).name || 'Unknown';
        // Normalize comparison (case-insensitive and handling "City" suffix for Nairobi/Mombasa)
        const relevantIncidents = incidents.filter(i => {
            const incLoc = (i.location.county || '').toLowerCase();
            const searchName = countyName.toLowerCase();
            const simpleName = searchName.replace(' city', '').trim();

            return incLoc === searchName ||
                incLoc === simpleName ||
                incLoc.includes(searchName) ||
                incLoc.includes(simpleName);
        });

        const currentIncidents = relevantIncidents.filter(i => {
            const date = new Date(i.createdAt);
            const cutoff = new Date();
            if (filters?.dateRange === 'week') cutoff.setDate(cutoff.getDate() - 7);
            else if (filters?.dateRange === 'month') cutoff.setDate(cutoff.getDate() - 30);
            else if (filters?.dateRange === 'today') cutoff.setHours(0, 0, 0, 0);
            else return true;
            return date >= cutoff;
        });

        const prevIncidents = relevantIncidents.filter(i => {
            const date = new Date(i.createdAt);
            const start = new Date();
            const end = new Date();
            if (filters?.dateRange === 'week') {
                start.setDate(start.getDate() - 14);
                end.setDate(end.getDate() - 7);
            } else if (filters?.dateRange === 'month') {
                start.setDate(start.getDate() - 60);
                end.setDate(end.getDate() - 30);
            } else if (filters?.dateRange === 'today') {
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
            } else return false;
            return date >= start && date < end;
        });

        const total = currentIncidents.length;
        const resolved = currentIncidents.filter(i => ['Resolved', 'Closed', 'Rejected'].includes(i.status as string)).length;
        const active = total - resolved;

        const prevTotal = prevIncidents.length;
        const trend = calculateTrend(total, prevTotal);

        // Calculate actual response time for this county
        let countyResponseSum = 0;
        let respondedCount = 0;

        currentIncidents.forEach(inc => {
            const firstUpdate = rawTimeline.find(t =>
                t.incident_id === inc.id &&
                (t.title?.toLowerCase().includes('status') || t.title?.toLowerCase().includes('assign'))
            );
            if (firstUpdate) {
                const diff = (new Date(firstUpdate.created_at).getTime() - new Date(inc.createdAt).getTime()) / 60000;
                if (diff > 0) {
                    countyResponseSum += diff;
                    respondedCount++;
                }
            }
        });

        return {
            county: countyName,
            totalReports: total,
            activeReports: active,
            resolvedReports: resolved,
            avgResponseTime: respondedCount > 0 ? Math.round(countyResponseSum / respondedCount) : 0,
            resolutionRate: total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0,
            trend: trend
        };
    }).sort((a, b) => b.totalReports - a.totalReports)
        :
        // Fallback if counties table fetch fails (uses existing reduction logic)
        incidents.reduce((acc: any[], incident) => {
            const rowCounty = incident.location.county || 'Unknown';
            // Simple normalization for fallback: use first part of comma-separated string if it looks like an address
            const county = rowCounty.includes(',') ? rowCounty.split(',').pop()?.trim() || rowCounty : rowCounty;

            const existing = acc.find((a: any) =>
                a.county.toLowerCase() === county.toLowerCase() ||
                a.county.toLowerCase().includes(county.toLowerCase()) ||
                county.toLowerCase().includes(a.county.toLowerCase())
            );

            if (existing) {
                existing.totalReports++;
                if (!['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(incident.status)) existing.activeReports++;
                else existing.resolvedReports++;
            } else {
                acc.push({
                    county,
                    totalReports: 1,
                    activeReports: !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(incident.status) ? 1 : 0,
                    resolvedReports: ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(incident.status) ? 1 : 0,
                    trend: 0,
                    avgResponseTime: 45,
                    resolutionRate: 0
                });
            }
            return acc;
        }, []);

    // Helper to get last 7 days counts
    const getSparklineData = (filterFn: (i: Incident) => boolean) => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const count = incidents.filter(inc => {
                const incDate = new Date(inc.createdAt);
                return incDate >= date && incDate < nextDate && filterFn(inc);
            }).length;
            data.push(count);
        }
        return data;
    };

    const sparklines = {
        total: getSparklineData(() => true),
        active: getSparklineData(i => !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)),
        resolved: getSparklineData(i => ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)),
        critical: getSparklineData(i => i.severity === 'critical' || i.severity === 'high'),
        response: Array(7).fill(0), // Placeholder for real time-series if available
        resolutionRate: Array(7).fill(0) // Placeholder for real time-series if available
    };

    const { data: unacknowledgedAlertsCount = 0 } = useQuery({
        queryKey: ['alerts_unack_count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('alerts')
                .select('*', { count: 'exact', head: true })
                .eq('acknowledged', false);
            if (error) throw error;
            return count || 0;
        },
    });

    const { data: sosActiveCount = 0 } = useQuery({
        queryKey: ['sos_alerts_active_count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('sos_alerts')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');
            if (error) throw error;
            return count || 0;
        },
    });

    // Subscriptions for alerts and SOS
    useEffect(() => {
        const alertsChannel = supabase
            .channel('alerts_count_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
                queryClient.invalidateQueries({ queryKey: ['alerts_unack_count'] });
            })
            .subscribe();

        const sosChannel = supabase
            .channel('sos_count_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, () => {
                queryClient.invalidateQueries({ queryKey: ['sos_alerts_active_count'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(alertsChannel);
            supabase.removeChannel(sosChannel);
        };
    }, [queryClient]);

    const resolvedCount = incidents.filter(i => ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length;

    // Fetch totals for the previous period to calculate real trends
    const now = new Date();
    const cutoff = new Date();
    const prevStart = new Date();

    if (filters?.dateRange === 'week') {
        cutoff.setDate(now.getDate() - 7);
        prevStart.setDate(now.getDate() - 14);
    } else if (filters?.dateRange === 'month') {
        cutoff.setDate(now.getDate() - 30);
        prevStart.setDate(now.getDate() - 60);
    } else if (filters?.dateRange === '90d') {
        cutoff.setDate(now.getDate() - 90);
        prevStart.setDate(now.getDate() - 180);
    } else if (filters?.dateRange === 'year') {
        cutoff.setFullYear(now.getFullYear() - 1);
        prevStart.setFullYear(now.getFullYear() - 2);
    } else if (filters?.dateRange === 'today') {
        cutoff.setHours(0, 0, 0, 0);
        prevStart.setDate(now.getDate() - 1);
        prevStart.setHours(0, 0, 0, 0);
    } else {
        cutoff.setFullYear(2000); // All time
        prevStart.setFullYear(2000);
    }

    const currentPeriodIncidents = incidents.filter(i => new Date(i.createdAt) >= cutoff);
    const prevPeriodIncidents = incidents.filter(i => {
        const d = new Date(i.createdAt);
        return d >= prevStart && d < cutoff;
    });


    const currentResolved = currentPeriodIncidents.filter(i => ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length;
    const resolutionRate = currentPeriodIncidents.length > 0 ? (currentResolved / currentPeriodIncidents.length) * 100 : 0;

    const stats: IncidentStats = {
        total: currentPeriodIncidents.length,
        active: currentPeriodIncidents.filter(i => !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length,
        resolvedToday: currentPeriodIncidents.filter(i => {
            const date = new Date(i.updatedAt);
            const today = new Date();
            return ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status) &&
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }).length,
        critical: unacknowledgedAlertsCount + sosActiveCount,
        avgResponseTime: responseTimeData.filter(d => d.time > 0).length > 0
            ? Math.round(responseTimeData.filter(d => d.time > 0).reduce((acc, d) => acc + d.time, 0) / responseTimeData.filter(d => d.time > 0).length)
            : 0,
        resolutionRate: parseFloat(resolutionRate.toFixed(1)),
        users: reporterCount,
        trend: {
            total: calculateTrend(currentPeriodIncidents.length, prevPeriodIncidents.length),
            active: calculateTrend(
                currentPeriodIncidents.filter(i => !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length,
                prevPeriodIncidents.filter(i => !['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length
            ),
            resolved: calculateTrend(
                currentPeriodIncidents.filter(i => ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length,
                prevPeriodIncidents.filter(i => ['Resolved', 'Closed', 'Rejected', 'resolved', 'closed', 'rejected'].includes(i.status)).length
            ),
            critical: calculateTrend(
                currentPeriodIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length,
                prevPeriodIncidents.filter(i => i.severity === 'critical' || i.severity === 'high').length
            ),
            users: calculateTrend(reporterCount, prevReporterCount)
        },
        sparklines
    };

    // Generate activities from recent incidents
    // Generate activities from recent incidents AND timeline
    const incidentActivities = incidents
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((incident) => ({
            id: `NEW-${incident.id}`,
            type: 'new_incident' as const,
            incident: {
                id: incident.id,
                title: incident.title,
                severity: incident.severity,
                category: incident.category
            },
            actor: {
                name: incident.reporter.name,
                role: 'Reporter'
            },
            details: 'New incident reported',
            timestamp: incident.createdAt
        }));

    const timelineActivities = rawTimeline.map((item: any) => {
        let type: any = 'status_change';
        if (item.title?.toLowerCase().includes('assign')) type = 'assignment';
        if (item.title?.toLowerCase().includes('resolve')) type = 'resolution';
        if (item.title?.toLowerCase().includes('escalate')) type = 'escalation';

        return {
            id: `TL-${item.id}`,
            type,
            incident: {
                id: item.incident_id,
                title: item.incidents?.title || 'Unknown Incident',
                severity: item.incidents?.severity || 'info', // Fallback if join misses
                category: item.incidents?.category || 'other'
            },
            details: item.description || item.title,
            timestamp: item.created_at
        };
    });

    const activities = [...incidentActivities, ...timelineActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

    return {
        incidents: options?.limit ? incidents.slice(0, options.limit) : incidents,
        stats,
        categoryBreakdown,
        countyStats,
        activities,
        monthlyData,
        responseTimeData,
        isLoading,
        error
    };
}
