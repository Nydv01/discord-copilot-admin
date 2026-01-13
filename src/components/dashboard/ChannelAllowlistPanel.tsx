import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Loader2,
  Hash,
  RefreshCw,
  Shield,
} from "lucide-react";

type AllowedChannel = {
  id: string;
  channel_id: string;
  channel_name: string | null;
};

const DISCORD_CHANNEL_REGEX = /^\d{17,20}$/;

export default function ChannelAllowlistPanel() {
  const [channels, setChannels] = useState<AllowedChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  /* =====================
     FETCH CHANNELS
  ====================== */
  const fetchChannels = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("allowed_channels")
      .select("id, channel_id, channel_name")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setChannels(data);
    } else {
      toast({
        title: "Failed to load channels",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  /* =====================
     ADD CHANNEL
  ====================== */
  const addChannel = async () => {
    const id = channelId.trim();

    if (!DISCORD_CHANNEL_REGEX.test(id)) {
      toast({
        title: "Invalid Channel ID",
        description: "Discord channel IDs are 17–20 digit numbers.",
        variant: "destructive",
      });
      return;
    }

    if (channels.some((c) => c.channel_id === id)) {
      toast({
        title: "Already Added",
        description: "This channel is already allowed.",
      });
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("allowed_channels")
      .insert({
        channel_id: id,
        channel_name: channelName.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      setChannels((prev) => [data, ...prev]);
      setChannelId("");
      setChannelName("");
      toast({
        title: "Channel added",
        description: "Bot can now respond in this channel.",
      });
    } else {
      toast({
        title: "Failed to add channel",
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  /* =====================
     REMOVE CHANNEL
  ====================== */
  const removeChannel = async (id: string) => {
    const previous = channels;
    setChannels((prev) => prev.filter((c) => c.id !== id));

    const { error } = await supabase
      .from("allowed_channels")
      .delete()
      .eq("id", id);

    if (error) {
      setChannels(previous);
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    } else {
      toast({ title: "Channel removed" });
    }
  };

  /* =====================
     UI
  ====================== */
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Channel Allowlist
          </CardTitle>
          <CardDescription>
            The bot will respond only in these channels (or when mentioned).
          </CardDescription>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchChannels}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ADD CHANNEL */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Discord Channel ID"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="flex-1 min-w-[220px]"
          />
          <Input
            placeholder="Channel name (optional)"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="flex-1 min-w-[160px]"
          />
          <Button onClick={addChannel} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add
          </Button>
        </div>

        {/* CHANNEL LIST */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Hash className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No allowed channels yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-mono text-sm">{c.channel_id}</p>
                    {c.channel_name && (
                      <p className="text-xs text-muted-foreground">
                        {c.channel_name}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChannel(c.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          💡 Enable Discord Developer Mode → Right-click channel → Copy ID
        </p>
      </CardContent>
    </Card>
  );
}
