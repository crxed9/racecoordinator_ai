import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AbsoluteWidgetNode } from "@app/models/settings";
import { Track } from "@app/models/track";
import { TranslatePipe } from "@app/pipes/translate.pipe";
import { Heat } from "@app/race/heat";

import { RacedayHeatListComponent } from "./raceday-heat-list.component";

describe("RacedayHeatListComponent", () => {
  let component: RacedayHeatListComponent;
  let fixture: ComponentFixture<RacedayHeatListComponent>;

  const mockTrack: Track = {
    entity_id: "track_1",
    name: "Speedway",
    lanes: [
      {
        lane_number: 1,
        background_color: "#ff0000",
        foreground_color: "#ffffff",
      },
      {
        lane_number: 2,
        background_color: "#0000ff",
        foreground_color: "#ffff00",
      },
      {
        lane_number: 3,
        background_color: "#00ff00",
        foreground_color: "#000000",
      },
      {
        lane_number: 4,
        background_color: "#ffff00",
        foreground_color: "#000000",
      },
    ],
  } as any;

  const mockHeats: any[] = [
    {
      heatNumber: 1,
      group: 0,
      heatDrivers: [
        {
          laneIndex: 0,
          driver: { nickname: "Speedy", name: "John Doe", seed: 1 },
          participant: { team: null },
        },
        {
          laneIndex: 1,
          driver: { nickname: "Rocket", name: "Jane Smith", seed: 2 },
          participant: { team: { name: "Team Red" } },
        },
      ],
    },
    {
      heatNumber: 2,
      group: 1,
      heatDrivers: [
        {
          laneIndex: 0,
          driver: { nickname: "Flash", name: "Bruce Wayne", seed: 3 },
          participant: { team: null },
        },
      ],
    },
  ];

  const mockWidget: AbsoluteWidgetNode = {
    id: "widget-heat-list-1",
    widgetType: "heat-list",
    x: 0,
    y: 0,
    width: 384,
    height: 400,
    zIndex: 100,
    scaleMode: "auto",
    customSettings: {
      showHeader: true,
      autoScrollToCurrent: true,
      highlightCurrentHeat: true,
      heatColumns: "auto",
      laneColumns: "auto",
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RacedayHeatListComponent, TranslatePipe],
    }).compileComponents();

    fixture = TestBed.createComponent(RacedayHeatListComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput("widget", mockWidget);
    fixture.componentRef.setInput("track", mockTrack);
    fixture.componentRef.setInput("heats", mockHeats);
    fixture.componentRef.setInput("currentHeat", { heatNumber: 1 } as Heat);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should process heats and map driver nickname (never driver full name)", () => {
    const processed = component.processedHeats();
    expect(processed.length).toBe(2);

    const heat1 = processed[0];
    expect(heat1.heatNumber).toBe(1);
    expect(heat1.isCurrent).toBeTrue();

    const lane1 = heat1.lanes[0];
    expect(lane1.driverNickname).toBe("Speedy");
    expect(lane1.backgroundColor).toBe("#ff0000");
    expect(lane1.foregroundColor).toBe("#ffffff");

    // Verify template renders driver nickname and not full name "John Doe"
    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain("Speedy");
    expect(textContent).not.toContain("John Doe");
  });

  it("should display team name when participant is a team", () => {
    const processed = component.processedHeats();
    const heat1 = processed[0];
    const lane2 = heat1.lanes[1];

    expect(lane2.driverNickname).toBe("Rocket");
    expect(lane2.isTeam).toBeTrue();
    expect(lane2.teamName).toBe("Team Red");

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain("Team Red");
    expect(textContent).not.toContain("Jane Smith");
  });

  it("should highlight the current heat", () => {
    const currentCard = fixture.nativeElement.querySelector(
      "#heat-card-1.current-heat",
    );
    expect(currentCard).toBeTruthy();

    const currentBadge = fixture.nativeElement.querySelector(
      ".current-heat-badge",
    );
    expect(currentBadge).toBeTruthy();
  });

  it("should handle lane and heat columns configuration", () => {
    expect(component.getHeatColumnsStyle()).toBe(
      "repeat(auto-fill, minmax(280px, 1fr))",
    );
    expect(component.getLaneColumnsStyle()).toBe("repeat(4, 1fr)");

    fixture.componentRef.setInput("widget", {
      ...mockWidget,
      customSettings: {
        ...mockWidget.customSettings,
        heatColumns: "2",
        laneColumns: "1",
      },
    });
    fixture.detectChanges();

    expect(component.getHeatColumnsStyle()).toBe("repeat(2, 1fr)");
    expect(component.getLaneColumnsStyle()).toBe("repeat(1, 1fr)");
  });

  it("should toggle title header based on showHeader setting", () => {
    expect(
      fixture.nativeElement.querySelector(".heat-list-title"),
    ).toBeTruthy();

    fixture.componentRef.setInput("widget", {
      ...mockWidget,
      customSettings: {
        ...mockWidget.customSettings,
        showHeader: false,
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(".heat-list-title")).toBeFalsy();
  });

  it("should process heats with heat.lanes format", () => {
    const alternativeHeats = [
      {
        heatNumber: 3,
        lanes: [
          {
            laneNumber: 1,
            nickname: "Bowser",
            backgroundColor: "#222222",
            foregroundColor: "#ffffff",
          },
        ],
      },
    ];
    fixture.componentRef.setInput("heats", alternativeHeats);
    fixture.detectChanges();

    const processed = component.processedHeats();
    expect(processed.length).toBe(1);
    expect(processed[0].lanes[0].driverNickname).toBe("Bowser");
  });

  it("should display empty message when heats is empty", () => {
    fixture.componentRef.setInput("heats", []);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(".heat-list-empty-msg"),
    ).toBeTruthy();
  });

  it("should apply scale-to-window classes and auto-calculate heat columns and rows", () => {
    fixture.componentRef.setInput("widget", {
      ...mockWidget,
      customSettings: {
        ...mockWidget.customSettings,
        scaleToWindow: true,
      },
    });
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector(
      ".raceday-heat-list-container.scale-to-window",
    );
    expect(container).toBeTruthy();

    // 2 heats in mockHeats -> auto layout chooses 2 columns, 1 row
    expect(component.getHeatColumnsStyle()).toBe("repeat(2, 1fr)");
    expect(component.getHeatRowsStyle()).toBe("repeat(1, 1fr)");

    const layout = component.calculateOptimalFit(8, 1920, 900);
    expect(layout.columns).toBeGreaterThanOrEqual(3);
    expect(layout.rows).toBeGreaterThanOrEqual(2);
    expect(layout.scale).toBeGreaterThan(0);
  });

  it("should vertically center lane numbers and driver info with large heat sets", () => {
    // Generate 20 mock heats to test scaling with a large set
    const largeHeats: any[] = [];
    for (let h = 1; h <= 20; h++) {
      largeHeats.push({
        heatNumber: h,
        heatDrivers: [
          {
            laneIndex: 0,
            driver: { nickname: `Driver ${h}` },
          },
          {
            laneIndex: 1,
            driver: { nickname: `Driver ${(h % 20) + 1}` },
          },
          {
            laneIndex: 2,
            driver: { nickname: `Driver ${((h + 1) % 20) + 1}` },
          },
          {
            laneIndex: 3,
            driver: { nickname: `Driver ${((h + 2) % 20) + 1}` },
          },
        ],
      });
    }

    fixture.componentRef.setInput("heats", largeHeats);
    fixture.componentRef.setInput("widget", {
      ...mockWidget,
      customSettings: {
        ...mockWidget.customSettings,
        scaleToWindow: true,
      },
    });
    fixture.detectChanges();

    const laneBadges =
      fixture.nativeElement.querySelectorAll(".lane-badge-item");
    expect(laneBadges.length).toBe(80); // 20 heats * 4 lanes

    const firstLaneBadge = laneBadges[0];
    const header = firstLaneBadge.querySelector(".lane-badge-header");
    const tag = firstLaneBadge.querySelector(".lane-badge-tag");
    const driverInfo = firstLaneBadge.querySelector(".lane-driver-info");

    expect(header).toBeTruthy();
    expect(tag).toBeTruthy();
    expect(driverInfo).toBeTruthy();
    expect(tag.textContent.trim()).toBe("L1");

    // With 20 heats, fit calculation selects multi-column grid
    const layout20 = component.calculateOptimalFit(20, 1920, 1080);
    expect(layout20.columns).toBeGreaterThanOrEqual(4);
    expect(layout20.rows).toBeGreaterThanOrEqual(4);
  });
});
