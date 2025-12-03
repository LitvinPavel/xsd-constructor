<!-- XSDForm.vue - добавим обработку добавления Relation -->
<template>
  <div class="max-w-full mx-auto">
    <!-- Контрол загрузки файла -->
    <div class="flex gap-4 items-center w-full mb-6">
      <input
        type="file"
        @change="handleFileUpload"
        accept=".xsd"
        class="px-3 py-2 border border-gray-300 rounded w-full file:-m-4 file:p-4 file:mr-8 file:border-0 file:bg-gray-500 file:text-white"
      />
    </div>

    <!-- Основная форма -->
    <div v-if="Object.keys(schema.elements).length > 0">
      <form @submit.prevent.stop>
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
          />
        </div>

        <!-- Кнопка генерации XML -->
        <div class="mt-8 pt-4 border-t">
          <button
            class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            @click="generateXML"
          >
            Сгенерировать XML
          </button>
        </div>
      </form>
    </div>

    <!-- Сообщение если схема не загружена -->
    <div v-else class="text-center py-12 text-gray-500">
      Загрузите XSD схему для начала работы
    </div>

    <!-- Результат XML -->
    <div v-if="generatedXML" class="bg-white rounded p-4 border mt-6">
      <h3 class="text-lg font-semibold mb-2">Сгенерированный XML:</h3>
      <pre
        class="bg-gray-100 p-4 rounded border overflow-auto"
      ><code>{{ generatedXML }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue';
import { useForm } from '@/composables/useForm';
import XSDGroup from '@/components/XSDGroup.vue';

const { 
  schema, 
  generatedXML, 
  generateXML, 
  handleFileUpload, 
  updateElementValue, 
  handleAddEntity, 
  handleAddProperty,
  handleAddRelation 
} = useForm();

// Предоставляем схему для дочерних компонентов
provide('schema', schema);
</script>