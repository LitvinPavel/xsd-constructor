<template>
  <div class="flex gap-4 items-center w-full">
    <input
      type="file"
      @change="handleFileUpload"
      accept=".xsd"
      class="px-3 py-2 border border-gray-300 rounded w-full file:-m-4 file:p-4 file:mr-8 file:border-0 file:bg-gray-500 file:text-white"
    />
    <button
      @click="handleParseXSD"
      class="px-6 py-3 bg-blue-600 text-white rounded flex-shrink-0 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      Парсить XSD
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { useXSDForm } from '../composables/useXSDForm';

interface Emits {
  (e: 'parse-xsd', content: Ref<string>): void;
}
const emit = defineEmits<Emits>();

const { readFileContent } = useXSDForm();
const xsdContent = ref<string | null>(null);

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const content = await readFileContent(file);
    xsdContent.value = content;
  }
};

const handleParseXSD = () => {
  if (typeof xsdContent.value === 'string') {
    emit('parse-xsd', xsdContent as Ref<string>);
  }
};
</script>

<style scoped></style>
