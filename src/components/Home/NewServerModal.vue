<template>
  <!-- Background overlay -->
  <div
    class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
    @click.self="close"
  >
    <!-- Modal -->
    <div class="bg-gray-800 text-white rounded-xl p-6 w-96 shadow-xl">

      <h2 class="text-2xl font-bold mb-4 text-green-400">
        Create New Server
      </h2>

      <!-- Name -->
      <div class="mb-3">
        <label class="block mb-1">Server Name</label>
        <input
          v-model="server.name"
          type="text"
          class="w-full bg-gray-700 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      <!-- Type -->
      <div class="mb-3">
        <label class="block mb-1">Type</label>
        <select
          v-model="server.type"
          class="w-full bg-gray-700 rounded px-3 py-2"
        >
          <option>Vanilla</option>
          <option>Modded (Forge)</option>
        </select>
      </div>

      <!-- Minecraft Version -->
      <div class="mb-3">
        <label class="block mb-1">Minecraft Version</label>

        <select
          v-model="server.version"
          class="w-full bg-gray-700 rounded px-3 py-2"
          :disabled="loadingVersions || versionError"
        >
          <option v-if="loadingVersions">
            Loading Minecraft versions...
          </option>

          <option v-else-if="versionError">
            Failed to load versions
          </option>

          <option
            v-for="version in versions"
            :key="version"
            :value="version"
          >
            {{ version }}
          </option>
        </select>
      </div>

      <!-- Forge Version -->
      <div
        v-if="server.type === 'Modded (Forge)'"
        class="mb-3"
      >
        <label class="block mb-1">Forge Version</label>

        <select
          v-model="server.forgeVersion"
          class="w-full bg-gray-700 rounded px-3 py-2"
          :disabled="loadingForge || forgeError"
        >
          <option v-if="loadingForge">
            Loading Forge versions...
          </option>

          <option v-else-if="forgeError">
            Failed to load Forge versions
          </option>

          <option
            v-for="forge in forgeVersions"
            :key="forge"
            :value="forge"
          >
            {{ forge }}
          </option>
        </select>
      </div>

      <!-- Buttons -->
      <div class="flex justify-end space-x-3 mt-6">

        <button
          @click="close"
          class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
        >
          Cancel
        </button>

        <button
          @click="create"
          class="px-4 py-2 bg-green-500 rounded hover:bg-green-400 text-black font-semibold"
        >
          Create
        </button>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"

const emit = defineEmits(["close", "create"])

/* -----------------------------
   State
----------------------------- */

const versions = ref([])
const forgeVersions = ref([])

const loadingVersions = ref(true)
const loadingForge = ref(false)

const versionError = ref(null)
const forgeError = ref(null)

const server = ref({
  name: "",
  type: "Vanilla",
  version: "",
  forgeVersion: "",
  running: false,
  createdAt: ""
})

/* -----------------------------
   UI Actions
----------------------------- */

function close() {
  emit("close")
}

function create() {

  if (!server.value.name) return

  server.value.createdAt = new Date().toISOString();

  emit("create", {
    ...server.value
  })

  close()
}

/* -----------------------------
   Fetch Minecraft Versions
----------------------------- */

async function fetchMinecraftVersions() {

  try {

    loadingVersions.value = true

    const res = await fetch(
      "https://launchermeta.mojang.com/mc/game/version_manifest.json"
    )

    if (!res.ok)
      throw new Error("Failed to fetch Minecraft versions")

    const data = await res.json()

    versions.value = data.versions
      .filter(v => v.type === "release")
      .map(v => v.id)

    if (versions.value.length > 0) {
      server.value.version = versions.value[0]
    }

  } catch (err) {

    versionError.value = err.message
    console.error(err)

  } finally {

    loadingVersions.value = false

  }
}

/* -----------------------------
   Fetch Forge Versions
----------------------------- */

async function fetchForgeVersions(mcVersion) {

  try {

    loadingForge.value = true
    forgeError.value = null

    const versions =
      await window.ipcRenderer.getForgeVersions(mcVersion)

    forgeVersions.value = versions

    if (versions.length > 0) {
      server.value.forgeVersion = versions[0]
    }

  } catch (err) {

    forgeError.value = err.message

  } finally {

    loadingForge.value = false

  }

}


/* -----------------------------
   Watch for Forge mode changes
----------------------------- */

watch(
  () => [server.value.type, server.value.version],
  async ([type, version]) => {

    if (type === "Modded (Forge)" && version) {

      await fetchForgeVersions(version)

    }

  }
)

/* -----------------------------
   Init
----------------------------- */

onMounted(() => {

  fetchMinecraftVersions()

})
</script>
