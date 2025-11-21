<template>
  <div>
    <!-- Текстовое поле -->
    <input
      v-if="field.type === 'xs:string' || field.type === 'string'"
      :value="field.value"
      @input="$emit('update', ($event.target as HTMLInputElement).value)"
      type="text"
      class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      :required="field.required"
    />

    <!-- Числовое поле -->
    <input
      v-else-if="field.type === 'xs:integer' || field.type === 'xs:decimal'"
      :value="field.value"
      @input="$emit('update', parseFloat(($event.target as HTMLInputElement).value) || 0)"
      type="number"
      class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      :required="field.required"
    />

    <!-- Boolean поле -->
    <select
      v-else-if="field.type === 'xs:boolean'"
      :value="field.value"
      @change="$emit('update', ($event.target as HTMLSelectElement).value === 'true')"
      class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
    >
      <option value="true">Да</option>
      <option value="false">Нет</option>
    </select>

    <!-- Дата поле -->
    <input
      v-else-if="field.type === 'xs:date'"
      :value="field.value"
      @input="$emit('update', ($event.target as HTMLInputElement).value)"
      type="date"
      class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      :required="field.required"
    />

    <!-- Select для enumerations -->
    <select
      v-else-if="field.type === 'select'"
      :value="field.value"
      @change="$emit('update', ($event.target as HTMLSelectElement).value)"
      class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      :required="field.required"
    >
      <option v-for="option in field.options" :key="option" :value="option">
        {{ option }}
      </option>
    </select>

    <!-- Поле по умолчанию -->
    <input
      v-else
      :value="field.value"
      @input="$emit('update', ($event.target as HTMLInputElement).value)"
      type="text"
      class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      :required="field.required"
    />
  </div>
</template>

<script setup lang="ts">
import type { FormField } from '../types';

interface Props {
  field: FormField;
}

defineProps<Props>();

defineEmits<{
  update: [value: any];
}>();
</script>
