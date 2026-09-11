import { useEffect, useState } from "react";
import { getCurrentMonthKey } from "../utils/transactions";

export function useCurrentMonthKey() {
  const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());

  useEffect(() => {
    let midnightTimer = 0;

    const updateMonth = () => {
      const nextMonthKey = getCurrentMonthKey();
      setMonthKey((currentMonthKey) =>
        currentMonthKey === nextMonthKey ? currentMonthKey : nextMonthKey
      );
    };

    const scheduleMidnightUpdate = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = window.setTimeout(() => {
        updateMonth();
        scheduleMidnightUpdate();
      }, nextMidnight.getTime() - now.getTime() + 1_000);
    };

    const updateWhenVisible = () => {
      if (document.visibilityState === "visible") {
        updateMonth();
      }
    };

    scheduleMidnightUpdate();
    window.addEventListener("focus", updateMonth);
    document.addEventListener("visibilitychange", updateWhenVisible);

    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", updateMonth);
      document.removeEventListener("visibilitychange", updateWhenVisible);
    };
  }, []);

  return monthKey;
}
