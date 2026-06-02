import { DashboardMetrics } from './dashboard.service';
import { Task } from '../../core/models/task.model';

export interface StatusSlice {
  label: string;
  value: number;
  color: string;
}

export interface WeeklyBar {
  label: string;
  planned: number;
  completed: number;
}

const STATUS_COLORS: Record<string, string> = {
  Completadas: '#2e7d32',
  'En progreso': '#1565c0',
  Pendientes: '#e65100',
  Atrasadas: '#b23b3b'
};

export function buildStatusDistribution(metrics: DashboardMetrics): StatusSlice[] {
  return [
    { label: 'Completadas', value: metrics.completedTasks, color: STATUS_COLORS['Completadas'] },
    { label: 'En progreso', value: metrics.inProgressTasks, color: STATUS_COLORS['En progreso'] },
    { label: 'Pendientes', value: metrics.pendingTasks, color: STATUS_COLORS['Pendientes'] },
    { label: 'Atrasadas', value: metrics.overdueTasks, color: STATUS_COLORS['Atrasadas'] }
  ].filter((item) => item.value > 0);
}

export function buildPieGradient(slices: StatusSlice[]): string {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) {
    return 'conic-gradient(#ececf1 0deg 360deg)';
  }

  let accumulated = 0;
  const stops = slices.map((slice) => {
    const start = (accumulated / total) * 100;
    accumulated += slice.value;
    const end = (accumulated / total) * 100;
    return `${slice.color} ${start}% ${end}%`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

export function buildWeeklyBars(tasks: Task[], metrics: DashboardMetrics, days = 16): WeeklyBar[] {
  const bars = createEmptyBars(days);
  const indexByKey = new Map<string, number>();

  for (let index = 0; index < bars.length; index++) {
    const date = getDateForOffset(days, index);
    indexByKey.set(formatDateKey(date), index);
  }

  for (const task of tasks) {
    const createdKey = toDateKey(task.createdAt);
    const updatedKey = toDateKey(task.updatedAt);
    const dueKey = toDateKey(task.dueDate);

    if (task.status === 'DONE') {
      const completedKey = updatedKey ?? dueKey ?? createdKey;
      incrementBar(bars, indexByKey, completedKey, 'completed');
      continue;
    }

    const plannedKey = dueKey ?? createdKey;
    incrementBar(bars, indexByKey, plannedKey, 'planned');
  }

  if (bars.every((bar) => bar.planned === 0 && bar.completed === 0)) {
    return buildWeeklyFallback(metrics, days);
  }

  return bars;
}

function createEmptyBars(days: number): WeeklyBar[] {
  const bars: WeeklyBar[] = [];

  for (let index = 0; index < days; index++) {
    const date = getDateForOffset(days, index);
    bars.push({
      label: formatShortLabel(date),
      planned: 0,
      completed: 0
    });
  }

  return bars;
}

function getDateForOffset(days: number, index: number): Date {
  const today = startOfDay(new Date());
  const date = new Date(today);
  date.setDate(today.getDate() - (days - 1 - index));
  return date;
}

function incrementBar(
  bars: WeeklyBar[],
  indexByKey: Map<string, number>,
  dateKey: string | null,
  field: 'planned' | 'completed'
): void {
  if (!dateKey) return;
  const index = indexByKey.get(dateKey);
  if (index === undefined) return;
  bars[index][field] += 1;
}

function buildWeeklyFallback(metrics: DashboardMetrics, days: number): WeeklyBar[] {
  const bars = createEmptyBars(days);
  const plannedTotal = Math.max(metrics.createdThisWeek, metrics.pendingTasks + metrics.inProgressTasks, 1);
  const completedTotal = Math.max(metrics.completedThisWeek, metrics.completedTasks, 1);
  const plannedWeights = distributeTotal(plannedTotal, days);
  const completedWeights = distributeTotal(completedTotal, days);

  return bars.map((bar, index) => ({
    ...bar,
    planned: plannedWeights[index],
    completed: completedWeights[index]
  }));
}

function distributeTotal(total: number, slots: number): number[] {
  if (total <= 0) return Array.from({ length: slots }, () => 0);

  const base = Math.floor(total / slots);
  const remainder = total % slots;
  return Array.from({ length: slots }, (_, index) => base + (index < remainder ? 1 : 0));
}

function toDateKey(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDateKey(parsed);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
