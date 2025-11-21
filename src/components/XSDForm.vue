<template>
  <div class="max-w-6xl mx-auto p-6">
    <!-- Загрузка XSD -->
    <div class="mb-8 p-6 bg-white rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Загрузка XSD схемы</h2>
      <FormControl @parse-xsd="handleParseXSD" />
    </div>

    <!-- Форма с вложенной структурой -->
    <div v-if="formGroups.length > 0" class="bg-white rounded-lg shadow-md">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">Форма заполнения</h2>
            <p class="text-gray-600 mt-2">
              Заполните поля согласно XSD схеме. Пустые поля не будут включены в
              XML.
            </p>
          </div>
          <div class="text-sm text-gray-500">
            Обязательные поля помечены <span class="text-red-500">*</span>
          </div>
        </div>
      </div>

      <div class="p-6">
        <form @submit.prevent="handleSubmit" class="space-y-8">
          <FormGroupComponent
            v-for="group in formGroups"
            :key="group.name"
            :group="group"
            :group-path="[]"
            @update-field="updateFieldValue"
          />

          <!-- Кнопки действий -->
          <div class="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Сгенерировать XML
            </button>
            <button
              type="button"
              @click="handleDownload"
              :disabled="!generatedXML"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Скачать XML
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Предпросмотр XML -->
    <div v-if="generatedXML" class="mt-8 bg-white rounded-lg shadow-md">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-800">Сгенерированный XML</h2>
        <p class="text-gray-600 mt-2">
          Только поля с значениями и обязательные атрибуты
        </p>
      </div>
      <div class="p-6">
        <pre
          class="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm"
        ><code>{{ generatedXML }}</code></pre>
      </div>
    </div>

    <!-- Отладочная информация -->
    <div
      v-if="showDebug && formData"
      class="mt-8 bg-yellow-50 rounded-lg shadow-md"
    >
      <div class="p-4 border-b border-yellow-200">
        <h2 class="text-lg font-bold text-yellow-800">
          Отладочная информация (formData)
        </h2>
        <button
          @click="showDebug = !showDebug"
          class="text-sm text-yellow-600 hover:text-yellow-800"
        >
          {{ showDebug ? 'Скрыть' : 'Показать' }}
        </button>
      </div>
      <div class="p-4">
        <pre
          class="text-sm overflow-x-auto"
        ><code>{{ JSON.stringify(formData, null, 2) }}</code></pre>
      </div>
    </div>

    <!-- Сообщение об ошибке -->
    <div
      v-if="errorMessage"
      class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { useXSDForm } from '../composables/useXSDForm';
import FormGroupComponent from './FormGroupComponent.vue';
import FormControl from './FormControl.vue';

const generatedXML = ref('');
const errorMessage = ref('');
const showDebug = ref(false);

const {
  formGroups,
  formData,
  parseXSD,
  updateFieldValue,
  generateXML,
  downloadXML,
} = useXSDForm();

const handleParseXSD = (xsdContent: Ref<string>) => {
  errorMessage.value = '';

  if (!xsdContent.value.trim()) {
    errorMessage.value = 'Пожалуйста, введите XSD схему';
    return;
  }

  try {
    parseXSD(xsdContent.value);
    generatedXML.value = '';
    console.log(
      'Form data structure:',
      JSON.parse(JSON.stringify(formData.value))
    );
  } catch (error) {
    errorMessage.value = 'Ошибка парсинга XSD: ' + (error as Error).message;
  }
};

const handleSubmit = () => {
  errorMessage.value = '';

  try {
    generatedXML.value = generateXML();
    console.log(
      'Generated XML from data:',
      JSON.parse(JSON.stringify(formData.value))
    );
  } catch (error) {
    errorMessage.value = 'Ошибка генерации XML: ' + (error as Error).message;
  }
};

const handleDownload = () => {
  errorMessage.value = '';

  try {
    downloadXML();
  } catch (error) {
    errorMessage.value = 'Ошибка скачивания XML: ' + (error as Error).message;
  }
};
</script>
