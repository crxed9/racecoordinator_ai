import { CommonModule } from "@angular/common";
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnDestroy,
  signal,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { AbsoluteWidgetNode } from "@app/models/settings";
import { Track } from "@app/models/track";
import { TranslatePipe } from "@app/pipes/translate.pipe";
import { Heat } from "@app/race/heat";

export interface ProcessedHeatLane {
  laneNumber: number;
  driverNickname: string;
  isTeam: boolean;
  teamName: string;
  backgroundColor: string;
  foregroundColor: string;
  isOccupied: boolean;
}

export interface ProcessedHeat {
  heatNumber: number;
  group: number;
  groupName: string;
  isCurrent: boolean;
  isCompleted: boolean;
  lanes: ProcessedHeatLane[];
}

@Component({
  standalone: true,
  selector: "app-raceday-heat-list",
  templateUrl: "./raceday-heat-list.component.html",
  styleUrls: ["./raceday-heat-list.component.css"],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, TranslatePipe],
})
export class RacedayHeatListComponent implements AfterViewInit, OnDestroy {
  widget = input<AbsoluteWidgetNode | null>(null);
  track = input<Track | undefined>(undefined);
  race = input<any>(undefined);
  currentHeat = input<Heat | undefined>(undefined);
  heats = input<any[]>([]);
  parent = input<any>(undefined);

  scrollContainer = viewChild<ElementRef<HTMLElement>>("scrollContainer");

  containerDimensions = signal<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  private resizeObserver?: ResizeObserver;

  showHeader = computed(() => {
    return this.widget()?.customSettings?.["showHeader"] !== false;
  });

  autoScrollToCurrent = computed(() => {
    return this.widget()?.customSettings?.["autoScrollToCurrent"] !== false;
  });

  highlightCurrentHeat = computed(() => {
    return this.widget()?.customSettings?.["highlightCurrentHeat"] !== false;
  });

  scaleToWindow = computed(() => {
    return this.widget()?.customSettings?.["scaleToWindow"] === true;
  });

  heatColumnsSetting = computed(() => {
    return this.widget()?.customSettings?.["heatColumns"] || "auto";
  });

  laneColumnsSetting = computed(() => {
    return this.widget()?.customSettings?.["laneColumns"] || "auto";
  });

  trackLaneCount = computed(() => {
    return this.track()?.lanes?.length || 4;
  });

  processedHeats = computed<ProcessedHeat[]>(() => {
    const rawHeats = this.heats() || [];
    const cur = this.currentHeat();
    const curHeatNum = cur?.heatNumber ?? -1;
    const trackObj = this.track();
    const raceObj = this.race();
    const totalTrackLanes = trackObj?.lanes?.length || 0;

    return rawHeats.map((h, idx) => {
      const heatNum = h.heatNumber ?? idx + 1;
      const groupNum = h.group ?? 0;
      let groupName = "";
      if (raceObj?.group_options?.enabled) {
        const customName = raceObj.group_options?.names?.[groupNum];
        groupName =
          customName && customName.trim() !== "" ? customName.trim() : "";
      }

      const isCurrent = this.highlightCurrentHeat() && heatNum === curHeatNum;
      const isCompleted = curHeatNum > 0 && heatNum < curHeatNum;

      const lanes: ProcessedHeatLane[] = [];

      if (h.heatDrivers && Array.isArray(h.heatDrivers)) {
        const laneCount = Math.max(totalTrackLanes, h.heatDrivers.length);
        for (let laneIdx = 0; laneIdx < laneCount; laneIdx++) {
          const hd = h.heatDrivers.find((d: any) => d.laneIndex === laneIdx);
          const trackLane = trackObj?.lanes?.[laneIdx];
          const isTm = this.isTeam(hd);
          const teamName = isTm ? this.getTeamName(hd) : "";
          const driverNickname = this.getDriverNickname(hd);
          const isOccupied = !!(driverNickname || teamName);

          lanes.push({
            laneNumber: laneIdx + 1,
            driverNickname,
            isTeam: isTm,
            teamName,
            backgroundColor: trackLane?.background_color || "#333333",
            foregroundColor: trackLane?.foreground_color || "#ffffff",
            isOccupied,
          });
        }
      } else if (h.lanes && Array.isArray(h.lanes)) {
        h.lanes.forEach((lane: any, laneIdx: number) => {
          const trackLane = trackObj?.lanes?.[laneIdx];
          const isTm = !!lane.teamName;
          const teamName = lane.teamName || "";
          const driverNickname =
            lane.nickname ||
            lane.driverNickname ||
            (lane.driverNumber ? String(lane.driverNumber) : "");
          const isOccupied = !!(driverNickname || teamName);

          lanes.push({
            laneNumber: lane.laneNumber ?? laneIdx + 1,
            driverNickname,
            isTeam: isTm,
            teamName,
            backgroundColor:
              lane.backgroundColor || trackLane?.background_color || "#333333",
            foregroundColor:
              lane.foregroundColor || trackLane?.foreground_color || "#ffffff",
            isOccupied,
          });
        });
      }

      return {
        heatNumber: heatNum,
        group: groupNum,
        groupName,
        isCurrent,
        isCompleted,
        lanes,
      };
    });
  });

