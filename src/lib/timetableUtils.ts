// src/lib/timetableUtils.ts
// basic utilities for timetable drag/resize logic

/**
 * Calculate a new start time (in minutes from day start) when dragging an event.
 */
export function dragEvent(start: number, deltaMinutes: number): number {
  return Math.max(0, start + deltaMinutes);
}

/**
 * Calculate new duration when resizing an event.
 */
export function resizeEvent(duration: number, deltaMinutes: number): number {
  return Math.max(30, duration + deltaMinutes);
}
