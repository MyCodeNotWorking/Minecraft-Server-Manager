<template>
  <!-- Sidebar -->
  <aside
    :class="[
      'bg-gray-900 border-r border-gray-700 flex flex-col transition-all duration-300',
      isOpen ? 'w-64' : 'w-16'
    ]"
  >
    <!-- Top Controls -->
    <div 
    	class="flex items-center p-2 border-b border-gray-700"
	:class="isOpen ? 'justify-between' : 'justify-center'"
    >
      <!-- Home Button -->
      <router-link
        v-if="isOpen"
        to="/"
        class="text-green-400 px-2 py-1 rounded hover:bg-gray-700 transition"
      >
        <span v-if="isOpen">🏠 Home</span>
      </router-link>

      <!-- Collapse Button -->
      <button @click="isOpen = !isOpen" class="text-green-400 focus:outline-none">
        <span v-if="isOpen">⬅️</span>
        <span v-else>➡️</span>
      </button>
    </div>

    <!-- Logo / Title (optional) -->
    <div v-if="isOpen" class="p-4 text-xl font-bold text-green-400 border-b border-gray-700">
      Server Panel
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col p-2 gap-1">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="{ path: item.path, query: route.query }"
        class="text-left px-4 py-2 rounded transition hover:bg-gray-700 whitespace-nowrap"
        active-class="bg-green-500 text-black font-semibold"
      >
        <span v-if="isOpen">{{ item.label }}</span>
        <span v-else>{{ item.label[0] }}</span> <!-- show first letter when collapsed -->
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const isOpen = ref(true) // sidebar open by default
const route = useRoute()

const navItems = [
  { name: 'general', label: 'General', path: '/serverpanel/general' },
  { name: 'mods', label: 'Mods', path: '/serverpanel/mods' },
  { name: 'world', label: 'World', path: '/serverpanel/world' },
  { name: 'backups', label: 'Server Backups', path: '/serverpanel/backups' }
]
</script>