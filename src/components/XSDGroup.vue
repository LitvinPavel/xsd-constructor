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
import { computed, nextTick, ref } from 'vue';

interface Props {
  element: any;
  level: number;
  parentPath?: string;
}

interface Emits {
  (e: 'update-value', path: string, value: any): void;
  (e: 'add-item', path: string, itemType: 'Entity' | 'Relation' | 'Property'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isExpanded = ref(true);

// Вычисляемый путь к элементу
const currentPath = computed(() => {
  return props.parentPath || props.element.name;
});

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