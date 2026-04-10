import { Injectable } from '@angular/core';

const KEY_ID = 'currentDiagramId';
const KEY_NAME = 'currentDiagramName';

@Injectable({
  providedIn: 'root',
})
export class CurrentDiagramService {
  get currentDiagramId(): string | null {
    return localStorage.getItem(KEY_ID);
  }

  get currentDiagramName(): string | null {
    return localStorage.getItem(KEY_NAME);
  }

  setCurrentDiagram(id: string, name?: string): void {
    localStorage.setItem(KEY_ID, id);
    if (name !== undefined) {
      localStorage.setItem(KEY_NAME, name);
    }
  }

  clearCurrentDiagram(): void {
    localStorage.removeItem(KEY_ID);
    localStorage.removeItem(KEY_NAME);
  }
}
