import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCounties } from "@/hooks/useCounties";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
    Ban,
    Edit,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Trash2
} from "lucide-react";
import { useEffect, useState } from "react";

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    employee_id: string | null;
    department: string | null;
    county: string | null;
    phone: string | null;
    created_at: string;
    role: string;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // New user form state
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newFullName, setNewFullName] = useState("");
    const [newEmployeeId, setNewEmployeeId] = useState("KIR-");
    const [newDepartment, setNewDepartment] = useState("");
    const [newCounty, setNewCounty] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newRole, setNewRole] = useState<"admin" | "operator" | "responder">("operator");

    const { toast } = useToast();
    const { data: counties } = useCounties();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: employees, error } = await supabase
                .from("employees")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setUsers(employees as unknown as UserProfile[]);
        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to fetch users",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'create',
                    email: newEmail,
                    password: newPassword,
                    full_name: newFullName,
                    // employee_id is now handled by DB trigger for systematic generation
                    role: newRole,
                    department: newDepartment,
                    county: newCounty,
                    phone: newPhone
                }
            });

            if (error) throw error;

            toast({
                title: "User Created",
                description: `Account for ${newFullName} initialized with systematic ID.`,
            });

            setCreateDialogOpen(false);
            resetForm();
            fetchUsers();

        } catch (error: any) {
            toast({
                title: "Creation Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setUpdating(true);

        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'update',
                    user_id: editingUser.id,
                    email: newEmail,
                    password: newPassword || undefined, // Only update if provided
                    full_name: newFullName,
                    role: newRole,
                    department: newDepartment,
                    county: newCounty,
                    phone: newPhone
                }
            });

            if (error) throw error;

            toast({
                title: "Success",
                description: "Employee details updated successfully.",
            });

            setEditDialogOpen(false);
            setEditingUser(null);
            resetForm();
            fetchUsers();

        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setUpdating(false);
        }
    };

    const resetForm = () => {
        setNewEmail("");
        setNewPassword("");
        setNewFullName("");
        setNewDepartment("");
        setNewCounty("");
        setNewPhone("");
        setNewRole("operator");
    };

    const openEditDialog = (user: UserProfile) => {
        setEditingUser(user);
        setNewFullName(user.full_name || "");
        setNewEmail(user.email || "");
        setNewDepartment(user.department || "");
        setNewCounty(user.county || "");
        setNewPhone(user.phone || "");
        setNewRole(user.role as any || "operator");
        setNewPassword(""); // Clear password field for security
        setEditDialogOpen(true);
    };


    const handleDisableUser = async (userId: string) => {
        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'disable',
                    user_id: userId
                }
            });

            if (error) throw error;

            toast({ title: "Success", description: "User account has been disabled." });
            fetchUsers();

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;

        try {
            const { data, error } = await supabase.functions.invoke('manage-users', {
                body: {
                    action: 'delete',
                    user_id: userId
                }
            });

            if (error) throw error;

            toast({ title: "Success", description: "User account deleted." });
            fetchUsers();

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    }

    const filteredUsers = users.filter((user) =>
        (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Employee Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage staff accounts for the Watch Command center.
                    </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add Employee
                </Button>
            </div>

            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search staff by name or email..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Employee Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>County</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-mono text-xs font-bold text-primary">
                                        {user.employee_id || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {user.department || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {user.county || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDisableUser(user.id)}>
                                                    <Ban className="h-4 w-4 mr-2" />
                                                    Disable Account
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Add New Operator</DialogTitle>
                        <DialogDescription>
                            Create a new account. The password provided here will be their initial login.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                required
                                value={newFullName}
                                onChange={(e) => setNewFullName(e.target.value)}
                                disabled={creating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Employee ID</Label>
                            <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-xs font-mono font-bold text-primary">
                                [ System Generated After Setup ]
                            </div>
                            <p className="text-[10px] text-muted-foreground">Systematic ID will be provided automatically to ensure uniqueness.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                required
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                disabled={creating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={creating}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={newDepartment}
                                    onChange={(e) => setNewDepartment(e.target.value)}
                                    placeholder="e.g. Operations"
                                    disabled={creating}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>County</Label>
                                <Select value={newCounty} onValueChange={setNewCounty} disabled={creating || updating}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select county" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(counties || []).map((c) => (
                                            <SelectItem key={c.id || c.name} value={c.name}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                placeholder="+254..."
                                disabled={creating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">Access Privilege</p>
                            <Select value={newRole} onValueChange={(v: any) => setNewRole(v)} disabled={creating}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operator">Operator</SelectItem>
                                    <SelectItem value="responder">Responder</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={creating} className="w-full">
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Initialize Secure Account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={(open) => {
                setEditDialogOpen(open);
                if (!open) {
                    setEditingUser(null);
                    resetForm();
                }
            }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Edit Employee Credentials</DialogTitle>
                        <DialogDescription>
                            Updating credentials for <span className="font-bold text-primary">{editingUser?.employee_id}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                required
                                value={newFullName}
                                onChange={(e) => setNewFullName(e.target.value)}
                                disabled={updating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                required
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                disabled={updating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>New Password (Optional)</Label>
                            <Input
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={updating}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={newDepartment}
                                    onChange={(e) => setNewDepartment(e.target.value)}
                                    disabled={updating}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>County</Label>
                                <Select value={newCounty} onValueChange={setNewCounty} disabled={creating || updating}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select county" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(counties || []).map((c) => (
                                            <SelectItem key={c.id || c.name} value={c.name}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                disabled={updating}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={newRole} onValueChange={(v: any) => setNewRole(v)} disabled={updating}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operator">Operator</SelectItem>
                                    <SelectItem value="responder">Responder</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updating} className="w-full">
                                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sync Updated Credentials
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
