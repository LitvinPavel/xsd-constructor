import { ref, computed, type Ref } from 'vue';
import { LayerFilter } from '../utils/layerFilter';
import type { FormField, FormData, LayerConfig } from '../types';

export function useForm(fields: Ref<FormField[]>) {
  const layerFilter = new LayerFilter();
  const formData = ref<FormData>({});

  // Конфигурация слоев с правильными типами
  const layerConfig = computed((): LayerConfig[] => [
    {
      name: 'MDATA',
      displayName: 'Metadata',
      visible: true,
      categories: [
        { 
          name: 'DocMetadata', 
          displayName: 'Document Metadata', 
          editableTypes: ['string', 'number', 'boolean', 'date', 'choice'] as FormField['type'][]
        },
        { 
          name: 'ReqMetadata', 
          displayName: 'Requirements Metadata', 
          editableTypes: ['string', 'number', 'boolean', 'date', 'choice'] as FormField['type'][]
        }
      ]
    },
    {
      name: 'VIEW',
      displayName: 'View',
      visible: true,
      categories: [
        { 
          name: 'TextView', 
          displayName: 'Text View', 
          editableTypes: ['string'] as FormField['type'][]
        },
        { 
          name: 'GraphView', 
          displayName: 'Graph View', 
          editableTypes: [] as FormField['type'][]
        },
        { 
          name: 'TableView', 
          displayName: 'Table View', 
          editableTypes: [] as FormField['type'][]
        },
        { 
          name: 'FormulasView', 
          displayName: 'Formulas View', 
          editableTypes: [] as FormField['type'][]
        }
      ]
    },
    {
      name: 'DMODEL',
      displayName: 'Data Model',
      visible: false, // Временно скрыт
      categories: [
        { 
          name: 'Entities', 
          displayName: 'Entities', 
          editableTypes: [] as FormField['type'][]
        },
        { 
          name: 'Relations', 
          displayName: 'Relations', 
          editableTypes: [] as FormField['type'][]
        },
        { 
          name: 'Constraints', 
          displayName: 'Constraints', 
          editableTypes: [] as FormField['type'][]
        },
        { 
          name: 'Properties', 
          displayName: 'Properties', 
          editableTypes: ['string'] as FormField['type'][]
        }
      ]
    }
  ]);

  const visibleLayers = computed(() => 
    layerConfig.value.filter(layer => layer.visible)
  );

  const hasFormData = computed(() => 
    Object.keys(formData.value).length > 0 && 
    Object.values(formData.value).some(value => value !== null && value !== '')
  );

  const initializeFormData = () => {
    const data: FormData = {};
    const filteredFields = layerFilter.filterFieldsForUI(fields.value);
    
    filteredFields.forEach((field: FormField) => {
      data[field.name] = field.defaultValue || null;
    });
    
    formData.value = data;
  };

  const updateFieldValue = (fieldName: string, value: string | number | boolean | null) => {
    formData.value = {
      ...formData.value,
      [fieldName]: value
    };
  };

  const getFieldValue = (fieldName: string): string | number | boolean | null => {
    return formData.value[fieldName] ?? null;
  };

  const getFieldsByLayer = (layer: string): FormField[] => {
    return layerFilter.getFieldsByLayer(fields.value, layer);
  };

  const getFieldsByCategory = (layer: string, category: string): FormField[] => {
    return layerFilter.getFieldsByLayerAndCategory(fields.value, layer, category);
  };

  const hasLayerFields = (layer: string): boolean => {
    return getFieldsByLayer(layer).length > 0;
  };

  const hasCategoryFields = (layer: string, category: string): boolean => {
    return getFieldsByCategory(layer, category).length > 0;
  };

  const resetForm = () => {
    initializeFormData();
  };

  return {
    formData,
    hasFormData,
    layerConfig,
    visibleLayers,
    initializeFormData,
    updateFieldValue,
    getFieldValue,
    getFieldsByLayer,
    getFieldsByCategory,
    hasLayerFields,
    hasCategoryFields,
    resetForm
  };
}