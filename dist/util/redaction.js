const REDACTED = "[[REDACTED_SECRET]]";
/**
 * Replaces all occurrences of a secret within a string with `REDACTED`.
 *
 * @param value - The string that may contain the secret.
 * @param secret - The sensitive value to redact.
 * @returns The sanitized string with all occurrences of `secret` replaced.
 */
export function redactSecret(value, secret) {
    if (secret.length === 0) {
        return value;
    }
    return value.split(secret).join(REDACTED);
}
