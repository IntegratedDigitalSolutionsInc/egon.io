import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { SettingsService } from 'src/app/workbench/services/settings/settings.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { TitleService } from '../tools/title/services/title.service';
import { ExportService } from '../tools/export/services/export.service';
import { ReplayService } from '../tools/replay/services/replay.service';
import { environment } from '../../environments/environment';
import { ColorPickerDirective } from 'ngx-color-picker';
import { AutosaveService } from '../tools/autosave/services/autosave.service';
import {
  BLACK,
  BLUE,
  CYAN,
  DARK_PINK,
  GREEN,
  GREY,
  LIGHT_PINK,
  LIME,
  ORANGE,
  PURPLE,
  RED,
  SNACKBAR_DURATION,
  SNACKBAR_DURATION_LONG,
  SNACKBAR_ERROR,
  SNACKBAR_INFO,
  YELLOW,
} from '../domain/entities/constants';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModelerService } from '../tools/modeler/services/modeler.service';
import { DirtyFlagService } from '../domain/services/dirty-flag.service';
import { ServerStorageService } from '../tools/server-storage/services/server-storage.service';
import { ImportDomainStoryService } from '../tools/import/services/import-domain-story.service';
import { CurrentDiagramService } from '../tools/server-storage/services/current-diagram.service';
import { DiagramEntry } from '../tools/server-storage/services/server-storage.service';

import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../workbench/presentation/header/header/header.component';
import { SettingsComponent } from '../workbench/presentation/settings/settings.component';
import { DragDirective } from '../tools/import/directive/dragDrop.directive';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SettingsComponent,
    DragDirective,
    ColorPickerDirective,
  ],
})
export class EditorComponent implements OnInit, AfterViewInit {
  showSettings$: Observable<boolean> | BehaviorSubject<boolean>;
  showDescription$: Observable<boolean>;
  version: string = environment.version;
  color: string = BLACK;

  @ViewChild(ColorPickerDirective, { static: false })
  colorPicker!: ColorPickerDirective;

  skipNextColorUpdate = false;

  readonly colorBox: string[] = [
    YELLOW,
    ORANGE,
    RED,
    LIGHT_PINK,
    DARK_PINK,
    PURPLE,
    BLUE,
    CYAN,
    GREEN,
    LIME,
    GREY,
    BLACK,
  ];

  private readonly settingsService = inject(SettingsService);
  private readonly titleService = inject(TitleService);
  private readonly exportService = inject(ExportService);
  private readonly autosaveService = inject(AutosaveService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snackbar = inject(MatSnackBar);
  private readonly replayService = inject(ReplayService);
  private readonly modelerService = inject(ModelerService);
  private readonly dirtyFlagService = inject(DirtyFlagService);
  private readonly serverStorageService = inject(ServerStorageService);
  private readonly importService = inject(ImportDomainStoryService);
  private readonly currentDiagramService = inject(CurrentDiagramService);

  constructor() {
    this.showSettings$ = new BehaviorSubject(false);
    this.showDescription$ = new BehaviorSubject(true);

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const modifierPressed = e.ctrlKey || e.metaKey;
      if (modifierPressed && e.key === 's' && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (this.exportService.isDomainStoryExportable()) {
          this.exportService.downloadDST();
        }
      }

      if (modifierPressed && e.altKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        if (this.exportService.isDomainStoryExportable()) {
          this.exportService.downloadSVG(true, true, undefined);
        }
      }
      if (modifierPressed && e.key === 'l') {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('import')?.click();
      }
      if (
        (e.key === 'ArrowRight' || e.key === 'ArrowUp') &&
        this.replayService.getReplayOn()
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.replayService.nextSentence();
      }
      if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowDown') &&
        this.replayService.getReplayOn()
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.replayService.previousSentence();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.skipNextColorUpdate = true;
        this.colorPicker.closeDialog();
      }
    });

    document.addEventListener('defaultColor', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.color === 'black') {
        this.color = BLACK;
      } else {
        this.color = customEvent.detail.color;
      }
    });

    document.addEventListener('openColorPicker', () => {
      this.colorPicker.openDialog();
    });

    document.addEventListener('errorColoringOnlySvg', () => {
      this.snackbar.open('Only SVG icons can be colored', undefined, {
        duration: SNACKBAR_DURATION_LONG,
        panelClass: SNACKBAR_INFO,
      });
    });
  }

  private isNewDiagram = false;

  ngOnInit(): void {
    this.modelerService.postInit();
    this.showDescription$ = this.titleService.showDescription$;
    this.showSettings$ = this.settingsService.showSettings$;

    const state = history.state as { loadEntry?: DiagramEntry; newDiagram?: boolean };
    this.isNewDiagram = state?.newDiagram ?? false;
    if (this.isNewDiagram) {
      this.titleService.reset();
      this.modelerService.reset();
    } else if (state?.loadEntry) {
      this.loadDiagramFromEntry(state.loadEntry);
    }
  }

  private loadDiagramFromEntry(entry: DiagramEntry): void {
    this.serverStorageService.loadDiagramContent(entry.id).subscribe({
      next: (content) => {
        const json = JSON.stringify(content);
        const blob = new Blob([json], { type: 'application/json' });
        this.importService.import(blob, `${entry.name}_2000-01-01.egn`);
        this.currentDiagramService.setCurrentDiagram(entry.id, entry.name);
      },
      error: () => {
        this.snackbar.open('Could not load diagram from server', undefined, {
          duration: SNACKBAR_DURATION,
          panelClass: SNACKBAR_ERROR,
        });
      },
    });
  }

  onColorChanged(color: string) {
    if (this.skipNextColorUpdate) {
      this.skipNextColorUpdate = false;
      return;
    }
    document.dispatchEvent(
      new CustomEvent('pickedColor', { detail: { color: color } }),
    );
  }

  ngAfterViewInit(): void {
    if (!this.isNewDiagram) {
      this.autosaveService.loadLatestDraft();
    }
    this.cd.detectChanges();
  }

  @HostListener('window:beforeunload', ['$event'])
  onWindowClose(event: any): void {
    if (this.dirtyFlagService.dirty) {
      event.returnValue = true;
    }
  }
}
