import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Wifi,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

/* ===========================
   TYPES
=========================== */
type BotHealth = {
  last_ping: string | null;
  last_message: string | null;
  error_count: number;
  cache_age_seconds: number;
  is_online?: boolean | null;
  updated_at?: string | null;
};


/* ===========================
   COMPONENT
=========================== */
export default function BotHealthPanel() {
  const [health, setHealth] = useState<BotHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousErrors, setPreviousErrors] = useState<number | null>(null);

  /* ===========================
     FETCH
  ============================ */
  const fetchHealth = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bot_health")
      .select("*")
      .limit(1)
      .maybeSingle();

    setHealth(data ?? null);
    setLoading(false);
  };

  /* ===========================
     AUTO REFRESH (30s)
  ============================ */
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  /* ===========================
     DERIVED STATUS
  ============================ */
  const status = useMemo(() => {
  if (!health) return "offline";

  const diff =
  health?.last_ping
    ? Math.max(
        0,
        Date.now() - new Date(health.last_ping).getTime()
      )
    : Infinity;


  if (health.is_online === true && diff < 300_000) {
    return diff < 120_000 ? "online" : "degraded";
  }

  return "offline";
}, [health]);

  const normalizedHealth = useMemo(() => {
  if (!health) return null;

  return {
    ...health,
    is_online: health.is_online === true,
  };
}, [health]);


  const heartbeatAgeSec = useMemo(() => {
    if (!health?.last_ping) return null;
    return Math.floor(
      (Date.now() - new Date(health.last_ping).getTime()) / 1000
    );
  }, [health?.last_ping]);

  const cacheFresh = useMemo(() => {
    if (!health) return false;
    return health.cache_age_seconds < 60;
  }, [health?.cache_age_seconds]);

  const wsHealthy =
  health?.is_online === true && status !== "offline";



  /* ===========================
     ERROR TREND
  ============================ */
  const errorTrend = useMemo(() => {
    if (!health) return "unknown";
    if (previousErrors === null) return "stable";

    if (health.error_count > previousErrors) return "increasing";
    if (health.error_count < previousErrors) return "recovering";
    return "stable";
  }, [health, previousErrors]);

useEffect(() => {
  if (health?.error_count !== undefined) {
    setPreviousErrors(health.error_count);
  }
}, [health?.error_count]);

  /* ===========================
     CONFIDENCE SCORE (🔥)
  ============================ */
  const confidenceScore = useMemo(() => {
    let score = 100;
    if (status === "offline") score -= 50;
    if (status === "degraded") score -= 20;
    if (!cacheFresh) score -= 10;
    if (health?.error_count && health.error_count > 0)
      score -= Math.min(30, health.error_count * 5);
    return Math.max(0, score);
  }, [status, cacheFresh, health?.error_count]);

  /* ===========================
     UI HELPERS
  ============================ */
  const StatusIcon =
    status === "online"
      ? CheckCircle2
      : status === "degraded"
      ? AlertTriangle
      : XCircle;

  const statusColor =
    status === "online"
      ? "text-green-600"
      : status === "degraded"
      ? "text-yellow-600"
      : "text-destructive";

  const formatDate = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
};


  /* ===========================
     RENDER STATES
  ============================ */
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10 text-muted-foreground">
          Loading bot health…
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardContent className="text-center py-10 text-muted-foreground">
          No health data available yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {/* HEADER */}
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Bot Health
        </CardTitle>

        <Button variant="ghost" size="icon" onClick={fetchHealth}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* OFFLINE ALERT */}
        {status === "offline" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium">
  Bot appears offline. Last heartbeat exceeded threshold.
</p>

          </div>
        )}

        {/* STATUS */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            <span className="font-medium capitalize">
              Status: {status}
            </span>
          </div>

          {heartbeatAgeSec !== null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {heartbeatAgeSec}s ago
            </span>
          )}

          <span className="flex items-center gap-1 text-xs">
            <Wifi
              className={`h-4 w-4 ${
                wsHealthy ? "text-green-600" : "text-destructive"
              }`}
            />
            Discord WS {wsHealthy ? "Healthy" : "Disconnected"}
          </span>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Last Ping" value={formatDate(health.last_ping)} />
          <Stat label="Last Message" value={formatDate(health.last_message)} />
          <Stat
            label="Errors"
            value={`${health.error_count} (${errorTrend})`}
          />
          <Stat label="Cache Age" value={`${health.cache_age_seconds}s`} />
        </div>

        {/* CACHE */}
        <div className="flex items-center gap-3 text-sm">
          <Database className="h-4 w-4 text-primary" />
          Cache status:{" "}
          <span
            className={
              cacheFresh
                ? "text-green-600 font-medium"
                : "text-yellow-600 font-medium"
            }
          >
            {cacheFresh ? "Fresh" : "Stale"}
          </span>
        </div>

        {/* CONFIDENCE */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" />
          Health confidence:{" "}
          <span className="font-semibold">{confidenceScore}%</span>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Metrics update every 30 seconds. Confidence is heuristic-based.
        </p>
        <p className="text-[11px] text-muted-foreground">
  🕒 All timestamps shown in your local timezone
</p>

      </CardContent>
    </Card>
  );
}

/* ===========================
   STAT
=========================== */
function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
