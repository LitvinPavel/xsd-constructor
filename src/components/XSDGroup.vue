<!-- components/XSDGroup.vue -->
<template>
  <div class="mb-1" :class="[level === 0 ? 'p-4' : `ml-${level * 2} pl-4`]">
    <div v-if="!element.type && element.complexType?.sequence" class="w-full">
      <div
        v-if="element.annotation?.documentation"
        class="mb-1 pb-1 flex justify-between items-start flex-wrap gap-4"
      >
        <div class="flex items-center gap-2">
          <button
            v-if="
              Object.keys(element.complexType?.sequence || {}).length > 1 &&
              level > 0
            "
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
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <svg
              v-else
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <h3 class="font-semibold text-gray-800 m-0">
            {{ element.annotation.documentation }}
          </h3>
        </div>

        <div v-if="isEntitiesOrPropertiesOrRelations" class="flex gap-2">
          <button
            @click="handleAddElement(element.name)"
            class="bg-green-500 text-white border-none py-2 px-4 rounded cursor-pointer text-sm transition-colors hover:bg-green-600 whitespace-nowrap"
            type="button"
          >
            + Добавить
          </button>
        </div>
      </div>

      <div v-show="isExpanded">
        <template v-if="isReqElementExtension">
          <div class="p-2 mb-1">
            <div
              v-for="(field, key) in schema?.complexTypes?.ReqElement
                ?.attributes"
              :key="key"
              class="flex items-center gap-4 mb-3"
            >
              <label class="w-1/4 text-sm">
                {{ field.annotation?.documentation || field.name }}
              </label>
              <input
                type="text"
                :value="element.value.attributes[key]"
                disabled
                @input="onReqElementTypeChange"
                class="flex-1 py-2 px-3 border border-gray-300 rounded text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                :placeholder="`Введите значение для ${field.name}`"
              />
            </div>
            <div
              v-for="(field, key) in element.complexType.complexContent
                .extension?.attributes"
              :key="key"
              class="flex items-center gap-4 mb-3"
            >
              <label class="w-1/4 text-sm">
                {{ field.annotation?.documentation || field.name }}
              </label>
              <input
                type="text"
                :value="element.value.attributes[key]"
                @input="onReqElementUidChange"
                class="flex-1 py-2 px-3 border border-gray-300 rounded text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                :placeholder="`Введите значение для ${field.name}`"
              />
            </div>
            <div
              v-for="field in schema?.complexTypes?.ReqElement?.sequence"
              :key="field.name"
              class="flex items-center gap-4 mb-3"
            >
              <label class="w-1/4 text-sm">
                {{ field.annotation?.documentation || field.name }}
              </label>
              <textarea
                v-if="field.name === 'ReqElementData'"
                :value="getReqElementFieldValue(field.name)"
                @input="onReqElementFieldChange(field.name, $event)"
                class="flex-1 py-2 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 font-mono"
                rows="6"
                :placeholder="`Введите значение для ${field.name}`"
              ></textarea>
              <input
                v-else
                :type="getInputType(field.type)"
                :value="getReqElementFieldValue(field.name)"
                @input="onReqElementFieldChange(field.name, $event)"
                class="flex-1 py-2 px-3 border border-gray-300 rounded text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                :placeholder="`Введите значение для ${field.name}`"
              />
            </div>
          </div>
        </template>

        <template v-else-if="element.complexType?.sequence">
          <div
            v-for="(item, key) in element.complexType.sequence"
            :key="String(key)"
            class="mb-1"
            :class="{ 'border rounded-lg border-gray-300 pr-4 pt-2': canRemoveItem(item.name) }"
          >
            <div v-if="canRemoveItem(item.name)" class="flex justify-end -mb-6">
              <button
                @click="removeItem(String(key))"
                class="bg-red-500 text-white border-none py-1 px-2 rounded cursor-pointer text-sm hover:bg-red-600"
                type="button"
                :disabled="isKSIIdentificationField(item)"
              >
                × Удалить
              </button>
            </div>
            <XSDGroup
              :element="item"
              :level="level + 1"
              :parent-path="getItemPath(String(key))"
              :current-entity-path="
                element.name === 'Entities'
                  ? getItemPath(String(key))
                  : currentEntityPath
              "
              @update-value="handleChildUpdate"
              @add-entity="handleChildAddEntity"
              @add-property="handleChildAddProperty"
              @add-relation="handleChildAddRelation"
            />
          </div>
        </template>

        <template v-if="element.complexType?.all">
          <div
            v-for="(item, key) in element.complexType.all"
            :key="String(key)"
            class="mb-1"
          >
            <XSDGroup
              :element="item"
              :level="level + 1"
              :parent-path="getItemPath(String(key))"
              :current-entity-path="currentEntityPath"
              @update-value="handleChildUpdate"
              @add-entity="handleChildAddEntity"
              @add-property="handleChildAddProperty"
              @add-relation="handleChildAddRelation"
            />
          </div>
        </template>
      </div>
    </div>

    <div v-else-if="element.type && isComplexType(element.type)" class="mb-3">
      <label class="flex items-center w-full gap-4">
        <span
          v-if="element.annotation?.documentation"
          class="w-1/4 text-sm"
        >
          {{ element.annotation.documentation }}
        </span>

        <div class="flex-1">
          <div class="flex gap-2 items-start flex-1">
          <select
            v-model="selectedComplexTypeId"
            @change="onComplexTypeSelected"
            class="flex-1 py-2 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            :disabled="isKSIIdentificationField(element)"
          >
            <option value="">-- Выберите из списка --</option>
            <option
              v-for="instance in availableMockInstances"
              :key="instance.id"
              :value="instance.id"
            >
              {{ instance.annotation?.documentation || instance.name }}
            </option>
          </select>

          <button
            v-if="hasComplexTypeValue && !isKSIIdentificationField(element)"
            @click="clearComplexType"
            class="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 whitespace-nowrap"
            type="button"
          >
            Очистить
          </button>
        </div>
        <div
          v-if="hasComplexTypeValue"
          class="p-4 bg-gray-100 rounded-b-lg border-x border-b border-gray-300"
        >
          <ComplexTypeInstanceView
            :data="element.value"
            :type-definition="getComplexTypeDefinition(element.type)"
          />
        </div>
        </div>

        
      </label>
      
    </div>

    <div v-else-if="element.type || element.simpleType" class="mb-3">
      <label class="flex items-center w-full gap-4">
        <span
          v-if="element.annotation?.documentation"
          class="w-1/4 text-sm"
        >
          {{ element.annotation.documentation }}
        </span>
        <input
          :type="getInputType(element.type)"
          :value="getElementValue()"
          @input="handleInputChange($event)"
          class="py-2 px-3 border border-gray-300 rounded text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          :class="{ 'flex-1': getInputType(element.type) !== 'checkbox' }"
          :placeholder="`Введите значение для ${element.name}`"
        />
      </label>
    </div>

    <div
      v-if="showEntitySelector"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto"
      >
        <h3 class="text-lg font-semibold mb-4">Выберите Entity</h3>
        <div class="space-y-2">
          <button
            v-for="entity in mockEntities"
            :key="entity.id"
            @click="selectEntity(entity)"
            class="w-full text-left p-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <div class="font-medium">
              {{ entity.annotation?.documentation || entity.name }}
            </div>
            <div class="text-sm text-gray-600">Тип: {{ entity.type }}</div>
            <div class="text-xs text-gray-500 mt-1">
              Привязан к KSI: {{ entity.data.EntityID?.KSIUIN || "Нет" }}
            </div>
          </button>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            @click="showEntitySelector = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showPropertySelector"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto"
      >
        <h3 class="text-lg font-semibold mb-4">Выберите Property</h3>
        <div class="space-y-2">
          <button
            v-for="property in mockProperties"
            :key="property.id"
            @click="selectProperty(property)"
            class="w-full text-left p-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <div class="font-medium">
              {{ property.annotation?.documentation || property.name }}
            </div>
            <div class="text-sm text-gray-600">Тип: {{ property.type }}</div>
            <div class="text-xs text-gray-500 mt-1">
              Привязан к KSI: {{ property.data.PropertyID?.KSIUIN || "Нет" }}
            </div>
          </button>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            @click="showPropertySelector = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, inject, watch } from "vue";
