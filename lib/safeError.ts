/**
 * Maps raw backend error messages to user-safe messages,
 * preventing internal schema/policy details from leaking.
 */
export function getSafeErrorMessage(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message).toLowerCase()
      : "";

  // Auth-specific patterns
  if (message.includes("invalid login") || message.includes("invalid email")) {
    return "Invalid email or password.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "This email is already registered.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  // Database / RLS patterns
  if (message.includes("row-level security") || message.includes("rls") || message.includes("policy")) {
    return "Access denied. Please contact support.";
  }
  if (message.includes("violates") || message.includes("constraint")) {
    return "Invalid data. Please check your input and try again.";
  }
  if (message.includes("duplicate key") || message.includes("unique")) {
    return "This record already exists.";
  }

  // Password policy (surface the real message so users know what to fix)
  if (message.includes("password")) {
    const raw = typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message)
      : "";
    return raw || "Password does not meet requirements.";
  }

  // Network
  if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
    return "Network error. Please check your connection and try again.";
  }

  // Generic fallback
  return "Something went wrong. Please try again.";
}
