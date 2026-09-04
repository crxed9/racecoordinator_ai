import { ComponentFixture, TestBed } from "@angular/core/testing";
import { BehaviorSubject, of, throwError } from "rxjs";
import { DataService } from "@app/data.service";
import { Role } from "@app/models/role";
import { AuthService } from "@app/services/auth.service";
import { TranslationService } from "@app/services/translation.service";

import { RaceHistoryDialogComponent } from "./race-history-dialog.component";

describe("RaceHistoryDialogComponent", () => {
  let component: RaceHistoryDialogComponent;
  let fixture: ComponentFixture<RaceHistoryDialogComponent>;
  let mockDataService: jasmine.SpyObj<DataService>;
  let roleSubject: BehaviorSubject<Role>;
  let mockAuthService: { currentRole$: BehaviorSubject<Role> };

  const mockHistories = [
    {
      _id: "hist_1",
      model: { name: "Grand Prix A" },
      track: { name: "Thunder Track" },
      is_demo: false,
      heats: [{ heatNumber: 1, drivers: [] }],
      drivers: [{ driver: { name: "Alice" } }],
      timestamp: 1000,
    },
    {
      _id: "hist_2",
      model: { name: "Sprint Cup" },
      track: { name: "Speedway" },
      is_demo: true,
      heats: [{ heatNumber: 1, drivers: [] }],
      drivers: [{ driver: { name: "Bob" } }],
      timestamp: 2000,
    },
  ];

  beforeEach(async () => {
    mockDataService = jasmine.createSpyObj("DataService", [
      "getAllFinishedRaceHistory",
      "getRaceHistoryById",
      "updateLiveLapRecordStatus",
      "updateHistoryLapRecordStatus",
    ]);
    mockDataService.getAllFinishedRaceHistory.and.returnValue(
      of(mockHistories),
    );
    mockDataService.getRaceHistoryById.and.returnValue(of(mockHistories[0]));

    roleSubject = new BehaviorSubject<Role>(Role.VIEWER);
    mockAuthService = {
      currentRole$: roleSubject,
    };

    const mockTranslationService = {
      translate: (key: string) => key,
      get: (key: string) => of(key),
    };

    await TestBed.configureTestingModule({
      imports: [RaceHistoryDialogComponent],
      providers: [
        { provide: DataService, useValue: mockDataService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RaceHistoryDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("visible", true);
    fixture.detectChanges();
  });

  it("should create the component", () => {
    expect(component).toBeTruthy();
    expect(component.canEdit).toBeFalse();
  });

  it("should update canEdit when role changes", () => {
    roleSubject.next(Role.DIRECTOR);
    expect(component.canEdit).toBeTrue();
  });

  it("should load race histories on visible change", () => {
    fixture.componentRef.setInput("visible", true);
    component.ngOnChanges({
      visible: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(mockDataService.getAllFinishedRaceHistory).toHaveBeenCalled();
    expect(component.raceHistories.length).toBe(2);
    // Should be sorted by timestamp descending
    expect(component.raceHistories[0]._id).toBe("hist_2");
    expect(component.raceHistories[1]._id).toBe("hist_1");
  });

  it("should filter race histories by search term", () => {
    component.raceHistories = [...mockHistories];

    component.searchTerm = "Grand";
    expect(component.filteredHistories.length).toBe(1);
    expect(component.filteredHistories[0].model.name).toBe("Grand Prix A");

    component.searchTerm = "Speedway";
    expect(component.filteredHistories.length).toBe(1);
    expect(component.filteredHistories[0].model.name).toBe("Sprint Cup");

    component.searchTerm = "NonExistent";
    expect(component.filteredHistories.length).toBe(0);
  });

  it("should fetch full details and open disallow dialog on editRaceLaps", () => {
    component.editRaceLaps(mockHistories[0]);

    expect(mockDataService.getRaceHistoryById).toHaveBeenCalledWith(
      "hist_1",
      false,
    );
    expect(component.showDisallowDialog).toBeTrue();
    expect(component.selectedHistoryDetails).toEqual(mockHistories[0]);
  });

  it("should preserve is_demo on selectedHistoryDetails when editing a demo race", () => {
    mockDataService.getRaceHistoryById.and.returnValue(
      of({ ...mockHistories[1] }),
    );
    component.editRaceLaps(mockHistories[1]);

    expect(mockDataService.getRaceHistoryById).toHaveBeenCalledWith(
      "hist_2",
      true,
    );
    expect(component.showDisallowDialog).toBeTrue();
    expect(component.selectedHistoryDetails.is_demo).toBeTrue();
  });

  it("should fall back to summary item if getRaceHistoryById fails", () => {
    mockDataService.getRaceHistoryById.and.returnValue(
      throwError(() => new Error("Not found")),
    );

    component.editRaceLaps(mockHistories[1]);

    expect(component.showDisallowDialog).toBeTrue();
    expect(component.selectedHistoryDetails).toEqual(mockHistories[1]);
  });

  it("should close disallow dialog and reload histories", () => {
    spyOn(component, "loadHistories");
    component.showDisallowDialog = true;
    component.selectedHistoryDetails = mockHistories[0];

    component.closeDisallowDialog();

    expect(component.showDisallowDialog).toBeFalse();
    expect(component.selectedHistoryDetails).toBeNull();
    expect(component.loadHistories).toHaveBeenCalled();
  });

  it("should update ineligible lap count on recordsUpdated event", () => {
    component.raceHistories = [
      {
        _id: "race_test_1",
        heats: [
          {
            heatNumber: 1,
            drivers: [
              {
                lane: 0,
                laps: [
                  { countTowardsRecords: true },
                  { countTowardsRecords: true },
                ],
              },
            ],
          },
        ],
        ineligible_lap_count: 0,
      },
    ];
    component.selectedHistoryDetails = component.raceHistories[0];

    component.onRecordsUpdated({
      heatNumber: 1,
      lane: 0,
      lapIndex: 1,
      countTowardsRecords: false,
    });

    expect(component.raceHistories[0].ineligible_lap_count).toBe(1);
    expect(component.raceHistories[0].ineligibleLapCount).toBe(1);
  });

  it("should calculate ineligible lap count correctly using getIneligibleLapCount", () => {
    expect(component.getIneligibleLapCount(null)).toBe(0);
    expect(component.getIneligibleLapCount({})).toBe(0);

    // Prioritize server property
    expect(component.getIneligibleLapCount({ ineligible_lap_count: 4 })).toBe(
      4,
    );
    expect(component.getIneligibleLapCount({ ineligibleLapCount: 2 })).toBe(2);

    // Calculate from heats when property not preset
    const raceWithHeats = {
      heats: [
        {
          drivers: [
            {
              laps: [
                { countTowardsRecords: true },
                { countTowardsRecords: false },
              ],
            },
            {
              laps: [
                { count_towards_records: false },
                { count_towards_records: true },
              ],
            },
          ],
        },
        {
          drivers: [
            {
              laps: [{ countTowardsRecords: false }],
            },
          ],
        },
      ],
    };

    expect(component.getIneligibleLapCount(raceWithHeats)).toBe(3);
  });

  it("should render ineligible lap count badge in the DOM", () => {
    component.raceHistories = [
      {
        _id: "hist_none",
        model: { name: "Clean Race" },
        track: { name: "Track A" },
        ineligible_lap_count: 0,
        heats: [],
      },
      {
        _id: "hist_some",
        model: { name: "Flagged Race" },
        track: { name: "Track B" },
        ineligible_lap_count: 2,
        heats: [],
      },
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const metaBadges = compiled.querySelectorAll(".meta-ineligible-laps");
    expect(metaBadges.length).toBe(2);

    // First race has 0 ineligible laps: should not have has-ineligible class
    expect(metaBadges[0].classList.contains("has-ineligible")).toBeFalse();
    expect(metaBadges[0].textContent).toContain("RHD_INELIGIBLE_LAPS_COUNT");

    // Second race has 2 ineligible laps: should have has-ineligible class
    expect(metaBadges[1].classList.contains("has-ineligible")).toBeTrue();
    expect(metaBadges[1].textContent).toContain("RHD_INELIGIBLE_LAPS_COUNT");
  });

  it("should use singular translation key when ineligible lap count is 1", () => {
    component.raceHistories = [
      {
        _id: "hist_single",
        model: { name: "Single Ineligible Race" },
        track: { name: "Track C" },
        ineligible_lap_count: 1,
        heats: [],
      },
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const metaBadge = compiled.querySelector(".meta-ineligible-laps");
    expect(metaBadge).toBeTruthy();
    expect(metaBadge?.classList.contains("has-ineligible")).toBeTrue();
    expect(metaBadge?.textContent).toContain("RHD_INELIGIBLE_LAP_SINGLE");
  });

  it("should emit close on onDismiss", () => {
    spyOn(component.close, "emit");
    component.onDismiss();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it("should resolve timestamp correctly using getRaceTimestamp", () => {
    expect(component.getRaceTimestamp(null)).toBeNull();
    expect(component.getRaceTimestamp({ timestamp: 123456 })).toBe(123456);
    expect(
      component.getRaceTimestamp({ statistics: { startMillis: 789000 } }),
    ).toBe(789000);
    expect(
      component.getRaceTimestamp({
        statistics: { startTime: "2026-08-30T18:00:00Z" },
      }),
    ).toBe("2026-08-30T18:00:00Z");
    expect(
      component.getRaceTimestamp({
        heats: [{ statistics: { startTime: "2026-08-30T19:00:00Z" } }],
      }),
    ).toBe("2026-08-30T19:00:00Z");
  });
});
