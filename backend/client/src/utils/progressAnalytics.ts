import type { Task } from "../types/column";

export type ProgressFilter = "daily" | "weekly" | "monthly" | "yearly";

export type DayActivity = {
  dateKey: string;
  label: string;
  count: number;
};

export type ChartPoint = {
  key: string;
  label: string;
  count: number;
};

export type SummaryMetrics = {
  totalCompleted: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
};

export type GroupedHistoryEntry = {
  key: string;
  label: string;
  count: number;
  startDate: string;
  endDate: string;
};

export type WeeklySummaryEntry = {
  label: string;
  count: number;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const toDayStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDayKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTaskAnchorDate = (task: Task): Date | null => {
  const candidate = task.completed ? task.completedAt : task.createdAt;
  return parseDate(candidate);
};

const getWeekStart = (date: Date): Date => {
  const normalized = toDayStart(date);
  const day = normalized.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + mondayOffset);
  return normalized;
};

const toMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const toWeekKey = (date: Date): string => {
  return toDayKey(getWeekStart(date));
};

const toYearKey = (date: Date): string => {
  return String(date.getFullYear());
};

const buildCompletionMap = (tasks: Task[]): Map<string, number> => {
  const map = new Map<string, number>();

  tasks.forEach((task) => {
    if (!task.completed) {
      return;
    }

    const completedAt = parseDate(task.completedAt);
    if (!completedAt) {
      return;
    }

    const dayKey = toDayKey(completedAt);
    map.set(dayKey, (map.get(dayKey) ?? 0) + 1);
  });

  return map;
};

export const getFilterRange = (filter: ProgressFilter, referenceDate = new Date()): DateRange => {
  const today = toDayStart(referenceDate);

  if (filter === "daily") {
    const dayKey = toDayKey(today);
    return { startDate: dayKey, endDate: dayKey };
  }

  if (filter === "weekly") {
    const start = new Date(today.getTime() - 6 * DAY_MS);
    return { startDate: toDayKey(start), endDate: toDayKey(today) };
  }

  if (filter === "monthly") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startDate: toDayKey(start), endDate: toDayKey(end) };
  }

  const start = new Date(today.getFullYear(), 0, 1);
  const end = new Date(today.getFullYear(), 11, 31);
  return { startDate: toDayKey(start), endDate: toDayKey(end) };
};

export const getFilteredTasks = (tasks: Task[], filter: ProgressFilter, referenceDate = new Date()): Task[] => {
  const range = getFilterRange(filter, referenceDate);
  const start = new Date(`${range.startDate}T00:00:00`).getTime();
  const end = new Date(`${range.endDate}T23:59:59`).getTime();

  return tasks.filter((task) => {
    const anchor = getTaskAnchorDate(task);
    if (!anchor) {
      return false;
    }

    const time = anchor.getTime();
    return time >= start && time <= end;
  });
};

const buildDateSeries = (range: DateRange): DayActivity[] => {
  const startDay = toDayStart(new Date(`${range.startDate}T00:00:00`));
  const endDay = toDayStart(new Date(`${range.endDate}T00:00:00`));
  const totalDays = Math.max(1, Math.floor((endDay.getTime() - startDay.getTime()) / DAY_MS) + 1);

  const points: DayActivity[] = [];
  for (let offset = 0; offset < totalDays; offset += 1) {
    const currentDay = new Date(startDay.getTime() + offset * DAY_MS);
    points.push({
      dateKey: toDayKey(currentDay),
      label: currentDay.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: 0,
    });
  }

  return points;
};

export const buildDailyActivity = (
  filteredTasks: Task[],
  range: DateRange
): DayActivity[] => {
  const completionMap = buildCompletionMap(filteredTasks);
  return buildDateSeries(range).map((point) => ({
    ...point,
    count: completionMap.get(point.dateKey) ?? 0,
  }));
};

