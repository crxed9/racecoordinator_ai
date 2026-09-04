import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnChanges,
  OnInit,
  output,
  SimpleChanges,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import {
  CustomOptionComponent,
  CustomSelectComponent,
} from "@app/components/shared/custom-select/custom-select.component";
import { DriverConverter } from "@app/converters/driver.converter";
import { DataService } from "@app/data.service";
import { isAtLeast, Role } from "@app/models/role";
import { TranslatePipe } from "@app/pipes/translate.pipe";
import { AuthService } from "@app/services/auth.service";
import { RaceService } from "@app/services/race.service";
import { naturalSortCompare } from "@app/utils/sorting.utils";

export type SortColumn =
  | "driver"
  | "heat"
  | "lane"
  | "lap"
  | "time"
  | "status"
  | "action";
export type SortDirection = "asc" | "desc";

export interface NormalizedLap {
  heatNumber: number;
  laneIndex: number;
  driverName: string;
  teamName?: string;
  laneColor?: string;
  laneTextColor?: string;
  lapIndex: number;
  lapNumber: number;
  lapTime: number;
  countTowardsRecords: boolean;
  isFastest: boolean;
}

export interface DriverFilterOption {
  driverName: string;
  teamName?: string;
}

export interface LaneOption {
  laneIndex: number;
  laneColor?: string;
  laneTextColor?: string;
}

@Component({
  standalone: true,
  selector: "app-disallow-lap-records-dialog",
  templateUrl: "./disallow-lap-records-dialog.component.html",
  styleUrls: ["./disallow-lap-records-dialog.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CustomSelectComponent,
    CustomOptionComponent,
  ],
})
export class DisallowLapRecordsDialogComponent implements OnInit, OnChanges {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private raceService = inject(RaceService, { optional: true });

  visible = input<boolean>(false);
  heats = input<any[]>([]);
  drivers = input<any[]>([]);
  allDrivers = input<any[]>([]);
  track = input<any>(null);
  currentHeatNumber = input<number>(1);
  raceHistoryId = input<string | null>(null);
  raceName = input<string>("");
  raceDate = input<Date | number | string | null | undefined>(undefined);
  isDemo = input<boolean>(false);

  get effectiveRaceDate(): Date | number | string | null {
    const direct = this.raceDate();
    let val: any = direct;
    if (val === null || val === undefined || val === "") {
      const heatsList = this.effectiveHeats;
      if (heatsList && heatsList.length > 0) {
        for (const h of heatsList) {
          if (h?.statistics?.startMillis) {
            val = h.statistics.startMillis;
            break;
          }
          if (h?.statistics?.startTime) {
            val = h.statistics.startTime;
            break;
          }
        }
      }
    }
    if (!val) return null;
    if (typeof val === "string" && /^\d+$/.test(val.trim())) {
      return parseInt(val.trim(), 10);
    }
    return val;
  }

  close = output<void>();
  recordsUpdated = output<{
    heatNumber: number;
    lane: number;
    lapIndex: number;
    countTowardsRecords: boolean;
  }>();

  canEdit: boolean = false;
  selectedDriverName: string = "";
  selectedHeatNumber: number = -1;
  selectedLaneIndex: number = -1;

  sortColumn: SortColumn = "time";
  sortDirection: SortDirection = "asc";

  isSaving: boolean = false;
  errorMessage: string = "";
  successMessage: string = "";

