import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import https from 'node:https'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// Minecraft Server

async function getServerUrl164(version): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get('https://launchermeta.mojang.com/mc/game/version_manifest.json', (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const manifest = JSON.parse(data)
        
        const versionEntry = manifest.versions.find((v: any) => v.id === version)
        
        if (!versionEntry) {
          reject(new Error("Could not find version", version, "in Mojang manifest"))
          return
        }

        const versionUrl = versionEntry.url
        
        https.get(versionUrl, (res2) => {
          let data2 = ''
          res2.on('data', chunk => data2 += chunk)
          res2.on('end', () => {
            const versionData = JSON.parse(data2)
            resolve(versionData.downloads.server.url)
          })
        })
      })
    }).on('error', reject)
  })
}

async function downloadFile(url: string, dest: string) {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', reject)
  })
}

import { app, BrowserWindow, ipcMain } from "electron"

/* -----------------------------
   Fetch Forge Versions
----------------------------- */

import { XMLParser } from "fast-xml-parser" // Optional: npm install fast-xml-parser
import { shell } from 'electron';

async function fetchForgeVersions(mcVersion: string): Promise<string[]> {
  try {
    // We use the Maven Metadata which contains EVERY version ever released
    const res = await fetch("https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml")
    if (!res.ok) throw new Error("Failed to fetch Forge metadata")
    
    const xmlText = await res.text()
    
    // Simple regex to grab all <version> tags if you don't want to add a dependency
    const versionMatch = xmlText.match(/<version>([^<]+)<\/version>/g)
    if (!versionMatch) return []

    const allVersions = versionMatch
      .map(v => v.replace(/<\/?version>/g, ''))
      // Forge versions are stored as "MCVERSION-FORGEVERSION" (e.g., "1.21.4-61.1.0")
      .filter(v => v.startsWith(`${mcVersion}-`))
      // Extract just the Forge part (the part after the hyphen)
      .map(v => v.split('-')[1])
      .reverse()

    return allVersions
  } catch (err) {
    console.error("Forge fetch error:", err)
    return []
  }
}

ipcMain.handle("forge:getVersions", async (_, mcVersion: string): Promise<string[]> => {

  try {

    return await fetchForgeVersions(mcVersion)

  } catch (err) {

    console.error(err)

    return []

  }

})

// Code to save server files
const USER_DATA_PATH = app.getPath('userData');
const SERVERS_JSON_PATH = path.join(USER_DATA_PATH, 'servers.json');
const SERVERS_DIR = path.join(USER_DATA_PATH, 'server_files');

// Ensure the base servers directory exists
if (!fs.existsSync(SERVERS_DIR)) {
  fs.mkdirSync(SERVERS_DIR, { recursive: true });
}

