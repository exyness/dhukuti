import "server-only";

import { BorshEventCoder, type Idl } from "@coral-xyz/anchor";
import idl from "@/lib/program/dhukuti_program.idl.json";
import type { DecodedDhukutiEvent } from "./types";

const EVENT_LOG_PREFIX = "Program data: ";
const eventCoder = new BorshEventCoder(idl as Idl);

export function decodeDhukutiEventsFromLogs(logs: string[] | null | undefined) {
  const decodedEvents: DecodedDhukutiEvent[] = [];

  for (const log of logs ?? []) {
    if (!log.startsWith(EVENT_LOG_PREFIX)) {
      continue;
    }

    const decoded = safeDecodeEvent(log.slice(EVENT_LOG_PREFIX.length));
    if (!decoded) {
      continue;
    }

    decodedEvents.push({
      data: normalizeAnchorValue(decoded.data) as Record<string, unknown>,
      eventIndex: decodedEvents.length,
      name: decoded.name,
    });
  }

  return decodedEvents;
}

function safeDecodeEvent(log: string) {
  try {
    return eventCoder.decode(log);
  } catch {
    return null;
  }
}

function normalizeAnchorValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeAnchorValue);
  }

  if (typeof value !== "object") {
    return value;
  }

  if ("toBase58" in value && typeof value.toBase58 === "function") {
    return value.toBase58();
  }

  if ("toNumber" in value && typeof value.toNumber === "function") {
    const raw = "toString" in value && typeof value.toString === "function" ? value.toString() : "";
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) ? numeric : raw;
  }

  const entries = Object.entries(value).map(([key, nestedValue]) => [
    key,
    normalizeAnchorValue(nestedValue),
  ]);

  return Object.fromEntries(entries);
}
