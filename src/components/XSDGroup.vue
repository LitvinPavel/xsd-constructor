<template>
  <div
    class="mb-4"
    :class="[
      level === 0 ? 'p-4' : 'pl-4',
      { 'border rounded-lg border-gray-200 p-4': canRemoveItem(element.name) },
      { 'bg-gray-50': element.name === 'LogicalUnit' },
      { 'bg-slate-50': element.name === 'Entity' },
      { 'bg-stone-50': element.name === 'Relation' },
      { 'bg-neutral-50': element.name === 'Property' },
    ]"
    :style="level > 0 ? { marginLeft: `${level * 4}px` } : undefined"
  >
  {{ element.name }}
    <div v-if="!element.type && element.complexType?.sequence" class="w-full">
      <div
        v-if="element.annotation?.documentation"
        class="mb-2 pb-2 flex justify-between items-center flex-wrap gap-4"
        :class="{
          'border-b border-gray-100': !isEntitiesOrPropertiesOrRelations,
        }"
      >
        <div class="flex items-center gap-2">
          <DxButton
            v-if="
              Object.keys(element.complexType?.sequence || {}).length > 1 &&
              level > 0
            "
            :icon="isExpanded ? 'chevrondown' : 'chevronright'"
            styling-mode="text"
            @click="toggleExpanded"
          />
          <h3 class="font-semibold text-gray-800">
            {{ element.annotation.documentation }}
          </h3>
        </div>

        <div v-if="isEntitiesOrPropertiesOrRelations">
          <DxButton
            @click="handleAddElement(element.name)"
            icon="plus"
            type="default"
            styling-mode="text"
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
            class="mb-1 relative"
          >
            <div
              v-if="canRemoveItem(item.name)"
              class="absolute right-0 top-0 p-4"
            >
              <DxButton
                @click="removeItem(String(key))"
                icon="close"
                type="danger"
                styling-mode="text"
                :disabled="isKSIIdentificationField(item)"
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
              @add-logical-unit="emit('add-logical-unit', $event)"
              @add-dynamic-item="handleChildAddDynamic"
            />
          </div>
        </template>

        <ChoiceField
          v-if="element.complexType?.choice?.elements"
          :element="element"
          :path="currentPath"
          :level="level"
          :current-entity-path="currentEntityPath"
          @update-value="(path: string, value: any) => emit('update-value', path, value)"
        />

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
              @add-logical-unit="emit('add-logical-unit', $event)"
              @add-dynamic-item="handleChildAddDynamic"
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
              :key="`${currentPath}-${attr.name}-select`"
              v-model="attr.value"
              :options="attr.simpleType.restriction.enumerations"
              :name="attr.name"
              :label="attr.annotation.documentation"
              option-key="value"
              label-key="value"
              :disabled="isUidFieldName(attr.name) || isPRuleFieldDisabled(attr, currentPath, attr.name)"
            />
            <BaseFieldInput
              v-else-if="attr.type"
              :key="`${currentPath}-${attr.name}-input`"
              :value="attr.value"
              :name="attr.name"
              :label="attr.annotation.documentation"
              :type="getInputType(attr.type)"
              :pattern="attr.pattern || attr.simpleType?.restriction?.pattern"
              :disabled="isUidFieldName(attr.name) || isPRuleFieldDisabled(attr, currentPath, attr.name)"
              @input="($event) => (attr.value = $event)"
            />
          </div>
        </template>
      </div>
    </div>

    <BaseFieldSelect
      v-else-if="element.type && isComplexType(element.type)"
      :key="`${currentPath}-${element.name}`"
      v-model="selectedComplexTypeId"
      :name="element.name"
      :label="element.name"
      :options="availableMockInstances"
      option-key="id"
      label-key="name"
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
    <EntityIdFieldSelect
      v-else-if="
        element.name === 'TailObjectId' || element.name === 'HeadObjectId'
      "
      :key="`${currentPath}-${element.name}-entityId`"
      :name="element.name"
      :label="element.annotation.documentation"
      :element-path="currentPath"
      @update-value="handleSelectEntity"
    />
    <div v-else-if="element.name === 'PRuleLogicalUnit'">
      <PRuleLogicalUnitField
        :element="element"
        :path="currentPath"
        @update-value="emit('update-value', currentPath, $event)"
      />
    </div>
    <BaseFieldSelect
      v-else-if="element.simpleType?.restriction?.enumerations"
      v-model="element.value"
      :key="`${currentPath}-${element.name}-select`"
      :options="element.simpleType.restriction.enumerations"
      :name="element.name"
      :label="element.annotation.documentation"
      option-key="value"
      label-key="value"
      :disabled="isPRuleFieldDisabled(element, currentPath)"
      @update:modelValue="handleInputChange"
    />
    <BaseFieldInput
      v-else
      :key="`${currentPath}-${element.name}-input`"
      :value="element.value || ''"
      :name="element.name"
      :label="element.annotation?.documentation"
      :type="getInputType(element.type)"
      :pattern="element.pattern || element.simpleType?.restriction?.pattern"
      :disabled="isUidFieldName(element.name) || isPRuleFieldDisabled(element, currentPath)"
      @input="handleInputChange"
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
  isUidFieldName,
} from "@/utils/xsdUtils";
import ReqElementExtensionField from "./fields/ReqElementExtensionField.vue";
import BaseFieldSelect from "./fields/BaseFieldSelect.vue";
import BaseFieldInput from "./fields/BaseFieldInput.vue";
import EntityIdFieldSelect from "./fields/EntityIdFieldSelect.vue";
import PRuleLogicalUnitField from "./fields/PRuleLogicalUnitField.vue";
import ChoiceField from "@/components/fields/ChoiceField.vue";

