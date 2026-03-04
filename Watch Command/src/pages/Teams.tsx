import { CreateTeamDialog } from "@/components/dialogs/CreateTeamDialog";
import { ManageMembersDialog } from "@/components/dialogs/ManageMembersDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import {
  Activity,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";

interface Team {
  id: string;
  name: string;
  type: string;
  status: string;
  members_count: number | null;
  avg_response_time: number | null;
  rating: number | null;
  county: string | null;
  lead_name: string | null;
  created_at: string;
}

const teamColors: Record<string, string> = {
  "Emergency Response": "hsl(var(--chart-1))",
  "Utilities": "hsl(var(--category-water))",
  "Infrastructure": "hsl(var(--category-roads))",
  "Healthcare": "hsl(var(--category-health))",
  "Security": "hsl(var(--category-security))",
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string, name: string } | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      // Fetch teams and their member counts via a separate join or profile count
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true });

      if (teamsError) throw teamsError;

      const { data: profilesData, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("team_id")
        .not("team_id", "is", null);

      if (profilesError) throw profilesError;

      // Manually aggregate member counts
      const teamsWithCounts = (teamsData || []).map((team: any) => ({
        ...team,
        members_count: (profilesData as any[])?.filter(p => p.team_id === team.id).length || 0,
        avg_response_time: team.avg_response_time || 20,
        rating: team.rating || 4.5
      }));

      setTeams(teamsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMembers = teams.reduce((acc, t) => acc + (t.members_count || 0), 0);
  const activeTeams = teams.filter((t) => t.status === "active").length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage response teams and field agents
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold font-mono">{teams.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold font-mono">{totalMembers}</p>
              </div>
              <Activity className="h-8 w-8 text-severity-low opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Teams</p>
                <p className="text-2xl font-bold font-mono">{activeTeams}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-severity-low opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold font-mono">
                  {teams.length > 0
                    ? Math.round(
                      teams.reduce((acc, t) => acc + (t.avg_response_time || 0), 0) /
                      teams.length
                    )
                    : 0}{" "}
                  min
                </p>
              </div>
              <Clock className="h-8 w-8 text-severity-medium opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="xl:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Teams Grid */}
          {filteredTeams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No teams found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeams.map((team) => (
                <Card key={team.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{
                            backgroundColor: teamColors[team.type] || "hsl(var(--primary))",
                          }}
                        >
                          {team.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{team.type}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedTeam({ id: team.id, name: team.name });
                            setIsManageMembersOpen(true);
                          }}>
                            Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={async () => {
                            if (confirm(`Delete team "${team.name}"?`)) {
                              const { error } = await supabase.from('teams').delete().eq('id', team.id);
                              if (!error) fetchTeams();
                            }
                          }}>Delete Team</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status & Rating */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          team.status === "active"
                            ? "default"
                            : team.status === "busy"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {team.status === "active"
                          ? "Active"
                          : team.status === "busy"
                            ? "Busy"
                            : "On Call"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{team.rating || 0}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold font-mono">{team.members_count || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Members</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold font-mono text-severity-medium">-</p>
                        <p className="text-[10px] text-muted-foreground">Active</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold font-mono text-severity-low">-</p>
                        <p className="text-[10px] text-muted-foreground">Resolved</p>
                      </div>
                    </div>

                    {/* Response Time */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Avg Response Time</span>
                        <span className="font-mono">{team.avg_response_time || 0} min</span>
                      </div>
                      <Progress
                        value={100 - (team.avg_response_time || 0)}
                        className="h-1.5"
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {team.county || "Multi-County"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Lead: {team.lead_name || "Unassigned"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Top Performers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-severity-low" />
                Top Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px]">
                <div className="p-4 pt-0 space-y-3">
                  {teams
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                    .slice(0, 5)
                    .map((team, i) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <span className="text-xs font-mono text-muted-foreground w-4">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.type}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-mono">{team.rating || 0}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  if (teams.length > 0) {
                    setSelectedTeam({ id: teams[0].id, name: teams[0].name });
                    setIsManageMembersOpen(true);
                  } else {
                    toast({ title: "No Teams", description: "Create a team first." });
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                Add Team Member
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Reassign Incidents
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Activity className="h-4 w-4" />
                View All Activity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchTeams}
      />

      <ManageMembersDialog
        open={isManageMembersOpen}
        onOpenChange={setIsManageMembersOpen}
        teamId={selectedTeam?.id || null}
        teamName={selectedTeam?.name || null}
        onSuccess={fetchTeams}
      />
    </DashboardLayout>
  );
}
