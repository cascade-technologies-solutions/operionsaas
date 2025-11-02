import { User } from '@/types';

/**
 * Get the user ID from a user object, handling both 'id' and '_id' fields
 * @param user - The user object
 * @returns The user ID or undefined if not found
 */
export const getUserId = (user: User | null): string | undefined => {
  if (!user) return undefined;
  return user.id || user._id;
};

/**
 * Check if a user has a valid ID
 * @param user - The user object
 * @returns True if user has a valid ID
 */
export const hasValidUserId = (user: User | null): boolean => {
  return !!getUserId(user);
};
