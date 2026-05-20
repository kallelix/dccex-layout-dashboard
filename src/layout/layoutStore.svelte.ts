import type { LayoutDocument } from './schema';
import { getExampleLayout, validateLayout } from './loader';

const LS_KEY = 'dccex-dashboard-layout';

export type LayoutSource = 'example' | 'file' | 'storage';

class LayoutStore {
  current: LayoutDocument = $state(getExampleLayout());
  source: LayoutSource = $state('example');
  fileName: string | null = $state(null);

  constructor() {
    const stored = this.loadFromStorage();
    if (stored) {
      this.current = stored.doc;
      this.fileName = stored.fileName;
      this.source = 'storage';
    }
  }

  set(doc: LayoutDocument, fileName: string | null): void {
    this.current = doc;
    this.fileName = fileName;
    this.source = 'file';
    this.persist(doc, fileName);
  }

  reset(): void {
    this.current = getExampleLayout();
    this.fileName = null;
    this.source = 'example';
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
  }

  private persist(doc: LayoutDocument, fileName: string | null): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ doc, fileName }));
    } catch {
      // localStorage may be disabled / full — non-fatal
    }
  }

  private loadFromStorage(): { doc: LayoutDocument; fileName: string | null } | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { doc?: unknown; fileName?: string | null };
      if (!parsed.doc) return null;
      return { doc: validateLayout(parsed.doc), fileName: parsed.fileName ?? null };
    } catch (e) {
      console.warn('[dashboard] Could not restore stored layout, falling back to example:', e);
      return null;
    }
  }
}

export const layoutStore = new LayoutStore();
