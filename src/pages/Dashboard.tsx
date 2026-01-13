import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import {
  Bot,
  LogOut,
  Loader2,
  Settings,
  MessageSquare,
  Hash,
  Brain,
  ShieldAlert,
  Activity,
  CheckCircle2,
  XCircle,
  Database,
  AlertTriangle,
} from "lucide-react";

import SystemInstructionsPanel from "@/components/dashboard/SystemInstructionsPanel";
import ChannelAllowlistPanel from "@/components/dashboard/ChannelAllowlistPanel";
import MemoryControlPanel from "@/components/dashboard/MemoryControlPanel";
import BotSetupGuide from "@/components/dashboard/BotSetupGuide";
import BotHealthPanel from "@/components/dashboard/BotHealthPanel";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  /* =========================
     ADMIN CHECK (SAFE)
  ========================== */
  useEffect(() => {
    if (!user?.email) return;

    let active = true;

    const checkAdmin = async () => {
      try {
        const { data } = await supabase
          .from("admins")
          .select("email")
          .eq("email", user.email)
          .single();
        if (!active) return;
        setIsAdmin(!!data);
      } catch {
        if (!active) return;
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, [user?.email]);

  /* =========================
     GLOBAL LOADING
  ========================== */
  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     AUTH GUARD
  ========================== */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /* =========================
     ADMIN GUARD
  ========================== */
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            This dashboard is restricted to administrators only.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  /* =========================
     DASHBOARD UI
  ========================== */
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Discord Copilot</h1>
              <p className="text-sm text-muted-foreground">
                Admin Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="instructions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="instructions" className="gap-2">
              <MessageSquare className="h-4 w-4 hidden sm:block" />
              Instructions
            </TabsTrigger>

            <TabsTrigger value="channels" className="gap-2">
              <Hash className="h-4 w-4 hidden sm:block" />
              Channels
            </TabsTrigger>

            <TabsTrigger value="memory" className="gap-2">
              <Brain className="h-4 w-4 hidden sm:block" />
              Memory
            </TabsTrigger>

            <TabsTrigger value="health" className="gap-2">
              <Activity className="h-4 w-4 hidden sm:block" />
              Health
            </TabsTrigger>

            <TabsTrigger value="setup" className="gap-2">
              <Settings className="h-4 w-4 hidden sm:block" />
              Bot Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instructions">
            <SystemInstructionsPanel />
          </TabsContent>

          <TabsContent value="channels">
            <ChannelAllowlistPanel />
          </TabsContent>

          <TabsContent value="memory">
            <MemoryControlPanel />
          </TabsContent>

          {/* 🆕 HEALTH CONTENT (ENHANCED WRAPPER) */}
          <TabsContent value="health" className="space-y-6">
            {/* Quick status row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bot Status</p>
                    <p className="font-medium">Online</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Database className="text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Cache Efficiency
                    </p>
                    <p className="font-medium">Live</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Error Tracking
                    </p>
                    <p className="font-medium">Enabled</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Activity className="text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Health Reports
                    </p>
                    <p className="font-medium">Auto</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Existing panel */}
            <BotHealthPanel />
          </TabsContent>

          <TabsContent value="setup">
            <BotSetupGuide />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
