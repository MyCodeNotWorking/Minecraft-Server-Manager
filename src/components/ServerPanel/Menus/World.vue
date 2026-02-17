<template>
  <div class="flex flex-col items-center justify-center h-full w-full bg-gray-900 gap-10">
    <h1 class="text-center text-green-300 text-6xl font-extrabold border-b">World</h1>
    <div class="text-center text-white">
      <p class="mb-3">
        Your world is stored here: 
        <span class="font-mono text-green-300">/server_files/{{ serverName }}/world</span>
      </p>
      <button 
        @click="openFolder"
        class="bg-green-400 text-gray-900 font-semibold py-2 px-6 rounded-lg shadow-lg hover:bg-green-500 hover:scale-105 transition transform duration-200 cursor-pointer"
      >
        Open world folder
      </button>
    </div>
    <button 
      @click="handleRegenerate"
      class="bg-red-600 text-gray-900 font-semibold py-1 px-4 rounded-lg shadow-lg hover:bg-red-700 hover:scale-105 transition transform duration-200 cursor-pointer text-xl"
    >
      Regenerate world
    </button>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const serverName = route.query.name; 

const openFolder = () => {
  window.ipcRenderer.openWorldFolder(serverName);
};

const handleRegenerate = async () => {
  const confirmed = confirm("Are you sure? This will permanently delete the current world. The server must be stopped first.");
  if (!confirmed) return;

  try {
    const result = await window.ipcRenderer.regenerateWorld(serverName);
    if (result.success) {
      alert("World folder deleted. It will be regenerated the next time you start the server.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
};
</script>