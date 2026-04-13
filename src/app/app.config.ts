import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  MAT_CHECKBOX_DEFAULT_OPTIONS,
  MatCheckboxDefaultOptions,
} from '@angular/material/checkbox';
import { UntypedFormBuilder } from '@angular/forms';

import { provideModeler } from './tools/modeler.providers';
import { provideAutosave } from './tools/autosave/autosave.providers';
import { provideImportDomainStory } from './tools/import/import.providers';
import { EditorComponent } from './editor/editor.component';
import { IndexComponent } from './index/index.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([
      { path: '', component: IndexComponent },
      { path: 'editor', component: EditorComponent },
      { path: '**', redirectTo: '' },
    ]),
    UntypedFormBuilder,
    {
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: { clickAction: 'noop' } as MatCheckboxDefaultOptions,
    },
    provideModeler(),
    provideAutosave(),
    provideImportDomainStory(),
  ],
};
