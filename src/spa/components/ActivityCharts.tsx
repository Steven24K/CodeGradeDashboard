"use client";

import { useMemo } from "react";
import { TimeGrouping } from "../Model";

interface ActivitySubmission {
  createdAt: string;
}

interface ActivityBucket {
  key: string;
  label: string;
  count: number;
}

interface ActivityChartsProps {
  submissions: ActivitySubmission[];
  grouping: TimeGrouping;
  onGroupingChange: (grouping: TimeGrouping) => void;
}

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date): Date => {
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const addGrouping = (date: Date, grouping: TimeGrouping): Date => {
  const next = new Date(date);
  if (grouping === "hour") next.setHours(next.getHours() + 1);
  if (grouping === "day") next.setDate(next.getDate() + 1);
  if (grouping === "week") next.setDate(next.getDate() + 7);
  if (grouping === "month") next.setMonth(next.getMonth() + 1);
  return next;
};

const groupingStart = (date: Date, grouping: TimeGrouping): Date => {
  if (grouping === "hour") {
    const start = new Date(date);
    start.setMinutes(0, 0, 0);
    return start;
  }
  if (grouping === "day") return startOfDay(date);
  if (grouping === "week") return startOfWeek(date);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const groupingLabel = (date: Date, grouping: TimeGrouping): string => {
  if (grouping === "hour") {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
  }
  if (grouping === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getBuckets = (
  submissions: ActivitySubmission[],
  grouping: TimeGrouping,
): ActivityBucket[] => {
  const limits: Record<TimeGrouping, number> = {
    hour: 24,
    day: 14,
    week: 12,
    month: 12,
  };
  const count = limits[grouping];
  const current = groupingStart(new Date(), grouping);
  const first = new Date(current);
  for (let index = 1; index < count; index += 1) {
    if (grouping === "hour") first.setHours(first.getHours() - 1);
    if (grouping === "day") first.setDate(first.getDate() - 1);
    if (grouping === "week") first.setDate(first.getDate() - 7);
    if (grouping === "month") first.setMonth(first.getMonth() - 1);
  }

  const bucketByKey = new Map<string, ActivityBucket>();
  const cursor = new Date(first);
  for (let index = 0; index < count; index += 1) {
    const key =
      grouping === "hour"
        ? `${dayKey(cursor)}-${cursor.getHours()}`
        : grouping === "month"
          ? `${cursor.getFullYear()}-${cursor.getMonth()}`
          : grouping === "week"
            ? dayKey(startOfWeek(cursor))
            : dayKey(cursor);
    bucketByKey.set(key, {
      key,
      label: groupingLabel(cursor, grouping),
      count: 0,
    });
    const next = addGrouping(cursor, grouping);
    cursor.setTime(next.getTime());
  }

  for (const submission of submissions) {
    const date = new Date(submission.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const start = groupingStart(date, grouping);
    const key =
      grouping === "hour"
        ? `${dayKey(start)}-${start.getHours()}`
        : grouping === "month"
          ? `${start.getFullYear()}-${start.getMonth()}`
          : grouping === "week"
            ? dayKey(startOfWeek(start))
            : dayKey(start);
    const bucket = bucketByKey.get(key);
    if (bucket) bucket.count += 1;
  }

  return [...bucketByKey.values()];
};

const getHeatmap = (submissions: ActivitySubmission[]) => {
  const counts = new Map<string, number>();
  for (const submission of submissions) {
    const date = new Date(submission.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = startOfDay(new Date());
  const first = new Date(today);
  first.setDate(first.getDate() - first.getDay() - 52 * 7);

  return Array.from({ length: 371 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const count = counts.get(dayKey(date)) ?? 0;
    const isFuture = date > today;
    const level =
      count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
    return {
      key: dayKey(date),
      date,
      count,
      level: isFuture ? -1 : level,
      isFuture,
    };
  });
};

export const ActivityCharts = ({
  submissions,
  grouping,
  onGroupingChange,
}: ActivityChartsProps) => {
  const buckets = useMemo(
    () => getBuckets(submissions, grouping),
    [submissions, grouping],
  );
  const heatmap = useMemo(() => getHeatmap(submissions), [submissions]);
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const maxDay = Math.max(1, ...heatmap.map((day) => day.count));

  return (
    <>
      <section className="activity-panel">
        <div className="activity-panel__heading">
          <div>
            <span className="eyebrow">Submission analytics</span>
            <h2>Work over time</h2>
            <p>Submission count grouped by {grouping}.</p>
          </div>
          <label className="filter-control activity-grouping">
            <span>Group by</span>
            <select
              value={grouping}
              onChange={(event) =>
                onGroupingChange(event.target.value as TimeGrouping)
              }
            >
              <option value="hour">Hour · last 24 hours</option>
              <option value="day">Day · last 14 days</option>
              <option value="week">Week · last 12 weeks</option>
              <option value="month">Month · last 12 months</option>
            </select>
          </label>
        </div>
        <div
          className="submission-chart"
          role="img"
          aria-label={`Submissions by ${grouping}`}
        >
          {buckets.map((bucket) => (
            <div className="submission-chart__item" key={bucket.key}>
              <span className="submission-chart__count">
                {bucket.count || ""}
              </span>
              <div className="submission-chart__bar-wrap">
                <div
                  className="submission-chart__bar"
                  style={{
                    height: `${bucket.count ? Math.max(5, (bucket.count / maxBucket) * 100) : 0}%`,
                  }}
                  title={`${bucket.count} submissions · ${bucket.label}`}
                />
              </div>
              <span className="submission-chart__label">{bucket.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="activity-panel heatmap-panel">
        <div className="activity-panel__heading">
          <div>
            <span className="eyebrow">Consistency</span>
            <h2>Submission activity</h2>
            <p>Each square represents one day during the past year.</p>
          </div>
          <span className="heatmap-summary">
            {submissions.length} submissions total
          </span>
        </div>
        <div
          className="activity-heatmap"
          aria-label="Daily submission activity for the past year"
        >
          {heatmap.map((day) => (
            <span
              className={`activity-heatmap__day activity-heatmap__day--${day.level}`}
              key={day.key}
              title={`${day.count} submissions on ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(day.date)}`}
              style={{
                opacity: day.count ? 0.4 + (day.count / maxDay) * 0.6 : 1,
              }}
              aria-hidden={day.isFuture}
            />
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i className={`activity-heatmap__day--${level}`} key={level} />
          ))}
          <span>More</span>
        </div>
      </section>
    </>
  );
};
