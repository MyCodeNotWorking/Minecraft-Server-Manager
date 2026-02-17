import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
  startServer: (serverData) => ipcRenderer.invoke('start-server', serverData),
  getForgeVersions: (mcVersion) => ipcRenderer.invoke("forge:getVersions", mcVersion),
  loadServers: () => ipcRenderer.invoke('servers:load'),
  createServer: (serverData) => ipcRenderer.invoke('servers:create', serverData),
  stopServer: (serverName) => ipcRenderer.invoke('stop-server', serverName),
  deleteServer: (serverName) => ipcRenderer.invoke('servers:delete', serverName),
  updateServer: (oldName, updatedData) => ipcRenderer.invoke('servers:update', oldName, updatedData),
  getServerStatus: (serverName) => ipcRenderer.invoke('server:get-status', serverName),
  openWorldFolder: (serverName) => ipcRenderer.invoke('world:open-folder', serverName),
  regenerateWorld: (serverName) => ipcRenderer.invoke('world:regenerate', serverName),
})
