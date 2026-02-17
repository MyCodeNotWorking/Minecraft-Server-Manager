<template>
  <div class="my-10 flex flex-col gap-3 bg-gray-800 rounded-lg p-5 text-white">
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
    const success = await window.ipcRenderer.startServer({
      name: server.value.name,
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