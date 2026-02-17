<template>
  <div class="flex items-center gap-4 h-16">
    <div v-if="isEditing" class="flex items-center gap-2 w-full">
      <input
        ref="nameInput"
        v-model="inputName"
        @keyup.enter="save"
        @keyup.esc="cancel"
        placeholder="Enter new server name"
        class="text-4xl font-bold text-gray-900 bg-white rounded px-3 py-1 outline-none w-full focus:ring-4 focus:ring-green-500/50"
      />
      <button
        @click="save"
        class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-lg font-bold shadow-lg transition"
      >
        Save
      </button>
      <button
        @click="cancel"
        class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-lg shadow-lg transition"
      >
        Cancel
      </button>
    </div>

    <div v-else class="flex items-center gap-4 group">
      <h1 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 pb-2">
        {{ modelValue }}
      </h1>
      <button
        @click="startEditing"
        class="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-white bg-gray-700/50 rounded-lg hover:bg-gray-700"
        title="Rename Server"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';

// We receive the current name via v-model from General.vue
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);
const router = useRouter();

const isEditing = ref(false);
const inputName = ref('');
const nameInput = ref(null);

// Start editing: clone current name to local input state
const startEditing = async () => {
  inputName.value = props.modelValue;
  isEditing.value = true;
  await nextTick();
  nameInput.value?.focus();
};

const cancel = () => {
  isEditing.value = false;
};

const save = async () => {
  const oldName = props.modelValue;
  const newName = inputName.value.trim();

  // Basic Validation
  if (!newName) return alert("Server name cannot be empty.");
  
  // If no change, just exit edit mode
  if (newName === oldName) {
    isEditing.value = false;
    return;
  }

  try {
    // 1. Call the backend to rename the folder and update JSON
    const result = await window.ipcRenderer.updateServer(oldName, { name: newName });

    if (result.success) {
      // 2. Update the parent component (General.vue) immediately
      emit('update:modelValue', newName);

      // 3. Update the URL Query Parameter
      // Since your app state relies on ?name=... in the URL, we must update this 
      // or a page refresh will result in a "Server not found" error.
      await router.replace({
        query: {
          ...router.currentRoute.value.query, // keep other params like type/version
          name: newName
        }
      });

      isEditing.value = false;
    } else {
      alert(`Failed to rename: ${result.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message}`);
  }
};
</script>