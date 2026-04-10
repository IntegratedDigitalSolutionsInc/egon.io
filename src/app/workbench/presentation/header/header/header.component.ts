import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { TitleService } from '../../../../tools/title/services/title.service';
import { ReplayService } from '../../../../tools/replay/services/replay.service';
import { ImportDomainStoryService } from '../../../../tools/import/services/import-domain-story.service';
import { SettingsService } from '../../../services/settings/settings.service';
import { DirtyFlagService } from '../../../../domain/services/dirty-flag.service';
import { DialogService } from '../../../../domain/services/dialog.service';
import { ExportService } from '../../../../tools/export/services/export.service';
import { LabelDictionaryService } from '../../../../tools/label-dictionary/services/label-dictionary.service';
import { ModelerService } from 'src/app/tools/modeler/services/modeler.service';
import { ServerStorageService } from '../../../../tools/server-storage/services/server-storage.service';
import { CurrentDiagramService } from '../../../../tools/server-storage/services/current-diagram.service';
import { HtmlPresentationService } from '../../../../tools/export/services/html-presentation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SNACKBAR_DURATION,
  SNACKBAR_ERROR,
  SNACKBAR_SUCCESS,
} from '../../../../domain/entities/constants';

import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { HeaderButtonsComponent } from '../header-buttons/header-buttons.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    HeaderButtonsComponent,
  ],
})
export class HeaderComponent {
  private readonly titleService = inject(TitleService);
  private readonly replayService = inject(ReplayService);
  private readonly importService = inject(ImportDomainStoryService);
  private readonly settingsService = inject(SettingsService);
  private readonly modelerService = inject(ModelerService);
  private readonly dirtyFlagService = inject(DirtyFlagService);
  private readonly dialogService = inject(DialogService);
  private readonly exportService = inject(ExportService);
  private readonly labelDictionaryService = inject(LabelDictionaryService);
  private readonly serverStorageService = inject(ServerStorageService);
  private readonly currentDiagramService = inject(CurrentDiagramService);
  private readonly htmlPresentationService = inject(HtmlPresentationService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(MatSnackBar);

  readonly title$ = this.titleService.title$;
  readonly description$ = this.titleService.description$;
  readonly showDescription$ = this.titleService.showDescription$;

  readonly isReplay$: Observable<boolean>;
  readonly isDirty$: Observable<boolean>;

  readonly showDescription: Observable<boolean>;

  constructor() {
    this.isReplay$ = this.replayService.replayOn$;
    this.isDirty$ = this.dirtyFlagService.dirty$;

    this.showDescription = this.titleService.showDescription$;
  }

  openHeaderDialog(): void {
    this.titleService.openHeaderDialog();
  }

  openSettings(): void {
    this.settingsService.open();
  }

  setShowDescription(show: boolean): void {
    this.titleService.setShowDescription(show);
  }

  createNewDomainStory(): void {
    const doNew = () => {
      this.currentDiagramService.clearCurrentDiagram();
      this.titleService.reset();
      this.modelerService.reset();
    };
    if (this.dirtyFlagService.dirty) {
      this.importService.openUnsavedChangesReminderDialog(doNew);
    } else {
      doNew();
    }
  }

  onImport(): void {
    if (this.dirtyFlagService.dirty) {
      this.importService.openUnsavedChangesReminderDialog(() =>
        this.importService.performImport(),
      );
    } else {
      this.importService.performImport();
    }
  }

  startReplay(): void {
    this.replayService.startReplay(true);
  }

  stopReplay(): void {
    this.replayService.stopReplay();
  }

  previousSentence(): void {
    this.replayService.previousSentence();
  }

  nextSentence(): void {
    this.replayService.nextSentence();
  }

  openKeyboardShortcutsDialog(): void {
    this.dialogService.openKeyboardShortcutsDialog();
  }

  openLabelDictionary(): void {
    this.labelDictionaryService.openLabelDictionary();
  }

  openDownloadDialog(): void {
    this.exportService.openDownloadDialog();
  }

  openImportFromUrlDialog(): void {
    this.importService.openImportFromUrlDialog(this.dirtyFlagService.dirty);
  }

  get hasDomainStory() {
    return this.exportService.isDomainStoryExportable();
  }

  get hasTitle(): boolean {
    return this.titleService.hasTitleOrDescription();
  }

  get isReplayable() {
    return this.replayService.isReplayable();
  }

  onSaveToServer(): void {
    const configAndDST = this.exportService.getConfigAndDSTForExport();
    const name = this.titleService.getTitle();
    const diagramId = this.currentDiagramService.currentDiagramId ?? undefined;
    const modeler = this.modelerService.getModeler();

    this.htmlPresentationService.generateHtmlString(modeler).then((html) => {
      this.serverStorageService
        .saveDiagram(name, configAndDST, { diagramId, html })
        .subscribe({
          next: ({ id }) => {
            this.currentDiagramService.setCurrentDiagram(id, name);
            this.modelerService.setClean();
            this.snackbar.open('Saved to server', undefined, {
              duration: SNACKBAR_DURATION,
              panelClass: SNACKBAR_SUCCESS,
            });
          },
          error: () => {
            this.snackbar.open('Could not save to server', undefined, {
              duration: SNACKBAR_DURATION,
              panelClass: SNACKBAR_ERROR,
            });
          },
        });
    });
  }

  onGoToIndex(): void {
    const navigate = () => {
      this.currentDiagramService.clearCurrentDiagram();
      this.router.navigate(['/']);
    };
    if (this.dirtyFlagService.dirty) {
      this.importService.openUnsavedChangesReminderDialog(navigate);
    } else {
      navigate();
    }
  }

  openServerLoadDialog(): void {
    const doLoad = (): void => {
      this.serverStorageService.openLoadDialog(({ content, name }) => {
        const json = JSON.stringify(content);
        const blob = new Blob([json], { type: 'application/json' });
        this.importService.import(blob, `${name}_2000-01-01.egn`);
      });
    };

    if (this.dirtyFlagService.dirty) {
      this.importService.openUnsavedChangesReminderDialog(doLoad);
    } else {
      doLoad();
    }
  }
}
