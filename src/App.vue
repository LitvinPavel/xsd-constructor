<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <XSDForm />
    </main>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue';
import XSDForm from '@/components/XSDForm.vue';
import { mockData } from '@/mockData';
import 'devextreme/dist/css/dx.light.css';

// Предоставляем mockData глобально для DevExtreme компонентов
provide('mockData', mockData);
(window as any).mockData = mockData;
</script>

<style>
@import 'tailwindcss';
@import 'devextreme/dist/css/dx.light.css';

.dx-widget {
  font-family: inherit;
}

.dx-textbox,
.dx-numberbox,
.dx-datebox,
.dx-selectbox {
  border-radius: 0.375rem;
}

.dx-button {
  border-radius: 0.375rem;
}
</style>