<template>
  <div class="form-controls">
    <input
      type="file"
      @change="handleFileUpload"
      accept=".xsd"
      class="file-input"
    />
    <button
      @click="handleDownload"
      :disabled="!hasFormData"
      class="export-button"
    >
      Экспорт XML
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  hasFormData: boolean;
}

interface Emits {
  (e: 'file-upload', file: File): void;
  (e: 'download'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    emit('file-upload', file);
  }
};

const handleDownload = () => {
  emit('download');
};
</script>

<style scoped></style>
