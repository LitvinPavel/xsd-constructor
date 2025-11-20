<template>
  <div class="category-section" v-if="hasFields">
    <h4 class="category-title">{{ displayName }}</h4>
    
    <div 
      v-if="showInfoMessage && hasNonEditableFields" 
      class="info-message"
    >
      {{ categoryConfig.editableTypes.length === 0 
        ? `${displayName} fields are not editable in current version`
        : `Only ${getEditableTypesDisplay()} fields are editable in ${displayName}`
      }}
    </div>
    
    <div class="fields-grid">
      <FieldRenderer
        v-for="field in fields"
        :key="field.name"
        :field="field"
        :value="getFieldValue(field.name)"
        @update:value="updateFieldValue(field.name, $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import FieldRenderer from './FieldRenderer.vue';
import type { FormField, CategoryConfig } from '../types';

interface Props {
  fields: FormField[];
  displayName: string;
  categoryConfig: CategoryConfig;
  showInfoMessage?: boolean;
  getFieldValue: (fieldName: string) => string | number | boolean | null;
  updateFieldValue: (fieldName: string, value: string | number | boolean | null) => void;
}

const props = withDefaults(defineProps<Props>(), {
  showInfoMessage: true
});

const hasFields = props.fields.length > 0;

const hasNonEditableFields = props.fields.some(field => !field.editable);

const getEditableTypesDisplay = (): string => {
  const typeNames: Record<FormField['type'], string> = {
    'string': 'text',
    'number': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'choice': 'choice',
    'object': 'object',
    'array': 'array',
    'graph': 'graph',
    'table': 'table',
    'formula': 'formula'
  };
  
  return props.categoryConfig.editableTypes
    .map(type => typeNames[type])
    .join(', ');
};
</script>