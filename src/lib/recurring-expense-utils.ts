export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDayOfMonth(day: number) {
  return `${day}. gün`;
}
