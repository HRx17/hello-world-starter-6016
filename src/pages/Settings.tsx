import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Trash2, Download, AlertTriangle, Link2, Copy, Check, Plus, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HeuristicsSelector } from "@/components/HeuristicsSelector";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface UserSettings {
  default_heuristics?: {
    set: string;
    custom?: string[];
  };
  email_notifications: boolean;
  weekly_reports: boolean;
  theme: string;
}

interface FigmaConnection {
  id: string;
  connect_key: string;
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newConnectionName, setNewConnectionName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    default_heuristics: {
      set: "nn_10",
      custom: [],
    },
    email_notifications: true,
    weekly_reports: false,
    theme: "system",
  });

  // Fetch Figma connections
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["figma-connections", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("figma_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FigmaConnection[];
    },
    enabled: !!user,
  });

  // Create connection mutation
  const createConnection = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("figma_connections")
        .insert({ user_id: user.id, name: name || "My Figma Connection" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["figma-connections"] });
      setNewConnectionName("");
      setIsCreatingKey(false);
      toast({ title: "Connect key created", description: "Your new key is ready to use in the Figma plugin." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create key", description: error.message, variant: "destructive" });
    },
  });

  // Delete connection mutation
  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("figma_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["figma-connections"] });
      toast({ title: "Connect key deleted" });
    },
  });

  const copyToClipboard = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
      }

      const { data: userSettings } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (userSettings) {
        const heuristics = userSettings.default_heuristics as { set: string; custom?: string[] } | null;
        setSettings({
          default_heuristics: heuristics || { set: "nn_10", custom: [] },
          email_notifications: userSettings.email_notifications ?? true,
          weekly_reports: userSettings.weekly_reports ?? false,
          theme: userSettings.theme || "system",
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: settingsError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          default_heuristics: settings.default_heuristics,
          email_notifications: settings.email_notifications,
          weekly_reports: settings.weekly_reports,
          theme: settings.theme,
        });

      if (settingsError) throw settingsError;

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password Updated", description: "Your password has been changed successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update password", variant: "destructive" });
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [projects, studyPlans, observations, personas, interviews] = await Promise.all([
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase.from("study_plans").select("*").eq("user_id", user.id),
        supabase.from("research_observations").select("*").eq("user_id", user.id),
        supabase.from("personas").select("*").eq("user_id", user.id),
        supabase.from("interview_sessions").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        profile: { email, fullName },
        projects: projects.data,
        studyPlans: studyPlans.data,
        observations: observations.data,
        personas: personas.data,
        interviews: interviews.data,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ux-probe-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Data Exported", description: "Your data has been downloaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to export data", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await Promise.all([
        supabase.from("projects").delete().eq("user_id", user.id),
        supabase.from("study_plans").delete().eq("user_id", user.id),
        supabase.from("research_observations").delete().eq("user_id", user.id),
        supabase.from("personas").delete().eq("user_id", user.id),
        supabase.from("interview_sessions").delete().eq("user_id", user.id),
        supabase.from("user_settings").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);

      await supabase.auth.signOut();
      toast({ title: "Account Deleted", description: "Your account and all data have been removed" });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Figma Plugin Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Figma Plugin
              </CardTitle>
              <CardDescription>
                Connect keys for authenticating the UX Probe Figma plugin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCreatingKey && (
                <div className="flex gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                  <Input
                    placeholder="Key name (optional)"
                    value={newConnectionName}
                    onChange={(e) => setNewConnectionName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => createConnection.mutate(newConnectionName)}
                    disabled={createConnection.isPending}
                    size="sm"
                  >
                    {createConnection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsCreatingKey(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              {connectionsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : connections?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No connect keys yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setIsCreatingKey(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Connect Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections?.map((conn) => (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{conn.name}</span>
                          <Badge variant={conn.is_active ? "default" : "secondary"} className="text-xs">
                            {conn.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-background px-2 py-0.5 rounded font-mono">
                            {conn.connect_key.slice(0, 8)}...{conn.connect_key.slice(-4)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => copyToClipboard(conn.connect_key)}
                          >
                            {copiedKey === conn.connect_key ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        onClick={() => deleteConnection.mutate(conn.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {!isCreatingKey && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setIsCreatingKey(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Another Key
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Preferences</CardTitle>
              <CardDescription>Choose which heuristics to use for website analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <HeuristicsSelector
                value={settings.default_heuristics || { set: "nn_10" }}
                onChange={(value) => setSettings({ ...settings, default_heuristics: value })}
              />
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what updates you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about analysis results
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, email_notifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Get weekly summaries of your projects
                  </p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={settings.weekly_reports}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, weekly_reports: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) => setSettings({ ...settings, theme: value })}
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={changePassword}
                disabled={!newPassword || !confirmPassword}
                variant="secondary"
              >
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export or manage your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Export Your Data</Label>
                <p className="text-sm text-muted-foreground">
                  Download all your data in JSON format
                </p>
                <Button onClick={exportData} disabled={exporting} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  {exporting ? "Exporting..." : "Export Data"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-8" />

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}