<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto"
    >
      <h3 class="text-lg font-semibold mb-4">
        <slot name="title"></slot>
      </h3>
      <slot name="content"></slot>
      <div class="mt-4 flex justify-end">
        <button
          @click="emit('close', false)"
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Отмена
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show?: boolean;
}

interface Emits {
  (e: "close", value: boolean): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>
