import argon2 from "argon2";

export async function hash(payload: string): Promise<string> {
  return argon2.hash(payload, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 Mb
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verify(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
