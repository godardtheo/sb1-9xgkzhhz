/**
 * Format a duration in minutes to "h:mm" format
 * Examples:
 * - 45 minutes -> "0:45"
 * - 60 minutes -> "1:00"
 * - 85 minutes -> "1:25"
 */
export function formatDuration(minutes: number): string {
  if (!minutes && minutes !== 0) return '0:00';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Extracts numeric minutes from a duration string
 * Examples:
 * - "45 minutes" -> 45
 * - "1 hour 25 minutes" -> 85
 * - "1:25" -> 85
 */
export function parseDurationToMinutes(durationString: string): number {
  if (!durationString) return 0;
  
  // If it's already in h:mm format
  if (durationString.includes(':')) {
    const [hours, minutes] = durationString.split(':').map(Number);
    return (hours * 60) + minutes;
  }
  
  // Extract digits from string like "45 minutes"
  const minutes = durationString.match(/(\d+)\s*(?:minute|min)/i);
  const hours = durationString.match(/(\d+)\s*(?:hour|hr)/i);
  
  const totalMinutes = 
    (minutes ? parseInt(minutes[1]) : 0) + 
    (hours ? parseInt(hours[1]) * 60 : 0);
  
  // If no pattern matched but there are digits, just use the first set of digits
  if (totalMinutes === 0) {
    const digits = durationString.match(/(\d+)/);
    return digits ? parseInt(digits[1]) : 0;
  }
  
  return totalMinutes;
} 