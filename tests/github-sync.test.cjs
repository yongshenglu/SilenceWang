const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(__dirname, "..", "github-sync.js");
const { createGitHubLedgerSync } = fs.existsSync(modulePath) ? require(modulePath) : {};
const payload = { schemaVersion: 2, categories: ["演唱会", "交通"], records: [{ title: "见面 🌸", note: "中文\n备注" }] };
const file = (sha, data = payload) => ({ sha, encoding: "base64", content: Buffer.from(JSON.stringify(data)).toString("base64") });

function setup(responses) {
  const calls = [];
  const client = createGitHubLedgerSync({ fetch: async (url, options) => {
    calls.push({ url, ...options });
    assert.ok(responses.length, "unexpected GitHub request");
    const next = responses.shift();
    if (next instanceof Error) throw next;
    const [status, body] = next;
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  } });
  return { client, calls };
}

const repo = [200, { private: true, default_branch: "main" }];
const missing = [404, { message: "Not Found" }];
const validate = (value) => { assert.equal(value.schemaVersion, 2); return true; };

test("exports a usable GitHub ledger client", () => {
  assert.equal(typeof createGitHubLedgerSync, "function");
});

test("creates a missing remote ledger with UTF-8 JSON and no stale SHA", async () => {
  const { client, calls } = setup([repo, missing, repo, missing, [201, { content: { sha: "created" } }]]);
  assert.deepEqual(await client.connect("test-session-credential"), { exists: false });
  await client.write(payload);
  const put = calls.find((call) => call.method === "PUT");
  const body = JSON.parse(put.body);
  assert.deepEqual(JSON.parse(Buffer.from(body.content, "base64").toString("utf8")), payload);
  assert.equal(body.branch, "main");
  assert.equal(body.sha, undefined);
  assert.equal(put.headers.Authorization, "Bearer test-session-credential");
  assert.equal(put.url, "https://api.github.com/repos/yongshenglu/SilenceWang-Data/contents/ledger.json");
});

test("refuses a public data repository before requesting a ledger", async () => {
  const { client, calls } = setup([[200, { private: false, default_branch: "main" }]]);
  await assert.rejects(client.connect("test"), /私有/);
  assert.equal(client.connected, false);
  assert.equal(calls.length, 1);
});

test("requires reading an existing ledger before allowing an overwrite", async () => {
  const { client, calls } = setup([repo, [200, file("old")]]);
  await client.connect("test");
  await assert.rejects(client.write(payload), /先.*读取/);
  assert.equal(calls.length, 2);
});

test("reads Chinese data and updates using the accepted remote SHA", async () => {
  const { client, calls } = setup([repo, [200, file("old")], repo, [200, file("old")], repo, [200, file("old")], [200, { content: { sha: "new" } }]]);
  await client.connect("test");
  let received;
  await client.read((value) => { validate(value); received = value; return true; });
  assert.deepEqual(received, payload);
  await client.write(payload);
  assert.equal(JSON.parse(calls.at(-1).body).sha, "old");
});

test("cancelled or rejected restore never authorizes overwriting the remote ledger", async () => {
  const { client } = setup([repo, [200, file("old")], repo, [200, file("old")], repo, [200, file("old")]]);
  await client.connect("test");
  assert.equal(await client.read(() => false), false);
  await assert.rejects(client.write(payload), /先.*读取/);
  await assert.rejects(client.read(() => { throw new Error("invalid ledger"); }), /invalid ledger/);
  await assert.rejects(client.write(payload), /先.*读取/);
});

for (const latest of [[200, file("other-device")], missing]) {
  test(`rejects changed or deleted remote file (${latest[0]}) without issuing PUT`, async () => {
    const { client, calls } = setup([repo, [200, file("old")], repo, [200, file("old")], repo, latest]);
    await client.connect("test");
    await client.read(validate);
    await assert.rejects(client.write(payload), /变化|更新|冲突/);
    assert.equal(calls.filter((call) => call.method === "PUT").length, 0);
    await assert.rejects(client.write(payload), /先.*读取/);
  });
}

for (const failure of [[409, { message: "Conflict" }], [422, { message: "sha wasn't supplied" }], new Error("network detail with secret")]) {
  test(`failed upload invalidates baseline (${failure instanceof Error ? "network" : failure[0]})`, async () => {
    const { client } = setup([repo, missing, repo, missing, failure]);
    await client.connect("test");
    await assert.rejects(client.write(payload), /冲突|连接/);
    await assert.rejects(client.write(payload), /先.*读取/);
  });
}

test("invalid remote JSON never reaches the restore callback", async () => {
  const { client } = setup([repo, [200, file("old")], repo, [200, { sha: "bad", encoding: "base64", content: Buffer.from("{bad").toString("base64") }]]);
  await client.connect("test");
  let invoked = false;
  await assert.rejects(client.read(() => { invoked = true; return true; }), /JSON|格式/);
  assert.equal(invoked, false);
  await assert.rejects(client.write(payload), /先.*读取/);
});

test("expired credentials disconnect and errors never expose response details", async () => {
  const { client } = setup([[401, { message: "private credential information" }]]);
  await assert.rejects(client.connect("test"), /令牌/);
  assert.equal(client.connected, false);
});

test("disconnect prevents further requests and discards prior file version", async () => {
  const { client, calls } = setup([repo, missing]);
  await client.connect("test");
  client.disconnect();
  assert.equal(client.connected, false);
  await assert.rejects(client.write(payload), /连接/);
  await assert.rejects(client.read(validate), /连接/);
  assert.equal(calls.length, 2);
});
