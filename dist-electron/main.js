import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import https from "node:https";
import { spawn } from "node:child_process";
import { app, BrowserWindow, ipcMain, shell } from "electron";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
async function getServerUrl164(version) {
  return new Promise((resolve, reject) => {
    https.get("https://launchermeta.mojang.com/mc/game/version_manifest.json", (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        const manifest = JSON.parse(data);
        const versionEntry = manifest.versions.find((v) => v.id === version);
        if (!versionEntry) {
          reject(new Error("Could not find version", version, "in Mojang manifest"));
          return;
        }
        const versionUrl = versionEntry.url;
        https.get(versionUrl, (res2) => {
          let data2 = "";
          res2.on("data", (chunk) => data2 += chunk);
          res2.on("end", () => {
            const versionData = JSON.parse(data2);
            resolve(versionData.downloads.server.url);
          });
        });
      });
    }).on("error", reject);
  });
}
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", reject);
  });
}
async function fetchForgeVersions(mcVersion) {
  try {
    const res = await fetch("https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml");
    if (!res.ok) throw new Error("Failed to fetch Forge metadata");
    const xmlText = await res.text();
    const versionMatch = xmlText.match(/<version>([^<]+)<\/version>/g);
    if (!versionMatch) return [];
    const allVersions = versionMatch.map((v) => v.replace(/<\/?version>/g, "")).filter((v) => v.startsWith(`${mcVersion}-`)).map((v) => v.split("-")[1]).reverse();
    return allVersions;
  } catch (err) {
    console.error("Forge fetch error:", err);
    return [];
  }
}
ipcMain.handle("forge:getVersions", async (_, mcVersion) => {
  try {
    return await fetchForgeVersions(mcVersion);
  } catch (err) {
    console.error(err);
    return [];
  }
});
const USER_DATA_PATH = app.getPath("userData");
const SERVERS_JSON_PATH = path.join(USER_DATA_PATH, "servers.json");
const SERVERS_DIR = path.join(USER_DATA_PATH, "server_files");
if (!fs.existsSync(SERVERS_DIR)) {
  fs.mkdirSync(SERVERS_DIR, { recursive: true });
}
function getSavedServers() {
  if (!fs.existsSync(SERVERS_JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(SERVERS_JSON_PATH, "utf-8"));
}
ipcMain.handle("servers:load", () => {
  return getSavedServers();
});
ipcMain.handle("servers:create", async (_, serverData) => {
  const servers = getSavedServers();
  const newServerDir = path.join(SERVERS_DIR, serverData.name);
  if (!fs.existsSync(newServerDir)) {
    fs.mkdirSync(newServerDir, { recursive: true });
  }
  try {
    const downloadUrl = await getServerUrl164(serverData.version);
    const jarPath = path.join(newServerDir, "server.jar");
    await downloadFile(downloadUrl, jarPath);
    servers.push(serverData);
    fs.writeFileSync(SERVERS_JSON_PATH, JSON.stringify(servers, null, 2));
    return serverData;
  } catch (error) {
    console.error("Failed to create server:", error);
    throw error;
  }
});
const activeServers = /* @__PURE__ */ new Map();
const serverLogs = /* @__PURE__ */ new Map();
const activeBoreProcesses = /* @__PURE__ */ new Map();
const boreLogs = /* @__PURE__ */ new Map();
const activeBoreIps = /* @__PURE__ */ new Map();
ipcMain.handle("start-server", async (event, serverData) => {
  const serverDir = path.join(SERVERS_DIR, serverData.name);
  const eulaPath = path.join(serverDir, "eula.txt");
  const jarPath = path.join(serverDir, "server.jar");
  const borePath = getBorePath();
  console.log("Starting Bore from:", borePath);
  if (!fs.existsSync(borePath)) {
    const errorMsg = `[ERROR] Bore binary not found at: ${borePath}
`;
    win == null ? void 0 : win.webContents.send("bore-log", { name: serverData.name, text: errorMsg });
    return false;
  }
  fs.writeFileSync(eulaPath, "eula=true\n");
  if (!fs.existsSync(jarPath)) {
    win == null ? void 0 : win.webContents.send("server-log", {
      name: serverData.name,
      text: `[ERROR] server.jar not found in ${serverDir}
`
    });
    return false;
  }
  if (!serverLogs.has(serverData.name)) {
    serverLogs.set(serverData.name, "");
  }
  if (!boreLogs.has(serverData.name)) {
    boreLogs.set(serverData.name, "");
  }
  const port = serverData.port || 25565;
  const minRam = serverData.minRam || 1024;
  const maxRam = serverData.maxRam || 2048;
  const serverPropertiesPath = path.join(serverDir, "server.properties");
  let properties = "";
  if (fs.existsSync(serverPropertiesPath)) {
    properties = fs.readFileSync(serverPropertiesPath, "utf-8");
  }
  if (properties.includes("server-port=")) {
    properties = properties.replace(/server-port=\d+/g, `server-port=${port}`);
  } else {
    properties += `
server-port=${port}
`;
  }
  fs.writeFileSync(serverPropertiesPath, properties);
  const serverProcess = spawn("java", [
    `-Xms${minRam}M`,
    `-Xmx${maxRam}M`,
    "-jar",
    "server.jar",
    "nogui"
  ], { cwd: serverDir });
  activeServers.set(serverData.name, serverProcess);
  const handleLog = (data) => {
    const text = data.toString();
    const currentLogs = serverLogs.get(serverData.name) || "";
    serverLogs.set(serverData.name, currentLogs + text);
    win == null ? void 0 : win.webContents.send("server-log", {
      name: serverData.name,
      text
    });
  };
  serverProcess.stdout.on("data", handleLog);
  serverProcess.stderr.on("data", handleLog);
  serverProcess.on("close", (code) => {
    activeServers.delete(serverData.name);
    const exitMsg = `[SYSTEM] Server stopped with code ${code}
`;
    handleLog(exitMsg);
    win == null ? void 0 : win.webContents.send("server-stopped", serverData.name);
  });
  const boreProcess = spawn(borePath, ["local", port.toString(), "--to", "bore.pub"]);
  activeBoreProcesses.set(serverData.name, boreProcess);
  const handleBoreLog = (data) => {
    const text = data.toString();
    const match = text.match(/bore\.pub:\d+/);
    if (match) {
      activeBoreIps.set(serverData.name, match[0]);
      win == null ? void 0 : win.webContents.send("bore-ip", { name: serverData.name, ip: match[0] });
    }
    const currentBoreLogs = boreLogs.get(serverData.name) || "";
    boreLogs.set(serverData.name, currentBoreLogs + text);
    win == null ? void 0 : win.webContents.send("bore-log", {
      name: serverData.name,
      text
    });
  };
  boreProcess.stdout.on("data", handleBoreLog);
  boreProcess.stderr.on("data", handleBoreLog);
  boreProcess.on("close", (code) => {
    activeBoreProcesses.delete(serverData.name);
    activeBoreIps.delete(serverData.name);
    const exitMsg = `[SYSTEM] Bore tunnel stopped with code ${code}
`;
    handleBoreLog(exitMsg);
  });
  return true;
});
ipcMain.handle("stop-server", async (event, serverName) => {
  var _a;
  const serverProcess = activeServers.get(serverName);
  const boreProcess = activeBoreProcesses.get(serverName);
  if (boreProcess) {
    boreProcess.kill();
    activeBoreProcesses.delete(serverName);
    activeBoreIps.delete(serverName);
  }
  if (serverProcess) {
    (_a = serverProcess.stdin) == null ? void 0 : _a.write("stop\n");
    return true;
  }
  return false;
});
ipcMain.handle("server:get-status", (_, serverName) => {
  const servers = getSavedServers();
  const serverInfo = servers.find((s) => s.name === serverName) || {};
  return {
    isRunning: activeServers.has(serverName),
    logs: serverLogs.get(serverName) || "",
    boreLogs: boreLogs.get(serverName) || "",
    // Pass back saved settings, defaulting if they don't exist yet
    minRam: serverInfo.minRam || 1024,
    maxRam: serverInfo.maxRam || 2048,
    port: serverInfo.port || 25565,
    boreIp: activeBoreIps.get(serverName) || ""
  };
});
ipcMain.handle("servers:delete", async (_, serverName) => {
  try {
    const servers = getSavedServers();
    const updatedServers = servers.filter((s) => s.name !== serverName);
    const serverDir = path.join(SERVERS_DIR, serverName);
    if (fs.existsSync(serverDir)) {
      fs.rmSync(serverDir, { recursive: true, force: true });
    }
    fs.writeFileSync(SERVERS_JSON_PATH, JSON.stringify(updatedServers, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete server:", error);
    throw error;
  }
});
ipcMain.handle("servers:update", async (_, oldName, updatedData) => {
  try {
    const servers = getSavedServers();
    const index = servers.findIndex((s) => s.name === oldName);
    if (index !== -1) {
      if (updatedData.name && oldName !== updatedData.name) {
        const oldPath = path.join(SERVERS_DIR, oldName);
        const newPath = path.join(SERVERS_DIR, updatedData.name);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
      }
      servers[index] = { ...servers[index], ...updatedData };
      fs.writeFileSync(SERVERS_JSON_PATH, JSON.stringify(servers, null, 2));
      return { success: true };
    }
    return { success: false, error: "Server not found" };
  } catch (error) {
    console.error("Failed to update server:", error);
    throw error;
  }
});
ipcMain.handle("world:open-folder", async (_, serverName) => {
  const worldPath = path.join(SERVERS_DIR, serverName, "world");
  if (!fs.existsSync(worldPath)) {
    shell.openPath(path.join(SERVERS_DIR, serverName));
  } else {
    shell.openPath(worldPath);
  }
});
ipcMain.handle("world:regenerate", async (_, serverName) => {
  const worldPath = path.join(SERVERS_DIR, serverName, "world");
  try {
    if (fs.existsSync(worldPath)) {
      fs.rmSync(worldPath, { recursive: true, force: true });
      return { success: true };
    }
    return { success: true, message: "No world folder found to delete." };
  } catch (error) {
    console.error("Failed to delete world folder:", error);
    throw error;
  }
});
function getBorePath() {
  const platform = process.platform;
  let binName = "bore";
  if (platform === "win32") {
    binName = "bore.exe";
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", binName);
  } else {
    return path.join(process.env.APP_ROOT, "resources", "bin", binName);
  }
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