export const buildChartSeries = (
  filteredTasks: Task[],
  filter: ProgressFilter,
  range: DateRange
): ChartPoint[] => {
  if (filter === "yearly") {
    const monthMap = new Map<number, number>();

    filteredTasks.forEach((task) => {
      if (!task.completed) {
        return;
      }

      const completedAt = parseDate(task.completedAt);
      if (!completedAt) {
        return;
      }

      const month = completedAt.getMonth();
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    });

    return Array.from({ length: 12 }, (_, monthIndex) => {
      const date = new Date(new Date(`${range.startDate}T00:00:00`).getFullYear(), monthIndex, 1);
      return {
        key: `${date.getFullYear()}-${String(monthIndex + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        count: monthMap.get(monthIndex) ?? 0,
      };
    });
  }

  return buildDailyActivity(filteredTasks, range).map((point) => ({
    key: point.dateKey,
    label: point.label,
    count: point.count,
  }));
};

export const buildWeeklySummary = (dailyActivity: DayActivity[]): WeeklySummaryEntry[] => {
  const weeklyMap = new Map<string, number>();

  dailyActivity.forEach((point) => {
    const date = new Date(`${point.dateKey}T00:00:00`);
    const weekKey = toWeekKey(date);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + point.count);
  });

  return Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => {
      const date = new Date(`${weekStart}T00:00:00`);
      return {
        label: `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        count,
      };
    });
};

export const buildSummaryMetrics = (tasks: Task[]): SummaryMetrics => {
  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter((task) => task.completed).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

  const completionMap = buildCompletionMap(tasks);
  const completedDayKeys = Array.from(completionMap.keys()).sort();
  const daySet = new Set(completedDayKeys);

  let currentStreak = 0;
  const today = toDayStart(new Date());
  for (let i = 0; i < 3650; i += 1) {
    const day = new Date(today.getTime() - i * DAY_MS);
    if (!daySet.has(toDayKey(day))) {
      break;
    }
    currentStreak += 1;
  }

  let bestStreak = 0;
  let runningStreak = 0;
  let previousTime: number | null = null;

  completedDayKeys.forEach((key) => {
    const time = new Date(`${key}T00:00:00`).getTime();
    if (previousTime == null || time - previousTime === DAY_MS) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    bestStreak = Math.max(bestStreak, runningStreak);
    previousTime = time;
  });

  return {
    totalCompleted,
    completionRate,
    currentStreak,
    bestStreak,
  };
};

export const buildHistoryGroups = (tasks: Task[]) => {
  const weekMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const yearMap = new Map<string, number>();

  tasks.forEach((task) => {
    if (!task.completed) {
      return;
    }

    const completedAt = parseDate(task.completedAt);
    if (!completedAt) {
      return;
    }

    const weekKey = toWeekKey(completedAt);
    const monthKey = toMonthKey(completedAt);
    const yearKey = toYearKey(completedAt);

    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);
    yearMap.set(yearKey, (yearMap.get(yearKey) ?? 0) + 1);
  });

  const toEntries = (map: Map<string, number>, formatter: (key: string) => string) => {
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .map(([key, count]) => {
        let startDate = key;
        let endDate = key;

        if (/^\d{4}-\d{2}$/.test(key)) {
          const [yearRaw, monthRaw] = key.split("-");
          const year = Number(yearRaw);
          const month = Number(monthRaw);
          const start = new Date(year, month - 1, 1);
          const end = new Date(year, month, 0);
          startDate = toDayKey(start);
          endDate = toDayKey(end);
        } else if (/^\d{4}$/.test(key)) {
          const year = Number(key);
          startDate = `${year}-01-01`;
          endDate = `${year}-12-31`;
        } else {
          const start = new Date(`${key}T00:00:00`);
          const end = new Date(start.getTime() + 6 * DAY_MS);
          startDate = toDayKey(start);
          endDate = toDayKey(end);
        }

        return {
          key,
          label: formatter(key),
          count,
          startDate,
          endDate,
        };
      });
  };

  return {
    week: toEntries(weekMap, (key) => {
      const date = new Date(`${key}T00:00:00`);
      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }),
    month: toEntries(monthMap, (key) => {
      const [year, month] = key.split("-");
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }),
    year: toEntries(yearMap, (key) => key),
  };
};

export const getCompletedTasksForDay = (tasks: Task[], dayKey: string): Task[] => {
  return tasks.filter((task) => {
    if (!task.completed || !task.completedAt) {
      return false;
    }

    const completedAt = parseDate(task.completedAt);
    return completedAt ? toDayKey(completedAt) === dayKey : false;
  });
};

export const getTaskTitle = (task: Task): string => {
  const value = task.values.name;
  return typeof value === "string" && value.trim().length > 0 ? value : "Untitled task";
};

export const getHeatIntensityLevel = (count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  const ratio = count / maxCount;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
};
