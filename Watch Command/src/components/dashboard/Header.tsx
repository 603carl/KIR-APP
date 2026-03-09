import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserSettings } from "@/hooks/useUserSettings";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  Download,
  Menu,
  RefreshCw,
  Search,
  Settings,
  User,
  Volume2,
  VolumeX
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveIndicator } from "./LiveIndicator";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { settings: userSettings, updateNotificationPrefs } = useUserSettings();
  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch } = useNotifications();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/incidents?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Mobile Menu */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">K</span>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold leading-none">Kenya Incident Reporter</h1>
          <p className="text-xs text-muted-foreground">Command Center</p>
        </div>
      </div>

      {/* Live Status */}
      <div className="hidden md:flex items-center gap-2 ml-4">
        <LiveIndicator />
        <span className="text-xs text-muted-foreground font-mono">
          Last sync: just now
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center max-w-xl mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents, locations, reporters..."
            className="pl-9 bg-muted/50 border-border/50 focus:bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Enter
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-9 w-9"
        >
          <RefreshCw className={cn(
            "h-4 w-4",
            isRefreshing && "animate-spin"
          )} />
        </Button>

        {/* Sound Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateNotificationPrefs({ sound_alerts: !userSettings?.notification_prefs.sound_alerts })}
          className="h-9 w-9"
          disabled={!userSettings}
        >
          {userSettings?.notification_prefs.sound_alerts ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>

        {/* Export */}
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex">
          <Download className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-severity-critical border-0"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => markAllAsRead()} className="h-6 text-xs gap-1 py-0 px-2">
                  <Check className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 py-3 cursor-pointer",
                      !notification.is_read && "bg-accent/20"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn("font-medium text-sm", !notification.is_read && "text-primary")}>
                        {notification.title}
                      </span>
                      {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hidden sm:flex"
          onClick={() => navigate("/settings")}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name || "User"} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {profile?.full_name ? profile.full_name.substring(0, 1).toUpperCase() : <User className="h-4 w-4" />}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <p className="font-medium">{profile?.full_name || "Command Center"}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground capitalize">{(profile as any)?.role || "Operator"}</p>
                  {profile?.employee_id && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 leading-none font-mono">
                      {profile.employee_id}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/teams")}>
              <User className="h-4 w-4 mr-2" />
              My Team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={signOut}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}