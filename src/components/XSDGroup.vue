<template>
  <div
    class="mb-4"
    :class="[
      level === 0 ? 'p-4' : 'pl-4',
      {
        'border rounded-lg border-gray-200 p-4 pt-10': canRemoveItem(
          element.name
        ),
      },
      { 'bg-gray-50': element.name === 'LogicalUnit' },
      { 'bg-slate-50': element.name === 'Entity' },
      { 'bg-stone-50': element.name === 'Relation' },
      { 'bg-neutral-50': element.name === 'Property' },
    ]"
    :style="level > 0 ? { marginLeft: `${level * 4}px` } : undefined"
  >
    <div v-if="!element.type && element.complexType?.sequence" class="w-full">
      <div
        v-if="element.annotation?.documentation"
        class="mb-2 pb-2 flex justify-between items-center flex-wrap gap-4 border-b border-gray-100"
        :class="{
          '-mt-8': canRemoveItem(element.name),
        }"
      >
        <div class="flex items-center gap-2">
          <DxButton
            v-if="
              Object.keys(element.complexType?.sequence || {}).length &&
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
              :disabled="
                isUidFieldName(attr.name) ||
                isPRuleFieldDisabled(attr, currentPath, attr.name)
              "
            />
            <BaseFieldInput
              v-else
              :key="`${currentPath}-${attr.name}-input`"
              :value="attr.value"
              :name="attr.name"
              :label="attr.annotation.documentation"
              :type="getInputType(attr.type)"
              :pattern="attr.pattern || attr.simpleType?.restriction?.pattern"
              :disabled="
                isUidFieldName(attr.name) ||
                isPRuleFieldDisabled(attr, currentPath, attr.name)
              "
              @input="($event) => (attr.value = $event)"
            />
          </div>
        </template>

        <template v-if="element.complexType?.sequence">
          <div
            v-for="(item, key) in element.complexType.sequence"
            :key="String(key)"
            class="mb-1 relative"
          >
            <div
              v-if="canRemoveItem(item.name)"
              class="absolute right-0 top-0 flex gap-1"
            >
              <DxButton
                @click="handleCopyItem(String(key))"
                icon="copy"
                type="default"
                styling-mode="text"
              />
              <DxButton
                @click="removeItem(String(key))"
                icon="close"
                type="danger"
                styling-mode="text"
                :disabled="isKSIIdentificationField(item)"
              />
            </div>

            <BaseFieldSelect
              v-if="isLinkSelectField(element, item)"
              v-model="item.value"
              :name="item.name"
              :label="item.annotation?.documentation"
              :options="getLinkSelectOptions(item.name)"
              option-key="value"
              label-key="value"
              :key="`${getItemPath(String(key))}-${item.name}-link-select`"
              @update:modelValue="
                (val: string | undefined) => emit('update-value', getItemPath(String(key)), val)
              "
            />

            <XSDGroup
              v-else
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
              @copy-dynamic-item="(path: string, itemKey: string) => emit('copy-dynamic-item', path, itemKey)"
              @add-condition="handleChildAddCondition"
            />
          </div>
          <DxButton
            v-if="
              element.name === 'Property' &&
              !element.complexType.sequence?.PropertyCond
            "
            text="+ Добавить условие"
            type="default"
            styling-mode="outlined"
            class="ml-10 my-2"
            @click="handleAddCondition('PropertyCond')"
          />
          <DxButton
            v-else-if="
              element.name === 'Relation' &&
              !element.complexType.sequence?.RelationCond
            "
            text="+ Добавить условие"
            type="default"
            styling-mode="outlined"
            class="ml-10 my-2"
            @click="handleAddCondition('RelationCond')"
          />
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
              @add-condition="handleChildAddCondition"
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
      :label="element.annotation.documentation"
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
      :disabled="
        isUidFieldName(element.name) ||
        isPRuleFieldDisabled(element, currentPath)
      "
      @input="handleInputChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, inject, watch } from "vue";
