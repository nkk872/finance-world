import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fw_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters.");
  return value;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(expires);
  return { value: payload + "." + signature(payload), expires };
}

export function isValidAdminSession(value?: string) {
  if (!value) return false;
  const [expires, supplied] = value.split(".");
  if (!expires || !supplied || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(expires);
  const a = Buffer.from(supplied, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasAdminSession() {
  const jar = await cookies();
  return isValidAdminSession(jar.get(COOKIE_NAME)?.value);
}

export const adminCookieName = COOKIE_NAME;
export const adminSessionSeconds = SESSION_SECONDS;
