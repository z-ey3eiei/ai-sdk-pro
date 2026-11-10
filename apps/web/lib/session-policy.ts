export const SESSION_IDLE_SECONDS = 3 * 60 * 60;

export const PLATFORM_SESSION_POLICY = {
  expiresIn: SESSION_IDLE_SECONDS,
  updateAge: 0,
  cookieCache: { enabled: false },
} as const;
