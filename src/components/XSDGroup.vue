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
        <div
          v-if="relationSummaryLines.length"
          class="mb-3 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700"
        >
          <div
            v-for="(line, idx) in relationSummaryLines"
            :key="`${currentPath}-relation-summary-${idx}`"
            class="leading-relaxed"
          >
            {{ line }}
          </div>
        </div>

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
                attr.name === 'ReqElementType' ||
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
                attr.name === 'ReqElementType' ||
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
              @remove-condition="handleChildRemoveCondition"
            />
          </div>
          <template v-if="element.name === 'Property'">
            <DxButton
              v-if="!element.complexType.sequence?.PropertyCond"
              text="+ Добавить условие"
              type="default"
              styling-mode="outlined"
              class="ml-10 my-2"
              @click="handleAddCondition('PropertyCond')"
            />
            <DxButton
              v-else
              text="- Убрать условие"
              type="danger"
              styling-mode="outlined"
              class="ml-10 my-2"
              @click="handleRemoveCondition('PropertyCond')"
            />
          </template>
          <template v-else-if="element.name === 'Relation'">
            <DxButton
              v-if="!element.complexType.sequence?.RelationCond"
              text="+ Добавить условие"
              type="default"
              styling-mode="outlined"
              class="ml-10 my-2"
              @click="handleAddCondition('RelationCond')"
            />
            <DxButton
              v-else
              text="- Убрать условие"
              type="danger"
              styling-mode="outlined"
              class="ml-10 my-2"
              @click="handleRemoveCondition('RelationCond')"
            />
          </template>
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
              @remove-condition="handleChildRemoveCondition"
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
      :value="element.value"
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
    <ReqElementDataField
      v-else-if="
        isFormulaElementDataField ||
        isGraphElementDataField ||
        isTableElementDataField
      "
      :element="element"
      :current-path="currentPath"
      :is-formula-element-data-field="isFormulaElementDataField"
      :formula-select-options="formulaSelectOptions"
      :formula-preview="formulaPreview"
      :handle-formula-select="handleFormulaSelect"
      :is-graph-element-data-field="isGraphElementDataField"
      :graph-select-options="graphSelectOptions"
      :graph-preview="graphPreview"
      :handle-graph-select="handleGraphSelect"
      :is-table-element-data-field="isTableElementDataField"
      :table-select-options="tableSelectOptions"
      :table-preview="tablePreview"
      :handle-table-select="handleTableSelect"
      :is-p-rule-field-disabled="(target: any, path: string) => isPRuleFieldDisabled(target, path)"
    />
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
      :value="element.value ?? ''"
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
import DxButton from "devextreme-vue/button";
import ComplexTypeInstanceView from "@/components/ComplexTypeInstanceView.vue";
import BaseFieldSelect from "./fields/BaseFieldSelect.vue";
import BaseFieldInput from "./fields/BaseFieldInput.vue";
import EntityIdFieldSelect from "./fields/EntityIdFieldSelect.vue";
import PRuleLogicalUnitField from "./fields/PRuleLogicalUnitField.vue";
import ChoiceField from "@/components/fields/ChoiceField.vue";
import ReqElementDataField from "@/components/fields/ReqElementDataField.vue";
import {
  type XsdGroupEmits,
  type XsdGroupProps,
  useXsdGroup,
} from "@/components/xsdGroup/useXsdGroup";

const props = defineProps<XsdGroupProps>();
const emit = defineEmits<XsdGroupEmits>();

const {
  isExpanded,
  selectedComplexTypeId,
  currentPath,
  relationSummaryLines,
  hasComplexTypeValue,
  isFormulaElementDataField,
  formulaSelectOptions,
  isGraphElementDataField,
  graphSelectOptions,
  isTableElementDataField,
  tableSelectOptions,
  formulaPreview,
  graphPreview,
  tablePreview,
  availableMockInstances,
  isEntitiesOrPropertiesOrRelations,
  isLinkSelectField,
  getLinkSelectOptions,
  isPRuleFieldDisabled,
  onComplexTypeSelected,
  toggleExpanded,
  getItemPath,
  getComplexTypeDefinition,
  handleSelectEntity,
  handleInputChange,
  handleFormulaSelect,
  handleGraphSelect,
  handleTableSelect,
  handleChildUpdate,
  handleAddElement,
  handleAddCondition,
  handleRemoveCondition,
  handleChildAddEntity,
  handleChildAddProperty,
  handleChildAddRelation,
  handleChildAddDynamic,
  handleCopyItem,
  handleChildAddCondition,
  handleChildRemoveCondition,
  removeItem,
  canRemoveItem,
  isKSIIdentificationField,
  isComplexType,
  isUidFieldName,
  getInputType,
} = useXsdGroup(props, emit);
</script>
