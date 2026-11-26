"use client";

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  AssignmentSubmissions,
  CodeGradeCourse,
} from "./CodeGradeApi";
import {
  isAssignment,
  isAssignmentSubmissions,
  isCourse,
  isStudent,
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
  cacheHydrated: boolean;
  cacheError: string;
  lastFetchedAt: string | null;
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
  cacheHydrated: false,
  cacheError: "",
  lastFetchedAt: null,
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
  reloadCachedData: () => void;
}

const ApiSessionContext = createContext<ApiSessionContextValue | null>(null);

const API_CACHE_KEY = "codegrade-dashboard-api-cache-v1";

interface PersistedApiData {
  courses: CodeGradeCourse[];
  gradebooks: ApiAppState["gradebooks"];
  submissions: ApiAppState["submissions"];
  activityGrouping: TimeGrouping;
  lastFetchedAt: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isTimeGrouping = (value: unknown): value is TimeGrouping =>
  value === "hour" ||
  value === "day" ||
  value === "week" ||
  value === "month";

const parsePersistedApiData = (raw: string): PersistedApiData => {
  const parsed: unknown = JSON.parse(raw);
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.courses) ||
    !parsed.courses.every(isCourse) ||
    !isRecord(parsed.gradebooks) ||
    !Object.values(parsed.gradebooks).every(
      (gradebook) =>
        isRecord(gradebook) &&
        Array.isArray(gradebook.assignments) &&
        gradebook.assignments.every(isAssignment) &&
        Array.isArray(gradebook.students) &&
        gradebook.students.every(isStudent),
    ) ||
    !isRecord(parsed.submissions) ||
    !Object.values(parsed.submissions).every(
      (submissions) =>
        Array.isArray(submissions) &&
        submissions.every(isAssignmentSubmissions),
    ) ||
    !isTimeGrouping(parsed.activityGrouping) ||
    !(
      parsed.lastFetchedAt === null ||
      (typeof parsed.lastFetchedAt === "string" &&
        !Number.isNaN(Date.parse(parsed.lastFetchedAt)))
    )
  ) {
    throw new Error("The saved CodeGrade cache has an invalid format.");
  }

  return {
    courses: parsed.courses,
    gradebooks: parsed.gradebooks as ApiAppState["gradebooks"],
    submissions: parsed.submissions as ApiAppState["submissions"],
    activityGrouping: parsed.activityGrouping,
    lastFetchedAt: parsed.lastFetchedAt,
  };
};

const getDashboards = (
  gradebooks: ApiAppState["gradebooks"],
): ApiAppState["dashboards"] =>
  Object.fromEntries(
    Object.entries(gradebooks).map(([courseId, gradebook]) => [
      courseId,
      { ...initialAppState(), students: gradebook.students },
    ]),
  );

const readPersistedApiData = (): PersistedApiData | null => {
  const raw = window.localStorage.getItem(API_CACHE_KEY);
  return raw ? parsePersistedApiData(raw) : null;
};

export const ApiTokenProvider = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const [state, setState] = useState<ApiAppState>(initialApiAppState);

  useEffect(() => {
    try {
      const cached = readPersistedApiData();
      if (cached) {
        setState((current) => ({
          ...current,
          ...cached,
          dashboards: getDashboards(cached.gradebooks),
          cacheHydrated: true,
        }));
      } else {
        setState((current) => ({ ...current, cacheHydrated: true }));
      }
    } catch (reason) {
      setState((current) => ({
        ...current,
        cacheHydrated: true,
        cacheError:
          reason instanceof Error
            ? reason.message
            : "Could not read the saved CodeGrade cache.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!state.cacheHydrated) return;

    try {
      if (
        state.courses.length === 0 &&
        Object.keys(state.gradebooks).length === 0 &&
        Object.keys(state.submissions).length === 0
      ) {
        window.localStorage.removeItem(API_CACHE_KEY);
        return;
      }

      const cache: PersistedApiData = {
        courses: state.courses,
        gradebooks: state.gradebooks,
        submissions: state.submissions,
        activityGrouping: state.activityGrouping,
        lastFetchedAt: state.lastFetchedAt,
      };
      window.localStorage.setItem(
        API_CACHE_KEY,
        JSON.stringify({ version: 1, ...cache }),
      );
      if (state.cacheError) {
        setState((current) => ({ ...current, cacheError: "" }));
      }
    } catch (reason) {
      setState((current) => ({
        ...current,
        cacheError:
          reason instanceof Error
            ? reason.message
            : "Could not save the CodeGrade cache.",
      }));
    }
  }, [
    state.cacheHydrated,
    state.cacheError,
    state.courses,
    state.gradebooks,
    state.submissions,
    state.activityGrouping,
    state.lastFetchedAt,
  ]);

  const reloadCachedData = () => {
    try {
      const cached = readPersistedApiData();
      if (!cached) {
        setState((current) => ({
          ...current,
          cacheError: "No saved CodeGrade data is available to reload.",
        }));
        return;
      }

      setState((current) => ({
        ...current,
        ...cached,
        dashboards: getDashboards(cached.gradebooks),
        cacheHydrated: true,
        cacheError: "",
      }));
    } catch (reason) {
      setState((current) => ({
        ...current,
        cacheError:
          reason instanceof Error
            ? reason.message
            : "Could not reload the saved CodeGrade cache.",
      }));
    }
  };

  return (
    <ApiSessionContext.Provider value={{ state, setState, reloadCachedData }}>
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

export const markApiDataFetched = <T extends ApiAppState>(state: T): T => ({
  ...state,
  lastFetchedAt: new Date().toISOString(),
});

export const getDashboardState = (
  state: ApiAppState,
  courseId: string,
): AppState => state.dashboards[courseId] ?? initialAppState();
