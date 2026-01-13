import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Loader2,
  RefreshCw,
  RotateCcw,
  Wand2,
} from "lucide-react";

/* =====================
   TEMPLATES
===================== */
const TEMPLATES = {
  default: `You are a helpful Discord Copilot.

Rules:
- Be concise and accurate
- Stay respectful
- Do not hallucinate
- Ask for clarification if unsure

Tone:
- Friendly
- Professional
- Calm`,

  strict: `You are a strict moderation-focused Discord assistant.

Rules:
- Answer only when confident
- Avoid speculation
- Enforce server rules
- Keep replies short

Tone:
- Formal
- Neutral
- Professional`,

  friendly: `You are a friendly and engaging Discord assistant.

Rules:
- Be helpful and warm
- Use emojis sparingly 🙂
- Explain clearly
- Stay on topic

Tone:
- Casual
- Friendly
- Approachable`,
};

export default function SystemInstructionsPanel() {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  /* =====================
     FETCH
  ====================== */
  const fetchInstructions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("system_instructions")
      .select("content, updated_at")
      .limit(1)
      .maybeSingle();

    if (!error) {
      const value = data?.content || "";
      setContent(value);
      setOriginal(value);
      setUpdatedAt(data?.updated_at ?? null);
    } else {
      toast({
        title: "Failed to load instructions",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInstructions();
  }, []);

  /* =====================
     DERIVED STATE
  ====================== */
  const hasChanges = content !== original;
  const charCount = content.length;

  /* =====================
     SAVE
  ====================== */
  const save = async () => {
    if (!hasChanges) return;

    setSaving(true);

    const { error } = await supabase
      .from("system_instructions")
      .update({ content })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      toast({
        title: "Save failed",
        variant: "destructive",
      });
    } else {
      setOriginal(content);
      toast({
        title: "Instructions saved",
        description: "New behavior applies immediately to the bot",
      });
    }

    setSaving(false);
  };

  /* =====================
     RESET (LOCAL ONLY)
  ====================== */
  const resetToDefault = () => {
    setContent(TEMPLATES.default);
  };

  /* =====================
     APPLY TEMPLATE
  ====================== */
  const applyTemplate = (value: string) => {
    setContent(value);
  };

  /* =====================
     LOADING
  ====================== */
  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  /* =====================
     UI
  ====================== */
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle>System Instructions</CardTitle>
            <CardDescription>
              Controls how the AI behaves across Discord
            </CardDescription>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={fetchInstructions}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* TEMPLATE BUTTONS */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyTemplate(TEMPLATES.default)}
          >
            <Wand2 className="h-4 w-4 mr-1" />
            Default
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyTemplate(TEMPLATES.friendly)}
          >
            Friendly
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => applyTemplate(TEMPLATES.strict)}
          >
            Strict
          </Button>
        </div>

        {/* EDITOR */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[420px] font-mono text-sm"
          placeholder={TEMPLATES.default}
        />

        {/* META */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{charCount} characters</span>
          {updatedAt && (
            <span>
              Last updated: {new Date(updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {hasChanges ? "• Unsaved changes" : "All changes saved"}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>

            <Button onClick={save} disabled={!hasChanges || saving}>
              {saving ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
