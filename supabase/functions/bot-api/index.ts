/// <reference lib="deno" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ===========================
   CORS
=========================== */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ===========================
   SERVER
=========================== */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    /* ===========================
       GET CONFIG FOR BOT
    ============================ */
    if (req.method === "GET" && action === "config") {
      const [instructions, channels, memory] = await Promise.all([
        supabase
          .from("system_instructions")
          .select("content")
          .limit(1)
          .single(),

        supabase
          .from("allowed_channels")
          .select("channel_id"),

        supabase
          .from("conversation_memory")
          .select("*")
          .limit(1)
          .single(),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            instructions: instructions.data?.content ?? "",
            allowedChannels: channels.data?.map((c) => c.channel_id) ?? [],
            memory: memory.data ?? {
              summary: "",
              message_count: 0,
            },
          },
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /* ===========================
       UPDATE MEMORY (BOT ONLY)
    ============================ */
    if (req.method === "POST" && action === "update-memory") {
      const body = await req.json();

      const summary =
        typeof body.summary === "string" ? body.summary : "";
      const message_count =
        typeof body.message_count === "number"
          ? body.message_count
          : 0;

      const { error } = await supabase
        .from("conversation_memory")
        .update({
          summary,
          message_count,
          updated_at: new Date().toISOString(),
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        console.error("❌ Memory update failed:", error.message);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
// 🔥 BOT HEALTH REPORTING — FINAL FIX
// =====================================================
if (req.method === "POST" && action === "health") {
  const body = await req.json();

  await supabase
    .from("bot_health")
    .upsert(
      {
        id: "00000000-0000-0000-0000-000000000000",
        last_ping: body.last_ping,
        last_message: body.last_message,
        error_count: body.error_count ?? 0,
        cache_age_seconds: body.cache_age_seconds ?? 0,
        cache_hits: body.cache_hits ?? 0,
        cache_misses: body.cache_misses ?? 0,
        is_online: body.is_online ?? true,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
}


    /* ===========================
       FALLBACK
    ============================ */
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid action",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("🔥 API Error:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