import DxButton from "devextreme-vue/button";
import ComplexTypeInstanceView from "@/components/ComplexTypeInstanceView.vue";
import type { ComplexTypeInstance, XSDElement, XSDSchema } from "@/types";
import {
  isComplexType,
  canRemoveItem,
  isKSIIdentificationField,
  getInputType,
  isUidFieldName,
} from "@/utils/xsdUtils";
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
  (e: "add-dynamic-item", path: string, desiredKey?: string): void;
  (e: "copy-dynamic-item", path: string, key: string): void;
  (
    e: "add-condition",
    path: string,
    condName: "PropertyCond" | "RelationCond"
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const schema: Partial<XSDSchema> = inject("schema", {});
const mockData: Record<string, any[]> = inject("mockData", {});

const isExpanded = ref(true);
const selectedComplexTypeId = ref("");

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
  const data = mockData[props.element.type as keyof typeof mockData] || [];
  if (props.element.type === "KSIIdentification") {
    if (props.element.name === "PropertyID") {
      return data.filter((d) => d.data.KSITableCode === "Prp");
    } else return data.filter((d) => d.data.KSITableCode !== "Prp");
  } else return data;
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
    "FormulasView",
    "ReqElementObjects",
  ];

  return dynamicAddables.includes(props.element.name);
});

const LINK_SELECT_FIELDS = ["NameOfSourceDocument", "LinkReqUid"];

const isLinkElement = (element: any) => {
  return !!element?.complexType?.attributes?.LinkType;
};

const isInternalLink = (element: any) => {
  const linkType = element?.complexType?.attributes?.LinkType?.value;
  return isLinkElement(element) && linkType === "внутренняя";
};

const isLinkSelectField = (parent: any, child: any) => {
  return isInternalLink(parent) && LINK_SELECT_FIELDS.includes(child?.name);
};

const getLinkSelectOptions = (fieldName: string) => {
  if (fieldName === "NameOfSourceDocument") {
    return mockData.LinkNameOfSourceDocument || [];
  }
  if (fieldName === "LinkReqUid") {
    return mockData.LinkReqUid || [];
  }
  return [];
};

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

const handleAddDynamic = async (path?: string, desiredKey?: string) => {
  await nextTick();
  emit("add-dynamic-item", path || currentPath.value, desiredKey);
};

const handleAddCondition = (condName: "PropertyCond" | "RelationCond") => {
  emit("add-condition", currentPath.value, condName);
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

const handleChildAddDynamic = (path: string, desiredKey?: string) => {
  emit("add-dynamic-item", path, desiredKey);
};

const handleCopyItem = (key: string) => {
  emit("copy-dynamic-item", currentPath.value, key);
};

const handleChildAddCondition = (
  path: string,
  condName: "PropertyCond" | "RelationCond"
) => {
  emit("add-condition", path, condName);
};

const removeItemDependencies = (
  item: XSDElement,
  logicalUnitId: string | undefined
) => {
  if (logicalUnitId && schema.pRuleLogicalUnits?.[logicalUnitId]) {
    const luMap = { ...schema.pRuleLogicalUnits[logicalUnitId] };
    const relationUid = item?.complexType?.sequence?.RelationUid?.value;
    const relationCondUid =
      item?.complexType?.sequence?.RelationCond?.complexType?.sequence
        ?.ConditionUid?.value;
    const propertyCondUid =
      item?.complexType?.sequence?.PropertyCond?.complexType?.sequence
        ?.ConditionUid?.value;

    if (relationUid && luMap[relationUid]) {
      delete luMap[relationUid];
    }
    if (relationCondUid && luMap[relationCondUid]) {
      delete luMap[relationCondUid];
    }
    if (propertyCondUid && luMap[propertyCondUid]) {
      delete luMap[propertyCondUid];
    }

    const nextPruMap = { ...schema.pRuleLogicalUnits };
    if (Object.keys(luMap).length) {
      nextPruMap[logicalUnitId] = luMap;
    } else {
      delete nextPruMap[logicalUnitId];
    }
    schema.pRuleLogicalUnits = nextPruMap;
  }
};

const removeItem = async (key: string) => {
  const item = props.element.complexType?.sequence?.[key];
  if (item && canRemoveItem(item.name) && !isKSIIdentificationField(item)) {
    const removedPath = getItemPath(String(key));
    const logicalUnitId = removedPath.match(/LogicalUnit_\d+/)?.[0] as string;
    if (
      item.name === "LogicalUnit" &&
      schema.pRuleLogicalUnits?.[logicalUnitId]
    ) {
      delete schema.pRuleLogicalUnits[logicalUnitId];
    } else if (item.name === "Entity") {
      const { Properties } = item?.complexType?.sequence;
      Object.keys(Properties?.complexType?.sequence).forEach((key: string) => {
        if (key) {
          removeItemDependencies(
            Properties.complexType.sequence[key],
            logicalUnitId
          );
        }
      });
    } else {
      removeItemDependencies(item, logicalUnitId);
    }
    await nextTick();
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
