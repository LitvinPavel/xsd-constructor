<!-- App.vue -->
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

provide('mockData', mockData);
</script>

<style>
@import 'tailwindcss';
</style>