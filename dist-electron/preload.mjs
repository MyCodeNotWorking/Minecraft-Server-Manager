"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  // You can expose other APTs you need here.
  // ...
  startServer: (serverData) => electron.ipcRenderer.invoke("start-server", serverData),
  getForgeVersions: (mcVersion) => electron.ipcRenderer.invoke("forge:getVersions", mcVersion),
  loadServers: () => electron.ipcRenderer.invoke("servers:load"),
  createServer: (serverData) => electron.ipcRenderer.invoke("servers:create", serverData),
  stopServer: (serverName) => electron.ipcRenderer.invoke("stop-server", serverName),
  deleteServer: (serverName) => electron.ipcRenderer.invoke("servers:delete", serverName),
  updateServer: (oldName, updatedData) => electron.ipcRenderer.invoke("servers:update", oldName, updatedData),
  getServerStatus: (serverName) => electron.ipcRenderer.invoke("server:get-status", serverName),
  openWorldFolder: (serverName) => electron.ipcRenderer.invoke("world:open-folder", serverName),
  regenerateWorld: (serverName) => electron.ipcRenderer.invoke("world:regenerate", serverName)
});
