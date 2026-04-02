import type { IssueSeverity } from '../types/issue';

export const SEVERITY_LEVELS: IssueSeverity[] = ['Mild', 'Medium', 'Large', 'Severe'];

export const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  Mild: '#32CD32',    // Lime
  Medium: '#FFD700',  // Yellow
  Large: '#FFA500',   // Orange
  Severe: '#FF0000',  // Red
};

export const SEVERITY_NUMERIC: Record<IssueSeverity, number> = {
  Mild: 1,
  Medium: 2,
  Large: 3,
  Severe: 4,
};
