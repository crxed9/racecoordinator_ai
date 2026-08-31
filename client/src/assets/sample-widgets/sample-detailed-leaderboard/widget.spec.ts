import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DataService } from "@app/data.service";
import { Driver } from "@app/models/driver";
import { RaceParticipant } from "@app/models/race_participant";
import { AuthService } from "@app/services/auth.service";
import { HelpService } from "@app/services/help.service";
import { LoggerService } from "@app/services/logger.service";
import { PrintService } from "@app/services/print.service";
import { RaceService } from "@app/services/race.service";
import { RaceFlagService } from "@app/services/race-flag.service";
import { RacePredictionService } from "@app/services/race-prediction.service";
import { SettingsService } from "@app/services/settings.service";
import { ThemeService } from "@app/services/theme.service";
import { TranslationService } from "@app/services/translation.service";

import { DetailedLeaderboardComponent } from "./widget";

describe("DetailedLeaderboardComponent (sample-detailed-leaderboard)", () => {
  let component: DetailedLeaderboardComponent;
  let fixture: ComponentFixture<DetailedLeaderboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DetailedLeaderboardComponent],
      providers: [
        { provide: DataService, useValue: {} },
        { provide: RaceService, useValue: {} },
        { provide: TranslationService, useValue: {} },
        { provide: ThemeService, useValue: {} },
        { provide: RaceFlagService, useValue: {} },
        {
          provide: LoggerService,
          useValue: { error: () => {}, warn: () => {}, debug: () => {} },
        },
        { provide: SettingsService, useValue: {} },
        { provide: PrintService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: HelpService, useValue: {} },
        { provide: RacePredictionService, useValue: {} },
      ],
    });

    fixture = TestBed.createComponent(DetailedLeaderboardComponent);
    component = fixture.componentInstance;
  });

  it("should be created", () => {
    expect(component).toBeTruthy();
  });

  describe("precision and number formatting", () => {
    it("should format laps to 2 decimal places", () => {
      expect(component.formatLaps(15.823485)).toBe("15.82");
      expect(component.formatLaps(10)).toBe("10.00");
      expect(component.formatLaps(0)).toBe("0.00");
      expect(component.formatLaps(undefined)).toBe("0.00");
      expect(component.formatLaps(null as any)).toBe("0.00");
      expect(component.formatLaps(NaN)).toBe("0.00");
    });

    it("should format total time to 3 decimal places", () => {
      expect(component.formatTotalTime(123.45678)).toBe("123.457");
      expect(component.formatTotalTime(45.1)).toBe("45.100");
      expect(component.formatTotalTime(0)).toBe("0.000");
      expect(component.formatTotalTime(undefined)).toBe("0.000");
      expect(component.formatTotalTime(null as any)).toBe("0.000");
      expect(component.formatTotalTime(NaN)).toBe("0.000");
    });

    it("should format lap times to 3 decimal places or placeholder", () => {
      expect(component.formatLapTime(3.4567)).toBe("3.457");
      expect(component.formatLapTime(4.1)).toBe("4.100");
      expect(component.formatLapTime(0)).toBe("--");
      expect(component.formatLapTime(-1)).toBe("--");
      expect(component.formatLapTime(undefined)).toBe("--");
      expect(component.formatLapTime(null as any)).toBe("--");
    });

    it("should format gap to 3 decimal places", () => {
      // Leader (index 0) returns empty string
      expect(component.formatGap({}, 0, [])).toBe("");

      // Gap position
      expect(
        component.formatGap({ gap_position: 1.2346 }, 1, [{ total_time: 10 }]),
      ).toBe("+1.235");
      expect(
        component.formatGap({ gap_position: -0.5678 }, 1, [{ total_time: 10 }]),
      ).toBe("-0.568");

      // Gap leader fallback
      expect(
        component.formatGap({ gap_leader: 2.3456 }, 1, [{ total_time: 10 }]),
      ).toBe("+2.346");

      // Total time delta fallback
      expect(
        component.formatGap({ total_time: 15.6789 }, 1, [
          { total_time: 10.1234 },
        ]),
      ).toBe("+5.556");

      // Zero laps or no data
      expect(component.formatGap({ lapCount: 0, total_laps: 0 }, 1, [{}])).toBe(
        "--",
      );
    });
  });

  describe("displayRows generation", () => {
    it("should format standings rows with 2 decimal laps and 3 decimal times", () => {
      const driver1 = new Driver("d1", "Speedy", "Speedy");
      const driver2 = new Driver("d2", "Racer", "Racer");

      const p1 = new RaceParticipant(
        "p1",
        driver1,
        1,
        12.3456,
        45.6789,
        3.4567,
        3.7012,
        3.7,
        12.3456,
        1,
        100,
      );

      const p2 = new RaceParticipant(
        "p2",
        driver2,
        2,
        11.8765,
        46.8912,
        3.5678,
        3.9456,
        3.9,
        11.8765,
        2,
        100,
        1.2123,
      );

      spyOnProperty(component, "participants", "get").and.returnValue([p1, p2]);

      const rows = component.displayRows;
      expect(rows.length).toBe(2);

      // Leader
      expect(rows[0].position).toBe(1);
      expect(rows[0].name).toBe("Speedy");
      expect(rows[0].laps).toBe("12.35");
      expect(rows[0].timeFormatted).toBe("45.679");
      expect(rows[0].gapFormatted).toBe("");
      expect(rows[0].bestLapFormatted).toBe("3.457");
      expect(rows[0].avgLapFormatted).toBe("3.701");
      expect(rows[0].isEmpty).toBeFalse();

      // P2
      expect(rows[1].position).toBe(2);
      expect(rows[1].name).toBe("Racer");
      expect(rows[1].laps).toBe("11.88");
      expect(rows[1].timeFormatted).toBe("46.891");
      expect(rows[1].gapFormatted).toBe("+1.212");
      expect(rows[1].bestLapFormatted).toBe("3.568");
      expect(rows[1].avgLapFormatted).toBe("3.946");
      expect(rows[1].isEmpty).toBeFalse();
    });

    it("should fill empty rows up to maxRows", () => {
      const driver1 = new Driver("d1", "Solo", "Solo");
      const p1 = new RaceParticipant(
        "p1",
        driver1,
        1,
        5,
        20,
        4.0,
        4.0,
        4.0,
        5,
        1,
        100,
      );

      spyOnProperty(component, "participants", "get").and.returnValue([p1]);
      spyOn(component, "getSetting").and.callFake((key: string, def: any) => {
        if (key === "maxRows") return 3;
        return def;
      });

      const rows = component.displayRows;
      expect(rows.length).toBe(3);
      expect(rows[0].isEmpty).toBeFalse();
      expect(rows[0].laps).toBe("5.00");
      expect(rows[1].isEmpty).toBeTrue();
      expect(rows[1].position).toBe(2);
      expect(rows[2].isEmpty).toBeTrue();
      expect(rows[2].position).toBe(3);
    });
  });

  describe("custom settings getters", () => {
    it("should read settings with correct defaults", () => {
      expect(component.title).toBe("");
      expect(component.maxRows).toBe(0);
      expect(component.showTime).toBeTrue();
      expect(component.showGap).toBeTrue();
      expect(component.showBestLap).toBeTrue();
      expect(component.showAvgLap).toBeTrue();
      expect(component.bestLapColor).toBe("#38bdf8");
      expect(component.avgLapColor).toBe("#f59e0b");
    });
  });
});
