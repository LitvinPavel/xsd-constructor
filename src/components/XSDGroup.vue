<template>
  <div class="mb-4" :class="level === 0 ? 'border border-gray-200 rounded-lg p-4' : `ml-${level * 2} pl-4 border-l-2 border-gray-300`">
    <!-- Группа для complexType с sequence -->
    <div
      v-if="
        !element.type &&
        (element.complexType?.sequence || element.complexType?.all)
      "
      class="w-full"
    >
      <div class="mb-4 pb-2 flex justify-between items-start flex-wrap gap-4">
        <div class="flex items-center gap-2">
          <button
            @click="toggleExpanded"
            class="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              v-if="isExpanded"
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            <svg
              v-else
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <h3 v-if="element.annotation?.documentation" class="text-lg font-semibold text-gray-800 m-0">
            {{ element.annotation.documentation }}
          </h3>
        </div>

        <!-- Кнопка добавления для Entities, Relations и Properties -->
        <button
          v-if="isCollectionElement(element.name)"
          @click="handleAddItem"
          class="bg-green-500 text-white border-none py-2 px-4 rounded cursor-pointer text-sm transition-colors hover:bg-green-600 whitespace-nowrap"
          type="button"
        >
          + Добавить {{ getItemTypeDisplayName(element.name) }}
        </button>
      </div>

      <div v-show="isExpanded">
        <!-- Рендеринг элементов из sequence -->
        <template v-if="element.complexType?.sequence">
          <div
            v-for="(item, key) in element.complexType.sequence"
            :key="String(key)"
            class="mb-4"
            :class="{
              'border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 bg-gray-50': isTemplateItem(element.name, String(key))
            }"
          >
            <div class="flex justify-end">
              <button
                v-if="canRemoveItem(element.name, String(key))"
                @click="removeItem(String(key))"
                class="bg-red-500 text-white border-none py-1 px-2 rounded cursor-pointer text-sm hover:bg-red-600"
                type="button"
              >
                × Удалить
              </button>
            </div>
            <XSDGroup
              :element="item"
              :level="level + 1"
              :parent-path="getItemPath(String(key))"
              @update-value="handleChildUpdate"
              @add-item="handleChildAddItem"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Поле для сложных типов -->
  <div v-else-if="element.type && isComplexType(element.type)" class="mb-3">
      <label class="flex flex-col gap-1">
        <span
          v-if="element.annotation?.documentation"
          class="text-xs text-gray-500 italic"
        >
          {{ element.annotation.documentation }}
        </span>
        
        <div class="flex gap-2 items-start">
          <ComplexTypeSelector
            :type-name="element.type"
            @type-selected="onComplexTypeSelected"
            class="flex-1"
          />
          
          <button
            v-if="hasComplexTypeValue"
            @click="clearComplexType"
            class="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 whitespace-nowrap"
            type="button"
          >
            Очистить
          </button>
        </div>

        <!-- Отображение выбранного complexType в читаемом виде -->
        <div v-if="hasComplexTypeValue" class="mt-3 p-4 bg-gray-50 rounded-lg border">
          <h4 class="font-medium text-gray-700 mb-3">Выбранный {{ element.type }}:</h4>
          <ComplexTypeDisplay 
            :data="element.value"
            :type-definition="getComplexTypeDefinition(element.type)"
          />
        </div>
      </label>
    </div>

    <!-- Простой элемент с типом -->
    <div v-else class="mb-3">
      <label class="flex flex-col gap-1">
        <span
          v-if="element.annotation?.documentation"
          class="text-xs text-gray-500 italic"
        >
          {{ element.annotation.documentation }}
        </span>
        <input
          :type="getInputType(element.type)"
          :value="getElementValue()"
          @input="handleInputChange($event)"
          class="py-2 px-3 border border-gray-300 rounded text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :placeholder="`Введите значение для ${element.name}`"
          :class="{
            'w-auto mr-2': getInputType(element.type) === 'checkbox'
          }"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, inject } from 'vue';
import ComplexTypeSelector from './ComplexTypeSelector.vue';
import ComplexTypeDisplay from './ComplexTypeDisplay.vue';

interface Props {
  element: any;
  level: number;
  parentPath?: string;
  complexTypesStore?: any;
}

