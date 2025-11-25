<template>
  <div class="complex-type-display">
    <template v-for="(value, key) in data" >
        <div 
            :key="key"
            v-if="`${key}` !== 'attributes' && value !== undefined && value !== null && value !== ''"
            class="mb-2"
            >
            <div class="flex">
                <div class="w-1/3 font-medium text-gray-700 text-sm py-1">
                {{ getFieldLabel(key) }}:
                </div>
                <div class="w-2/3 text-gray-900 text-sm py-1">
                <template v-if="isNestedComplexType(value, key)">
                    <ComplexTypeDisplay 
                    :data="value"
                    :type-definition="getNestedTypeDefinition(key)"
                    class="ml-2 pl-2 border-l border-gray-300"
                    />
                </template>
                <template v-else>
                    {{ formatValue(value) }}
                </template>
                </div>
            </div>
            </div>
    </template>
    

    <!-- Атрибуты -->
    <div 
      v-if="data.attributes && Object.keys(data.attributes).length > 0" 
      class="mt-3 pt-3 border-t border-gray-200"
    >
      <div class="text-xs font-semibold text-gray-500 mb-2">Атрибуты:</div>
      <div 
        v-for="(value, key) in data.attributes" 
        :key="`attr_${key}`"
        v-if="value !== undefined && value !== null && value !== ''"
        class="flex mb-1"
      >
        <div class="w-1/3 font-medium text-gray-600 text-xs py-1">
          {{ key }}:
        </div>
        <div class="w-2/3 text-gray-700 text-xs py-1">
          {{ value }}
        </div>
      </div>
    </div>

    <!-- Сообщение об отсутствии данных -->
    <div 
      v-if="!hasData" 
      class="text-gray-500 text-sm italic py-2"
    >
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
  
  const mainKeys = Object.keys(props.data).filter(key => key !== 'attributes');
  const hasMainData = mainKeys.some(key => 
    props.data[key] !== undefined && 
    props.data[key] !== null && 
    props.data[key] !== ''
  );
  
  const hasAttributes = props.data.attributes && 
    Object.keys(props.data.attributes).some(key => 
      props.data.attributes[key] !== undefined && 
      props.data.attributes[key] !== null && 
      props.data.attributes[key] !== ''
    );
  
  return hasMainData || hasAttributes;
});

const getFieldLabel = (fieldKey: string | number): string => {
  if (!props.typeDefinition) return `${fieldKey}`;
  
  // Ищем в all
  if (props.typeDefinition.all?.[fieldKey]?.annotation?.documentation) {
    return props.typeDefinition.all[fieldKey].annotation.documentation;
  }
  
  // Ищем в sequence
  if (props.typeDefinition.sequence?.[fieldKey]?.annotation?.documentation) {
    return props.typeDefinition.sequence[fieldKey].annotation.documentation;
  }
  
  // Ищем в choice
  if (props.typeDefinition.choice?.elements?.[fieldKey]?.annotation?.documentation) {
    return props.typeDefinition.choice.elements[fieldKey].annotation.documentation;
  }
  
  return `${fieldKey}`;
};

const isNestedComplexType = (value: any, fieldKey: string): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  
  if (!props.typeDefinition) return false;
  
  // Проверяем в all
  if (props.typeDefinition.all?.[fieldKey]?.complexType) return true;
  if (props.typeDefinition.all?.[fieldKey]?.type && isComplexTypeName(props.typeDefinition.all[fieldKey].type)) return true;
  
  // Проверяем в sequence
  if (props.typeDefinition.sequence?.[fieldKey]?.complexType) return true;
  if (props.typeDefinition.sequence?.[fieldKey]?.type && isComplexTypeName(props.typeDefinition.sequence[fieldKey].type)) return true;
  
  return false;
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

const isComplexTypeName = (typeName: string): boolean => {
  const complexTypes = ['KSIIdentification', 'Condition', 'Organization', 'Link', 'ReqElement'];
  return complexTypes.includes(typeName);
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
</script>