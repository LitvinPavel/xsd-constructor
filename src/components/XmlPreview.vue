<template>
  <div class="xml-preview">
    <div class="xml-header">
      <h4>Предпросмотр XML:</h4>
      <div class="xml-actions">
        <button @click="handleCopy" class="copy-button">Скопировать</button>
        <button @click="handleDownload" class="download-button">Экспорт</button>
      </div>
    </div>
    <pre class="xml-content"><code>{{ xmlContent }}</code></pre>
  </div>
</template>

<script setup lang="ts">
interface Props {
  xmlContent: string;
}

interface Emits {
  (e: 'copy'): void;
  (e: 'download'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const handleCopy = () => {
  emit('copy');
};

const handleDownload = () => {
  emit('download');
};
</script>
