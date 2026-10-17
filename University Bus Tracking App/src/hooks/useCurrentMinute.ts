import { useEffect, useState } from "react";

export function useCurrentMinute() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setCurrentTime(new Date());
      intervalId = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return currentTime;
}