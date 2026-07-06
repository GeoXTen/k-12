const btn = document.getElementById("btn");
const log = document.getElementById("log");
const progress = document.getElementById("progress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const count = document.getElementById("count");
const textarea = document.getElementById("ids");
const miniLog = document.getElementById("miniLog");
const miniDot = document.getElementById("miniDot");
const miniText = document.getElementById("miniText");

const setMini = (text, state = "run") => {
  miniLog.style.display = "block";
  miniDot.className = `dot ${state}`;
  miniText.textContent = text;
};

textarea.addEventListener("input", () => {
  const lines = textarea.value.trim().split("\n").filter(s => s.length > 0);
  count.textContent = lines.length;
});

const addLog = (msg, cls = "info") => {
  log.style.display = "block";
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = msg;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
};

const updateProgress = (done, total) => {
  const pct = Math.round((done / total) * 100);
  progressFill.style.width = pct + "%";
  progressText.textContent = pct + "%";
};

btn.onclick = async () => {
  const input = textarea.value.trim();
  if (!input) { alert("Paste workspace IDs first!"); return; }

  const W = input.split("\n").map(s => s.trim()).filter(s => s.length > 0);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const valid = W.filter(id => uuidRegex.test(id));
  const invalid = W.filter(id => !uuidRegex.test(id));

  if (invalid.length) {
    addLog(`Skipped ${invalid.length} invalid ID(s)`, "err");
  }

  btn.classList.add("loading");
  btn.disabled = true;
  progress.style.display = "block";
  log.innerHTML = "";
  log.style.display = "block";
  progressFill.style.width = "0%";
  progressText.textContent = "0%";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes("chatgpt.com")) {
      addLog("Open chatgpt.com first", "err");
      setMini("Not on chatgpt.com", "err");
      btn.classList.remove("loading");
      btn.disabled = false;
      return;
    }

    addLog("Authenticating...", "info");
    setMini("Authenticating...");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const r = await fetch("/api/auth/session", { credentials: "include" });
        const { accessToken: t } = await r.json();
        if (!t) throw new Error("Not logged in");
        return t;
      }
    });
    const token = results[0].result;
    addLog("Token acquired", "ok");
    setMini("Token OK");

    addLog("Checking workspaces...", "info");
    setMini("Checking workspaces...");
    const curr = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (t) => {
        const r = await fetch("/backend-api/accounts", {
          headers: { "authorization": `Bearer ${t}` },
          credentials: "include"
        });
        const data = await r.json();
        if (Array.isArray(data)) return data;
        if (data.accounts) return data.accounts;
        if (data.items) return data.items;
        return [];
      },
      args: [token]
    });
    const accounts = curr[0].result || [];
    const myIds = new Set(Array.isArray(accounts) ? accounts.map(a => a.id || a.account_id || "") : []);
    const todo = valid.filter(id => !myIds.has(id));
    addLog(`${valid.length - todo.length} joined, ${todo.length} pending`, "info");

    if (!todo.length) {
      addLog("All done", "ok");
      setMini("All done", "done");
      updateProgress(1, 1);
      btn.classList.remove("loading");
      btn.disabled = false;
      return;
    }

    for (let i = 0; i < todo.length; i++) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (wsId, t) => {
            const r = await fetch(`/backend-api/accounts/${wsId}/invites/request`, {
              method: "POST",
              headers: {
                "accept": "*/*",
                "authorization": `Bearer ${t}`,
                "cache-control": "no-cache",
                "pragma": "no-cache"
              },
              credentials: "include"
            });
            return await r.json();
          },
          args: [todo[i], token]
        });
        addLog(`[${i + 1}/${todo.length}] ${todo[i].slice(0, 8)}...`, "ok");
        setMini(`[${i + 1}/${todo.length}] Inviting...`);
      } catch (e) {
        addLog(`[${i + 1}/${todo.length}] Failed`, "err");
        setMini(`[${i + 1}/${todo.length}] Failed`, "err");
      }
      updateProgress(i + 1, todo.length);
      if (i < todo.length - 1) await new Promise(r => setTimeout(r, 1000));
    }
    addLog("Complete", "ok");
    setMini("Complete", "done");
  } catch (e) {
    addLog(e.message, "err");
    setMini(e.message, "err");
  }
  btn.classList.remove("loading");
  btn.disabled = false;
};
