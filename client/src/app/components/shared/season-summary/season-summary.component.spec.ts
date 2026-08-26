import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Season, SeasonStandingItem } from "@app/models/season";
import { TranslatePipe } from "@app/pipes/translate.pipe";
import { TranslationService } from "@app/services/translation.service";

import { SeasonSummaryComponent } from "./season-summary.component";

describe("SeasonSummaryComponent", () => {
  let component: SeasonSummaryComponent;
  let fixture: ComponentFixture<SeasonSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeasonSummaryComponent, TranslatePipe],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translate: (key: string) => key,
            getTranslation: (key: string) => key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SeasonSummaryComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display empty message when season is undefined", () => {
    fixture.componentRef.setInput("season", undefined);
    fixture.componentRef.setInput("emptyMessage", "RDS_NO_SEASON_SELECTED");
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector(".empty-standings");
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain("RDS_NO_SEASON_SELECTED");
  });

  it("should display empty standings when season has no races", () => {
    const season: Season = {
      entity_id: "s_empty",
      name: "Empty Season",
      drops: 1,
      races: [],
    };
    fixture.componentRef.setInput("season", season);
    fixture.detectChanges();

    const name = fixture.nativeElement.querySelector("#season-detail-name");
    expect(name.textContent).toContain("Empty Season");

    const drops = fixture.nativeElement.querySelector("#season-detail-drops");
    expect(drops.textContent).toContain("1");

    const races = fixture.nativeElement.querySelector("#season-detail-races");
    expect(races.textContent).toContain("0");

    const empty = fixture.nativeElement.querySelector(".empty-standings");
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain("SM_NO_RACES_RUN");
  });

  it("should render standings table with podium classes and medals when standings are provided", () => {
    const season: Season = {
      entity_id: "s1",
      name: "Pro Championship",
      drops: 0,
      races: [
        {
          race_id: "r1",
          race_name: "Race 1",
          timestamp: 1000,
          driver_results: [],
        },
      ],
    };
    const standings: SeasonStandingItem[] = [
      {
        driver_id: "d1",
        driver_name: "First Driver",
        net_points: 50,
        gross_points: 50,
        races_run: 2,
        race_scores: [],
      },
      {
        driver_id: "d2",
        driver_name: "Second Driver",
        net_points: 40,
        gross_points: 40,
        races_run: 2,
        race_scores: [],
      },
      {
        driver_id: "d3",
        driver_name: "Third Driver",
        net_points: 30,
        gross_points: 30,
        races_run: 2,
        race_scores: [],
      },
      {
        driver_id: "d4",
        driver_name: "Fourth Driver",
        net_points: 20,
        gross_points: 20,
        races_run: 2,
        race_scores: [],
      },
    ];

    fixture.componentRef.setInput("season", season);
    fixture.componentRef.setInput("standings", standings);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      ".standings-body-container tbody tr",
    );
    expect(rows.length).toBe(4);

    expect(rows[0].classList).toContain("podium-1");
    expect(rows[0].textContent).toContain("🥇 1");
    expect(rows[0].textContent).toContain("First Driver");
    expect(rows[0].textContent).toContain("50");

    expect(rows[1].classList).toContain("podium-2");
    expect(rows[1].textContent).toContain("🥈 2");

    expect(rows[2].classList).toContain("podium-3");
    expect(rows[2].textContent).toContain("🥉 3");

    expect(rows[3].textContent).toContain("4");
    expect(rows[3].textContent).toContain("Fourth Driver");
  });

  it("should show demo badge when season contains demo races", () => {
    const season: Season = {
      entity_id: "s_demo",
      name: "Demo Season",
      drops: 0,
      races: [
        {
          race_id: "r1",
          race_name: "Demo Race",
          timestamp: 1000,
          is_demo: true,
          driver_results: [],
        },
      ],
    };
    fixture.componentRef.setInput("season", season);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector(
      "#season-detail-demo-badge",
    );
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("SE_DEMO_RACES_INCLUDED");
  });

  it("should compute standings automatically when standings input is omitted", () => {
    const season: Season = {
      entity_id: "s_calc",
      name: "Computed Season",
      drops: 0,
      races: [
        {
          race_id: "r1",
          race_name: "Race 1",
          timestamp: 1000,
          driver_results: [
            {
              driver_id: "d1",
              driver_name: "Driver A",
              overall_rank: 1,
              overall_points: 25,
              heat_points: 0,
              total_points: 25,
            },
          ],
        },
      ],
    };
    fixture.componentRef.setInput("season", season);
    fixture.detectChanges();

    expect(component.computedStandings().length).toBe(1);
    expect(component.computedStandings()[0].driver_name).toBe("Driver A");
  });

  it("should apply compact class when compact input is true", () => {
    fixture.componentRef.setInput("compact", true);
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector(
      ".season-summary-container",
    );
    expect(container.classList).toContain("compact");
  });
});