import ComplexTypeInstanceView from "@/components/ComplexTypeInstanceView.vue";
import type { ComplexTypeInstance, XSDSchema } from "@/types";
import {
  isComplexType,
  canRemoveItem,
  isKSIIdentificationField,
  getInputType,
  decodeHTMLEntities,
  isReqElementExtension as isReqElementExtensionUtil,
} from "@/utils/xsdUtils";

interface Props {
  element: any;
  level: number;
  parentPath?: string;
  currentEntityPath?: string;
}

interface Emits {
  (e: "update-value", path: string, value: any): void;
  (e: "add-entity", path: string, entityData: any): void;
  (e: "add-property", path: string, propertyData: any): void;
  (e: "add-relation", path: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const schema: Partial<XSDSchema> = inject("schema", {});
const mockData: { [key: string]: ComplexTypeInstance[] } = inject(
  "mockData",
  {}
);

const isExpanded = ref(true);
const selectedComplexTypeId = ref("");
const showEntitySelector = ref(false);
const showPropertySelector = ref(false);

const mockEntities = computed(() => {
  return mockData.Entities || [];
});

const mockProperties = computed(() => {
  return mockData.Properties || [];
});

const isReqElementExtension = computed(() => {
  return isReqElementExtensionUtil(props.element);
});

const getReqElementFieldValue = (fieldName: string): any => {
  if (!props.element.value || typeof props.element.value !== "object")
    return "";
  return props.element.value[fieldName] || "";
};

const currentPath = computed(() => {
  return props.parentPath || props.element.name;
});

const hasComplexTypeValue = computed(() => {
  return (
    props.element.value &&
    typeof props.element.value === "object" &&
    Object.keys(props.element.value).length > 0
  );
});

const availableMockInstances = computed(() => {
  if (!props.element.type) return [];
  return mockData[props.element.type as keyof typeof mockData] || [];
});

const isEntitiesOrPropertiesOrRelations = computed(() => {
  return ["Entities", "Properties", "Relations"].includes(props.element.name);
});

const onComplexTypeSelected = () => {
  if (!selectedComplexTypeId.value) return;

  const instance = availableMockInstances.value.find(
    (inst: ComplexTypeInstance) => inst.id === selectedComplexTypeId.value
  );

  if (instance) {
    emit("update-value", currentPath.value, instance.data);
  }
};

const clearComplexType = () => {
  if (isKSIIdentificationField(props.element)) return;

  selectedComplexTypeId.value = "";
  emit("update-value", currentPath.value, null);
};

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const getItemPath = (key: string): string => {
  return `${currentPath.value}.${key}`;
};

const getElementValue = (): any => {
  return props.element.value || "";
};

const getComplexTypeDefinition = (typeName: string) => {
  return schema?.complexTypes?.[typeName];
};

const handleInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value: any = target.value;

  if (target.type === "number") {
    value = target.valueAsNumber || target.value;
  } else if (target.type === "checkbox") {
    value = target.checked;
  }

  emit("update-value", currentPath.value, value);
};

const handleChildUpdate = (path: string, value: any) => {
  emit("update-value", path, value);
};

const onReqElementTypeChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  const currentValue = props.element.value || {};
  const updatedValue = {
    ...currentValue,
    attributes: {
      ...currentValue.attributes,
      ReqElementType: value,
    },
  };

