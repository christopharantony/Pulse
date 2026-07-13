import { ObjectId } from 'mongodb';

/**
 * Shared test helpers. Kept dependency-light so any repository suite can seed the ids it needs
 * without pulling in unrelated domains.
 */

/** Fresh ObjectId — a stand-in for a real user/workspace id in tests that don't create one. */
export function newId(): ObjectId {
  return new ObjectId();
}

/** A midnight-UTC Date for the given ISO date string, matching how day-keyed docs store dates. */
export function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}
