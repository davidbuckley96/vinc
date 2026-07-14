import type { SupabaseClient } from "@supabase/supabase-js";

/** Faixas do dia de um alerta (B-30 fatia 3, D-064). */
export type TimeBand = "madrugada" | "manha" | "tarde" | "noite";

export interface AlertRegion {
  lat: number;
  lng: number;
  radiusKm: number;
  label: string | null;
}

export interface JobAlert {
  id: string;
  categoryId: string;
  /** Dias da semana (0=domingo … 6=sábado); vazio = qualquer dia. */
  days: number[];
  /** Vazio = qualquer horário. */
  timeBands: TimeBand[];
  /** Null = qualquer lugar. */
  region: AlertRegion | null;
  pushEnabled: boolean;
  active: boolean;
}

export interface JobAlertInput {
  categoryId: string;
  days: number[];
  timeBands: TimeBand[];
  region: AlertRegion | null;
  pushEnabled: boolean;
}

interface AlertRow {
  id: string;
  category_id: string;
  days: number[] | null;
  time_bands: string[] | null;
  region_lat: number | null;
  region_lng: number | null;
  radius_km: number;
  region_label: string | null;
  push_enabled: boolean;
  active: boolean;
}

function rowToAlert(row: AlertRow): JobAlert {
  return {
    id: row.id,
    categoryId: row.category_id,
    days: row.days ?? [],
    timeBands: (row.time_bands ?? []) as TimeBand[],
    region:
      row.region_lat != null && row.region_lng != null
        ? {
            lat: row.region_lat,
            lng: row.region_lng,
            radiusKm: row.radius_km,
            label: row.region_label,
          }
        : null,
    pushEnabled: row.push_enabled,
    active: row.active,
  };
}

/** The caller's saved alerts, newest first. RLS scopes to the owner. */
export async function fetchMyAlerts(
  client: SupabaseClient,
  userId: string,
): Promise<JobAlert[]> {
  const { data, error } = await client
    .from("job_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AlertRow[] | null)?.map(rowToAlert) ?? [];
}

export async function createAlert(
  client: SupabaseClient,
  userId: string,
  input: JobAlertInput,
): Promise<JobAlert | null> {
  const { data, error } = await client
    .from("job_alerts")
    .insert({
      user_id: userId,
      category_id: input.categoryId,
      days: input.days,
      time_bands: input.timeBands,
      region_lat: input.region?.lat ?? null,
      region_lng: input.region?.lng ?? null,
      radius_km: input.region?.radiusKm ?? 30,
      region_label: input.region?.label ?? null,
      push_enabled: input.pushEnabled,
    })
    .select("*")
    .single();
  if (error) return null;
  return rowToAlert(data as AlertRow);
}

export async function setAlertActive(
  client: SupabaseClient,
  alertId: string,
  active: boolean,
): Promise<boolean> {
  const { error } = await client.from("job_alerts").update({ active }).eq("id", alertId);
  return !error;
}

export async function deleteAlert(client: SupabaseClient, alertId: string): Promise<boolean> {
  const { error } = await client.from("job_alerts").delete().eq("id", alertId);
  return !error;
}
