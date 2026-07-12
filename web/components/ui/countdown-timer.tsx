"use client";

import { useEffect, useState } from "react";

type CountdownUnits = {
  days: string | null;
  hours: string;
  minutes: string;
  seconds: string;
};

function computeUnits(deadlineAt: string): CountdownUnits | null {
  const diffMs = new Date(deadlineAt).getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  return {
    days: days > 0 ? String(days).padStart(2, "0") : null,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

export function useCountdown(deadlineAt: string | null): CountdownUnits | null {
  const [units, setUnits] = useState(() => (deadlineAt ? computeUnits(deadlineAt) : null));

  useEffect(() => {
    if (!deadlineAt) {
      setUnits(null);
      return;
    }

    setUnits(computeUnits(deadlineAt));

    const id = setInterval(() => {
      const next = computeUnits(deadlineAt);
      setUnits(next);
      if (!next) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [deadlineAt]);

  return units;
}
