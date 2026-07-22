import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const publicUser = ({ passwordHash, passwordSalt, passwordResetHash, passwordResetExpiresAt, tokenVersion, ...user }) => structuredClone(user);

export class AuthError extends Error {
  constructor(message, status = 401, details) { super(message); this.name = "AuthError"; this.status = status; this.details = details; }
}

export class AuthService {
  constructor(filePath, secret, { now = () => new Date(), tokenLifetimeSeconds = 60 * 60 * 8, exposeResetToken = false } = {}) {
    if (typeof secret !== "string" || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
    this.filePath = filePath;
    this.secret = secret;
    this.now = now;
    this.tokenLifetimeSeconds = tokenLifetimeSeconds;
    this.exposeResetToken = exposeResetToken;
    this.queue = Promise.resolve();
  }

  async initialize() {
    try { await this.#read(); }
    catch (error) {
      if (error?.code !== "ENOENT") throw new Error("User database could not be loaded safely.", { cause: error });
      await this.#write([]);
    }
  }

  async #read() {
    const users = JSON.parse(await readFile(this.filePath, "utf8"));
    const valid = Array.isArray(users) && users.every((user) => user && typeof user === "object"
      && typeof user.id === "string" && typeof user.name === "string" && typeof user.email === "string"
      && typeof user.passwordSalt === "string" && typeof user.passwordHash === "string"
      && typeof user.createdAt === "string" && typeof user.updatedAt === "string");
    const unique = valid && new Set(users.map(({ id }) => id)).size === users.length
      && new Set(users.map(({ email }) => email)).size === users.length;
    if (!unique) throw new Error("Invalid user database.");
    return users;
  }

  async #write(users) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(users, null, 2)}\n`, "utf8");
    await rename(temporary, this.filePath);
  }

  #mutate(operation) {
    const next = this.queue.then(async () => operation(await this.#read()));
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  async register(input) {
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = input?.password;
    const details = {};
    if (name.length < 2 || name.length > 80) details.name = "Name must contain 2 to 80 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) details.email = "A valid email address is required.";
    if (typeof password !== "string" || password.length < 8 || password.length > 128) details.password = "Password must contain 8 to 128 characters.";
    if (Object.keys(details).length) throw new AuthError("Registration validation failed.", 422, details);
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64);
    return this.#mutate(async (users) => {
      if (users.some((user) => user.email === email)) throw new AuthError("An account with this email already exists.", 409);
      const timestamp = this.now().toISOString();
      const user = { id: randomUUID(), name, email, passwordSalt: salt.toString("base64"), passwordHash: hash.toString("base64"), tokenVersion: 0, createdAt: timestamp, updatedAt: timestamp };
      await this.#write([...users, user]);
      return { user: publicUser(user), token: this.#createToken(user) };
    });
  }

  async login(input) {
    const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = input?.password;
    if (!email || typeof password !== "string") throw new AuthError("Email and password are required.", 422);
    const user = (await this.#read()).find((candidate) => candidate.email === email);
    if (!user) throw new AuthError("Invalid email or password.");
    const hash = await scrypt(password, Buffer.from(user.passwordSalt, "base64"), 64);
    const expected = Buffer.from(user.passwordHash, "base64");
    if (hash.length !== expected.length || !timingSafeEqual(hash, expected)) throw new AuthError("Invalid email or password.");
    return { user: publicUser(user), token: this.#createToken(user) };
  }

  #createToken(user) {
    const issuedAt = Math.floor(this.now().getTime() / 1000);
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({ sub: user.id, email: user.email, ver: user.tokenVersion ?? 0, iat: issuedAt, exp: issuedAt + this.tokenLifetimeSeconds });
    const signature = createHmac("sha256", this.secret).update(`${header}.${payload}`).digest("base64url");
    return `${header}.${payload}.${signature}`;
  }

  async verifyToken(token) {
    if (typeof token !== "string") throw new AuthError("Authentication is required.");
    const parts = token.split(".");
    if (parts.length !== 3) throw new AuthError("Invalid authentication token.");
    let header;
    try { header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { throw new AuthError("Invalid authentication token."); }
    if (header.alg !== "HS256" || header.typ !== "JWT") throw new AuthError("Invalid authentication token.");
    const expected = Buffer.from(createHmac("sha256", this.secret).update(`${parts[0]}.${parts[1]}`).digest("base64url"));
    const actual = Buffer.from(parts[2]);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AuthError("Invalid authentication token.");
    let payload;
    try { payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")); } catch { throw new AuthError("Invalid authentication token."); }
    if (!payload.exp || payload.exp <= Math.floor(this.now().getTime() / 1000)) throw new AuthError("Authentication token has expired.");
    const user = (await this.#read()).find(({ id }) => id === payload.sub);
    if (!user) throw new AuthError("Authentication account no longer exists.");
    if (payload.ver !== (user.tokenVersion ?? 0)) throw new AuthError("Authentication token has been revoked.");
    return publicUser(user);
  }

  async findUserByEmail(email) {
    if (typeof email !== "string") return null;
    const user = (await this.#read()).find((candidate) => candidate.email === email.trim().toLowerCase());
    return user ? publicUser(user) : null;
  }

  requestPasswordReset(emailInput) {
    const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
    const response = { message: "If an account exists for that email, a reset token has been created." };
    return this.#mutate(async (users) => {
      const user = users.find((candidate) => candidate.email === email);
      if (!user) return response;
      const token = randomBytes(32).toString("base64url");
      user.passwordResetHash = createHash("sha256").update(token).digest("hex");
      user.passwordResetExpiresAt = new Date(this.now().getTime() + 15 * 60 * 1000).toISOString();
      await this.#write(users);
      return { ...response, ...(this.exposeResetToken ? { resetToken: token } : {}) };
    });
  }

  async resetPassword(token, newPassword) {
    if (typeof token !== "string" || !token || typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) throw new AuthError("A valid reset token and password of 8 to 128 characters are required.", 422);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const salt = randomBytes(16);
    const hash = await scrypt(newPassword, salt, 64);
    return this.#mutate(async (users) => {
      const user = users.find((candidate) => candidate.passwordResetHash === tokenHash);
      if (!user || Date.parse(user.passwordResetExpiresAt) <= this.now().getTime()) throw new AuthError("Reset token is invalid or has expired.", 400);
      user.passwordSalt = salt.toString("base64");
      user.passwordHash = hash.toString("base64");
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      user.updatedAt = this.now().toISOString();
      delete user.passwordResetHash;
      delete user.passwordResetExpiresAt;
      await this.#write(users);
      return { message: "Password changed successfully." };
    });
  }
}
