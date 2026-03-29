"use client";

import { useEffect, useState } from "react";
import type {
  AIInterventionResponse,
  IAppointment,
  IPatient,
  RiskScoreResult,
} from "@/lib/types";

type AiState = "idle" | "loading" | "success" | "error";

// Bump version when AIInterventionResponse shape changes to auto-invalidate old cache
const STORAGE_VERSION = "v1";

function storageKey(patientId: string, appointmentId: string, riskTotal: number) {
  return `ai-message-${STORAGE_VERSION}-${patientId}-${appointmentId}-${riskTotal}`;
}

function loadFromStorage(patientId: string, appointmentId: string, riskTotal: number): AIInterventionResponse | null {
  try {
    const raw = sessionStorage.getItem(storageKey(patientId, appointmentId, riskTotal));
    return raw ? (JSON.parse(raw) as AIInterventionResponse) : null;
  } catch {
    return null;
  }
}

function saveToStorage(patientId: string, appointmentId: string, riskTotal: number, data: AIInterventionResponse) {
  try {
    sessionStorage.setItem(storageKey(patientId, appointmentId, riskTotal), JSON.stringify(data));
  } catch {
    // sessionStorage not available (SSR, private mode without quota, etc.) — data is ephemeral by design
  }
}

function clearFromStorage(patientId: string, appointmentId: string, riskTotal: number) {
  try {
    sessionStorage.removeItem(storageKey(patientId, appointmentId, riskTotal));
  } catch {
    // ignore
  }
}

export function useAiMessage(patientId: string, appointmentId: string, riskTotal: number) {
  // Always initialize as "idle" — server has no sessionStorage.
  // Load cache in useEffect (client-only, post-hydration) to avoid
  // SSR/client mismatch that causes React hydration errors.
  const [state, setState] = useState<AiState>("idle");
  const [result, setResult] = useState<AIInterventionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState("idle");
    setResult(null);
    setError(null);
    const cached = loadFromStorage(patientId, appointmentId, riskTotal);
    if (cached) {
      setResult(cached);
      setState("success");
    }
  }, [patientId, appointmentId, riskTotal]);

  const generateMessage = async (
    patient: IPatient,
    appointment: IAppointment,
    riskScore: RiskScoreResult
  ) => {
    clearFromStorage(patientId, appointmentId, riskTotal);
    setState("loading");
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient, appointment, riskScore }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: AIInterventionResponse = await response.json();
      saveToStorage(patientId, appointmentId, riskTotal, data);
      setResult(data);
      setState("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      setState("error");
    }
  };

  const reset = () => {
    clearFromStorage(patientId, appointmentId, riskTotal);
    setState("idle");
    setResult(null);
    setError(null);
  };

  return { state, result, error, generateMessage, reset };
}
