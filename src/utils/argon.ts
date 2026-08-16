import argon2 from "argon2";

/**
 * Hashes a plaintext password using Argon2id with 64MB memory cost, time cost 3, and parallelism 4.
 *
 * @param payload - Plaintext password or string.
 * @returns Promise resolving to the Argon2id hash string.
 */
export async function hash(payload: string): Promise<string> {
  return argon2.hash(payload, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 Mb
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash string.
 *
 * @param hash - Argon2id hash string.
 * @param password - Plaintext password candidate.
 * @returns Promise resolving to true if password matches, false otherwise.
 */
export async function verify(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
