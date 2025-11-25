<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <XSDForm />
    </main>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue';
import XSDForm from './components/XSDForm.vue';
import { useComplexTypes } from './composables/useComplexTypes';

// Создаем хранилище сложных типов и предоставляем его всем компонентам
const complexTypesStore = useComplexTypes();
provide('complexTypesStore', complexTypesStore);
</script>

<style>
@import 'tailwindcss';
</style>
