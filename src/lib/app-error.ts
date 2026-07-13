/**
 * Base class for domain errors that carry an intended HTTP status. Deliberately dependency-light
 * (no `server-only`, no repositories) so `lib/api-response` can map it to a response without pulling
 * server-only service code into every route bundle. Domain services subclass this and set a stable
 * `code` for clients plus the `status` the route should return.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}
