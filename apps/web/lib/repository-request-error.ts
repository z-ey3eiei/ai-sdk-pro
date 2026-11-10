export type RepositoryRequestErrorKind =
  | "signed-out"
  | "permission-denied"
  | "not-found"
  | "rate-limit"
  | "setup"
  | "timeout"
  | "provider-failure";

export interface RepositoryRequestErrorPresentation {
  kind: RepositoryRequestErrorKind;
  title: string;
  message: string;
}

export class RepositoryRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("repository-request-failed");
    this.name = "RepositoryRequestError";
    this.status = status;
  }
}

export function mapRepositoryRequestStatus(
  status: number
): RepositoryRequestErrorPresentation {
  switch (status) {
    case 401:
      return {
        kind: "signed-out",
        title: "Sign in required",
        message: "Your session has expired or is not active. Sign in again to continue.",
      };
    case 403:
      return {
        kind: "permission-denied",
        title: "Permission denied",
        message: "You do not have permission to access this repository snapshot.",
      };
    case 404:
      return {
        kind: "not-found",
        title: "Snapshot not found",
        message: "The requested repository snapshot or file could not be found.",
      };
    case 429:
      return {
        kind: "rate-limit",
        title: "Too many requests",
        message: "Too many requests were made. Wait a moment and try again.",
      };
    case 503:
      return {
        kind: "setup",
        title: "Workspace setup is pending",
        message: "Repository access is temporarily unavailable while workspace setup is completed.",
      };
    case 504:
      return {
        kind: "timeout",
        title: "Request timed out",
        message: "The repository service took too long to respond. Try again.",
      };
    case 500:
    default:
      return {
        kind: "provider-failure",
        title: "Repository provider unavailable",
        message: "The repository provider could not complete this request. Try again later.",
      };
  }
}

export function presentRepositoryRequestError(
  error: unknown
): RepositoryRequestErrorPresentation {
  if (error instanceof RepositoryRequestError) {
    return mapRepositoryRequestStatus(error.status);
  }

  return mapRepositoryRequestStatus(500);
}
