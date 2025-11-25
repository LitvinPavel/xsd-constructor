<template>
  <div class="complex-type-form">
    <div class="mb-6">
      <h2 class="text-xl font-semibold mb-4">Управление сложными типами</h2>
      
      <!-- Выбор типа -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Выберите тип:
        </label>
        <select 
          v-model="selectedType" 
          class="w-full p-2 border border-gray-300 rounded"
          @change="onTypeChange"
          :disabled="!!targetType"
        >
          <option value="">-- Выберите тип --</option>
          <option 
            v-for="item in availableComplexTypeNames" 
            :key="item.value" 
            :value="item.value"
          >
            {{ item.title }}
          </option>
        </select>
        <div v-if="targetType" class="text-sm text-gray-600 mt-1">
          Создание типа: <strong>{{ targetType }}</strong>
        </div>
      </div>

      <!-- Форма для создания экземпляра типа -->
      <div v-if="currentType && complexTypeDefinition" class="border rounded-lg p-4 bg-white">
      <h3 class="text-lg font-medium mb-4">
        Создать {{ currentType }}
        <span v-if="complexTypeDefinition.annotation?.documentation" class="text-sm font-normal text-gray-600">
          - {{ complexTypeDefinition.annotation.documentation }}
        </span>
      </h3>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Название экземпляра (опционально):
        </label>
        <input
          v-model="instanceName"
          type="text"
          class="w-full p-2 border border-gray-300 rounded"
          :placeholder="`Экземпляр ${currentType}`"
        />
      </div>
      
      <form @submit.prevent="createComplexType">
        <!-- Элементы из sequence -->
        <div v-if="hasElements(complexTypeDefinition.sequence)" class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3">Обязательные элементы:</h4>
          <div 
            v-for="(field, key) in complexTypeDefinition.sequence" 
            :key="`seq_${key}`"
            class="mb-4 ml-4"
          >
            <ComplexTypeField 
              :field="field"
              :field-key="String(key)"
              :field-path="String(key)"
              :value="newInstance[key]"
              @update="onFieldUpdate"
            />
          </div>
        </div>

        <!-- Choice - выбор одного из элементов -->
        <div v-if="hasChoice" class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3">
            Выбор условия:
            <span v-if="complexTypeDefinition.choice?.annotation?.documentation" class="text-sm font-normal text-gray-600">
              - {{ complexTypeDefinition.choice.annotation.documentation }}
            </span>
          </h4>
          
          <div class="ml-4 space-y-4">
            <!-- Радио-кнопки для выбора типа условия -->
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Выберите тип условия:
              </label>
              <div class="space-y-2">
                <label 
                  v-for="(choice, key) in complexTypeDefinition.choice.elements" 
                  :key="`choice_${key}`"
                  class="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                  :class="selectedChoice === `${key}` ? 'bg-blue-50 border-blue-300' : 'border-gray-200'"
                >
                  <input
                    type="radio"
                    :value="key"
                    v-model="selectedChoice"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">{{ key }}</div>
                    <div v-if="choice.annotation?.documentation" class="text-sm text-gray-600">
                      {{ choice.annotation.documentation }}
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Форма выбранного условия -->
            <div v-if="selectedChoice" class="p-4 border border-gray-300 rounded-lg bg-gray-50">
              <h5 class="font-medium text-gray-700 mb-3">
                Параметры для {{ selectedChoice }}:
              </h5>
              
              <!-- Обработка вложенного complexType для выбранного условия -->
              <div v-if="selectedChoiceDefinition?.complexType">
                <!-- Элементы из sequence выбранного условия -->
                <div 
                  v-for="(field, key) in selectedChoiceDefinition.complexType.sequence" 
                  :key="`choice_seq_${key}`"
                  class="mb-4 ml-4"
                >
                  <ComplexTypeField 
                    :field="field"
                    :field-key="String(key)"
                    :field-path="`${selectedChoice}.${key}`"
                    :value="newInstance[selectedChoice]?.[key]"
                    @update="onChoiceFieldUpdate"
                  />
                </div>
                
                <!-- Атрибуты выбранного условия -->
                <div 
                  v-for="(attr, key) in selectedChoiceDefinition.complexType.attributes" 
                  :key="`choice_attr_${key}`"
                  class="mb-4 ml-4"
                >
                  <ComplexTypeField 
                    :field="attr"
                    :field-key="String(key)"
                    :field-path="`${selectedChoice}.attributes.${key}`"
                    :value="newInstance[selectedChoice]?.attributes?.[key]"
                    @update="onChoiceFieldUpdate"
                    is-attribute
                  />
                </div>
              </div>
              
              <!-- Обработка простых элементов в choice -->
              <div v-else>
                <ComplexTypeField 
                  :field="selectedChoiceDefinition"
                  :field-key="selectedChoice"
                  :field-path="selectedChoice"
                  :value="newInstance[selectedChoice]"
                  @update="onFieldUpdate"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Элементы из all -->
        <div v-if="hasElements(complexTypeDefinition.all)" class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3">Дополнительные элементы:</h4>
          <div 
            v-for="(field, key) in complexTypeDefinition.all" 
            :key="`all_${key}`"
            class="mb-4 ml-4"
          >
            <ComplexTypeField 
              :field="field"
              :field-key="String(key)"
              :field-path="String(key)"
              :value="newInstance[key]"
              @update="onFieldUpdate"
            />
          </div>
        </div>

        <!-- Атрибуты -->
        <div v-if="hasElements(complexTypeDefinition.attributes)" class="mb-6">
          <h4 class="font-medium text-gray-700 mb-3">Атрибуты:</h4>
          <div 
            v-for="(attr, key) in complexTypeDefinition.attributes" 
            :key="`attr_${key}`"
            class="mb-4 ml-4"
          >
            <ComplexTypeField 
              :field="attr"
              :field-key="String(key)"
              :field-path="`attributes.${key}`"
              :value="newInstance.attributes[key]"
              @update="onFieldUpdate"
              is-attribute
            />
          </div>
        </div>

        <div class="flex gap-2 mt-6">
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            :disabled="!isFormValid"
          >
            Создать
          </button>
          <button
            type="button"
            @click="resetForm"
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Сбросить
          </button>
        </div>
      </form>
    </div>

      <!-- Сообщение, если тип не найден -->
      <div v-else-if="currentType && !complexTypeDefinition" class="border rounded-lg p-4 bg-yellow-50">
        <p class="text-yellow-700">
          Определение для типа "{{ currentType }}" не найдено в загруженной XSD схеме.
        </p>
      </div>
    </div>

    <!-- Список созданных экземпляров -->
    <div v-if="createdInstances.length > 0" class="mt-8">
      <h3 class="text-lg font-medium mb-4">Созданные экземпляры</h3>
      <div class="space-y-4">
        <div
          v-for="instance in createdInstances"
          :key="instance.id"
          class="border rounded-lg p-4 bg-gray-50"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="font-medium">{{ instance.name || instance.type }}</h4>
              <div class="text-sm text-gray-600 mt-1">Тип: {{ instance.type }}</div>
              
              <!-- Отображение данных в читаемом виде -->
              <div class="mt-3 space-y-2">
                <ComplexTypeInstanceView 
                  :data="instance.data" 
                  :type-definition="getTypeDefinition(instance.type)"
                />
              </div>
            </div>
            <div class="flex gap-2 ml-4">
              <button
                @click="useInstance(instance)"
                class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 whitespace-nowrap"
              >
                Использовать
              </button>
              <button
                @click="deleteInstance(instance.id)"
                class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 whitespace-nowrap"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import ComplexTypeField from '@/components/ComplexTypeField.vue';
