/**
 * Generate a consistent fallback rating between 4.5 and 5.0 for a course.
 * Uses a hash of the course ID so the same course always gets the same rating.
 */
export const getFallbackRating = (courseId: string): number => {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map to either 4.5 or 5.0
  return Math.abs(hash) % 2 === 0 ? 4.5 : 5.0;
};

/**
 * Format a course price for display. Always shows a price, never "Free".
 */
export const formatCoursePrice = (monthlyPrice: number | null, price: number): string => {
  const displayPrice = monthlyPrice ?? price;
  return `$${displayPrice > 0 ? displayPrice : 5}/mo`;
};
