<template>
  <div class="dynamic-form">
    <div class="form-header">
      <FormControls
        :has-form-data="hasFormData"
        @file-upload="handleXSDUpload"
        @download="handleDownload"
      />
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      Загрузка XSD схемы...
    </div>

    <div v-else-if="xsdError" class="error">
      <strong>Ошибка:</strong> {{ xsdError }}
    </div>

    <form
      v-else-if="hasFields"
      @submit.prevent="handleSubmit"
      class="form-content"
    >
      <LayerSection
        v-for="layer in visibleLayers"
        :key="layer.name"
        :layer-name="layer.name"
        :display-name="layer.displayName"
        :categories="layer.categories"
        :fields="getFieldsByLayer(layer.name)"
        :get-field-value="getFieldValue"
        :update-field-value="updateFieldValue"
        :get-fields-by-category="getFieldsByCategory"
      />

      <div class="form-actions">
        <button type="submit" class="submit-button">Применить</button>
        <button type="button" @click="resetForm" class="reset-button">
          Сбросить
        </button>
      </div>
    </form>

    <div v-else class="no-data">
      <p>Загрузите XSD файл</p>
    </div>

    <XmlPreview
      v-if="generatedXML"
      :xml-content="generatedXML"
      @copy="handleCopyXML"
      @download="handleDownloadXML"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useXSD } from '../composables/useXSD';
import { useForm } from '../composables/useForm';
import { useXML } from '../composables/useXML';
import FormControls from './FormControls.vue';
import LayerSection from './LayerSection.vue';
import XmlPreview from './XmlPreview.vue';

const { fields, loading, error: xsdError, parseXSD } = useXSD();
const {
  formData,
  hasFormData,
  visibleLayers,
  initializeFormData,
  updateFieldValue,
  getFieldValue,
  getFieldsByLayer,
  getFieldsByCategory,
  resetForm,
} = useForm(fields);
const { generatedXML, generateXML, downloadXML, copyXML } = useXML();

const hasFields = computed(() => fields.value.length > 0);

const handleXSDUpload = async (file: File) => {
  const success = await parseXSD(file);
  if (success) {
    initializeFormData();
  }
};

const handleSubmit = () => {
  generateXML(formData.value, fields.value);
};

const handleDownload = () => {
  if (!hasFormData.value) return;

  if (!generatedXML.value) {
    generateXML(formData.value, fields.value);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `form-data-${timestamp}.xml`;
  downloadXML(filename);
};

const handleCopyXML = async () => {
  const success = await copyXML();
  if (success) {
    alert('XML copied to clipboard!');
  }
};

const handleDownloadXML = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `form-data-${timestamp}.xml`;
  downloadXML(filename);
};
</script>
