<template>
  <div class="flex flex-col">
    <ServerName v-model="server.name"></ServerName>
    <ServerInfo :server="server"></ServerInfo>
    <StartServer :server="server"></StartServer>
    <Logs 
      :initial-logs="serverLogs"
      :initial-bore-logs="boreLogs"
      :server-name="server.name"
    ></Logs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import ServerName from "./ServerName.vue"
import ServerInfo from "./ServerInfo.vue"
import StartServer from "./StartServer.vue"
import Logs from "./Logs.vue"

const route = useRoute()

// Initialize state from route, plus default RAM arguments expected by main.ts
const server = reactive({
  name: route.query.name,
  type: route.query.type,
  version: route.query.version,
  running: false,
  minRam: 1024,
  maxRam: 2048,
  port: 25565,
  createdAt: route.query.createdAt,
  boreIp: ""
})

const serverLogs = ref("")
const boreLogs = ref("")

// Listen for the back-end to confirm the Java process has closed
const handleServerStopped = (event, stoppedServerName) => {
  if (server.name === stoppedServerName) {
    server.running = false
    server.boreIp = ""
  }
}

// Listen for dynamic IP extraction
const handleBoreIp = (event, payload) => {
  if (server.name === payload.name) {
    server.boreIp = payload.ip
  }
}

onMounted(async () => {
  // 1. Listen for stop events
  window.ipcRenderer.on('server-stopped', handleServerStopped)
  window.ipcRenderer.on('bore-ip', handleBoreIp)

  // 2. Fetch REAL status from backend (Syncs UI with Background Process)
  try {
    const status = await window.ipcRenderer.getServerStatus(server.name);
    server.running = status.isRunning;
    serverLogs.value = status.logs; // Load historical logs
    boreLogs.value = status.boreLogs;
    // Sync RAM, Port, and IP states from backend memory
    server.minRam = status.minRam;
    server.maxRam = status.maxRam;
    server.port = status.port;
    server.boreIp = status.boreIp;
  } catch (e) {
    console.error("Failed to sync server status:", e);
  }
})

onUnmounted(() => {
  window.ipcRenderer.off('server-stopped', handleServerStopped)
  window.ipcRenderer.off('bore-ip', handleBoreIp)
})
</script>