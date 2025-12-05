<template>
  <div class="mb-4" :class="[level === 0 ? 'p-4' : `ml-${level * 2} pl-4`]">
    <div v-if="!element.type && element.complexType?.sequence" class="w-full">
      <div
        v-if="element.annotation?.documentation"
        class="mb-2 pb-2 border-b border-gray-200 flex justify-between items-start flex-wrap gap-4"
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
          <DxButton
            @click="handleAddElement(element.name)"
            :text="`+ Добавить`"
            type="default"
            styling-mode="contained"
            class="whitespace-nowrap"
          />
        </div>
      </div>

      <div v-show="isExpanded">
        <ReqElementExtensionField
          v-if="isReqElementExtension"
          :element="element"
          @update-value="emit('update-value', currentPath, $event)"
        />

        <template v-else-if="element.complexType?.sequence">
          <div
            v-for="(item, key) in element.complexType.sequence"
            :key="String(key)"
            class="mb-1"
            :class="{
              'border rounded-lg border-gray-200 p-4 pt-2': canRemoveItem(
                item.name
              ),
            }"
          >
            <div v-if="canRemoveItem(item.name)" class="flex justify-end mb-2">
              <DxButton
                @click="removeItem(String(key))"
                :text="'× Удалить'"
                type="danger"
                styling-mode="outlined"
                :disabled="isKSIIdentificationField(item)"
                class="text-sm"
              />
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
            class="mb-2"
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

        <template
          v-if="
            element?.complexType?.attributes &&
            Object.keys(element.complexType.attributes).length
          "
        >
          <div
            v-for="(attr, key) in element.complexType.attributes"
            :key="key"
            class="mb-2"
          >
            <BaseFieldSelect
              v-if="attr.simpleType?.restriction?.enumerations"
              v-model="attr.value"
              :options="attr.simpleType.restriction.enumerations"
              :name="attr.name"
              :label="attr.annotation.documentation"
              option-key="value"
              label-key="value"
            />
            <BaseFieldInput
              v-else-if="attr.type"
              :value="attr.value"
              :name="attr.name"
              :label="attr.annotation.documentation"
              :type="getInputType(attr.type)"
              :pattern="attr.pattern || attr.simpleType?.restriction?.pattern"
              @input="($event) => (attr.value = $event)"
            />
          </div>
        </template>
      </div>
    </div>

    <BaseFieldSelect
      v-else-if="element.type && isComplexType(element.type)"
      v-model="selectedComplexTypeId"
      :name="element.name"
      :label="element.annotation.documentation"
      :options="availableMockInstances"
      option-key="id"
      label-key="annotation.documentation"
      :disabled="isKSIIdentificationField(element)"
      :isСannotEnpty="isKSIIdentificationField(element)"
      @update:modelValue="onComplexTypeSelected"
    >
      <div
        v-if="hasComplexTypeValue"
        class="p-4 bg-gray-100 rounded-b-lg border-x border-b border-gray-300"
      >
        <ComplexTypeInstanceView
          :data="element.value"
          :type-definition="getComplexTypeDefinition(element.type)"
        />
      </div>
    </BaseFieldSelect>
    <div v-else-if="element.name === 'TailObjectId' || element.name === 'HeadObjectId'">
      <EntityIdFieldSelect :name="element.name" :label="element.annotation.documentation" @update-value="handleSelectEntity" />
    </div>
    <BaseFieldInput
      v-else-if="element.type || element.simpleType"
      :value="element.value || ''"
      :name="element.name"
      :label="element.annotation?.documentation"
      :type="getInputType(element.type)"
      :pattern="element.pattern || element.simpleType?.restriction?.pattern"
      @input="handleInputChange"
    />

    <AddEntityModal
      v-model="showEntitySelector"
      @add="emit('add-entity', currentPath, $event)"
    />
    <AddPropertyModal
      v-model="showPropertySelector"
      @add="emit('add-property', currentPath, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, inject, watch } from "vue";
import DxButton from "devextreme-vue/button";
import ComplexTypeInstanceView from "@/components/ComplexTypeInstanceView.vue";
import type { ComplexTypeInstance, XSDSchema } from "@/types";
import {
  isComplexType,
  canRemoveItem,
  isKSIIdentificationField,
  getInputType,
  isReqElementExtension as isReqElementExtensionUtil,
} from "@/utils/xsdUtils";
import ReqElementExtensionField from "./fields/ReqElementExtensionField.vue";
import BaseFieldSelect from "./fields/BaseFieldSelect.vue";
import BaseFieldInput from "./fields/BaseFieldInput.vue";
import AddEntityModal from "./modals/AddEntityModal.vue";
import AddPropertyModal from "./modals/AddPropertyModal.vue";
import EntityIdFieldSelect from "./fields/EntityIdFieldSelect.vue";

interface Props {
  element: any;
  level: number;
  parentPath?: string;
  currentEntityPath?: string;
  isAttributeValue?: boolean;
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

const isReqElementExtension = computed(() => {
  return isReqElementExtensionUtil(props.element);
});

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

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const getItemPath = (key: string): string => {
  return `${currentPath.value}.${key}`;
};

const getComplexTypeDefinition = (typeName: string) => {
  return schema?.complexTypes?.[typeName];
};

const handleSelectEntity = (value: string | undefined) => {
  emit("update-value", currentPath.value, value);
}
const handleInputChange = (value: string | number | boolean) => {
  const currentValue = props.isAttributeValue ? { attributes: value } : value;
  emit("update-value", currentPath.value, currentValue);
};

const handleChildUpdate = (path: string, value: any) => {
  emit("update-value", path, value);
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
