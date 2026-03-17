import { CategoryIcon, getCategoryLabel } from "@/components/dashboard/CategoryIcon";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AssignTeamDialog } from "@/components/dialogs/AssignTeamDialog";
import { EscalationDialog } from "@/components/dialogs/EscalationDialog";
import { ImageViewerDialog } from "@/components/dialogs/ImageViewerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Archive, ArrowLeft, Calendar, Check, CheckCircle, Clock, Loader2, MapPin, MessageSquare, Send, Shield, User, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function IncidentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assignOpen, setAssignOpen] = useState(false);
    const [escalateOpen, setEscalateOpen] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const { data: incident, isLoading, refetch } = useQuery({
        queryKey: ["incident", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("incidents")
                .select("*, teams(name, type, id), comments(*, profiles(full_name, avatar_url, role)), incident_timeline(*)")
                .eq("id", id)
                .single();

            if (error) throw error;

            const incidentData = data as any;

            // Sort comments and timeline locally since we can't easily sub-select sort in single query
            const sortedComments = (incidentData.comments || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            const sortedTimeline = (incidentData.incident_timeline || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            return {
                id: incidentData.id,
                title: incidentData.title,
                description: incidentData.description,
                category: incidentData.category,
                severity: incidentData.severity,
                status: incidentData.status,
                location: {
                    county: incidentData.location || "Unknown",
                    address: incidentData.location_name || incidentData.location,
                    coordinates: { lat: incidentData.lat, lng: incidentData.lng }
                },
                reporter: {
                    id: incidentData.user_id,
                    name: "Citizen Reporter",
                    verified: true
                },
                createdAt: incidentData.created_at,
                updatedAt: incidentData.updated_at,
                assignedTeam: incidentData.teams ? {
                    id: incidentData.teams.id,
                    name: incidentData.teams.name,
                    type: incidentData.teams.type
                } : undefined,
                assignedTeamId: incidentData.assigned_team_id,
                media: {
                    photos: incidentData.media_urls || [],
                    videos: [],
                    audio: []
                },
                comments: sortedComments,
                timeline: sortedTimeline
            } as any;
        },
    });

    // Add Realtime subscription
    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`incident_sync_${id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'incidents', filter: `id=eq.${id}` },
                () => queryClient.invalidateQueries({ queryKey: ['incident', id] })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comments', filter: `incident_id=eq.${id}` },
                () => queryClient.invalidateQueries({ queryKey: ['incident', id] })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'incident_timeline', filter: `incident_id=eq.${id}` },
                () => queryClient.invalidateQueries({ queryKey: ['incident', id] })
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, queryClient]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!incident) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="text-xl font-semibold">Incident Not Found</div>
                    <Button onClick={() => navigate("/incidents")}>Back to Incidents</Button>
                </div>
            </DashboardLayout>
        );
    }


    const handleStatusUpdate = async (newStatus: string) => {
        if (!incident?.id) {
            toast({
                title: "Error",
                description: "No incident loaded. Please refresh the page.",
                variant: "destructive"
            });
            return;
        }

        const targetId = incident.id; // Use the loaded incident's ID, not the URL param
        console.log('[handleStatusUpdate] Updating incident:', targetId, 'to status:', newStatus);

        try {
            // 1. Update Incident Status
            const { data, error } = await supabase
                .from('incidents')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', targetId)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Update failed. You may not have permission to modify this incident.');

            // Audit Log
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('staff_audit_logs').insert({
                    actor_id: user.id,
                    action: `Status Update: ${newStatus}`,
                    target_resource: `incident:${targetId}`,
                    details: { old_status: incident.status, new_status: newStatus }
                });
            }

            // Side effects now handled by database trigger: notify_on_status_change

            toast({
                title: "Status Updated",
                description: `Incident ${targetId.slice(0, 8).toUpperCase()} status changed to ${newStatus.replace('_', ' ')}`,
            });
            queryClient.invalidateQueries({ queryKey: ['incident', targetId] });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleFakeReport = async () => {
        if (!incident?.id) return;
        const targetId = incident.id;

        try {
            // 1. Mark incident as rejected
            const { data, error: updateError } = await supabase
                .from('incidents')
                .update({ status: 'Rejected', updated_at: new Date().toISOString() })
                .eq('id', targetId)
                .select();

            if (updateError) throw updateError;
            if (!data || data.length === 0) throw new Error('Update failed. You may not have permission to modify this incident.');

            // Audit Log
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('staff_audit_logs').insert({
                    actor_id: user.id,
                    action: 'Marked as Fake',
                    target_resource: `incident:${targetId}`,
                    details: { previous_status: incident.status }
                });
            }

            // 2. Penalize User (Deduct 50 points)
            if (incident.reporter.id && incident.reporter.id !== 'system') {
                // Fetch current score first (safest way without RPC if not available)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('accuracy_score')
                    .eq('id', incident.reporter.id)
                    .single();

                if (profile) {
                    const newScore = Math.max(0, (profile.accuracy_score || 100) - 50);
                    await supabase
                        .from('profiles')
                        .update({ accuracy_score: newScore })
                        .eq('id', incident.reporter.id);
                }

                // 3. Notify User
                await supabase.from('notifications').insert({
                    user_id: incident.reporter.id,
                    title: 'Report Rejected - Fake Incident',
                    body: 'Your incident report has been verified as fake. 50 points have been deducted from your accuracy score.',
                    type: 'warning'
                });
            }

            // 4. Timeline Entry
            await supabase.from('incident_timeline').insert({
                incident_id: targetId,
                title: 'Report Rejected',
                description: 'This report was marked as fake by the Command Center.'
            });

            toast({
                title: "Report Rejected",
                description: "Incident marked as fake and reporter penalized.",
                variant: "destructive"
            });
            // refetch(); // Handled by realtime
        } catch (error: any) {
            toast({
                title: "Action Failed",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setIsSubmittingNote(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Validate we have the required data
            if (!incident?.id) {
                throw new Error('No incident ID found');
            }
            if (!user?.id) {
                throw new Error('You must be logged in to add notes');
            }

            const targetId = incident.id;

            console.log('Attempting to insert comment:', {
                incident_id: targetId,
                user_id: user.id,
                content_length: noteText.trim().length
            });

            // Add as a comment
            const { error: commentError, data: commentData } = await supabase.from('comments').insert({
                incident_id: targetId,
                user_id: user.id,
                content: noteText.trim()
            }).select();

            if (commentError) {
                console.error('Comment insert error:', commentError);
                throw commentError;
            }

            console.log('Comment inserted successfully:', commentData);

            // Add to timeline
            await supabase.from('incident_timeline').insert({
                incident_id: targetId,
                title: 'Note Added',
                description: `Command Center added a note: "${noteText.trim().slice(0, 50)}..."`
            });

            // Audit Log
            if (user) {
                await supabase.from('staff_audit_logs').insert({
                    actor_id: user.id,
                    action: 'Added Note',
                    target_resource: `incident:${targetId}`,
                    details: { note_snippet: noteText.trim().slice(0, 50) }
                });
            }

            setNoteText("");
            toast({
                title: "Note Added",
                description: "Your briefing note has been recorded.",
            });
        } catch (error: any) {
            console.error('handleAddNote error:', error);
            toast({
                title: "Failed to add note",
                description: error.message || 'Unknown error occurred',
                variant: "destructive"
            });
        } finally {
            setIsSubmittingNote(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in-up">
                {/* Header Navigation */}
                <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                {/* Title Section */}
                <div className="flex flex-col md:flex-row justify-between gap-4 md:items-start">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{incident.title}</h1>
                            <Badge variant="outline" className="font-mono text-xs">
                                {incident.id.slice(0, 8).toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <SeverityBadge severity={incident.severity} />
                            <StatusBadge status={incident.status} />
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                                <CategoryIcon category={incident.category} size="sm" />
                                {incident.displayCategory || getCategoryLabel(incident.category)}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {/* STAGE 1: VALIDATION (Submitted/Pending) */}
                        {['Submitted', 'Pending', 'Under Review', 'submitted', 'pending', 'under_review'].includes(incident.status || '') && (
                            <>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    onClick={() => handleStatusUpdate('Verified')}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Verify Incident
                                </Button>
                                <Button
                                    className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm border-0"
                                    onClick={() => setAssignOpen(true)}
                                >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Assign Team
                                </Button>
                                <Button
                                    variant="outline"
                                    className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm"
                                    onClick={() => setEscalateOpen(true)}
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                                    Escalate
                                </Button>
                                <Button
                                    className="bg-[#7f1d1d] hover:bg-[#991b1b] text-white shadow-sm border-0"
                                    onClick={handleFakeReport}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Mark as Fake
                                </Button>
                            </>
                        )}

                        {/* STAGE 2: VERIFIED (Ready for Action) */}
                        {incident.status === 'Verified' && (
                            <>
                                <Button
                                    className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm border-0"
                                    onClick={() => setAssignOpen(true)}
                                >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Assign Team
                                </Button>
                                <Button
                                    variant="outline"
                                    className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm"
                                    onClick={() => setEscalateOpen(true)}
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                                    Escalate
                                </Button>
                                <Button
                                    className="bg-[#7f1d1d] hover:bg-[#991b1b] text-white shadow-sm border-0"
                                    onClick={handleFakeReport}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Mark as Fake
                                </Button>
                            </>
                        )}

                        {/* STAGE 3: ACTIVE RESPONSE (Assigned/In Progress) */}
                        {['Assigned', 'In Progress', 'assigned', 'in_progress'].includes(incident.status || '') && (
                            <>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    onClick={() => handleStatusUpdate('Resolved')}
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Resolve
                                </Button>
                                <Button
                                    variant="outline"
                                    className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm"
                                    onClick={() => setEscalateOpen(true)}
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                                    Escalate
                                </Button>
                            </>
                        )}

                        {/* STAGE 4: RESOLVED (Ready for Close) */}
                        {incident.status === 'resolved' && (
                            <Button
                                variant="outline"
                                className="border-gray-300 text-gray-600 hover:bg-gray-100"
                                onClick={() => handleStatusUpdate('Closed')}
                            >
                                <Archive className="mr-2 h-4 w-4" />
                                Close Case
                            </Button>
                        )}

                        {/* TERMINAL STATES: CLOSED OR REJECTED (Read Only) */}
                        {['rejected', 'closed'].includes((incident.status || '').toLowerCase()) && (
                            <Badge variant="outline" className="px-3 py-1 border-muted text-muted-foreground">
                                Read Only - {incident.status === 'rejected' ? 'Rejected' : 'Case Closed'}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed">
                                    {incident.description}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Media Gallery */}
                        {incident.media?.photos && incident.media.photos.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Media Evidence</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {incident.media.photos.map((url, i) => (
                                            <div
                                                key={i}
                                                className="aspect-video rounded-lg bg-muted overflow-hidden border border-border/50 group relative cursor-pointer"
                                                onClick={() => setSelectedImage(url)}
                                            >
                                                <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Location Map Placeholder */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <span className="text-muted-foreground">Address:</span>
                                        {incident.location.address}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm mt-1">
                                        <span className="text-muted-foreground">Coordinates:</span>
                                        <span className="font-mono text-xs bg-muted px-1 rounded">
                                            {incident.location.coordinates?.lat.toFixed(6)}, {incident.location.coordinates?.lng.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                                {/* Placeholder for map view - would use Leaflet/Mapbox in real app */}
                                <div className="w-full h-[300px] bg-muted/20 rounded-lg flex items-center justify-center border border-border/50">
                                    <p className="text-muted-foreground text-sm">Map View Component</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Details Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Incident Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between py-2 border-b border-border/50">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-4 w-4" /> Used Reported
                                    </span>
                                    <span className="text-sm font-medium">
                                        {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-border/50">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> Date
                                    </span>
                                    <span className="text-sm font-medium">
                                        {new Date(incident.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-border/50">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <User className="h-4 w-4" /> Reporter
                                    </span>
                                    <span className="text-sm font-medium">
                                        {incident.reporter.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-border/50">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Shield className="h-4 w-4" /> Assigned Team
                                    </span>
                                    <span className="text-sm font-medium">
                                        {incident.assignedTeam ? incident.assignedTeam.name : "Unassigned"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Activity / Comments (Placeholder) */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Updates & Activity
                                </CardTitle>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live
                                </span>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Action Box */}
                                    <div className="flex gap-2">
                                        <textarea
                                            placeholder="Add a briefing note..."
                                            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            disabled={isSubmittingNote}
                                        />
                                        <Button
                                            size="icon"
                                            className="h-[80px] w-12 flex-shrink-0"
                                            onClick={handleAddNote}
                                            disabled={!noteText.trim() || isSubmittingNote}
                                        >
                                            {isSubmittingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Combined Timeline & Comments */}
                                        {[...(incident.timeline || []), ...(incident.comments || [])]
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .map((item: any) => (
                                                <div key={item.id} className="flex gap-3 text-sm animate-in fade-in slide-in-from-top-1">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                                        item.description ? "bg-primary/10" : "bg-muted"
                                                    )}>
                                                        {item.description ? (
                                                            <Clock className="h-4 w-4 text-primary" />
                                                        ) : (
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-semibold text-sm">
                                                                {item.title || item.profiles?.full_name || "System Update"}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                        <p className="text-muted-foreground mt-0.5 line-clamp-3">
                                                            {item.description || item.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}

                                        {(!incident.timeline?.length && !incident.comments?.length) && (
                                            <div className="text-center py-8">
                                                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <AssignTeamDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                incident={incident}
                onSuccess={refetch}
            />
            <EscalationDialog
                open={escalateOpen}
                onOpenChange={setEscalateOpen}
                incident={incident}
                onSuccess={refetch}
            />
            <ImageViewerDialog
                open={!!selectedImage}
                onOpenChange={(open) => !open && setSelectedImage(null)}
                imageUrl={selectedImage}
            />
        </DashboardLayout >
    );
}
