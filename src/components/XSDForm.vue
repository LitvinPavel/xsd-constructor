<template>
  <div class="max-w-full mx-auto p-4">
    <!-- Контрол загрузки файла -->
    <div class="flex gap-4 items-center w-full mb-6">
      <DxFileUploader
        :multiple="false"
        :accept="'.xsd'"
        upload-mode="instantly"
        :select-button-text="'Выбрать файл'"
        :label-text="'Выберите XSD файл'"
        @value-changed="onFileUpload"
        class="w-full"
      />
    </div>

    <div
      v-if="errorMessage"
      class="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3"
    >
      {{ errorMessage }}
    </div>

    <!-- Основная форма (для сложных элементов) -->
    <div v-if="Object.keys(schema.elements).length > 0" class="mb-6">
      <form class="bg-white rounded-lg shadow p-4" @submit.prevent.stop>
        <!-- Рендеринг элементов -->
        <div
          v-for="(element, key) in schema.elements"
          :key="key"
          class="mb-6"
        >
          <XSDGroup
            :element="element"
            :level="0"
            @update-value="updateElementValue"
            @add-entity="handleAddEntity"
            @add-property="handleAddProperty"
            @add-relation="handleAddRelation"
            @add-logical-unit="handleAddLogicalUnit"
            @add-dynamic-item="handleAddDynamicItem"
            @add-condition="handleAddConditionElement"
          />
        </div>
      </form>
    </div>

    <!-- Сообщение если схема не загружена -->
    <div v-if="!Object.keys(schema.elements).length" class="text-center py-12 text-gray-500">
      Загрузите XSD схему для начала работы
    </div>

    <!-- Кнопка генерации XML -->
    <div v-if="Object.keys(schema.elements).length" class="mt-8 pt-4 border-t border-gray-200">
      <DxButton
        :text="'Сгенерировать XML'"
        type="success"
        styling-mode="contained"
        icon="file"
        @click="generateXML"
        class="w-full sm:w-auto"
      />
    </div>

    <!-- Результат XML -->
    <div v-if="generatedXML" class="bg-white rounded-lg shadow p-4 mt-6">
      <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Сгенерированный XML
      </h3>
      <div class="bg-gray-50 p-4 rounded border border-gray-200 overflow-auto">
        <pre class="text-sm whitespace-pre-wrap"><code>{{ generatedXML }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue';
import DxFileUploader from 'devextreme-vue/file-uploader'
import DxButton from 'devextreme-vue/button'
import { useForm } from '@/composables/useForm';
import XSDGroup from '@/components/XSDGroup.vue';

const { 
  schema, 
  generatedXML, 
  errorMessage,
  generateXML, 
  handleFileUpload, 
  updateElementValue, 
  handleAddEntity, 
  handleAddProperty,
  handleAddRelation,
  handleAddLogicalUnit,
  handleAddDynamicItem,
  handleAddConditionElement
} = useForm();

// Предоставляем схему для дочерних компонентов
provide('schema', schema);

const onFileUpload = (e: any) => {
  const file = e.value?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      handleFileUpload({ target: { files: [file] } } as any);
    };
    reader.readAsText(file);
  }
};

</script>
