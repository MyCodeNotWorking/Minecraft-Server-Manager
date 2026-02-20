<template>
  <div class="my-10 flex flex-col gap-3 bg-gray-800 rounded-lg p-5 text-white border">
    <label class="font-semibold text-green-200">Server Port
      <span class="text-gray-500 text-sm font-light"><br>Keep in mind that multiple servers running simultaneously cannot use the same port!</span>
    </label>
    <input
      type="number"
      v-model.number="server.port"
      class="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
    />

    <label class="font-semibold">Minimum RAM (MB)</label>
    <input
      type="number"
      v-model.number="server.minRam"
      min="128"
      :max="server.maxRam || 65536"
      class="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
    />

    <label class="font-semibold mt-2">Maximum RAM (MB)</label>
    <input
      type="number"
      v-model.number="server.maxRam"
      :min="server.minRam || 128"
      max="65536"
      class="px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
    />

    <p class="text-sm text-gray-400 mt-2 mb-4">
      Allocated: {{ server.minRam }} MB - {{ server.maxRam }} MB
    </p>
    
    <button
      class="cursor-pointer px-8 py-4 text-xl font-semibold rounded-lg shadow-md transition-colors duration-200"
      :class="server.running ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
      @click="toggleServer"
      :disabled="isStopping"
    >
      {{ server.running ? (isStopping ? 'Stopping...' : 'Stop Server') : 'Start Server' }}
    </button>

    <div class="mt-2 flex flex-col gap-2">
      <p v-if="server.running">
        Your server is running with <span class="font-semibold">{{ server.minRam }}–{{ server.maxRam }} MB RAM</span> on port <span class="font-semibold">{{ server.port }}</span>.
      </p>

      <p v-if="server.running">
        Your server is publicly accessible at 
        <span v-if="server.boreIp" class="inline-block px-3 py-1 bg-gray-500 text-white font-bold rounded-lg shadow-md">
          {{ server.boreIp }}
        </span>
        <span v-else class="inline-block px-3 py-1 bg-gray-500 text-gray-300 font-bold rounded-lg shadow-md italic">
          Connecting...
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, toRefs, watch } from 'vue'

const props = defineProps({
  server: {
    type: Object,
    required: true
  }
})

const { server } = toRefs(props)
const isStopping = ref(false)

watch(() => server.value.running, (isRunning) => {
  if (!isRunning) {
    isStopping.value = false;
  }
});

const toggleServer = async () => {
  if (!server.value.running) {
    // 1. Persist RAM and port configurations to servers.json before starting
    await window.ipcRenderer.updateServer(server.value.name, {
      name: server.value.name,
      port: server.value.port,
      minRam: server.value.minRam,
      maxRam: server.value.maxRam
    });

    // 2. Start the server
    const success = await window.ipcRenderer.startServer({
      name: server.value.name,
      port: server.value.port,
      minRam: server.value.minRam,
      maxRam: server.value.maxRam
    });
    
    if (success) {
      server.value.running = true;
      isStopping.value = false;
    }
  } else {
    isStopping.value = true;
    await window.ipcRenderer.stopServer(server.value.name);
    // Note: We don't set running to false here. 
    // General.vue will handle it when it hears 'server-stopped'
  }
}
</script>