interface Emits {
  (e: 'update-value', path: string, value: any): void;
  (e: 'add-item', path: string, itemType: 'Entity' | 'Relation' | 'Property'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const schema = inject('schema', {});

const isExpanded = ref(true);

// Вычисляемый путь к элементу
const currentPath = computed(() => {
  return props.parentPath || props.element.name;
});

const isComplexType = (type: string): boolean => {
  const complexTypes = ['KSIIdentification', 'Condition', 'Organization', 'Link', 'ReqElement'];
  return complexTypes.includes(type);
};

// Проверка наличия значения complexType
const hasComplexTypeValue = computed(() => {
  return props.element.value && typeof props.element.value === 'object' && Object.keys(props.element.value).length > 0;
});

// Получение определения complexType
const getComplexTypeDefinition = (typeName: string) => {
  return schema?.complexTypes?.[typeName];
};

// Обработка выбора complexType
const onComplexTypeSelected = (instance: any) => {
  const path = currentPath.value;
  console.log('Complex type selected for path:', path, instance);
  
  // Сохраняем данные complexType
  if (instance && instance.data) {
    emit('update-value', path, instance.data);
  }
};

// Очистка complexType
const clearComplexType = () => {
  const path = currentPath.value;
  emit('update-value', path, null);
};

// Переключение состояния раскрытия/скрытия
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

// Получение типа элемента на основе имени
const getItemType = (): 'Entity' | 'Relation' | 'Property' => {
  if (props.element.name === 'Entities') return 'Entity';
  if (props.element.name === 'Relations') return 'Relation';
  if (props.element.name === 'Properties') return 'Property';
  return 'Entity'; // fallback
};

// Получение отображаемого имени для кнопки
const getItemTypeDisplayName = (elementName: string): string => {
  const typeMap: { [key: string]: string } = {
    'Entities': 'Entity',
    'Relations': 'Relation',
    'Properties': 'Property'
  };
  return typeMap[elementName] || elementName;
};

// Проверка, является ли элемент коллекцией (Entities, Relations, Properties)
const isCollectionElement = (elementName: string): boolean => {
  return ['Entities', 'Relations', 'Properties'].includes(elementName);
};

// Получение пути для элемента
const getItemPath = (key: string): string => {
  return `${currentPath.value}.${key}`;
};

// Получение текущего значения элемента
const getElementValue = (): any => {
  return props.element.value || '';
};

// Определение типа input на основе типа XSD
const getInputType = (xsdType: string | undefined): string => {
  if (!xsdType) return 'text';

  const typeMap: { [key: string]: string } = {
    'xs:string': 'text',
    'xs:integer': 'number',
    'xs:decimal': 'number',
    'xs:float': 'number',
    'xs:double': 'number',
    'xs:boolean': 'checkbox',
    'xs:date': 'date',
    'xs:dateTime': 'datetime-local',
    'xs:time': 'time',
  };

  return typeMap[xsdType] || 'text';
};

// Обработка изменения input
const handleInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value: any = target.value;

  if (target.type === 'number') {
    value = target.valueAsNumber || target.value;
  } else if (target.type === 'checkbox') {
    value = target.checked;
  }

  console.log(`Updating value for ${currentPath.value}:`, value);
  emit('update-value', currentPath.value, value);
};

// Обработка обновления от дочерних элементов
const handleChildUpdate = (path: string, value: any) => {
  emit('update-value', path, value);
};

// Обработка добавления нового Entity/Relation/Property
const handleAddItem = async () => {
  await nextTick();
  const itemType = getItemType();
  console.log('Adding item with type:', itemType, 'at path:', currentPath.value);
  emit('add-item', currentPath.value, itemType);
};

// Обработка добавления от дочерних элементов
const handleChildAddItem = async (path: string, itemType: 'Entity' | 'Relation' | 'Property') => {
  await nextTick();
  console.log('Child adding item with type:', itemType, 'at path:', path);
  emit('add-item', path, itemType);
};

// Получение индекса элемента по ключу
const getItemIndex = (key: string): number => {
  if (!props.element.complexType?.sequence) return 0;
  
  const keys = Object.keys(props.element.complexType.sequence);
  return keys.indexOf(key);
};

// Проверка, является ли элемент шаблонным (первым в списке)
const isTemplateItem = (elementName: string, key: string): boolean => {
  const templateKeys: { [key: string]: string } = {
    'Entities': 'Entity',
    'Relations': 'Relation',
    'Properties': 'Property'
  };
  return key.startsWith(templateKeys[elementName] as string);
};

// Проверка, можно ли удалить элемент
const canRemoveItem = (elementName: string, key: string): boolean => {
  const index = getItemIndex(key);
  const prefixMap: { [key: string]: string } = {
    'Entities': 'Entity_',
    'Relations': 'Relation_',
    'Properties': 'Property_'
  };
  
  return !!(index > 0 &&
         prefixMap[elementName] &&
         key.startsWith(prefixMap[elementName]));
};

// Удаление элемента
const removeItem = (key: string) => {
  const prefixMap: { [key: string]: string } = {
    'Entities': 'Entity_',
    'Relations': 'Relation_',
    'Properties': 'Property_'
  };
  
  const prefix = prefixMap[props.element.name];
  
  if (props.element.complexType?.sequence && 
      props.element.complexType.sequence[key] &&
      prefix &&
      key.startsWith(prefix)) {
    delete props.element.complexType.sequence[key];
  }
};
</script>