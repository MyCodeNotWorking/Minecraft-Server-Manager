<template>
  <!-- Server Grid -->
  <div class="grid grid-cols-4 gap-6 mt-10 auto-rows-fr">
    <!-- New Server Button -->
    <button
      @click="showModal = true"
      class="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 text-gray-400 rounded-lg hover:border-green-400 hover:text-green-400 transition cursor-pointer"
    >
      <span class="text-2xl font-bold">+</span>
      <span>New Server</span>
    </button>


    <!-- Example Servers -->
    <div
      v-for="server in servers"
      :key="server.name"
      @click="openServerPanel(server)"
      class="bg-gray-700 text-white rounded-xl p-4 flex flex-col justify-between hover:bg-gray-600 transition transform hover:scale-105 
       hover:shadow-xl duration-200 cursor-pointer"
    >
      <button 
        @click.stop="handleDelete(server.name)"
        class="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
        title="Delete Server"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
      <h3 class="text-green-200 text-xl font-semibold">{{ server.name }}</h3>
      <p>
        Status:
        <span :class="server.running ? 'text-green-400' : 'text-red-400'">
          {{ server.running ? 'Running' : 'Stopped' }}
        </span>
      </p>
      <p>Type: {{ server.type }}</p>
      <p>Version: {{ server.version }}</p>

      <p v-if="server.createdAt" class="text-gray-400 text-sm mt-2">
        Created: {{ new Date(server.createdAt).toLocaleDateString() }}
      </p>
    </div>

    <NewServerModal
      v-if="showModal"
      @close="showModal = false"
      @create="addServer"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NewServerModal from "./NewServerModal.vue"

const router = useRouter()
const showModal = ref(false)
const servers = ref([]) // Start empty

// Load saved servers when the grid opens
onMounted(async () => {
  // 1. Load the static list from JSON
  const loadedServers = await window.ipcRenderer.loadServers();
  
  // 2. Check the LIVE status of each server from the backend
  // We map over them to create an array of promises
  const statusPromises = loadedServers.map(async (server) => {
    const status = await window.ipcRenderer.getServerStatus(server.name);
    return {
      ...server,
      running: status.isRunning // Override the JSON 'running' (which might be stale) with real status
    };
  });

  // 3. Wait for all checks to finish and update state
  servers.value = await Promise.all(statusPromises);
});

// Send the new server to Node.js to be saved and get the created server back
async function addServer(newServer) {
  try {
    // Tell Node.js to create the folder and download the jar
    const createdServer = await window.ipcRenderer.invoke('servers:create', newServer);
    
    // Add the new server to the grid display
    servers.value.push(createdServer);
  } catch (err) {
    alert("Error creating server: " + err.message);
  }
}

function openServerPanel(server) {
  router.push({
    path: '/serverpanel',
    query: {
      name: server.name,
      type: server.type,
      version: server.version,
      running: server.running,
      createdAt: server.createdAt
    }
  })
}

async function handleDelete(serverName) {
  const confirmed = confirm(`Are you sure you want to delete "${serverName}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    const result = await window.ipcRenderer.deleteServer(serverName);
    if (result.success) {
      // Update local state to remove the server from the grid
      servers.value = servers.value.filter(s => s.name !== serverName);
    }
  } catch (err) {
    alert("Error deleting server: " + err.message);
  }
}
</script>

