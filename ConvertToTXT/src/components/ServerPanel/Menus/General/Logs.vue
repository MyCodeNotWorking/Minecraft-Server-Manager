<template>
  <div class="p-6 bg-gray-100">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">Server Logs</h2>
    <textarea
      ref="logTextarea"
      :value="fullLogs"
      readonly
      class="w-full h-86 p-4 bg-gray-800 text-green-400 font-mono rounded-lg shadow-inner resize-none overflow-auto"
      placeholder="Server logs will appear here..."
    ></textarea>
    <h2 class="text-2xl font-bold mb-4 text-gray-800">Bore Logs</h2>
    <textarea
      readonly
      class="w-full h-42 p-4 bg-gray-800 text-green-400 font-mono rounded-lg shadow-inner resize-none overflow-auto"
      placeholder="Bore logs will appear here..."
    ></textarea>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'

const props = defineProps({
  serverName: String,
  initialLogs: String
})

const newLogs = ref("")
const logTextarea = ref(null)

// Combine historical logs (from backend memory) with new incoming logs
const fullLogs = computed(() => {
  return (props.initialLogs || "") + newLogs.value
})

// Auto-scroll function
const scrollToBottom = async () => {
  await nextTick()
  if (logTextarea.value) {
    logTextarea.value.scrollTop = logTextarea.value.scrollHeight
  }
}

// Watch for changes in logs to scroll down
watch(fullLogs, scrollToBottom)

const handleNewLog = (event, payload) => {
  if (payload.name === props.serverName) {
    newLogs.value += payload.text
  }
}

onMounted(() => {
  window.ipcRenderer.on('server-log', handleNewLog)
  // Scroll to bottom initially in case there are old logs
  scrollToBottom()
})

onUnmounted(() => {
  window.ipcRenderer.off('server-log', handleNewLog)
})
</script>