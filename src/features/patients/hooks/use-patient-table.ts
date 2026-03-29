"use client";

import { calculateAge } from "@/lib/utils";
import type { PatientWithScore } from "@/lib/types";
import { ATTENDANCE_THRESHOLDS } from "@/lib/business-constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type SortKey = "name" | "age" | "specialty" | "nextAppointment" | "attendance" | "risk";
export type SortDir = "asc" | "desc";

export function usePatientTable(patients: PatientWithScore[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derive filter/sort directly from URL so back/forward navigation always
  // reflects the correct state without needing a separate sync effect.
  const riskFilter = searchParams.get("risk") ?? "all";
  const specialtyFilter = searchParams.get("specialty") ?? "all";
  const sortKey = (searchParams.get("sort") as SortKey) ?? "risk";
  const sortDir = (searchParams.get("dir") as SortDir) ?? "desc";

  // Local state for search input only — needed for responsive typing
  // (URL update is debounced, input must update immediately).
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  // Sync search input when URL's ?q= changes externally (back/forward).
  // Using derived-state-during-render pattern (React docs pattern for prop sync).
  const [prevUrlQ, setPrevUrlQ] = useState(searchParams.get("q") ?? "");
  const urlQ = searchParams.get("q") ?? "";
  if (prevUrlQ !== urlQ) {
    setPrevUrlQ(urlQ);
    setSearch(urlQ);
  }

  // Keep a ref to latest searchParams to avoid stale closures in debounced timer
  const searchParamsRef = useRef(searchParams);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);

  // Sync search local state → URL (debounced to avoid per-keystroke navigation)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (search.trim()) params.set("q", search.trim());
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 150);
    return () => clearTimeout(t);
  }, [search, pathname, router]);

  // Update a single filter param in the URL while preserving the rest
  const setFilterParam = (key: string, value: string, defaultValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== defaultValue) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleSort = (key: SortKey) => {
    const newDir = sortKey === key
      ? (sortDir === "asc" ? "desc" : "asc")
      : (key === "risk" || key === "age" || key === "attendance" ? "desc" : "asc");
    const params = new URLSearchParams(searchParams.toString());
    if (key !== "risk") params.set("sort", key); else params.delete("sort");
    if (newDir !== "desc") params.set("dir", newDir); else params.delete("dir");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        if (!fullName.includes(q)) return false;
      }
      if (riskFilter !== "all" && p.riskScore?.level !== riskFilter) return false;
      if (specialtyFilter !== "all" && p.specialty !== specialtyFilter) return false;
      return true;
    });
  }, [patients, search, riskFilter, specialtyFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "es");
        case "age":
          return dir * (calculateAge(a.dateOfBirth) - calculateAge(b.dateOfBirth));
        case "specialty":
          return dir * a.specialty.localeCompare(b.specialty, "es");
        case "nextAppointment": {
          const da = a.nextAppointment ? new Date(a.nextAppointment.date).getTime() : Infinity;
          const db = b.nextAppointment ? new Date(b.nextAppointment.date).getTime() : Infinity;
          return dir * (da - db);
        }
        case "attendance":
          return dir * (a.stats.attendanceRate - b.stats.attendanceRate);
        case "risk":
          return dir * ((a.riskScore?.score ?? -1) - (b.riskScore?.score ?? -1));
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const hasFilters = !!(search.trim() || riskFilter !== "all" || specialtyFilter !== "all");

  const clearFilters = () => {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("risk");
    params.delete("specialty");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const getSortAriaSort = (col: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== col) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  const attendanceColor = (rate: number) => {
    if (rate >= ATTENDANCE_THRESHOLDS.good) return "text-green-600";
    if (rate >= ATTENDANCE_THRESHOLDS.fair) return "text-amber-600";
    return "text-red-600";
  };

  return {
    search,
    setSearch,
    riskFilter,
    specialtyFilter,
    sortKey,
    sortDir,
    sorted,
    hasFilters,
    setFilterParam,
    handleSort,
    clearFilters,
    getSortAriaSort,
    attendanceColor,
  };
}
