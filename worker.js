// Runs in a dedicated Web Worker so a runaway program can never freeze the page.
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
let py = null;

self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === "init") {
    try {
      importScripts(PYODIDE_URL + "pyodide.js");
      py = await loadPyodide({ indexURL: PYODIDE_URL });
      py.runPython(m.runtime);
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "fatal", error: String(err && err.message ? err.message : err) });
    }
    return;
  }
  if (m.type === "call") {
    let fn;
    try {
      fn = py.globals.get(m.fn);
      const result = fn(m.arg);
      self.postMessage({ type: "result", id: m.id, ok: true, result });
    } catch (err) {
      self.postMessage({ type: "result", id: m.id, ok: false, error: String(err && err.message ? err.message : err) });
    } finally {
      if (fn && fn.destroy) fn.destroy();
    }
  }
};
