import { ref } from 'vue';
import { XMLGenerator } from '../utils/xmlGenerator';
import type { FormField, FormData, XMLGenerationResult } from '../types';

export function useXML() {
  const xmlGenerator = new XMLGenerator();
  const generatedXML = ref('');
  const error = ref('');

  const generateXML = (formData: FormData, fields: FormField[]): boolean => {
    const generationResult: XMLGenerationResult = xmlGenerator.generateXML(
      formData,
      fields
    );

    if (generationResult.success) {
      generatedXML.value = generationResult.xml;
      error.value = '';
      return true;
    } else {
      error.value = generationResult.error || 'Failed to generate XML';
      return false;
    }
  };

  const downloadXML = (filename: string = 'form-data.xml') => {
    if (!generatedXML.value) {
      error.value = 'No XML content to download';
      return false;
    }

    xmlGenerator.downloadXML(generatedXML.value, filename);
    return true;
  };

  const copyXML = async (): Promise<boolean> => {
    if (!generatedXML.value) {
      error.value = 'No XML content to copy';
      return false;
    }

    try {
      await navigator.clipboard.writeText(generatedXML.value);
      return true;
    } catch (err) {
      error.value = 'Failed to copy XML to clipboard';
      return false;
    }
  };

  const reset = () => {
    generatedXML.value = '';
    error.value = '';
  };

  return {
    generatedXML,
    error,
    generateXML,
    downloadXML,
    copyXML,
    reset,
  };
}
