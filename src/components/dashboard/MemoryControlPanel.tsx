import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConversationMemory = {
  id: string;
  summary: string;
  message_count: number;
  updated_at: string;
};

export default function MemoryControlPanel() {
  const [memory, setMemory] = useState<ConversationMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const { toast } = useToast();

  /* =====================
     FETCH MEMORY
  ====================== */
  const fetchMemory = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("conversation_memory")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error) {
      setMemory(data);
    } else {
      toast({
        title: "Failed to load memory",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  /* =====================
     RESET MEMORY
  ====================== */
  const resetMemory = async () => {
    if (!memory) return;

    setResetting(true);

    // Optimistic UI
    setMemory({
      ...memory,
      summary: "",
      message_count: 0,
      updated_at: new Date().toISOString(),
    });

    const { error } = await supabase
      .from("conversation_memory")
      .update({
        summary: "",
        message_count: 0,
      })
      .eq("id", memory.id);

    if (error) {
      toast({
        title: "Reset failed",
        variant: "destructive",
      });
      await fetchMemory();
    } else {
      toast({
        title: "Memory cleared",
        description: "Bot will now respond without past context.",
      });
    }

    setResetting(false);
  };

  const formatDate = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
};


  /* =====================
     LOADING
  ====================== */
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  /* =====================
     UI
  ====================== */
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Conversation Memory
          </CardTitle>
          <CardDescription>
            A rolling summary used by the bot to maintain context
          </CardDescription>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchMemory}
          disabled={resetting}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Messages Processed</p>
            <p className="text-2xl font-bold">
              {memory?.message_count ?? 0}
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Last Updated</p>
            <p className="text-sm font-medium">
              {formatDate(memory?.updated_at)}
            </p>
          </div>
        </div>

        {/* SUMMARY */}
        <div>
          <p className="text-sm font-medium mb-2">Current Memory Summary</p>

          <div className="min-h-[170px] rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap">
            {memory?.summary ? (
              memory.summary
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Brain className="h-8 w-8 mb-2 opacity-50" />
                <p>No memory stored yet</p>
                <p className="text-xs">
                  Memory builds automatically as users interact
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DANGER ZONE */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={resetting || !memory?.summary}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Conversation Memory
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Clear bot memory?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action permanently deletes all stored context.
                The bot will behave as if it just joined the server.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={resetMemory}
                className="bg-destructive text-destructive-foreground"
              >
                {resetting && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Yes, reset memory
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-xs text-muted-foreground">
          💡 Memory is summarized context — not raw chat logs.
        </p>
      </CardContent>
    </Card>
  );
}
