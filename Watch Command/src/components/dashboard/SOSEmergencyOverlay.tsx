import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, MapPin, RefreshCw, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DispatchTeamSOSDialog } from "../dialogs/DispatchTeamSOSDialog";

interface SOSAlert {
    id: string;
    user_id: string;
    lat: number;
    lng: number;
    location_name: string | null;
    status: 'active' | 'acknowledged' | 'resolved' | 'cancelled';
    created_at: string;
    profiles?: {
        full_name: string | null;
        email: string | null;
        role: string | null;
        bio: string | null;
        blood_group: string | null;
        medical_conditions: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
    };
}

export function SOSEmergencyOverlay() {
    const [activeSOS, setActiveSOS] = useState<SOSAlert[]>([]);
    const [channelStatus, setChannelStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [dispatchSOS, setDispatchSOS] = useState<SOSAlert | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const { settings: userSettings } = useUserSettings();

    const isSoundEnabled = userSettings?.notification_prefs.sound_alerts !== false;

    const fetchActiveSOS = async () => {
        const { data, error } = await supabase
            .from('sos_alerts')
            .select('*, profiles(full_name, email, role, bio, blood_group, medical_conditions, emergency_contact_name, emergency_contact_phone)')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setActiveSOS(data as any);
        }
    };

    useEffect(() => {
        let isMounted = true;
        fetchActiveSOS();

        const channel = supabase
            .channel('sos_alerts_intel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sos_alerts'
                },
                async (payload) => {
                    console.log('SOS Realtime Payload:', payload);
                    if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
                        // Fetch profile for the new alert
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('full_name, email, role, bio, blood_group, medical_conditions, emergency_contact_name, emergency_contact_phone')
                            .eq('id', payload.new.user_id)
                            .single();

                        const newSOS = { ...payload.new, profiles: profile } as SOSAlert;
                        setActiveSOS(prev => {
                            if (prev.some(s => s.id === newSOS.id)) return prev;
                            return [newSOS, ...prev];
                        });
                        toast.error("EMERGENCY SOS SIGNAL RECEIVED", {
                            description: payload.new.location_name || "Unknown location",
                            duration: 10000,
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        if (payload.new.status !== 'active') {
                            setActiveSOS(prev => prev.filter(s => s.id !== payload.new.id));
                        } else {
                            fetchActiveSOS(); // Refresh to ensure profile data is correct
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setActiveSOS(prev => prev.filter(s => s.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status) => {
                if (isMounted) {
                    if (status === 'SUBSCRIBED') setChannelStatus('connected');
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setChannelStatus('error');
                }
            });

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    const handleStatusUpdate = async (sos: SOSAlert, newStatus: 'acknowledged' | 'resolved') => {
        // Immediate local state removal for snap-action feel (Requested)
        setActiveSOS(prev => prev.filter(s => s.id !== sos.id));

        try {
            console.log(`Updating SOS ${sos.id} to ${newStatus}`);
            const { error } = await supabase
                .from('sos_alerts')
                .update({
                    status: newStatus,
                    acknowledged_by: 'Watch Command',
                    acknowledged_at: new Date().toISOString(),
                    resolved_at: newStatus === 'resolved' ? new Date().toISOString() : undefined,
                })
                .eq('id', sos.id);

            if (error) {
                console.error('Supabase Update Error:', error);
                // Rollback if failed
                fetchActiveSOS();
                throw error;
            }

            // Notify the user via high-priority notification table
            await supabase.from('notifications').insert({
                user_id: sos.user_id,
                title: newStatus === 'acknowledged' ? "SOS Acknowledged" : "Emergency Resolved",
                body: newStatus === 'acknowledged'
                    ? "Watch Command has acknowledged your SOS. Help is on the way."
                    : "Your emergency situation has been marked as resolved. Stay safe.",
                type: newStatus === 'acknowledged' ? 'warning' : 'success'
            });

            toast.success(`SOS Alert ${newStatus}`);
        } catch (err: any) {
            console.error('Handler Error:', err);
            toast.error(`Error: ${err.message || "Failed to update SOS status"}`);
        }
    };

    if (activeSOS.length === 0) return null;

    return (
        <div className="fixed top-24 right-8 z-[9999] w-96 space-y-4">
            {!isMuted && isSoundEnabled && activeSOS.length > 0 && (
                <audio autoPlay loop src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" />
            )}

            <div className="flex justify-end gap-2 mb-2">
                <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 text-[10px] font-bold border-red-500/50 ${isMuted ? 'bg-red-500 text-white' : 'bg-black/50 text-red-500'}`}
                    onClick={() => setIsMuted(!isMuted)}
                >
                    {isMuted ? "UNMUTE ALARM" : "MUTE ALARM"}
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-[11px] font-black uppercase tracking-tighter shadow-lg shadow-red-500/20"
                    onClick={fetchActiveSOS}
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    FORCE REFRESH SIGNALS
                </Button>
            </div>

            {activeSOS.map((sos) => (
                <Card key={sos.id} className="border-red-500 bg-black/95 border-2 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.5)] overflow-hidden">
                    <div className="bg-red-600 px-4 py-1.5 flex items-center justify-between">
                        <Badge className="bg-white text-red-600 font-black text-[10px] animate-bounce">
                            CRITICAL EMERGENCY
                        </Badge>
                        <span className="text-[10px] text-white font-mono font-bold">
                            {new Date(sos.created_at).toLocaleTimeString()}
                        </span>
                    </div>

                    <CardContent className="p-4 bg-gradient-to-b from-red-950/50 to-black">
                        <div className="space-y-4">
                            {/* Personal Details Section (Requested) */}
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                <div className="flex items-center gap-2 text-red-400">
                                    <Users className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Reporter Profile</span>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-white leading-tight">
                                        {sos.profiles?.full_name || 'Anonymous Citizen'}
                                    </p>
                                    <p className="text-xs text-red-200/70 font-medium">
                                        {sos.profiles?.email || 'No email provided'}
                                    </p>
                                </div>
                                {sos.profiles?.bio && (
                                    <p className="text-[10px] text-white/60 italic border-l-2 border-red-500 pl-2 py-1">
                                        "{sos.profiles.bio}"
                                    </p>
                                )}

                                {/* Critical Medical Intel */}
                                {sos.profiles && (sos.profiles.blood_group || sos.profiles.medical_conditions) && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="p-2 rounded bg-white/10 border border-white/5">
                                            <p className="text-[8px] uppercase text-red-300 font-bold tracking-tighter">Blood Group</p>
                                            <p className="text-sm font-black text-white">{sos.profiles.blood_group || 'N/A'}</p>
                                        </div>
                                        <div className="p-2 rounded bg-white/10 border border-white/5">
                                            <p className="text-[8px] uppercase text-red-300 font-bold tracking-tighter">Conditions</p>
                                            <p className="text-[9px] font-bold text-white line-clamp-1">{sos.profiles.medical_conditions || 'NONE'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Location Section */}
                            <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/20">
                                <div className="flex items-center gap-2 text-red-300 mb-1">
                                    <MapPin className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Active Location</span>
                                </div>
                                <p className="text-sm font-bold text-white italic">
                                    {sos.location_name || `${sos.lat.toFixed(6)}, ${sos.lng.toFixed(6)}`}
                                </p>
                            </div>

                            {/* Action Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-black/40 border-white/20 text-white hover:bg-white hover:text-red-950 font-black text-[10px] h-9"
                                    onClick={() => handleStatusUpdate(sos, 'acknowledged')}
                                >
                                    <CheckCircle className="h-3 w-3 mr-1 text-green-400" />
                                    ACKNOWLEDGE
                                </Button>
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-red-600 hover:bg-red-500 text-white font-black text-[10px] h-9 shadow-lg shadow-red-600/20"
                                    onClick={() => setDispatchSOS(sos)}
                                >
                                    <Users className="h-3 w-3 mr-1" />
                                    DISPATCH TEAM
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-white text-red-950 hover:bg-red-100 font-black shadow-xl col-span-2 h-10 text-[11px] uppercase tracking-tighter"
                                    onClick={() => handleStatusUpdate(sos, 'resolved')}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    MARK AS RESOLVED / SECURED
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <DispatchTeamSOSDialog
                open={!!dispatchSOS}
                onOpenChange={(open) => !open && setDispatchSOS(null)}
                sos={dispatchSOS}
                onSuccess={() => {
                    if (dispatchSOS) {
                        setActiveSOS(prev => prev.filter(s => s.id !== dispatchSOS.id));
                    }
                    fetchActiveSOS();
                }}
            />
        </div>
    );
}

