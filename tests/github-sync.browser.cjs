const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const key = "star-expense-ledger-v1";
const fixture = (title) => ({
  schemaVersion: 2, exportedAt: "2026-10-16T00:00:00.000Z", categories: ["演唱会", "交通"],
  records: [{
    id: "fixture-1", startDate: "2026-10-01", endDate: "2026-10-01", type: "expense",
    amountCents: 12345, category: "演唱会", title, city: "上海", venue: "测试场馆",
    item: title, items: [{ category: "演唱会", name: "内场 🌸", amountCents: 12345 }],
    note: "", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"
  }]
});

test("GitHub sync browser workflows", { timeout: 120000 }, async (t) => {
  const server = http.createServer(async (request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "") || "index.html";
      if (!/^(index\.html|app\.js|github-sync\.js|styles\.css|assets\/[^.].*)$/.test(relative) || relative.includes("..")) {
        response.writeHead(404).end(); return;
      }
      const file = path.join(root, relative);
      const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
      response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      response.end(await fs.readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(19177, "127.0.0.1", resolve); });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  t.after(async () => { await browser.close(); await new Promise((resolve) => server.close(resolve)); });

  async function open({ remote = null, seed = fixture("本地活动"), width = 1280 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    t.after(() => context.close());
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const state = { remote, sha: "version-1", uploads: 0, fail: false, pause: null };
    await page.addInitScript(({ key, seed }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed)); }, { key, seed });
    await page.route("https://api.github.com/repos/yongshenglu/SilenceWang-Data**", async (route) => {
      const request = route.request();
      assert.equal(request.headers().authorization, "Bearer synthetic-test-token");
      if (state.fail) { await route.abort(); return; }
      const send = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers: { "Access-Control-Allow-Origin": "*" } });
      if (!request.url().includes("/contents/")) return send(200, { private: true, default_branch: "main" });
      if (request.method() === "GET") {
        const snapshot = state.remote;
        if (state.pause) await state.pause;
        return snapshot === null ? send(404, { message: "Not Found" }) : send(200, {
          sha: state.sha, encoding: "base64", content: Buffer.from(JSON.stringify(snapshot)).toString("base64")
        });
      }
      const body = request.postDataJSON();
      state.remote = JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
      state.sha = `saved-${++state.uploads}`;
      if (state.pause) await state.pause;
      return send(200, { content: { sha: state.sha } });
    });
    await page.goto("http://127.0.0.1:19177/");
    await page.locator('[data-tab="data"]').click();
    return { page, state, errors, context };
  }

  async function connect(page) {
    await page.locator("#githubToken").fill("synthetic-test-token");
    await page.locator("#githubConnectButton").click();
    await page.waitForFunction(() => !document.getElementById("githubSaveButton").disabled || document.getElementById("githubSyncStatus").dataset.error === "true");
  }
  const local = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
  const status = (page) => page.locator("#githubSyncStatus").innerText();
  async function rename(page, name) {
    await page.locator('[data-tab="ledger"]').click();
    await page.locator('[data-action="edit"]').first().click();
    await page.locator("#recordItem").fill(name);
    await page.locator('#recordForm button[type="submit"]').click();
    await page.locator('[data-tab="data"]').click();
  }

  await t.test("saves complete ledger, tracks edits, clears token and disconnects on reload", async () => {
    const { page, state, errors } = await open();
    await connect(page);
    assert.equal(await page.locator("#githubToken").inputValue(), "");
    await page.locator("#githubSaveButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("已保存到 GitHub"));
    assert.equal(state.remote.records[0].title, "本地活动");
    assert.deepEqual(state.remote.categories, ["演唱会", "交通"]);
    await rename(page, "修改后的活动");
    assert.match(await status(page), /未.*保存|待.*保存/);
    assert.equal((await local(page)).records[0].title, "修改后的活动");
    assert.ok(!JSON.stringify(await page.evaluate(() => ({ ...localStorage, ...sessionStorage }))).includes("synthetic-test-token"));
    await page.reload();
    assert.equal(await page.locator("#githubToken").inputValue(), "");
    assert.equal(await page.locator("#githubSaveButton").isDisabled(), true);
    assert.equal((await local(page)).records[0].title, "修改后的活动");
    assert.deepEqual(errors, []);
  });

  await t.test("requires read and confirmation, then refreshes records and statistics", async () => {
    const { page } = await open({ remote: fixture("云端活动") });
    await connect(page);
    await page.locator("#githubSaveButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("先"));
    assert.match(await status(page), /先.*读取/);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.locator("#githubReadButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("取消"));
    assert.equal((await local(page)).records[0].title, "本地活动");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#githubReadButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("已从 GitHub"));
    assert.equal((await local(page)).records[0].title, "云端活动");
    await page.locator('[data-tab="ledger"]').click();
    assert.match(await page.locator("#recordList").innerText(), /云端活动/);
    assert.match(await page.locator("#meetingCount").innerText(), /1/);
  });

  await t.test("invalid ledger and network failure preserve the local copy", async () => {
    const bad = fixture("invalid");
    bad.records.push({ id: "broken" });
    const { page, state } = await open({ remote: bad });
    await connect(page);
    await page.locator("#githubReadButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("无效"));
    assert.equal((await local(page)).records.length, 1);
    assert.equal((await local(page)).records[0].title, "本地活动");
    state.fail = true;
    await page.locator("#githubReadButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("连接"));
    assert.equal((await local(page)).records[0].title, "本地活动");
  });

  await t.test("stale remote version does not overwrite either copy", async () => {
    const { page, state } = await open();
    await connect(page);
    await page.locator("#githubSaveButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("已保存到 GitHub"));
    state.remote = fixture("另一设备活动"); state.sha = "other-device-version";
    await page.locator("#githubSaveButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("变化"));
    assert.equal(state.remote.records[0].title, "另一设备活动");
    assert.equal(state.uploads, 1);
    assert.equal((await local(page)).records[0].title, "本地活动");
  });

  await t.test("localStorage failure blocks restore without changing displayed records", async () => {
    const { page } = await open({ remote: fixture("云端活动") });
    await connect(page);
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("quota", "QuotaExceededError"); }; });
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#githubReadButton").click();
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("浏览器保存失败"));
    assert.equal((await local(page)).records[0].title, "本地活动");
    await page.locator('[data-tab="ledger"]').click();
    assert.match(await page.locator("#recordList").innerText(), /本地活动/);
  });

  await t.test("local edit while remote read is in flight is preserved", async () => {
    const { page, state } = await open({ remote: fixture("云端活动") });
    await connect(page);
    let release;
    state.pause = new Promise((resolve) => { release = resolve; });
    const request = page.waitForRequest((request) => request.url().includes("/contents/ledger.json"));
    await page.locator("#githubReadButton").click();
    await request;
    await rename(page, "读取期间的本地编辑");
    release(); state.pause = null;
    await page.waitForFunction(() => document.getElementById("githubSyncStatus").textContent.includes("本地数据已变化"));
    assert.equal((await local(page)).records[0].title, "读取期间的本地编辑");
  });

  await t.test("desktop and mobile sync controls fit their section", async () => {
    for (const width of [1280, 390]) {
      const { page, errors } = await open({ width });
      const overflow = await page.locator("#githubSyncSection").evaluate((section) => {
        const outer = section.getBoundingClientRect();
        return [...section.querySelectorAll("input, button, p, label")].some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width && (rect.left < outer.left - 1 || rect.right > outer.right + 1);
        });
      });
      assert.equal(overflow, false, `sync controls overflow at ${width}px`);
      assert.deepEqual(errors, []);
    }
  });
});
