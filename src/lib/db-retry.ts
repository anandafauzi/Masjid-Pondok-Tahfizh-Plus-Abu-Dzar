/**
 * Retry a Serializable transaction when Postgres aborts it with P2034
 * (write conflict). Supabase/Postgres uses this code under concurrent writes.
 */
export async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isP2034 =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2034";

      if (isP2034 && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, attempt * 50 + Math.random() * 50)
        );
        continue;
      }
      throw error;
    }
  }
}
