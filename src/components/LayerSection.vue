<template>
  <div class="layer-section" v-if="hasFields">
    <h3 class="layer-title">{{ displayName }} ({{ layerName }})</h3>
    
    <CategorySection
      v-for="category in categories"
      :key="category.name"
      :fields="getCategoryFields(category.name)"
      :display-name="category.displayName"
      :category-config="category"
      :get-field-value="getFieldValue"
      :update-field-value="updateFieldValue"
    />
  </div>
</template>

<script setup lang="ts">
import CategorySection from './CategorySection.vue';
import type { FormField, CategoryConfig } from '../types';

interface Props {
  layerName: string;
  displayName: string;
  categories: CategoryConfig[];
  fields: FormField[];
  getFieldValue: (fieldName: string) => string | number | boolean | null;
  updateFieldValue: (fieldName: string, value: string | number | boolean | null) => void;
  getFieldsByCategory: (layer: string, category: string) => FormField[];
}

const props = defineProps<Props>();

const hasFields = props.fields.length > 0;

const getCategoryFields = (categoryName: string) => {
  return props.getFieldsByCategory(props.layerName, categoryName);
};
</script>