import ComplexTypeInstanceView from '@/components/ComplexTypeInstanceView.vue';
import type { ComplexTypeInstance, ComplexTypesStore } from '../composables/useComplexTypes';

interface XSDSchema {
  elements: { [key: string]: any };
  complexTypes: { [key: string]: any };
  simpleTypes: { [key: string]: any };
}

interface Props {
  schema: XSDSchema;
  targetType?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'instance-created', instance: ComplexTypeInstance): void;
}>();

const complexTypesStore: ComplexTypesStore | undefined = inject('complexTypesStore');

const selectedType = ref('');
const instanceName = ref('');
const newInstance = ref<any>({});
const selectedChoice = ref('');

const currentType = computed(() => props.targetType || selectedType.value);

// Вычисляемое свойство для проверки наличия choice
const hasChoice = computed(() => {
  return hasElements(complexTypeDefinition.value?.choice?.elements);
});

// Определение выбранного choice элемента
const selectedChoiceDefinition = computed(() => {
  if (!selectedChoice.value || !complexTypeDefinition.value?.choice) return null;
  return complexTypeDefinition.value.choice.elements[selectedChoice.value];
});

// Доступные имена complexTypes
const availableComplexTypeNames = computed(() => {
  if (!props.schema.complexTypes) return [];
  return Object.keys(props.schema.complexTypes).map(key => {
    return {
      title: props.schema.complexTypes[key]?.annotation?.documentation,
      value: key
    }
  });
});

