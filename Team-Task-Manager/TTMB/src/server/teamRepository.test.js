import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TeamRepository } from "./teamRepository.js";

test("team storage persists safely and does not overwrite corruption", async () => {
  const directory = await mkdtemp(join(tmpdir(), "teams-"));
  try {
    const path = join(directory, "teams.json");
    const repository = new TeamRepository(path);
    await repository.initialize();
    const team = await repository.create("Engineering", "owner-1");
    assert.equal((await repository.listForUser("owner-1"))[0].id, team.id);
    await writeFile(path, "corrupted", "utf8");
    const invalid = new TeamRepository(path);
    await assert.rejects(() => invalid.initialize(), /could not be loaded safely/);
    assert.equal(await readFile(path, "utf8"), "corrupted");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
