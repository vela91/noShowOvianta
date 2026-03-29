"use client";

import { useAiMessage } from "@/hooks/use-ai-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { IAppointment, IPatient, RiskScoreResult } from "@/lib/types";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Smartphone,
  Volume2,
} from "lucide-react";
import { CHANNEL_LABELS } from "@/lib/appointment-config";
import { useEffect, useRef, useState } from "react";

const TTS_ENABLED = process.env.NEXT_PUBLIC_ELEVENLABS_ENABLED === "true";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return "Buenos días";
  if (hour >= 14 && hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

function cleanScriptForTTS(text: string): string {
  return text
    .replace(/\{SALUDO\}/g, getGreeting())
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[«»]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface AiMessagePanelProps {
  patient: IPatient;
  appointment: IAppointment;
  riskScore: RiskScoreResult;
}

const CHANNEL_ICONS = {
  sms: Smartphone,
  whatsapp: MessageSquare,
  call: Phone,
};


const NUDGE_LABELS: Record<string, string> = {
  waits_framing: "Efecto lista de espera",
  cost_framing: "Coste del no-show",
  clinical_relevance: "Relevancia clínica",
  urgency: "Urgencia",
  social_proof: "Prueba social",
};

const ESCALATION_LABELS: Record<string, string> = {
  none: "Sin escalación",
  waitlist_activate: "Activar lista de espera",
  offer_teleconsult: "Ofrecer teleconsulta",
  overbooking_slot: "Reservar slot de overbooking",
};

export function AiMessagePanel({
  patient,
  appointment,
  riskScore,
}: AiMessagePanelProps) {
  const { state, result, error, generateMessage, reset } = useAiMessage(patient._id, appointment._id, riskScore.score);
  const [copied, setCopied] = useState(false);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "ready">("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attempt playback once audio is ready — .catch() handles browser autoplay policy
  useEffect(() => {
    if (audioState === "ready" && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked — user can press play in the controls
      });
    }
  }, [audioState, audioUrl]);

  const handleGenerate = () => {
    generateMessage(patient, appointment, riskScore);
  };

  const handleListen = async () => {
    if (!result) return;
    setAudioState("loading");
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    try {
      const cleanText = cleanScriptForTTS(result.message);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        setAudioState("idle");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setAudioState("ready");
    } catch {
      setAudioState("idle");
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-7 w-7 text-primary" />
        </div>
        <h3 className="mb-1 font-semibold text-foreground">
          Generar intervención con IA
        </h3>
        <p className="mb-5 max-w-sm text-sm text-muted-foreground">
          Claude Sonnet analizará el perfil del paciente y generará un mensaje
          personalizado según su nivel de riesgo y canal preferido.
        </p>
        <Button onClick={handleGenerate} className="gap-2">
          <Bot className="h-4 w-4" />
          Generar mensaje personalizado
        </Button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-4 py-4">
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Claude está generando el mensaje personalizado...
          </p>
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div role="alert" className="flex flex-col items-center justify-center py-8 text-center">
        <p className="mb-2 text-sm font-medium text-red-600">
          Error al generar el mensaje
        </p>
        <p className="mb-4 text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (state === "success" && result) {
    const ChannelIcon = CHANNEL_ICONS[result.recommended_channel] || Smartphone;

    return (
      <div className="space-y-5">
        {/* Risk explanation for staff */}
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Análisis del riesgo
          </p>
          <p className="text-sm text-foreground">{result.explanation}</p>
        </div>

        {/* Message for patient */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChannelIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                Mensaje por {CHANNEL_LABELS[result.recommended_channel]}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {result.message}
            </p>
          </div>

          {(result.recommended_channel === "call" || result.nudge_type === "urgency") && TTS_ENABLED ? (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleListen}
                disabled={audioState === "loading"}
                className="gap-2"
              >
                {audioState === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando audio...
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    Escuchar llamada
                  </>
                )}
              </Button>

              {audioState === "ready" && audioUrl ? (
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full h-10 rounded-lg"
                  onEnded={() => {
                    URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setAudioState("idle");
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Intervention metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Card className="border bg-muted/20">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Técnica de nudge
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="font-medium text-foreground">
                {NUDGE_LABELS[result.nudge_type] || result.nudge_type}
              </p>
            </CardContent>
          </Card>

          <Card className="border bg-muted/20">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Momento óptimo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="font-medium text-foreground">
                {result.recommended_timing}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Escalation if required */}
        {result.escalation !== "none" ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Acción recomendada
            </p>
            <p className="text-sm font-medium text-amber-800">
              {ESCALATION_LABELS[result.escalation] || result.escalation}
            </p>
          </div>
        ) : null}

        {/* Regenerate */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          className="w-full gap-2 text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerar mensaje
        </Button>
      </div>
    );
  }

  return null;
}
