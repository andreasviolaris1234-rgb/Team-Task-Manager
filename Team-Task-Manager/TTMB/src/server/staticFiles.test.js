import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { createStaticHandler } from "./staticFiles.js";

test("serves the frontend root and blocks path traversal", async () => {
  const handler = createStaticHandler(resolve("public"));
  const server = createServer(async (request, response) => {
    if (await handler(request, response)) return;
    response.writeHead(404).end();
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const root = await fetch(`${base}/`);
    assert.equal(root.status, 200);
    assert.match(root.headers.get("content-type"), /text\/html/);
    assert.match(root.headers.get("content-security-policy"), /script-src 'self'/);
    assert.equal(root.headers.get("x-frame-options"), "DENY");
    assert.match(await root.text(), /<title>Taskflow<\/title>/);
    const client = await fetch(`${base}/apiClient.js`);
    assert.equal(client.status, 200);
    assert.match(await client.text(), /export const tasksApi/);
    assert.equal((await fetch(`${base}/missing-file`)).status, 404);
  } finally { await new Promise((done) => server.close(done)); }
});
