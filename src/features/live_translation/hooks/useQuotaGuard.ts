import { useState, useEffect, useCallback, useRef } from "react";
import {
  quotaService,
  QuotaLevel,
  YELLOW_WARNING_THRESHOLD,
  RED_WARNING_THRESHOLD,
  HARD_STOP_THRESHOLD,
  MONTHLY_MAX_FREE_LIMIT,
} from "../domain/quotaService";

export interface UseQuotaGuardOptions {
  isLive: boolean;
  onHardStop?: () => void;
  defaultListeners?: number;
}

export function useQuotaGuard({
  isLive,
  onHardStop,
  defaultListeners = 1,
}: UseQuotaGuardOptions) {
  const [usage, setUsage] = useState<number>(() => quotaService.getMonthlyUsage());
  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>(() => quotaService.getQuotaLevel());
  const [isHardStopped, setIsHardStopped] = useState<boolean>(() => quotaService.isHardStop());
  const [interpreterTracksDisabled, setInterpreterTracksDisabled] = useState<boolean>(false);
  const [listenersCount, setListenersCount] = useState<number>(defaultListeners);

  const onHardStopRef = useRef(onHardStop);
  useEffect(() => {
    onHardStopRef.current = onHardStop;
  }, [onHardStop]);

  // Registrera hård-stopp lyssnare på quotaService
  useEffect(() => {
    quotaService.onHardStop = () => {
      setIsHardStopped(true);
      onHardStopRef.current?.();
    };
    quotaService.onQuotaChange = (newUsage, newLevel) => {
      setUsage(newUsage);
      setQuotaLevel(newLevel);
      if (newLevel === "hard_stop") {
        setIsHardStopped(true);
      }
    };
  }, []);

  // 1-sekunds tick-loop under aktiv sändning
  useEffect(() => {
    if (!isLive || isHardStopped) return;

    const timer = setInterval(() => {
      const activeTracks = interpreterTracksDisabled ? 0 : 1;
      const res = quotaService.addSecondUsage(activeTracks, listenersCount);
      setUsage(res.usage);
      setQuotaLevel(res.level);

      if (res.stopped) {
        setIsHardStopped(true);
        onHardStopRef.current?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isLive, isHardStopped, interpreterTracksDisabled, listenersCount]);

  const toggleInterpreterTracks = useCallback(() => {
    setInterpreterTracksDisabled((prev) => !prev);
  }, []);

  const resetMonthlyUsage = useCallback(() => {
    quotaService.resetUsage();
    setUsage(0);
    setQuotaLevel("normal");
    setIsHardStopped(false);
  }, []);

  return {
    usage,
    quotaLevel,
    isHardStopped,
    interpreterTracksDisabled,
    toggleInterpreterTracks,
    listenersCount,
    setListenersCount,
    resetMonthlyUsage,
    thresholds: {
      yellow: YELLOW_WARNING_THRESHOLD,
      red: RED_WARNING_THRESHOLD,
      hardStop: HARD_STOP_THRESHOLD,
      max: MONTHLY_MAX_FREE_LIMIT,
    },
  };
}
