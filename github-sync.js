(function (root) {
  "use strict";

  function createGitHubLedgerSync({ fetch: fetchData = globalThis.fetch } = {}) {
    const repositoryUrl = "https://api.github.com/repos/yongshenglu/SilenceWang-Data";
    const fileUrl = `${repositoryUrl}/contents/ledger.json`;
    let token = "", branch = "", knownSha;

    function disconnect() { token = ""; branch = ""; knownSha = undefined; }
    function requireConnection() { if (!token || !branch) throw new Error("请先连接 GitHub。"); }

    async function request(url, { method = "GET", body, allowMissing = false } = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetchData(url, {
          method, signal: controller.signal, cache: "no-store", credentials: "omit",
          redirect: "error", referrerPolicy: "no-referrer",
          headers: {
            Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {})
          },
          ...(body ? { body: JSON.stringify(body) } : {})
        });
        if (response.status === 404 && allowMissing) return null;
        if (response.status === 401) { disconnect(); throw new Error("GitHub 令牌无效或已过期，请重新连接。"); }
        if (response.status === 403 || response.status === 429) throw new Error("GitHub 拒绝访问，请检查仓库权限或稍后重试。");
        if (response.status === 409 || response.status === 422) throw new Error("云端发生冲突，请先备份本地数据，再从 GitHub 读取。");
        if (!response.ok) throw new Error(`GitHub 请求失败（${response.status}），请检查仓库和权限后重试。`);
        try { return await response.json(); } catch (error) { throw new Error("GitHub 返回的数据格式无效。"); }
      } catch (error) {
        if (error instanceof TypeError || error.name === "AbortError" || !error.message.startsWith("GitHub") && !error.message.startsWith("云端")) {
          throw new Error("无法连接 GitHub，请检查网络后重试。");
        }
        throw error;
      } finally { clearTimeout(timeout); }
    }

    async function checkRepository() {
      const repository = await request(repositoryUrl);
      if (repository.private !== true) { disconnect(); throw new Error("GitHub 数据仓库必须保持私有，已停止同步。"); }
      if (typeof repository.default_branch !== "string" || !repository.default_branch) throw new Error("GitHub 数据仓库没有可用分支。");
      return repository.default_branch;
    }

    async function getFile() {
      const file = await request(`${fileUrl}?ref=${encodeURIComponent(branch)}`, { allowMissing: true });
      if (file && (typeof file.sha !== "string" || !file.sha || file.encoding !== "base64" || typeof file.content !== "string")) {
        throw new Error("GitHub 账本文件格式无效或过大，请保留本地备份。");
      }
      return file;
    }

    async function connect(value) {
      disconnect();
      token = String(value || "").trim();
      if (!token) throw new Error("请填写 GitHub 令牌。");
      try {
        branch = await checkRepository();
        const file = await getFile();
        knownSha = file ? undefined : null;
        return { exists: Boolean(file) };
      } catch (error) { disconnect(); throw error; }
    }

    async function read(accept) {
      requireConnection();
      knownSha = undefined;
      await checkRepository();
      const file = await getFile();
      if (!file) { knownSha = null; throw new Error("云端尚无账本，可以先保存本地数据到 GitHub。"); }
      let payload;
      try {
        const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), (character) => character.charCodeAt(0));
        payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      } catch (error) { throw new Error("云端账本不是有效的 JSON，已保留本地数据。"); }
      if (await accept(payload) !== true) return false;
      knownSha = file.sha;
      return true;
    }

    async function write(payload) {
      requireConnection();
      if (knownSha === undefined) throw new Error("请先从 GitHub 读取账本，再保存；覆盖前可备份本地 JSON。");
      try {
        await checkRepository();
        const file = await getFile();
        if ((file ? file.sha : null) !== knownSha) throw new Error("云端账本已有变化，请先备份本地数据，再从 GitHub 读取。");
        const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        const result = await request(fileUrl, {
          method: "PUT",
          body: {
            message: "Save ledger data", branch, content: btoa(binary),
            ...(knownSha === null ? {} : { sha: knownSha })
          }
        });
        if (!result.content || typeof result.content.sha !== "string") throw new Error("GitHub 未确认保存结果，请重新读取云端账本。");
        knownSha = result.content.sha;
      } catch (error) { knownSha = undefined; throw error; }
    }

    return { connect, read, write, disconnect, get connected() { return Boolean(token && branch); } };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createGitHubLedgerSync };
  else root.createGitHubLedgerSync = createGitHubLedgerSync;
})(globalThis);
