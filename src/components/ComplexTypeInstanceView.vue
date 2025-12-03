<!-- ComplexTypeInstanceView.vue (упрощенный) -->
<template>
  <div class="complex-type-instance-view">
    <!-- Основные поля -->
    <div v-for="(value, key) in data" :key="key">
      <!-- Пропускаем атрибуты - они отображаются отдельно -->
      <template v-if="`${key}` !== 'attributes'">
        <div class="flex items-start py-1 border-b border-gray-100">
          <div class="w-1/3 font-medium text-sm text-gray-700 pr-2">
            {{ getFieldLabel(`${key}`) }}
          </div>
          <div class="w-2/3 text-sm">
            <template v-if="isComplexTypeValue(value, `${key}`)">
              <!-- Рекурсивный вызов для вложенных complexType -->
              <ComplexTypeInstanceView 
                :data="value" 
                :type-definition="getNestedTypeDefinition(`${key}`)"
                class="ml-2 pl-2 border-l border-gray-300"
              />
            </template>
            <template v-else-if="Array.isArray(value)">
              <div v-for="(item, index) in value" :key="index" class="mb-1">
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {{ formatValue(item) }}
                </span>
              </div>
            </template>
            <template v-else>
              <span class="text-gray-900">{{ formatValue(value) }}</span>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Атрибуты -->
    <div v-if="data.attributes && Object.keys(data.attributes).length > 0" class="mt-2 pt-2 border-t border-gray-200">
      <div class="text-xs font-semibold text-gray-500 mb-2">Атрибуты:</div>
      <div v-for="(value, key) in data.attributes" :key="`attr_${key}`" class="flex items-center py-1">
        <div class="w-1/3 font-medium text-sm text-gray-600 pr-2 text-xs">
          {{ key }}
        </div>
        <div class="w-2/3 text-sm">
          <span class="text-gray-700">{{ formatValue(value) }}</span>
        </div>
      </div>
    </div>

    <!-- Сообщение, если данных нет -->
    <div v-if="!hasData" class="text-sm text-gray-500 italic py-2">
      Нет данных
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  data: any;
  typeDefinition?: any;
}

const props = defineProps<Props>();

const hasData = computed(() => {
  if (!props.data) return false;
  
  const keys = Object.keys(props.data);
  if (keys.length === 0) return false;
  if (keys.length === 1 && keys[0] === 'attributes') {
    return Object.keys(props.data.attributes || {}).length > 0;
  }
  
  return true;
});

const getFieldLabel = (fieldKey: string): string => {
  if (!props.typeDefinition) return fieldKey;
  
  // Ищем документацию в all
  if (props.typeDefinition.all?.[fieldKey]?.annotation?.documentation) {
    return props.typeDefinition.all[fieldKey].annotation.documentation;
  }
  
  // Ищем документацию в sequence
  if (props.typeDefinition.sequence?.[fieldKey]?.annotation?.documentation) {
    return props.typeDefinition.sequence[fieldKey].annotation.documentation;
  }
  
  // Ищем документацию в choice
  if (props.typeDefinition.choice?.elements?.[fieldKey]?.annotation?.documentation) {
    return props.typeDefinition.choice.elements[fieldKey].annotation.documentation;
  }
  
  return fieldKey;
};

const isComplexTypeValue = (value: any, fieldKey: string): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  
  // Для упрощения считаем объектом complexType
  return true;
};

const getNestedTypeDefinition = (fieldKey: string): any => {
  if (!props.typeDefinition) return null;
  
  // Ищем в all
  if (props.typeDefinition.all?.[fieldKey]?.complexType) {
    return props.typeDefinition.all[fieldKey].complexType;
  }
  
  // Ищем в sequence
  if (props.typeDefinition.sequence?.[fieldKey]?.complexType) {
    return props.typeDefinition.sequence[fieldKey].complexType;
  }
  
  return null;
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return '[Object]';
  return String(value);
};
</script>