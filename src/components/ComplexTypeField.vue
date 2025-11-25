<template>
  <div class="complex-type-field">
    <label class="block text-sm font-medium text-gray-700 mb-1">
      {{ field.annotation?.documentation || fieldKey }}
      <span v-if="isRequired" class="text-red-500">*</span>
    </label>
    
    <!-- Поле ввода в зависимости от типа -->
    <template v-if="isEnum">
      <select
        :value="value"
        @change="onInput($event.target.value)"
        class="w-full p-2 border border-gray-300 rounded"
        :required="isRequired"
      >
        <option value="">-- Выберите значение --</option>
        <option 
          v-for="enumValue in field.simpleType.restriction.enumerations" 
          :key="enumValue.value" 
          :value="enumValue.value"
        >
          {{ enumValue.value }}
          <span v-if="enumValue.annotation">- {{ enumValue.annotation.documentation }}</span>
        </option>
      </select>
    </template>
    
    <template v-else-if="isComplexType">
      <ComplexTypeSelector
        :type-name="field.type"
        @type-selected="onComplexTypeSelected"
      />
      <div v-if="value" class="mt-2 p-2 bg-gray-100 rounded text-sm">
        <pre>{{ JSON.stringify(value, null, 2) }}</pre>
      </div>
    </template>
    
    <template v-else-if="fieldType === 'boolean'">
      <select
        :value="value"
        @change="onInput($event.target.value)"
        class="w-full p-2 border border-gray-300 rounded"
        :required="isRequired"
      >
        <option value="">-- Выберите --</option>
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    </template>
    
    <template v-else-if="fieldType === 'date'">
      <input
        :value="value"
        @input="onInput($event.target.value)"
        type="date"
        class="w-full p-2 border border-gray-300 rounded"
        :required="isRequired"
      />
    </template>
    
    <template v-else>
      <input
        :value="value"
        @input="onInput($event.target.value)"
        type="text"
        class="w-full p-2 border border-gray-300 rounded"
        :required="isRequired"
        :pattern="field.simpleType?.restriction?.pattern"
        :placeholder="getPlaceholder()"
      />
    </template>
    
    <div v-if="field.simpleType?.restriction?.pattern" class="text-xs text-gray-500 mt-1">
      Паттерн: {{ field.simpleType.restriction.pattern }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ComplexTypeSelector from './ComplexTypeSelector.vue';

interface Props {
  field: any;
  fieldKey: string;
  fieldPath: string;
  value: any;
  isAttribute?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', path: string, value: any): void;
}>();

const isRequired = computed(() => {
  if (props.isAttribute) {
    return props.field.use === 'required';
  }
  return props.field.minOccurs !== '0';
});

const isEnum = computed(() => {
  return props.field.simpleType?.restriction?.enumerations;
});

const isComplexType = computed(() => {
  const complexTypes = ['KSIIdentification', 'Condition', 'Organization', 'Link', 'ReqElement'];
  return complexTypes.includes(props.field.type);
});

const fieldType = computed(() => {
  if (!props.field.type) return 'string';
  
  const typeMap: { [key: string]: string } = {
    'xs:string': 'string',
    'xs:integer': 'number',
    'xs:decimal': 'number',
    'xs:boolean': 'boolean',
    'xs:date': 'date',
    'xs:dateTime': 'datetime'
  };
  
  return typeMap[props.field.type] || 'string';
});

const onInput = (newValue: any) => {
  emit('update', props.fieldPath, newValue);
};

const onComplexTypeSelected = (instance: any) => {
  emit('update', props.fieldPath, instance.data);
};

const getPlaceholder = (): string => {
  if (props.field.simpleType?.restriction?.pattern) {
    return `Должно соответствовать: ${props.field.simpleType.restriction.pattern}`;
  }
  return `Введите ${props.field.annotation?.documentation || props.fieldKey}`;
};
</script>