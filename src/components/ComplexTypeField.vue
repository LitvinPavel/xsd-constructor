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
        @change="onInput"
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
        <ComplexTypeInstanceView 
          :data="value" 
          :type-definition="getComplexTypeDefinition(field.type)"
        />
      </div>
    </template>

    <template v-else-if="hasNestedComplexType">
      <!-- Вложенный complexType (как в EqualityCondition) -->
      <div class="space-y-3 p-3 border border-gray-300 rounded-lg bg-white">
        <div 
          v-for="(nestedField, nestedKey) in field.complexType.sequence" 
          :key="nestedKey"
          class="mb-3"
        >
          <ComplexTypeField 
            :field="nestedField"
            :field-key="String(nestedKey)"
            :field-path="`${fieldPath}.${nestedKey}`"
            :value="getNestedValue(nestedKey)"
            @update="onNestedFieldUpdate"
          />
        </div>
        
        <!-- Атрибуты вложенного complexType -->
        <div 
          v-for="(attr, attrKey) in field.complexType.attributes" 
          :key="`attr_${attrKey}`"
          class="mb-3"
        >
          <ComplexTypeField 
            :field="attr"
            :field-key="String(attrKey)"
            :field-path="`${fieldPath}.attributes.${attrKey}`"
            :value="getNestedAttribute(attrKey)"
            @update="onNestedFieldUpdate"
            is-attribute
          />
        </div>
      </div>
    </template>
    
    <template v-else-if="fieldType === 'boolean'">
      <select
        :value="value"
        @change="onInput"
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
        @input="onInput"
        type="date"
        class="w-full p-2 border border-gray-300 rounded"
        :required="isRequired"
      />
    </template>
    
    <template v-else>
      <input
        :value="value"
        @input="onInput"
        type="text"
        class="w-full p-2 border border-gray-300 rounded"
        :required="isRequired"
        
        :placeholder="getPlaceholder()"
      />
    </template>
    
    <div v-if="field.simpleType?.restriction?.pattern" class="text-xs text-gray-500 mt-1">
      Паттерн: {{ field.simpleType.restriction.pattern }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import ComplexTypeSelector from '@/components/ComplexTypeSelector.vue';
import ComplexTypeInstanceView from '@/components/ComplexTypeInstanceView.vue';

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

const schema = inject('schema', { complexTypes: null });

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

const onInput = (e: Event) => {
  const { value } = e.target as HTMLInputElement
  emit('update', props.fieldPath, value);
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

// Проверка наличия вложенного complexType
const hasNestedComplexType = computed(() => {
  return props.field.complexType && 
    (props.field.complexType.sequence || props.field.complexType.all || props.field.complexType.attributes);
});

// Получение определения complexType
const getComplexTypeDefinition = (typeName: string) => {
  return schema.complexTypes?.[typeName];
};

// Получение вложенного значения
const getNestedValue = (nestedKey: string | number) => {
  if (!props.value || typeof props.value !== 'object') return '';
  return props.value[nestedKey];
};

// Получение вложенного атрибута
const getNestedAttribute = (attrKey: string | number) => {
  if (!props.value || typeof props.value !== 'object' || !props.value.attributes) return '';
  return props.value.attributes[attrKey];
};

// Обработка обновления вложенных полей
const onNestedFieldUpdate = (nestedPath: string, nestedValue: any) => {
  const fullPath = `${props.fieldPath}.${nestedPath}`;
  emit('update', fullPath, nestedValue);
};
</script>