  emit("update-value", currentPath.value, updatedValue);
};

const onReqElementUidChange = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const currentValue = props.element.value || {};
  const updatedValue = {
    ...currentValue,
    attributes: {
      ...currentValue.attributes,
      ReqElementUId: value,
    },
  };

  emit("update-value", currentPath.value, updatedValue);
};

const onReqElementFieldChange = (fieldName: string, event: Event) => {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  const currentValue = props.element.value || {};
  const updatedValue = {
    ...currentValue,
    [fieldName]: decodeHTMLEntities(value),
  };

  emit("update-value", currentPath.value, updatedValue);
};

const selectEntity = (entity: ComplexTypeInstance) => {
  showEntitySelector.value = false;
  emit("add-entity", currentPath.value, entity);
};

const selectProperty = (property: ComplexTypeInstance) => {
  showPropertySelector.value = false;
  emit("add-property", currentPath.value, property);
};

function handleAddElement(name: string) {
  if (name === "Entities") {
    showEntitySelector.value = true;
  } else if (name === "Properties" && props.currentEntityPath) {
    showPropertySelector.value = true;
  } else if (name === "Relations") {
    handleAddRelation();
  }
}

const handleAddRelation = async () => {
  await nextTick();
  emit("add-relation", currentPath.value);
};

const handleChildAddEntity = (
  path: string,
  entityData: ComplexTypeInstance
) => {
  emit("add-entity", path, entityData);
};

const handleChildAddProperty = (
  path: string,
  propertyData: ComplexTypeInstance
) => {
  emit("add-property", path, propertyData);
};

const handleChildAddRelation = (path: string) => {
  emit("add-relation", path);
};

const removeItem = (key: string) => {
  const item = props.element.complexType?.sequence?.[key];
  if (item && canRemoveItem(item.name) && !isKSIIdentificationField(item)) {
    delete props.element.complexType.sequence[key];
  }
};

watch(
  () => props.element.value,
  (newValue) => {
    if (newValue && props.element.type && isComplexType(props.element.type)) {
      const instances = availableMockInstances.value;
      const matchingInstance = instances.find((inst: ComplexTypeInstance) => {
        return JSON.stringify(inst.data) === JSON.stringify(newValue);
      });

      if (matchingInstance) {
        selectedComplexTypeId.value = matchingInstance.id;
      }
    }
  },
  { immediate: true }
);
</script>