// Используем instances из хранилища
const createdInstances = computed(() => {
  if (!complexTypesStore) return [];
  return complexTypesStore?.instances.value;
});

const getTypeDefinition = (typeName: string | number) => {
  return props.schema.complexTypes?.[typeName];
};

// Определение complexType
const complexTypeDefinition = computed(() => {
  if (!currentType.value || !props.schema.complexTypes) return null;
  return props.schema.complexTypes[currentType.value];
});

// Валидация формы
const isFormValid = computed(() => {
  if (!complexTypeDefinition.value) return false;
  
  // Здесь можно добавить более сложную валидацию
  return true;
});

// Проверка наличия элементов
const hasElements = (obj: any): boolean => {
  return obj && Object.keys(obj).length > 0;
};

// Если передан targetType, устанавливаем его автоматически
watch(() => props.targetType, (newTargetType) => {
  if (newTargetType) {
    selectedType.value = newTargetType;
    onTypeChange();
  }
}, { immediate: true });

const onTypeChange = () => {
  resetForm();
  if (complexTypeDefinition.value) {
    // Инициализация структуры
    initializeStructure();
  }
};

const initializeStructure = () => {
  newInstance.value = { attributes: {} };
  instanceName.value = '';
  selectedChoice.value = '';
  
  // Инициализируем поля из sequence
  if (complexTypeDefinition.value.sequence) {
    Object.keys(complexTypeDefinition.value.sequence).forEach(key => {
      newInstance.value[key] = '';
    });
  }
  
  // Инициализируем поля из all
  if (complexTypeDefinition.value.all) {
    Object.keys(complexTypeDefinition.value.all).forEach(key => {
      newInstance.value[key] = '';
    });
  }
  
  // Инициализируем атрибуты
  if (complexTypeDefinition.value.attributes) {
    Object.keys(complexTypeDefinition.value.attributes).forEach(key => {
      newInstance.value.attributes[key] = '';
    });
  }
};

// Обработка обновления полей в choice
const onChoiceFieldUpdate = (path: string, value: any) => {
  if (!selectedChoice.value) return;
  
  const fullPath = `${selectedChoice.value}.${path}`;
  onFieldUpdate(fullPath, value);
};

const onFieldUpdate = (path: string, value: any) => {
  // Обновляем значение по пути
  const pathParts = path.split('.');
  let current = newInstance.value;
  
  for (let i = 0; i < pathParts.length - 1; i++) {
    if (!current[pathParts[i] as string]) {
      current[pathParts[i] as string] = {};
    }
    current = current[pathParts[i] as string];
  }
  
  current[pathParts[pathParts.length - 1] as string] = value;
};

const createComplexType = () => {
  if (!currentType.value || !complexTypesStore) return;

  // Очищаем undefined значения и пустые объекты
  const cleanData = JSON.parse(JSON.stringify(newInstance.value));
  
  // Удаляем пустые choice элементы (кроме выбранного)
  if (complexTypeDefinition.value?.choice?.elements) {
    Object.keys(complexTypeDefinition.value.choice.elements).forEach(choiceKey => {
      if (choiceKey !== selectedChoice.value) {
        delete cleanData[choiceKey];
      }
    });
  }

  // Удаляем пустые атрибуты
  if (cleanData.attributes && Object.keys(cleanData.attributes).length === 0) {
    delete cleanData.attributes;
  }

  const instance = complexTypesStore.addInstance(
    currentType.value, 
    cleanData,
    instanceName.value || `Экземпляр ${currentType.value}`
  );

  console.log('Создан сложный тип:', instance);
  emit('instance-created', instance);
  resetForm();
};

const useInstance = (instance: ComplexTypeInstance) => {
  emit('instance-created', instance);
};

const deleteInstance = (id: string) => {
  if (complexTypesStore) {
    complexTypesStore.removeInstance(id);
  }
};

const resetForm = () => {
  newInstance.value = { attributes: {} };
  instanceName.value = '';
  selectedChoice.value = '';
};
</script>