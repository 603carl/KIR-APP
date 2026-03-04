import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
    Database,
    Globe,
    Loader2,
    Mail,
    Save,
    Server,
    Settings,
    Shield
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminSettings() {
    const {
        settings: systemSettings,
        isLoading: loadingSystem,
        updateSettings: saveSystemSettings,
        isUpdating: savingSystem
    } = useSystemSettings();

    const [localSystem, setLocalSystem] = useState<any>({});

    useEffect(() => {
        if (systemSettings) {
            setLocalSystem(systemSettings);
        }
    }, [systemSettings]);

    const handleSystemChange = (field: string, value: any) => {
        setLocalSystem((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSaveSystem = () => {
        saveSystemSettings(localSystem);
    };

    if (loadingSystem) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
                <p className="text-muted-foreground">Manage global application settings and service integrations.</p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general" className="gap-2">
                        <Settings className="h-4 w-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2">
                        <Database className="h-4 w-4" />
                        Integrations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Information</CardTitle>
                            <CardDescription>Basic system configuration and details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>System Name</Label>
                                    <Input
                                        value={localSystem.system_name || ""}
                                        onChange={(e) => handleSystemChange("system_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Organization</Label>
                                    <Input
                                        value={localSystem.organization_name || ""}
                                        onChange={(e) => handleSystemChange("organization_name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Admin Email</Label>
                                    <Input
                                        type="email"
                                        value={localSystem.admin_email || ""}
                                        onChange={(e) => handleSystemChange("admin_email", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Support Phone</Label>
                                    <Input
                                        value={localSystem.support_phone || ""}
                                        onChange={(e) => handleSystemChange("support_phone", e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>System Description</Label>
                                <Textarea
                                    value={localSystem.system_description || ""}
                                    onChange={(e) => handleSystemChange("system_description", e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Regional Settings</CardTitle>
                            <CardDescription>Configure timezone and locale preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Timezone</Label>
                                    <Select
                                        value={localSystem.timezone}
                                        onValueChange={(v) => handleSystemChange("timezone", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="africa_nairobi">Africa/Nairobi (EAT)</SelectItem>
                                            <SelectItem value="utc">UTC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Language</Label>
                                    <Select
                                        value={localSystem.language}
                                        onValueChange={(v) => handleSystemChange("language", v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="sw">Swahili</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button className="gap-1.5" onClick={handleSaveSystem} disabled={savingSystem}>
                            {savingSystem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Authentication Settings</CardTitle>
                            <CardDescription>Configure security and authentication options</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Two-Factor Authentication</Label>
                                    <p className="text-sm text-muted-foreground">Require 2FA for all admin accounts</p>
                                </div>
                                <Switch
                                    checked={localSystem.two_factor_required}
                                    onCheckedChange={(v) => handleSystemChange("two_factor_required", v)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Session Timeout</Label>
                                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                                </div>
                                <Select
                                    value={localSystem.session_timeout?.toString()}
                                    onValueChange={(v) => handleSystemChange("session_timeout", parseInt(v))}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                        <SelectItem value="120">2 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/20">
                                        <Database className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Database</CardTitle>
                                        <CardDescription>PostgreSQL via Supabase</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-severity-low">Connected</span>
                                    <Button variant="outline" size="sm">Health Check</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-chart-2/20">
                                        <Mail className="h-5 w-5 text-chart-2" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Email Service</CardTitle>
                                        <CardDescription>SendGrid Integration</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-severity-low">Connected</span>
                                    <Button variant="outline" size="sm">Configure</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-chart-3/20">
                                        <Globe className="h-5 w-5 text-chart-3" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Maps API</CardTitle>
                                        <CardDescription>Mapbox Integration</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-severity-low">Connected</span>
                                    <Button variant="outline" size="sm">Configure</Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-chart-4/20">
                                        <Server className="h-5 w-5 text-chart-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">SMS Gateway</CardTitle>
                                        <CardDescription>Africa's Talking</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Not Connected</span>
                                    <Button variant="outline" size="sm">Connect</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