  autoFitLayout = computed(() => {
    const n = this.processedHeats().length;
    if (n <= 0) {
      return { columns: 1, rows: 1, scale: 1 };
    }

    const { width, height } = this.containerDimensions();
    return this.calculateOptimalFit(n, width, height);
  });

  constructor() {
    effect(() => {
      const cur = this.currentHeat();
      const shouldAutoScroll =
        this.autoScrollToCurrent() && !this.scaleToWindow();
      if (!cur || !shouldAutoScroll) return;

      setTimeout(() => {
        const container = this.scrollContainer()?.nativeElement;
        if (!container) return;
        const activeCard = container.querySelector(
          `#heat-card-${cur.heatNumber}`,
        ) as HTMLElement;
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 50);
    });
  }

  ngAfterViewInit() {
    const el = this.scrollContainer()?.nativeElement;
    if (el && typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.containerDimensions.set({ width, height });
          }
        }
      });
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  calculateOptimalFit(
    n: number,
    width: number,
    height: number,
  ): { columns: number; rows: number; scale: number } {
    if (n <= 0) return { columns: 1, rows: 1, scale: 1 };

    if (width > 0 && height > 0) {
      const targetAspect = 2.2;
      let bestCols = 1;
      let bestRows = n;
      let bestScore = Infinity;

      const maxCols = Math.min(n, 12);
      for (let c = 1; c <= maxCols; c++) {
        const r = Math.ceil(n / c);
        const cellW = (width - (c - 1) * 6) / c;
        const cellH = (height - (r - 1) * 6) / r;
        if (cellW <= 0 || cellH <= 0) continue;

        const aspect = cellW / cellH;
        const aspectDiff = Math.abs(Math.log(aspect / targetAspect));
        const emptySlots = c * r - n;
        const emptyPenalty = (emptySlots / n) * 0.25;
        const squishPenalty = cellH < 35 ? (35 - cellH) * 0.1 : 0;

        const totalScore = aspectDiff + emptyPenalty + squishPenalty;
        if (totalScore < bestScore) {
          bestScore = totalScore;
          bestCols = c;
          bestRows = r;
        }
      }

      const finalCellW = (width - (bestCols - 1) * 6) / bestCols;
      const finalCellH = (height - (bestRows - 1) * 6) / bestRows;
      const scaleW = finalCellW / 240;
      const scaleH = finalCellH / 110;
      const scale = Math.max(0.4, Math.min(2.0, Math.min(scaleW, scaleH)));

      return { columns: bestCols, rows: bestRows, scale };
    }

    // Default layout purely based on N
    let cols = 1;
    if (n <= 2) cols = n;
    else if (n <= 4) cols = 2;
    else if (n <= 6) cols = 3;
    else if (n <= 8) cols = 4;
    else if (n <= 12) cols = 4;
    else if (n <= 16) cols = 4;
    else if (n <= 20) cols = 5;
    else if (n <= 30) cols = 6;
    else cols = 8;

    const rows = Math.ceil(n / cols);
    const scale = Math.max(0.4, Math.min(1.0, 1.2 / Math.sqrt(rows)));
    return { columns: cols, rows, scale };
  }

  isTeam(hd: any): boolean {
    if (!hd) return false;
    if (this.parent()?.isTeam) {
      return this.parent().isTeam(hd);
    }
    return !!(hd?.participant?.team || hd?.driver?.team);
  }

  getTeamName(hd: any): string {
    if (!hd) return "";
    return hd?.participant?.team?.name || hd?.driver?.team?.name || "";
  }

  getDriverNickname(hd: any): string {
    if (!hd) return "";
    return hd?.driver?.nickname || "";
  }

  getLaneColumnsStyle(): string {
    const setting = this.laneColumnsSetting();
    if (setting === "auto") {
      const count = Math.min(this.trackLaneCount(), 4);
      return `repeat(${Math.max(count, 1)}, 1fr)`;
    }
    const cols = parseInt(setting, 10);
    return `repeat(${isNaN(cols) ? 2 : cols}, 1fr)`;
  }

  getHeatColumnsStyle(): string {
    if (this.scaleToWindow()) {
      return `repeat(${this.autoFitLayout().columns}, 1fr)`;
    }
    const setting = this.heatColumnsSetting();
    if (setting === "auto") {
      return "repeat(auto-fill, minmax(280px, 1fr))";
    }
    const cols = parseInt(setting, 10);
    return `repeat(${isNaN(cols) ? 1 : cols}, 1fr)`;
  }

  getHeatRowsStyle(): string {
    if (this.scaleToWindow()) {
      return `repeat(${this.autoFitLayout().rows}, 1fr)`;
    }
    return "none";
  }

  trackByHeatNumber(_index: number, heat: ProcessedHeat): number {
    return heat.heatNumber;
  }

  trackByLaneNumber(_index: number, lane: ProcessedHeatLane): number {
    return lane.laneNumber;
  }
}
