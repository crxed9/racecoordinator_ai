import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  input,
  OnChanges,
  OnInit,
  output,
  SimpleChanges,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { DisallowLapRecordsDialogComponent } from "@app/components/shared/disallow-lap-records-dialog/disallow-lap-records-dialog.component";
import { DataService } from "@app/data.service";
import { isAtLeast, Role } from "@app/models/role";
import { TranslatePipe } from "@app/pipes/translate.pipe";
import { AuthService } from "@app/services/auth.service";

@Component({
  standalone: true,
  selector: "app-race-history-dialog",
  templateUrl: "./race-history-dialog.component.html",
  styleUrls: ["./race-history-dialog.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    DisallowLapRecordsDialogComponent,
  ],
})
export class RaceHistoryDialogComponent implements OnInit, OnChanges {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  visible = input<boolean>(false);
  close = output<void>();

  canEdit: boolean = false;
  isLoading: boolean = false;
  raceHistories: any[] = [];
  searchTerm: string = "";

  selectedHistoryDetails: any | null = null;
  showDisallowDialog: boolean = false;
  isLoadingDetails: boolean = false;

  ngOnInit(): void {
    this.authService.currentRole$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        this.canEdit = isAtLeast(role, Role.DIRECTOR);
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible()) {
      this.loadHistories();
    }
  }

  loadHistories(): void {
    this.isLoading = true;
    this.raceHistories = [];
    this.cdr.markForCheck();

    this.dataService.getAllFinishedRaceHistory().subscribe({
      next: (histories) => {
        this.raceHistories = [...(histories || [])].sort((a, b) => {
          const valA = this.getRaceTimestamp(a);
          const valB = this.getRaceTimestamp(b);
          const timeA =
            typeof valA === "string"
              ? new Date(valA).getTime() || 0
              : valA || 0;
          const timeB =
            typeof valB === "string"
              ? new Date(valB).getTime() || 0
              : valB || 0;
          return timeB - timeA;
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  getRaceTimestamp(race: any): number | string | null {
    if (!race) return null;
    if (race.timestamp) return race.timestamp;
    if (race.statistics?.startMillis) return race.statistics.startMillis;
    if (race.statistics?.startTime) return race.statistics.startTime;
    if (race.created_at) return race.created_at;
    if (race.model?.created_at) return race.model.created_at;
    if (race.heats && race.heats.length > 0) {
      for (const h of race.heats) {
        if (h.statistics?.startMillis) return h.statistics.startMillis;
        if (h.statistics?.startTime) return h.statistics.startTime;
      }
    }
    return null;
  }

  get filteredHistories(): any[] {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return this.raceHistories;
    }
    const term = this.searchTerm.toLowerCase().trim();
    return this.raceHistories.filter((h) => {
      const name = (h.model?.name || h.name || "").toLowerCase();
      const track = (h.track?.name || "").toLowerCase();
      return name.includes(term) || track.includes(term);
    });
  }

  editRaceLaps(historyItem: any): void {
    const id = historyItem._id || historyItem.id || historyItem.entity_id;
    if (!id) return;

    this.isLoadingDetails = true;
    this.cdr.markForCheck();

    const isDemo = Boolean(historyItem.is_demo);
    this.dataService.getRaceHistoryById(id, isDemo).subscribe({
      next: (fullRecord) => {
        this.isLoadingDetails = false;
        this.selectedHistoryDetails = fullRecord || historyItem;
        if (this.selectedHistoryDetails) {
          this.selectedHistoryDetails.is_demo =
            isDemo ||
            Boolean(
              this.selectedHistoryDetails.is_demo ||
              this.selectedHistoryDetails.isDemo ||
              this.selectedHistoryDetails.demo,
            );
        }
        this.showDisallowDialog = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingDetails = false;
        // Fall back to the item in list if full fetch fails
        this.selectedHistoryDetails = historyItem;
        if (this.selectedHistoryDetails) {
          this.selectedHistoryDetails.is_demo =
            isDemo ||
            Boolean(
              this.selectedHistoryDetails.is_demo ||
              this.selectedHistoryDetails.isDemo ||
              this.selectedHistoryDetails.demo,
            );
        }
        this.showDisallowDialog = true;
        this.cdr.markForCheck();
      },
    });
  }

  getIneligibleLapCount(race: any): number {
    if (!race) return 0;
    if (typeof race.ineligible_lap_count === "number") {
      return race.ineligible_lap_count;
    }
    if (typeof race.ineligibleLapCount === "number") {
      return race.ineligibleLapCount;
    }
    return this.calculateIneligibleLapsFromHeats(race);
  }

  calculateIneligibleLapsFromHeats(race: any): number {
    if (!race || !Array.isArray(race.heats)) return 0;
    let count = 0;
    for (const heat of race.heats) {
      const drivers = heat?.drivers || heat?.heatDrivers || heat?.heat_drivers;
      if (!Array.isArray(drivers)) continue;
      for (const driver of drivers) {
        const laps =
          driver?.laps ||
          driver?.lapsWithDetails ||
          driver?._lapsWithDetails ||
          driver?._laps;
        if (!Array.isArray(laps)) continue;
        for (const lap of laps) {
          if (typeof lap === "object" && lap !== null) {
            const countTowardsRecords =
              lap.countTowardsRecords ?? lap.count_towards_records ?? true;
            if (countTowardsRecords === false) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }

  onRecordsUpdated(event: {
    heatNumber: number;
    lane: number;
    lapIndex: number;
    countTowardsRecords: boolean;
  }): void {
    if (!this.selectedHistoryDetails) return;
    const raceId =
      this.selectedHistoryDetails._id ||
      this.selectedHistoryDetails.id ||
      this.selectedHistoryDetails.entity_id;
    const target = this.raceHistories.find(
      (h) => (h._id || h.id || h.entity_id) === raceId,
    );
    if (target) {
      const heat = (target.heats || []).find(
        (h: any) => (h.heatNumber ?? h.heat_number) === event.heatNumber,
      );
      if (heat) {
        const drivers =
          heat.drivers || heat.heatDrivers || heat.heat_drivers || [];
        const dhd = drivers.find((d: any, idx: number) => {
          const laneVal = d.lane ?? d.laneIndex ?? d.lane_index ?? idx;
          return laneVal === event.lane;
        });
        const laps = dhd?.laps || dhd?.lapsWithDetails || dhd?._lapsWithDetails;
        if (laps && laps[event.lapIndex]) {
          laps[event.lapIndex].countTowardsRecords = event.countTowardsRecords;
        }
      }
      const updatedCount = this.calculateIneligibleLapsFromHeats(target);
      target.ineligible_lap_count = updatedCount;
      target.ineligibleLapCount = updatedCount;
      this.cdr.markForCheck();
    }
  }

  closeDisallowDialog(): void {
    this.showDisallowDialog = false;
    this.selectedHistoryDetails = null;
    this.loadHistories();
    this.cdr.markForCheck();
  }

  onDismiss(): void {
    this.close.emit();
  }
}
