<template>
  <div class="xsd-group" :class="`level-${level}`">
    <!-- Группа для complexType с sequence -->
    <div
      v-if="
        !element.type &&
        (element.complexType?.sequence || element.complexType?.all)
      "
      class="complex-group"
    >
      <div class="group-header">
        <h3 class="group-title">{{ element.name }}</h3>
        <p v-if="element.annotation?.documentation" class="group-description">
          {{ element.annotation.documentation }}
        </p>

        <!-- Кнопка добавления для Entities, Relations и Properties -->
        <button
          v-if="isCollectionElement(element.name)"
          @click="handleAddItem"
          class="add-item-btn"
          type="button"
        >
          + Добавить {{ getItemTypeDisplayName(element.name) }}
        </button>
      </div>

      <div class="group-content">
        <!-- Рендеринг элементов из sequence -->
        <template v-if="element.complexType?.sequence">
          <div
            v-for="(item, key) in element.complexType.sequence"
            :key="String(key)"
            class="child-element"
            :class="{ 'dynamic-item': isDynamicItem(element.name, String(key)) }"
          >
            <div class="item-header">
              <h4 class="item-title">
                {{ getItemDisplayName(item.name, String(key)) }}
                <span
                  v-if="isTemplateItem(element.name, String(key))"
                  class="template-badge"
                  >(из схемы)</span
                >
                <span
                  v-else-if="isDynamicItem(element.name, String(key))"
                  class="dynamic-badge"
                  >(добавлен)</span
                >
              </h4>
              <button
                v-if="canRemoveItem(element.name, String(key))"
                @click="removeItem(String(key))"
                class="remove-item-btn"
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
    <div v-else class="simple-element">
      <label class="element-label">
        <span class="label-text">{{ element.name }}</span>
        <span
          v-if="element.annotation?.documentation"
          class="label-description"
        >
          {{ element.annotation.documentation }}
        </span>
        <input
          :type="getInputType(element.type)"
          :value="getElementValue()"
          @input="handleInputChange($event)"
          class="element-input"
          :placeholder="`Введите значение для ${element.name}`"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';

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

// Вычисляемый путь к элементу
const currentPath = computed(() => {
  return props.parentPath || props.element.name;
});

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

// Получение отображаемого имени элемента
const getItemDisplayName = (itemName: string, key: string): string => {
  const elementName = props.element.name;
  
  if (elementName === 'Entities' && itemName === 'Entity') {
    return `Entity ${getItemIndex(key) + 1}`;
  }
  if (elementName === 'Relations' && itemName === 'Relation') {
    return `Relation ${getItemIndex(key) + 1}`;
  }
  if (elementName === 'Properties' && itemName === 'Property') {
    return `Property ${getItemIndex(key) + 1}`;
  }
  return itemName;
};

// Получение индекса элемента по ключу
const getItemIndex = (key: string): number => {
  if (!props.element.complexType?.sequence) return 0;
  
  const keys = Object.keys(props.element.complexType.sequence);
  return keys.indexOf(key);
};

// Проверка, является ли элемент шаблонным (первым в списке)
const isTemplateItem = (elementName: string, key: string): boolean => {
  const index = getItemIndex(key);
  const templateKeys: { [key: string]: string[] } = {
    'Entities': ['Entity'],
    'Relations': ['Relation'],
    'Properties': ['Property']
  };
  
  return index === 0 && 
         templateKeys[elementName]?.includes(key) === true;
};

// Проверка, является ли элемент динамическим (добавленным)
const isDynamicItem = (elementName: string, key: string): boolean => {
  const index = getItemIndex(key);
  const prefixMap: { [key: string]: string } = {
    'Entities': 'entity_',
    'Relations': 'relation_',
    'Properties': 'property_'
  };
  
  return !!(index > 0 && 
         prefixMap[elementName] &&
         key.startsWith(prefixMap[elementName]));
};

// Проверка, можно ли удалить элемент
const canRemoveItem = (elementName: string, key: string): boolean => {
  const index = getItemIndex(key);
  const prefixMap: { [key: string]: string } = {
    'Entities': 'entity_',
    'Relations': 'relation_',
    'Properties': 'property_'
  };
  
  return !!(index > 0 &&
         prefixMap[elementName] &&
         key.startsWith(prefixMap[elementName]));
};

// Удаление элемента
const removeItem = (key: string) => {
  const prefixMap: { [key: string]: string } = {
    'Entities': 'entity_',
    'Relations': 'relation_',
    'Properties': 'property_'
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

<style scoped>
.xsd-group {
  margin-bottom: 1rem;
}

.level-0 {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.level-1 {
  margin-left: 1rem;
  padding-left: 1rem;
  border-left: 2px solid #d1d5db;
}

.complex-group {
  width: 100%;
}

.group-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.group-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  font-style: italic;
  flex-basis: 100%;
}

.dynamic-item {
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #f9fafb;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.item-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.template-badge, .dynamic-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

.template-badge {
  background: #dbeafe;
  color: #1e40af;
}

.dynamic-badge {
  background: #dcfce7;
  color: #166534;
}

.remove-item-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
}

.remove-item-btn:hover {
  background: #dc2626;
}

.add-item-btn {
  background: #10b981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.add-item-btn:hover {
  background: #059669;
}

.group-content {
}

.simple-element {
  margin-bottom: 0.75rem;
}

.element-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label-text {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.label-description {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
}

.element-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.element-input:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: #3b82f6;
}

.element-input[type='checkbox'] {
  width: auto;
  margin-right: 0.5rem;
}
</style>