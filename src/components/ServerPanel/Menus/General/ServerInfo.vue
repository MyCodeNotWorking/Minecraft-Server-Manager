<template>
  <div class="flex justify-between mt-3 border-t border-b border-gray-700 p-10 text-white">
    <p>Version: {{ server.version }}</p>
    <p>Status: 
      <span :class="server.running ? 'text-green-400 font-bold' : 'text-red-400 font-bold'">
        {{ server.running ? 'Running' : 'Stopped' }}
      </span>
    </p>
    <p>{{ server.type }} Server</p>
    <p>Created: {{ new Date(server.createdAt).toLocaleDateString() }}</p>
  </div>
</template>

<script setup>
defineProps({
  server: {
    type: Object,
    required: true
  }
})
</script>