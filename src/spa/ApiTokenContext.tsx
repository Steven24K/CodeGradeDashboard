"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";
import type {
  AssignmentSubmissions,
  CodeGradeCourse,
} from "./CodeGradeApi";
import {
  AppState,
  CodeGradeGradebook,
  TimeGrouping,
  initialAppState,
} from "./Model";

export interface ApiAppState {
  tokenDraft: string;
  connected: boolean;
  courses: CodeGradeCourse[];
  gradebooks: Record<string, CodeGradeGradebook>;
  dashboards: Record<string, AppState>;
  submissions: Record<string, AssignmentSubmissions[]>;
  activityGrouping: TimeGrouping;
  activityRefreshes: Record<string, number>;
  loading: string | null;
  error: string;
}

export const initialApiAppState = (): ApiAppState => ({
  tokenDraft: "",
  connected: false,
  courses: [],
  gradebooks: {},
  dashboards: {},
  submissions: {},
  activityGrouping: "day",
  activityRefreshes: {},
  loading: null,
  error: "",
});

interface ApiSessionContextValue {
  state: ApiAppState;
  setState: Dispatch<SetStateAction<ApiAppState>>;
}

const ApiSessionContext = createContext<ApiSessionContextValue | null>(null);

export const ApiTokenProvider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const [state, setState] = useState<ApiAppState>(initialApiAppState);

  return (
    <ApiSessionContext.Provider value={{ state, setState }}>
      {children}
    </ApiSessionContext.Provider>
  );
};

export const useApiSession = (): ApiSessionContextValue => {
  const context = useContext(ApiSessionContext);
  if (!context) {
    throw new Error("useApiSession must be used within ApiTokenProvider.");
  }
  return context;
};

export const studentCacheKey = (
  courseId: string,
  studentId: string,
): string => `${courseId}:${studentId}`;

export const getDashboardState = (
  state: ApiAppState,
  courseId: string,
): AppState => state.dashboards[courseId] ?? initialAppState();
