"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyUiPreferencesToDocument,
  DEFAULT_MOTION_PREFERENCE,
  DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE,
  DEFAULT_WEEK_START_PREFERENCE,
  getSystemResolvedMotion,
  persistMotionPreference,
  persistShowCompletedPreference,
  persistWeekStartPreference,
  readStoredMotionPreference,
  readStoredShowCompletedPreference,
  readStoredWeekStartPreference,
  resolveMotion,
  type MotionPreference,
  type ResolvedMotionPreference,
  type WeekStartPreference,
} from "@/lib/preferences/ui";

type UiPreferencesState = {
  weekStart: WeekStartPreference;
  showCompletedTasks: boolean;
  motionPreference: MotionPreference;
  resolvedMotion: ResolvedMotionPreference;
};

type UiPreferencesContextValue = UiPreferencesState & {
  setWeekStart: (value: WeekStartPreference) => void;
  setShowCompletedTasks: (value: boolean) => void;
  setMotionPreference: (value: MotionPreference) => void;
};

type UiPreferencesProviderProps = {
  children: ReactNode;
  initialWeekStart: WeekStartPreference;
  initialShowCompletedTasks: boolean;
  initialMotionPreference: MotionPreference;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

export function UiPreferencesProvider({
  children,
  initialWeekStart,
  initialShowCompletedTasks,
  initialMotionPreference,
}: UiPreferencesProviderProps) {
  const [state, setState] = useState<UiPreferencesState>(() => {
    const weekStart = readStoredWeekStartPreference() ?? initialWeekStart ?? DEFAULT_WEEK_START_PREFERENCE;
    const showCompletedTasks =
      readStoredShowCompletedPreference() ?? initialShowCompletedTasks ?? DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE;
    const motionPreference = readStoredMotionPreference() ?? initialMotionPreference ?? DEFAULT_MOTION_PREFERENCE;
    const resolvedMotion = resolveMotion(motionPreference, getSystemResolvedMotion());

    return {
      weekStart,
      showCompletedTasks,
      motionPreference,
      resolvedMotion,
    };
  });

  const setWeekStart = useCallback((value: WeekStartPreference) => {
    setState((current) => ({
      ...current,
      weekStart: value,
    }));
  }, []);

  const setShowCompletedTasks = useCallback((value: boolean) => {
    setState((current) => ({
      ...current,
      showCompletedTasks: value,
    }));
  }, []);

  const setMotionPreference = useCallback((value: MotionPreference) => {
    const resolvedMotion = resolveMotion(value, getSystemResolvedMotion());
    setState((current) => ({
      ...current,
      motionPreference: value,
      resolvedMotion,
    }));
  }, []);

  useEffect(() => {
    applyUiPreferencesToDocument(state);
    persistWeekStartPreference(state.weekStart);
    persistShowCompletedPreference(state.showCompletedTasks);
    persistMotionPreference(state.motionPreference);
  }, [state]);

  useEffect(() => {
    if (state.motionPreference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSystemMotion = () => {
      setState((current) => {
        if (current.motionPreference !== "system") {
          return current;
        }

        const nextResolvedMotion: ResolvedMotionPreference = mediaQuery.matches ? "reduce" : "no-preference";
        if (current.resolvedMotion === nextResolvedMotion) {
          return current;
        }

        const nextState = {
          ...current,
          resolvedMotion: nextResolvedMotion,
        };
        applyUiPreferencesToDocument(nextState);
        return nextState;
      });
    };

    mediaQuery.addEventListener("change", syncSystemMotion);
    return () => {
      mediaQuery.removeEventListener("change", syncSystemMotion);
    };
  }, [state.motionPreference]);

  const value = useMemo(
    () => ({
      ...state,
      setWeekStart,
      setShowCompletedTasks,
      setMotionPreference,
    }),
    [setMotionPreference, setShowCompletedTasks, setWeekStart, state],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiPreferences() {
  const context = useContext(UiPreferencesContext);
  if (!context) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider.");
  }

  return context;
}
