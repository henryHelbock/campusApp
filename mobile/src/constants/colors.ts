/**
 * App-wide color constants.
 * Severity colors match the spec: Mild->Lime, Medium->Yellow, Large->Orange, Severe->Red
 */
export const AppColors = {
  primary: '#1a73e8',
  background: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e0e0e0',

  severity: {
    Mild: '#32CD32',
    Medium: '#FFD700',
    Large: '#FFA500',
    Severe: '#FF0000',
  },

  pins: {
    issue: '#FF6B6B',
    lostItem: '#4ECDC4',
    foundItem: '#45B7D1',
  },
} as const;
