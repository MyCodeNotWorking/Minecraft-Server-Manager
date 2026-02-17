<template>
  <div class="flex flex-col">
    <ServerName v-model="server.name"></ServerName>
    <ServerInfo :server="server"></ServerInfo>
    <StartServer :server="server"></StartServer>
    <Logs :initial-logs="serverLogs" :server-name="server.name"></Logs>
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
  createdAt: route.query.createdAt
})

const serverLogs = ref("")

// Listen for the back-end to confirm the Java process has closed
const handleServerStopped = (event, stoppedServerName) => {
  if (server.name === stoppedServerName) {
    server.running = false
  }
}

onMounted(async () => {
  // 1. Listen for stop events
  window.ipcRenderer.on('server-stopped', handleServerStopped)

  // 2. Fetch REAL status from backend (Syncs UI with Background Process)
  try {
    const status = await window.ipcRenderer.getServerStatus(server.name);
    server.running = status.isRunning;
    serverLogs.value = status.logs; // Load historical logs
  } catch (e) {
    console.error("Failed to sync server status:", e);
  }
})

onUnmounted(() => {
  window.ipcRenderer.off('server-stopped', handleServerStopped)
})
</script>