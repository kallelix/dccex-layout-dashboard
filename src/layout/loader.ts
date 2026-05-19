import type { LayoutDocument } from './schema';
import exampleLayout from './example.json';

export function getExampleLayout(): LayoutDocument {
  return exampleLayout as LayoutDocument;
}

export async function loadLayoutFromFile(file: File): Promise<LayoutDocument> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  return validateLayout(parsed);
}

export function validateLayout(input: unknown): LayoutDocument {
  if (!input || typeof input !== 'object') throw new Error('layout must be an object');
  const obj = input as Record<string, unknown>;
  const required = ['name', 'viewBox', 'segments', 'turnouts', 'sensors', 'lights', 'sections', 'sequences'];
  for (const key of required) {
    if (!(key in obj)) throw new Error(`layout is missing required key: ${key}`);
  }
  return obj as unknown as LayoutDocument;
}
