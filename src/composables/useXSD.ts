import { ref } from 'vue';
import { XSDParser } from '../utils/xsdParser';
import type { FormField, ParsingResult } from '../types';

export function useXSD() {
  const xsdParser = new XSDParser();
  const fields = ref<FormField[]>([]);
  const loading = ref(false);
  const error = ref('');

  const parseXSD = async (file: File): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    try {
      const content = await readFileContent(file);
      const parsingResult: ParsingResult = xsdParser.parseXSD(content);

      if (parsingResult.success && parsingResult.fields) {
        fields.value = parsingResult.fields;
        return true;
      } else {
        error.value = parsingResult.error || 'Failed to parse XSD file';
        return false;
      }
    } catch (err) {
      error.value = `Error reading file: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`;
      return false;
    } finally {
      loading.value = false;
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) =>
        resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    fields,
    loading,
    error,
    parseXSD,
  };
}
