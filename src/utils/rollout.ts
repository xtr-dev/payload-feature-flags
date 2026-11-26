/**
 * Whether a flag's rollout reaches only part of its users, for display in the
 * admin dashboard. A missing percentage (null or undefined) means everyone;
 * any number below 100, including 0 (nobody), is a partial rollout.
 */
export const isPartialRollout = (rolloutPercentage?: null | number): boolean =>
  typeof rolloutPercentage === 'number' && rolloutPercentage < 100