  private allDriversList: any[] = [];
  private allTeamsList: any[] = [];

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.errorMessage = "";
        this.successMessage = "";
        this.initSelection();
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentRole$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        this.canEdit = isAtLeast(role, Role.DIRECTOR);
        this.cdr.markForCheck();
      });

    if (typeof this.dataService?.getDrivers === "function") {
      this.dataService
        .getDrivers()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (drivers) => {
            this.allDriversList = drivers || [];
            this.allDriversList.forEach((d) => {
              const converted = DriverConverter.fromJSON(d);
              DriverConverter.register(converted);
            });
            this.cdr.markForCheck();
          },
          error: () => {},
        });
    }

    if (typeof this.dataService?.getTeams === "function") {
      this.dataService
        .getTeams()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (teams) => {
            this.allTeamsList = teams || [];
            this.cdr.markForCheck();
          },
          error: () => {},
        });
    }

    if (typeof this.dataService?.getLaps === "function") {
      this.dataService
        .getLaps()
        ?.pipe(takeUntilDestroyed(this.destroyRef))
        ?.subscribe(() => {
          if (this.visible()) {
            this.cdr.markForCheck();
          }
        });
    }

    if (typeof this.dataService?.getRaceUpdate === "function") {
      this.dataService
        .getRaceUpdate()
        ?.pipe(takeUntilDestroyed(this.destroyRef))
        ?.subscribe(() => {
          if (this.visible()) {
            this.cdr.markForCheck();
          }
        });
    }

    if (this.raceService?.currentHeat$) {
      this.raceService.currentHeat$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.visible()) {
            this.cdr.markForCheck();
          }
        });
    }

    if (this.raceService?.heats$) {
      this.raceService.heats$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.visible()) {
            this.cdr.markForCheck();
          }
        });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible()) {
      this.errorMessage = "";
      this.successMessage = "";
      this.initSelection();
    }
  }

  private initSelection(): void {
    this.selectedDriverName = "";
    this.selectedHeatNumber = -1;
    this.selectedLaneIndex = -1;
    this.sortColumn = "time";
    this.sortDirection = "asc";
    this.cdr.markForCheck();
  }

  getHeatNumber(heat: any): number {
    if (!heat) return 1;
    return heat.heatNumber ?? heat.heat_number ?? 1;
  }

  get effectiveHeats(): any[] {
    const inputHeats = this.heats() || [];
    const serviceHeats = this.raceService
      ? this.raceService.getHeats() || []
      : [];
    const currentHeat = this.raceService
      ? this.raceService.getCurrentHeat()
      : undefined;

    const countLapsInHeat = (h: any) => {
      const drivers = this.getHeatDrivers(h);
      return drivers.reduce((acc, d) => acc + this.getDriverLaps(d).length, 0);
    };

    const heatsMap = new Map<number, any>();

    const addOrMergeHeat = (h: any) => {
      if (!h) return;
      const num = this.getHeatNumber(h);
      const existing = heatsMap.get(num);
      if (!existing) {
        heatsMap.set(num, h);
      } else {
        const existingLaps = countLapsInHeat(existing);
        const newLaps = countLapsInHeat(h);
        if (newLaps > existingLaps) {
          heatsMap.set(num, h);
        } else if (
          existingLaps === 0 &&
          newLaps === 0 &&
          h.heatDrivers?.length > 0
        ) {
          heatsMap.set(num, h);
        }
      }
    };

    for (const h of serviceHeats) addOrMergeHeat(h);
    for (const h of inputHeats) addOrMergeHeat(h);
    if (currentHeat) addOrMergeHeat(currentHeat);

    const merged = Array.from(heatsMap.values()).sort(
      (a, b) => this.getHeatNumber(a) - this.getHeatNumber(b),
    );

    return merged.length > 0 ? merged : inputHeats;
  }

  get availableHeats(): number[] {
    const heatsList = this.effectiveHeats;
    if (!heatsList || heatsList.length === 0) return [];
    return heatsList.map((h) => this.getHeatNumber(h));
  }

  private get allParticipants(): any[] {
    return [
      ...(this.drivers() || []),
      ...(this.raceService?.getParticipants() || []),
    ];
  }

  private get combinedAllDrivers(): any[] {
    return [...(this.allDrivers() || []), ...this.allDriversList];
  }

  private get combinedAllTeams(): any[] {
    return this.allTeamsList;
  }

  isEmptyLane(driverData: any): boolean {
    if (!driverData) return true;
    // If the lane has recorded laps, it is NOT empty: laps exist and can be viewed or disallowed.
    if (this.getDriverLaps(driverData).length > 0) {
      return false;
    }
    if (
      driverData.isEmptyLane === true ||
      driverData.isEmpty === true ||
      (typeof driverData.isEmptyLane === "function" &&
        driverData.isEmptyLane()) ||
      (typeof driverData.isEmpty === "function" && driverData.isEmpty())
    ) {
      return true;
    }
    const d =
      driverData.actualDriver ||
      driverData.participant?.driver ||
      (driverData.driver?.driver
        ? driverData.driver.driver
        : driverData.driver);
    const id = (d?.entity_id || d?.entityId || d?.id || "")
      .toString()
      .toUpperCase();
    if (id === "EMPTY_LANE" || id.startsWith("EMPTY_") || id === "EMPTY")
      return true;

    if (!d && !driverData.participant?.team && !driverData.team) return true;
    return false;
  }

  private resolveTeamName(driverData: any): string | undefined {
    const participant =
      driverData.participant ||
      (driverData.driver && (driverData.driver.driver || driverData.driver.team)
        ? driverData.driver
        : null);
    const teamObj = participant?.team || driverData.team;
    if (teamObj && typeof teamObj === "object" && teamObj.name) {
      return teamObj.name.trim();
    }
    if (typeof teamObj === "string") {
      return teamObj.trim();
    }
    return undefined;
  }

  private resolveTeammateDriverName(
    lapDriverId: string,
    allDrivers: any[],
  ): string | undefined {
    const found = allDrivers.find(
      (d) =>
        (d.entity_id || d.entityId || d.id || "").toString() === lapDriverId,
    );
    if (found) {
      const nickname = (found.nickname || found.nickName || "").trim();
      const name = (found.name || found.driverName || "").trim();
      return nickname || name || lapDriverId;
    }
    try {
      const cached = DriverConverter.get(lapDriverId);
      if (cached) {
        const nickname = (cached.nickname || "").trim();
        const name = (cached.name || "").trim();
        return nickname || (name !== "Unknown" ? name : "") || lapDriverId;
      }
    } catch {
      // Ignored
    }
    return undefined;
  }

  private resolveLaneDriverName(
    driverData: any,
    teamObj: any,
    teamName: string | undefined,
    allDrivers: any[],
  ): string {
    const participant =
      driverData.participant ||
      (driverData.driver && (driverData.driver.driver || driverData.driver.team)
        ? driverData.driver
        : null);
    const d =
      driverData.actualDriver ||
      participant?.driver ||
      (driverData.driver?.driver
        ? driverData.driver.driver
        : driverData.driver);

    let nickname = "";
    let name = "";

    if (d && typeof d === "object") {
      nickname = (d.nickname || d.nickName || "").trim();
      name = (d.name || d.driverName || "").trim();
      if (!nickname && (d.entity_id || d.entityId || d.id)) {
        const dId = (d.entity_id || d.entityId || d.id).toString();
        const found = allDrivers.find(
          (x) => (x.entity_id || x.entityId || x.id || "").toString() === dId,
        );
        if (found) {
          nickname = (found.nickname || found.nickName || "").trim();
          if (!name) name = (found.name || found.driverName || "").trim();
        }
      }
    }

    if (
      teamObj &&
      Array.isArray(teamObj.driverIds) &&
      teamObj.driverIds.length > 0 &&
      (!nickname || (teamName && name.toLowerCase() === teamName.toLowerCase()))
    ) {
      const firstMemberId = teamObj.driverIds[0];
      const member = allDrivers.find(
        (x) =>
          (x.entity_id || x.entityId || x.id || "").toString() ===
          firstMemberId,
      );
      if (member) {
        nickname = (member.nickname || member.nickName || "").trim();
        if (!name) name = (member.name || member.driverName || "").trim();
      }
    }

    const isPlaceholder = (val: string) => {
      const lower = (val || "").trim().toLowerCase();
      return (
        lower === "empty" ||
        lower === "empty lane" ||
        lower === "rd_empty_lane" ||
        lower === "(empty)" ||
        lower === "unknown"
      );
    };
    if (isPlaceholder(nickname)) nickname = "";
    if (isPlaceholder(name)) name = "";

    return (
      nickname ||
      (name && name !== "Unknown" ? name : "") ||
      driverData.driverName ||
      `Driver ${(driverData.laneIndex ?? driverData.lane ?? 0) + 1}`
    );
  }

  resolveDriverAndTeam(
    driverData: any,
    lap?: any,
  ): { driverName: string; teamName?: string } {
    if (!driverData || this.isEmptyLane(driverData)) {
      return { driverName: "" };
    }

    const allDrivers = this.combinedAllDrivers;
    const teamName = this.resolveTeamName(driverData);
    const lapDriverId =
      lap && typeof lap === "object"
        ? (lap.driverId || lap.driver_id || "").toString().trim()
        : "";

    if (lapDriverId) {
      const display = this.resolveTeammateDriverName(lapDriverId, allDrivers);
      if (display) {
        return {
          driverName: display,
          teamName:
            teamName && teamName.toLowerCase() !== display.toLowerCase()
              ? teamName
              : undefined,
        };
      }
    }

    const participant =
      driverData.participant ||
      (driverData.driver && (driverData.driver.driver || driverData.driver.team)
        ? driverData.driver
        : null);
    const teamObj = participant?.team || driverData.team;
    const finalDriverName = this.resolveLaneDriverName(
      driverData,
      teamObj,
      teamName,
      allDrivers,
    );

    return {
      driverName: finalDriverName,
      teamName:
        teamName && teamName.toLowerCase() !== finalDriverName.toLowerCase()
          ? teamName
          : undefined,
    };
  }

  get availableDrivers(): DriverFilterOption[] {
    const heatsList = this.effectiveHeats;
    if (!heatsList || heatsList.length === 0) return [];
    const map = new Map<string, string | undefined>();

    for (const heat of heatsList) {
      const drivers = this.getHeatDrivers(heat);
      for (const d of drivers) {
        if (this.isEmptyLane(d)) continue;
        const laps = this.getDriverLaps(d);
        if (laps.length > 0) {
          for (const lap of laps) {
            const resolved = this.resolveDriverAndTeam(d, lap);
            if (resolved.driverName && !map.has(resolved.driverName)) {
              map.set(resolved.driverName, resolved.teamName);
            }
          }
        } else {
          const resolved = this.resolveDriverAndTeam(d);
          if (resolved.driverName && !map.has(resolved.driverName)) {
            map.set(resolved.driverName, resolved.teamName);
          }
        }
      }
    }

    return Array.from(map.entries())
      .map(([driverName, teamName]) => ({ driverName, teamName }))
      .sort((a, b) => naturalSortCompare(a.driverName, b.driverName));
  }

  get availableLanes(): LaneOption[] {
    const trackData = this.track();
    const heatsList = this.effectiveHeats;
    let numLanes = trackData?.lanes?.length || 0;
    for (const h of heatsList) {
      const dList = this.getHeatDrivers(h);
      if (dList.length > numLanes) {
        numLanes = dList.length;
      }
      for (let i = 0; i < dList.length; i++) {
        const d = dList[i];
        const l =
          typeof d?.laneIndex === "number" && d.laneIndex >= 0
            ? d.laneIndex
            : typeof d?.lane_index === "number" && d.lane_index >= 0
              ? d.lane_index
              : i;
        if (l + 1 > numLanes) {
          numLanes = l + 1;
        }
      }
    }
    const lanes: LaneOption[] = [];
    for (let i = 0; i < numLanes; i++) {
      const laneConfig =
        trackData?.lanes && trackData.lanes[i] ? trackData.lanes[i] : null;
      lanes.push({
        laneIndex: i,
        laneColor: laneConfig?.background_color || laneConfig?.backgroundColor,
        laneTextColor:
          laneConfig?.foreground_color || laneConfig?.foregroundColor,
      });
    }
    return lanes;
  }

  get selectedHeat(): any | null {
    if (this.selectedHeatNumber === -1) return null;
    const heatsList = this.effectiveHeats;
    if (!heatsList || heatsList.length === 0) return null;
    return (
      heatsList.find(
        (h) => this.getHeatNumber(h) === this.selectedHeatNumber,
      ) || null
    );
  }

  getDriverName(d: any): string {
    if (!d) return "";
    return this.resolveDriverAndTeam(d).driverName;
  }

  getHeatDrivers(heat: any): any[] {
    if (!heat) return [];
    if (Array.isArray(heat.heatDrivers) && heat.heatDrivers.length > 0)
      return heat.heatDrivers;
    if (Array.isArray(heat.drivers) && heat.drivers.length > 0)
      return heat.drivers;
    if (Array.isArray(heat.heat_drivers) && heat.heat_drivers.length > 0)
      return heat.heat_drivers;
    if (Array.isArray(heat.heatDrivers)) return heat.heatDrivers;
    if (Array.isArray(heat.drivers)) return heat.drivers;
    if (Array.isArray(heat.heat_drivers)) return heat.heat_drivers;
    return [];
  }

  getDriverLaps(driverData: any): any[] {
    if (!driverData) return [];
    try {
      if (
        Array.isArray(driverData.lapsWithDetails) &&
        driverData.lapsWithDetails.length > 0
      ) {
        return driverData.lapsWithDetails;
      }
      if (
        Array.isArray(driverData._lapsWithDetails) &&
        driverData._lapsWithDetails.length > 0
      ) {
        return driverData._lapsWithDetails;
      }
      if (Array.isArray(driverData.laps) && driverData.laps.length > 0) {
        return driverData.laps;
      }
      if (Array.isArray(driverData._laps) && driverData._laps.length > 0) {
        return driverData._laps;
      }
      if (
        Array.isArray(driverData.lapTimes) &&
        driverData.lapTimes.length > 0
      ) {
        return driverData.lapTimes;
      }
      if (
        Array.isArray(driverData._lapTimes) &&
        driverData._lapTimes.length > 0
      ) {
        return driverData._lapTimes;
      }
      if (
        driverData.lapsWithDetails &&
        Array.isArray(driverData.lapsWithDetails)
      ) {
        return driverData.lapsWithDetails;
      }
      if (
        driverData._lapsWithDetails &&
        Array.isArray(driverData._lapsWithDetails)
      ) {
        return driverData._lapsWithDetails;
      }
      if (driverData.laps && Array.isArray(driverData.laps)) {
        return driverData.laps;
      }
      if (driverData._laps && Array.isArray(driverData._laps)) {
        return driverData._laps;
      }
      if (driverData.lapTimes && Array.isArray(driverData.lapTimes)) {
        return driverData.lapTimes;
      }
      if (driverData._lapTimes && Array.isArray(driverData._lapTimes)) {
        return driverData._lapTimes;
      }
    } catch {
      return [];
    }
    return [];
  }

  get normalizedLaps(): NormalizedLap[] {
    const heatsList = this.effectiveHeats;
    const trackData = this.track();
    const lapsList: NormalizedLap[] = [];

    for (const heat of heatsList) {
      if (!heat) continue;
      const heatNum = this.getHeatNumber(heat);
      if (
        this.selectedHeatNumber !== -1 &&
        heatNum !== this.selectedHeatNumber
      ) {
        continue;
      }

      const drivers = this.getHeatDrivers(heat);
      if (!drivers || drivers.length === 0) continue;

      const dupLanes = this.hasDuplicateLanes(drivers);

      drivers.forEach((driverData: any, dIndex: number) => {
        const driverLaps = this.extractDriverLaps(
          driverData,
          heatNum,
          dIndex,
          trackData,
          dupLanes,
        );
        if (driverLaps.length > 0) {
          lapsList.push(...driverLaps);
        }
      });
    }

    return lapsList.sort((a, b) => this.compareNormalizedLaps(a, b));
  }

  private matchesDriverFilter(driverName: string): boolean {
    if (!this.selectedDriverName) return true;
    return driverName === this.selectedDriverName;
  }

  private computeMinAllowedTime(rawLaps: any[]): number {
    let minAllowedTime = Infinity;
    rawLaps.forEach((lap: any) => {
      if (!lap) return;
      const num =
        typeof lap === "number"
          ? lap
          : parseFloat(lap?.time ?? lap?.lapTime ?? lap?.lap_time ?? 0);
      const time = isNaN(num) ? 0 : num;
      const countTowardsRecords =
        typeof lap === "object" && lap !== null
          ? (lap.countTowardsRecords ?? lap.count_towards_records ?? true)
          : true;
      if (countTowardsRecords && time > 0 && time < minAllowedTime) {
        minAllowedTime = time;
      }
    });
    return minAllowedTime;
  }

  private hasDuplicateLanes(drivers: any[]): boolean {
    if (!drivers || drivers.length <= 1) return false;
    const laneCounts = new Map<number, number>();
    for (const d of drivers) {
      if (!d) continue;
      const l = typeof d.laneIndex === "number" ? d.laneIndex : d.lane;
      if (typeof l === "number" && l >= 0) {
        laneCounts.set(l, (laneCounts.get(l) || 0) + 1);
        if (laneCounts.get(l)! > 1) {
          return true;
        }
      }
    }
    return false;
  }

  private extractDriverLaps(
    driverData: any,
    heatNum: number,
    dIndex: number,
    trackData: any,
    hasDuplicateLanes: boolean = false,
  ): NormalizedLap[] {
    const rawLaps = this.getDriverLaps(driverData);
    if (!driverData || rawLaps.length === 0 || this.isEmptyLane(driverData)) {
      return [];
    }
    const laneIndex =
      typeof driverData.laneIndex === "number" && driverData.laneIndex >= 0
        ? driverData.laneIndex
        : typeof driverData.lane_index === "number" &&
            driverData.lane_index >= 0
          ? driverData.lane_index
          : !hasDuplicateLanes &&
              typeof driverData.lane === "number" &&
              driverData.lane >= 0
            ? driverData.lane
            : dIndex >= 0
              ? dIndex
              : typeof driverData.lane === "number" && driverData.lane >= 0
                ? driverData.lane
                : 0;

    if (this.selectedLaneIndex !== -1 && laneIndex !== this.selectedLaneIndex) {
      return [];
    }

    const laneConfig =
      trackData?.lanes && trackData.lanes[laneIndex]
        ? trackData.lanes[laneIndex]
        : null;
    const laneColor =
      laneConfig?.background_color || laneConfig?.backgroundColor;
    const laneTextColor =
      laneConfig?.foreground_color || laneConfig?.foregroundColor;

    const minAllowedTime = this.computeMinAllowedTime(rawLaps);
    const result: NormalizedLap[] = [];

    rawLaps.forEach((lap: any, index: number) => {
      if (!lap) return;
      const num =
        typeof lap === "number"
          ? lap
          : parseFloat(lap?.time ?? lap?.lapTime ?? lap?.lap_time ?? 0);
      const time = isNaN(num) ? 0 : num;
      if (time <= 0) return;

      const resolved = this.resolveDriverAndTeam(driverData, lap);

      if (!this.matchesDriverFilter(resolved.driverName)) return;

      const countTowardsRecords =
        typeof lap === "object" && lap !== null
          ? (lap.countTowardsRecords ?? lap.count_towards_records ?? true)
          : true;

      const isFastest =
        countTowardsRecords &&
        minAllowedTime < Infinity &&
        Math.abs(time - minAllowedTime) < 0.0001;

      result.push({
        heatNumber: heatNum,
        laneIndex,
        driverName: resolved.driverName,
        teamName: resolved.teamName,
        laneColor,
        laneTextColor,
        lapIndex: index,
        lapNumber: index + 1,
        lapTime: time,
        countTowardsRecords,
        isFastest,
      });
    });

    return result;
  }

  private getStatusPriority(lap: NormalizedLap): number {
    if (!lap.countTowardsRecords) return 0;
    if (lap.isFastest) return 2;
    return 1;
  }

  private compareNormalizedLaps(a: NormalizedLap, b: NormalizedLap): number {
    let diff = 0;
    switch (this.sortColumn) {
      case "driver":
        diff = naturalSortCompare(a.driverName || "", b.driverName || "");
        break;
      case "heat":
        diff = a.heatNumber - b.heatNumber;
        break;
      case "lane":
        diff = a.laneIndex - b.laneIndex;
        break;
      case "lap":
        diff = a.lapNumber - b.lapNumber;
        break;
      case "time":
        diff = a.lapTime - b.lapTime;
        break;
      case "status":
      case "action":
        diff = this.getStatusPriority(a) - this.getStatusPriority(b);
        break;
    }

    if (this.sortDirection === "desc") {
      diff = -diff;
    }

    if (diff !== 0) {
      return diff;
    }

    // Secondary sorting: Always by time in ascending order (fastest time first)
    if (this.sortColumn !== "time") {
      const timeDiff = a.lapTime - b.lapTime;
      if (timeDiff !== 0) {
        return timeDiff;
      }
    }

    // Tertiary / fallback tie-breaker (and secondary when sorted by time):
    // heat -> lane -> lap
    if (a.heatNumber !== b.heatNumber) {
      return a.heatNumber - b.heatNumber;
    }
    if (a.laneIndex !== b.laneIndex) {
      return a.laneIndex - b.laneIndex;
    }
    return a.lapNumber - b.lapNumber;
  }

  formatLapTime(time: any): string {
    const num = typeof time === "number" ? time : parseFloat(time);
    return isNaN(num) ? "0.000" : num.toFixed(3);
  }

  trackByLap(lap: NormalizedLap, index: number): string {
    return `${lap.heatNumber}-${lap.laneIndex}-${lap.lapIndex}-${index}`;
  }

  onDriverChange(driverName: any): void {
    this.selectedDriverName = String(driverName ?? "");
    this.errorMessage = "";
    this.successMessage = "";
    this.cdr.markForCheck();
  }

  onHeatChange(newHeatNumber: any): void {
    this.selectedHeatNumber = Number(newHeatNumber);
    this.errorMessage = "";
    this.successMessage = "";
    this.cdr.markForCheck();
  }

  onLaneChange(laneIndex: any): void {
    this.selectedLaneIndex = Number(laneIndex);
    this.errorMessage = "";
    this.successMessage = "";
    this.cdr.markForCheck();
  }

  onSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }
    this.cdr.markForCheck();
  }

  getAriaSort(column: SortColumn): "ascending" | "descending" | "none" {
    if (this.sortColumn !== column) return "none";
    return this.sortDirection === "asc" ? "ascending" : "descending";
  }

  toggleLapRecord(lap: NormalizedLap): void {
    if (!this.canEdit || this.isSaving) return;

    const newStatus = !lap.countTowardsRecords;
    this.isSaving = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.cdr.markForCheck();

    const heatNum = lap.heatNumber;
    const lane = lap.laneIndex;
    const lapIndex = lap.lapIndex;

    const historyId = this.raceHistoryId();
    const request$ = historyId
      ? this.dataService.updateHistoryLapRecordStatus(
          historyId,
          heatNum,
          lane,
          lapIndex,
          newStatus,
          this.isDemo(),
        )
      : this.dataService.updateLiveLapRecordStatus(
          heatNum,
          lane,
          lapIndex,
          newStatus,
        );

    request$.subscribe({
      next: (response) => {
        this.isSaving = false;
        lap.countTowardsRecords = newStatus;
        this.applyLapRecordStatusUpdate(
          heatNum,
          lane,
          lapIndex,
          newStatus,
          response?.bestLapTime,
        );
        this.recordsUpdated.emit({
          heatNumber: heatNum,
          lane,
          lapIndex,
          countTowardsRecords: newStatus,
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          "Failed to update lap record status";
        this.cdr.markForCheck();
      },
    });
  }

  private applyLapRecordStatusUpdate(
    heatNum: number,
    lane: number,
    lapIndex: number,
    newStatus: boolean,
    bestLapTime?: number,
  ): void {
    const heatListsToUpdate = [
      this.effectiveHeats,
      this.heats() || [],
      this.raceService?.getHeats() || [],
      [this.raceService?.getCurrentHeat()].filter(Boolean),
    ];

    for (const heatsList of heatListsToUpdate) {
      const heat = heatsList.find((h) => this.getHeatNumber(h) === heatNum);
      if (!heat) continue;
      const drivers = this.getHeatDrivers(heat);
      if (drivers.length === 0) continue;

      const driverData =
        drivers.find((d: any, idx: number) => {
          const l =
            typeof d.laneIndex === "number"
              ? d.laneIndex
              : typeof d.lane_index === "number"
                ? d.lane_index
                : idx;
          return l === lane;
        }) || drivers[lane];

      if (driverData) {
        this.updateDriverLapRecord(
          driverData,
          lapIndex,
          newStatus,
          bestLapTime,
        );
      }
    }

    if (this.raceService) {
      const ch = this.raceService.getCurrentHeat();
      if (ch) {
        this.raceService.setCurrentHeat(ch);
      }
      const sh = this.raceService.getHeats();
      if (sh && sh.length > 0) {
        this.raceService.setHeats([...sh]);
      }
    }
  }

  private updateDriverLapRecord(
    driverData: any,
    lapIndex: number,
    newStatus: boolean,
    bestLapTime?: number,
  ): void {
    if (typeof driverData.updateLapRecordStatus === "function") {
      driverData.updateLapRecordStatus(lapIndex, newStatus);
    }
    if (driverData.lapsWithDetails && driverData.lapsWithDetails[lapIndex]) {
      driverData.lapsWithDetails[lapIndex].countTowardsRecords = newStatus;
    }
    if (
      (driverData as any)._lapsWithDetails &&
      (driverData as any)._lapsWithDetails[lapIndex]
    ) {
      (driverData as any)._lapsWithDetails[lapIndex].countTowardsRecords =
        newStatus;
    }
    if (driverData.laps && driverData.laps[lapIndex]) {
      if (typeof driverData.laps[lapIndex] === "object") {
        driverData.laps[lapIndex].countTowardsRecords = newStatus;
        driverData.laps[lapIndex].count_towards_records = newStatus;
      }
    }
    if (bestLapTime !== undefined) {
      if (typeof (driverData as any)._bestLapTime !== "undefined") {
        (driverData as any)._bestLapTime = bestLapTime;
      }
      if (typeof driverData.bestLapTime !== "undefined") {
        driverData.bestLapTime = bestLapTime;
      }
      if (typeof driverData.best_lap_time !== "undefined") {
        driverData.best_lap_time = bestLapTime;
      }
    }
  }

  onDismiss(): void {
    this.close.emit();
  }
}