// Helper to get servers from JSON
function getSavedServers() {
  if (!fs.existsSync(SERVERS_JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(SERVERS_JSON_PATH, 'utf-8'));
}

// IPC Handler to load servers into the UI
ipcMain.handle('servers:load', () => {
  return getSavedServers();
});

// IPC Handler to create a new server
ipcMain.handle('servers:create', async (_, serverData) => {
  const servers = getSavedServers();
  
  // Create a dedicated folder for this new server
  const newServerDir = path.join(SERVERS_DIR, serverData.name);
  if (!fs.existsSync(newServerDir)) {
    fs.mkdirSync(newServerDir, { recursive: true });
  }

  try {
    // 1. Get the official Minecraft server download URL
    const downloadUrl = await getServerUrl164(serverData.version);
    
    // 2. Download the server.jar into the new directory
    const jarPath = path.join(newServerDir, 'server.jar');
    await downloadFile(downloadUrl, jarPath);
    
    // 3. Save the server info to our JSON database
    servers.push(serverData);
    fs.writeFileSync(SERVERS_JSON_PATH, JSON.stringify(servers, null, 2));

    return serverData;
  } catch (error) {
    console.error("Failed to create server:", error);
    throw error; // Let the frontend handle the error
  }
});

// Keep track of running servers so we can stop them later
const activeServers = new Map<string, ReturnType<typeof spawn>>();
const serverLogs = new Map<string, string>();

ipcMain.handle('start-server', async (event, serverData) => {
  const serverDir = path.join(SERVERS_DIR, serverData.name);
  const eulaPath = path.join(serverDir, 'eula.txt');
  const jarPath = path.join(serverDir, 'server.jar'); // Assuming you download it here

  // 1. Auto-accept the EULA
  fs.writeFileSync(eulaPath, 'eula=true\n');

  // 2. Check if the jar actually exists before starting
  if (!fs.existsSync(jarPath)) {
    win?.webContents.send('server-log', { 
      name: serverData.name, 
      text: `[ERROR] server.jar not found in ${serverDir}\n` 
    });
    return false;
  }

  // 3. Initialize Log Buffer for this server
  if (!serverLogs.has(serverData.name)) {
    serverLogs.set(serverData.name, "");
  }

  // 4. Spawn the Java process
  // Adjust memory arguments based on the UI inputs
  const minRam = serverData.minRam || 1024;
  const maxRam = serverData.maxRam || 2048;
  
  const serverProcess = spawn('java', [
    `-Xms${minRam}M`,
    `-Xmx${maxRam}M`,
    '-jar',
    'server.jar',
    'nogui'
  ], { cwd: serverDir });

  activeServers.set(serverData.name, serverProcess);

  // Helper to handle log data
  const handleLog = (data: Buffer | string) => {
    const text = data.toString();
    // Append to backend memory
    const currentLogs = serverLogs.get(serverData.name) || "";
    serverLogs.set(serverData.name, currentLogs + text);
    
    // Send to frontend
    win?.webContents.send('server-log', { 
      name: serverData.name, 
      text: text 
    });
  };

  // 5. Stream Stdout & Stderr
  serverProcess.stdout.on('data', handleLog);
  serverProcess.stderr.on('data', handleLog);

  // 6. Handle process exit
  serverProcess.on('close', (code) => {
    activeServers.delete(serverData.name);
    // Optional: Clear logs on stop, or keep them until app restart. 
    // We will keep them so you can see why it crashed.
    const exitMsg = `[SYSTEM] Server stopped with code ${code}\n`;
    handleLog(exitMsg);
    
    win?.webContents.send('server-stopped', serverData.name);
  });

  return true;
});

// Add this IPC Handler to stop the server
ipcMain.handle('stop-server', async (event, serverName) => {
  const serverProcess = activeServers.get(serverName);

  if (serverProcess) {
    // 1. Send the "stop" command to the Minecraft server console
    // This allows the server to save the world before shutting down.
    serverProcess.stdin?.write("stop\n");
    
    // We do NOT delete the server from activeServers here.
    // The 'close' event listener we defined in 'start-server' will handle
    // the cleanup and notify the frontend when the process actually dies.
    return true;
  }
  
  return false; // Server was not found in active list
});

ipcMain.handle('server:get-status', (_, serverName: string) => {
  return {
    isRunning: activeServers.has(serverName),
    logs: serverLogs.get(serverName) || ""
  };
});

ipcMain.handle('servers:delete', async (_, serverName: string) => {
  try {
    // 1. Load current servers
    const servers = getSavedServers();
    
    // 2. Filter out the server to delete
    const updatedServers = servers.filter((s: any) => s.name !== serverName);
    
    // 3. Delete the server's directory
    const serverDir = path.join(SERVERS_DIR, serverName);
    if (fs.existsSync(serverDir)) {
      fs.rmSync(serverDir, { recursive: true, force: true });
    }
    
    // 4. Save the updated list back to servers.json
    fs.writeFileSync(SERVERS_JSON_PATH, JSON.stringify(updatedServers, null, 2)); 
    
    return { success: true };
  } catch (error) {
    console.error("Failed to delete server:", error);
    throw error;
  }
});

ipcMain.handle('servers:update', async (_, oldName: string, updatedData: any) => {
  try {
    const servers = getSavedServers();
    const index = servers.findIndex((s: any) => s.name === oldName);

    if (index !== -1) {
      // 1. Rename the server's directory if the name changed
      if (oldName !== updatedData.name) {
        const oldPath = path.join(SERVERS_DIR, oldName);
        const newPath = path.join(SERVERS_DIR, updatedData.name);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
      }

      // 2. Update the data in the array
      servers[index] = { ...servers[index], ...updatedData };

      // 3. Save back to servers.json
      fs.writeFileSync(SERVERS_JSON_PATH, JSON.stringify(servers, null, 2));
      return { success: true };
    }
    return { success: false, error: 'Server not found' };
  } catch (error) {
    console.error("Failed to update server:", error);
    throw error;
  }
});

// Handler to open the world folder in the OS file explorer
ipcMain.handle('world:open-folder', async (_, serverName: string) => {
  const worldPath = path.join(SERVERS_DIR, serverName, 'world');
  
  // Ensure the folder exists before trying to open it
  if (!fs.existsSync(worldPath)) {
    // If 'world' doesn't exist yet (server never started), open the base server dir
    shell.openPath(path.join(SERVERS_DIR, serverName));
  } else {
    shell.openPath(worldPath);
  }
});

// Handler to "Regenerate" by deleting the 'world' folder
ipcMain.handle('world:regenerate', async (_, serverName: string) => {
  const worldPath = path.join(SERVERS_DIR, serverName, 'world');
  
  try {
    if (fs.existsSync(worldPath)) {
      // Use rmSync to delete the entire directory recursively
      fs.rmSync(worldPath, { recursive: true, force: true });
      return { success: true };
    }
    return { success: true, message: "No world folder found to delete." };
  } catch (error) {
    console.error("Failed to delete world folder:", error);
    throw error;
  }
});