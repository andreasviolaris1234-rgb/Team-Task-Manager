import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const copy = (value) => structuredClone(value);
export class TeamError extends Error {
  constructor(message, status = 400) { super(message); this.name = "TeamError"; this.status = status; }
}

export class TeamRepository {
  constructor(filePath, { now = () => new Date() } = {}) { this.filePath = filePath; this.now = now; this.queue = Promise.resolve(); }

  async initialize() {
    try { await this.#read(); }
    catch (error) { if (error?.code !== "ENOENT") throw new Error("Team database could not be loaded safely.", { cause: error }); await this.#write([]); }
  }

  async #read() {
    const teams = JSON.parse(await readFile(this.filePath, "utf8"));
    const valid = Array.isArray(teams) && teams.every((team) => team && typeof team.id === "string" && typeof team.name === "string"
      && typeof team.ownerId === "string" && Array.isArray(team.members)
      && team.members.every((member) => typeof member.userId === "string" && ["owner", "member"].includes(member.role)));
    if (!valid || new Set(teams.map(({ id }) => id)).size !== teams.length) throw new Error("Invalid team database.");
    return teams;
  }

  async #write(teams) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(teams, null, 2)}\n`, "utf8");
    await rename(temporary, this.filePath);
  }

  #mutate(operation) {
    const next = this.queue.then(async () => operation(await this.#read()));
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  async listForUser(userId) { return copy((await this.#read()).filter((team) => team.members.some((member) => member.userId === userId))); }

  async findForUser(teamId, userId) {
    const team = (await this.#read()).find(({ id }) => id === teamId);
    if (!team) throw new TeamError("Team not found.", 404);
    if (!team.members.some((member) => member.userId === userId)) throw new TeamError("You do not have access to this team.", 403);
    return copy(team);
  }

  create(name, ownerId) {
    const normalized = typeof name === "string" ? name.trim() : "";
    if (normalized.length < 2 || normalized.length > 80) throw new TeamError("Team name must contain 2 to 80 characters.", 422);
    return this.#mutate(async (teams) => {
      const timestamp = this.now().toISOString();
      const team = { id: randomUUID(), name: normalized, ownerId, members: [{ userId: ownerId, role: "owner" }], createdAt: timestamp, updatedAt: timestamp };
      await this.#write([...teams, team]);
      return copy(team);
    });
  }

  update(teamId, ownerId, name) {
    const normalized = typeof name === "string" ? name.trim() : "";
    if (normalized.length < 2 || normalized.length > 80) throw new TeamError("Team name must contain 2 to 80 characters.", 422);
    return this.#mutate(async (teams) => {
      const index = teams.findIndex(({ id }) => id === teamId);
      if (index < 0) throw new TeamError("Team not found.", 404);
      if (teams[index].ownerId !== ownerId) throw new TeamError("Only the team owner can update this team.", 403);
      teams[index] = { ...teams[index], name: normalized, updatedAt: this.now().toISOString() };
      await this.#write(teams);
      return copy(teams[index]);
    });
  }

  addMember(teamId, ownerId, userId) {
    return this.#mutate(async (teams) => {
      const team = teams.find(({ id }) => id === teamId);
      if (!team) throw new TeamError("Team not found.", 404);
      if (team.ownerId !== ownerId) throw new TeamError("Only the team owner can add members.", 403);
      if (team.members.some((member) => member.userId === userId)) throw new TeamError("User is already a team member.", 409);
      team.members.push({ userId, role: "member" });
      team.updatedAt = this.now().toISOString();
      await this.#write(teams);
      return copy(team);
    });
  }

  removeMember(teamId, ownerId, userId) {
    return this.#mutate(async (teams) => {
      const team = teams.find(({ id }) => id === teamId);
      if (!team) throw new TeamError("Team not found.", 404);
      if (team.ownerId !== ownerId) throw new TeamError("Only the team owner can remove members.", 403);
      if (userId === ownerId) throw new TeamError("The owner cannot be removed from the team.", 400);
      const index = team.members.findIndex((member) => member.userId === userId);
      if (index < 0) throw new TeamError("Team member not found.", 404);
      team.members.splice(index, 1);
      team.updatedAt = this.now().toISOString();
      await this.#write(teams);
      return copy(team);
    });
  }

  delete(teamId, ownerId) {
    return this.#mutate(async (teams) => {
      const index = teams.findIndex(({ id }) => id === teamId);
      if (index < 0) throw new TeamError("Team not found.", 404);
      if (teams[index].ownerId !== ownerId) throw new TeamError("Only the team owner can delete this team.", 403);
      const [deleted] = teams.splice(index, 1);
      await this.#write(teams);
      return copy(deleted);
    });
  }
}