interface Props {
  element: any;
  level: number;
  parentPath?: string;
  currentEntityPath?: string;
  isAttributeValue?: boolean;
}

interface Emits {
  (e: "update-value", path: string, value: any): void;
  (e: "add-entity", path: string): void;
  (e: "add-property", path: string): void;
  (e: "add-relation", path: string): void;
  (e: "add-logical-unit", path: string): void;
  (e: "add-dynamic-item", path: string): void;
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
  const dynamicAddables = [
    "Entities",
    "Properties",
    "Relations",
    "LogicalUnits",
    "KeyWords",
    "AuthorizedBy",
    "ObjectsOfStandartization",
    "SecurityAspects",
    "ObjectsOfReq",
    "ReqLinks",
    "NeedDataLinks",
    "GraphView",
    "TableView",
    "FormulasView"
  ];
  console.log(props.element.name)
  return dynamicAddables.includes(props.element.name);
});

const isPRuleContext = (path: string) => {
  const segments = path.split(".");
  return (
    path.includes("PLOGIC") &&
    path.includes("PRules") &&
    segments.some((segment) => /^PRule/.test(segment))
  );
};

const isPRuleFieldDisabled = (
  target: any,
  path: string,
  nameOverride?: string
) => {
  if (!isPRuleContext(path)) return false;
  const fieldName = nameOverride || target?.name;
  return fieldName !== "PRuleNotes";
};

const onComplexTypeSelected = () => {
  const instance = availableMockInstances.value.find(
    (inst: ComplexTypeInstance) => inst.id === selectedComplexTypeId.value
  );

  emit("update-value", currentPath.value, instance?.data);
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
};
const handleInputChange = (value?: string | number | boolean) => {
  const currentValue = props.isAttributeValue ? { attributes: value } : value;
  emit("update-value", currentPath.value, currentValue);
};

const handleChildUpdate = (path: string, value: any) => {
  emit("update-value", path, value);
};

function handleAddElement(name: string) {
  if (name === "Entities") {
    handleAddEntity();
  } else if (name === "Properties" && props.currentEntityPath) {
    handleAddProperty();
  } else if (name === "Relations") {
    handleAddRelation();
  } else if (name === "LogicalUnits") {
    handleAddLogicalUnit();
  } else {
    handleAddDynamic();
  }
}

const handleAddEntity = async () => {
  await nextTick();
  emit("add-entity", currentPath.value);
};

const handleAddProperty = async () => {
  await nextTick();
  emit("add-property", currentPath.value);
};

const handleAddLogicalUnit = async () => {
  await nextTick();
  emit("add-logical-unit", currentPath.value);
};

const handleAddRelation = async () => {
  await nextTick();
  emit("add-relation", currentPath.value);
};

const handleAddDynamic = async () => {
  await nextTick();
  emit("add-dynamic-item", currentPath.value);
};

const handleChildAddEntity = (path: string) => {
  emit("add-entity", path);
};

const handleChildAddProperty = (path: string) => {
  emit("add-property", path);
};

const handleChildAddRelation = (path: string) => {
  emit("add-relation", path);
};

const handleChildAddDynamic = (path: string) => {
  emit("add-dynamic-item", path);
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
