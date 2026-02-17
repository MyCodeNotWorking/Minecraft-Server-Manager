<template>
  <div class="flex min-h-screen bg-gray-800 text-white">

    <Sidebar></Sidebar>

    <!-- Main Content -->
    <main class="flex-1 p-10">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

  </div>
</template>

<script setup>
import Sidebar from "../components/ServerPanel/Sidebar.vue"
</script>
