
/**
 * Calculates workspace session price based on custom rounding rules:
 * - Rate: 10 EGP/hour
 * - Total time < 1h -> 10 EGP
 * - Remaining minutes <= 15m -> +0h
 * - Remaining minutes <= 37m -> +0.5h
 * - Remaining minutes > 37m -> +1h
 */
export function calculateSessionPrice(totalMinutes: number, ratePerHour: number = 10): number {
  if (totalMinutes <= 0) return 0;

  // Special Rule for Rooms (Rate is 80 or specifically handled)
  // Logic: 0-18 mins extra -> +0, >18 mins extra -> +0.5 hour
  if (ratePerHour >= 80) {
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    // Minimum 1 hour charge
    if (hours === 0) return ratePerHour;
    
    let extra = 0;
    if (remainingMinutes > 18) {
      extra = 0.5;
    }
    
    return (hours + extra) * ratePerHour;
  }

  // Standard Workspace Rule (10 EGP/hour)
  // Rule 1: Minimum 1 hour if less than 60 mins
  if (totalMinutes < 60) {
    return ratePerHour;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  let extra = 0;

  if (remainingMinutes <= 15) {
    extra = 0;
  } else if (remainingMinutes <= 37) {
    extra = 0.5;
  } else {
    extra = 1;
  }

  return (hours + extra) * ratePerHour;
}
