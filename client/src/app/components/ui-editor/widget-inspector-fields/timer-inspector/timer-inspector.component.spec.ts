import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@app/pipes/translate.pipe";
import { FontService } from "@app/services/font.service";

import { TimerInspectorComponent } from "./timer-inspector.component";

describe("TimerInspectorComponent", () => {
  let component: TimerInspectorComponent;
  let fixture: ComponentFixture<TimerInspectorComponent>;
  let changeSpy: jasmine.Spy;

  let fontServiceSpy: jasmine.SpyObj<FontService>;

  beforeEach(async () => {
    const fontSpy = jasmine.createSpyObj("FontService", ["loadLocalFonts"], {
      availableFonts: () => ["Font A", "Font B"],
    });

    await TestBed.configureTestingModule({
      imports: [FormsModule, TimerInspectorComponent, TranslatePipe],
      providers: [{ provide: FontService, useValue: fontSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerInspectorComponent);
    component = fixture.componentInstance;
    fontServiceSpy = TestBed.inject(FontService) as jasmine.SpyObj<FontService>;

    // Set required input
    fixture.componentRef.setInput("settings", {
      timeFontFamily: "",
      timeFontSize: 100,
      timeTextColor: "",
    });

    changeSpy = spyOn(component.change, "emit");
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should emit change when general settings change", () => {
    component.onSettingsChange();
    expect(changeSpy).toHaveBeenCalled();
  });

  it("should update color and emit change on onColorChange", () => {
    const event = {
      target: {
        value: "#ff0000",
      },
    } as any;

    component.onColorChange("timeTextColor", event);
    expect(component.settings().timeTextColor).toBe("#ff0000");
    expect(changeSpy).toHaveBeenCalled();
  });

  it("should reset color to empty string and emit change on resetColor", () => {
    component.settings().timeTextColor = "#ffffff";
    component.resetColor("timeTextColor");
    expect(component.settings().timeTextColor).toBe("");
    expect(changeSpy).toHaveBeenCalled();
  });

  it("should trigger loadLocalFonts on font service when select element is focused", () => {
    const selectEl = fixture.nativeElement.querySelector("app-custom-select");
    selectEl.dispatchEvent(new Event("focus"));
    expect(fontServiceSpy.loadLocalFonts).toHaveBeenCalled();
  });

  it("should disable font size inputs when disableFontSizes is true", async () => {
    fixture.componentRef.setInput("disableFontSizes", true);
    fixture.detectChanges();
    await fixture.whenStable();
    const sliders = Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('input[type="range"]'),
    ).filter((el) => el.getAttribute("max") === "200");
    expect(sliders.length).toBeGreaterThan(0);
    sliders.forEach((slider: HTMLInputElement) => {
      expect(slider.disabled).toBeTrue();
    });
  });

  it("should update timeSubsecondThreshold and emit change", async () => {
    const inputEl = fixture.nativeElement.querySelector('input[type="number"]');
    inputEl.value = "15";
    inputEl.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.settings().timeSubsecondThreshold).toBe(15);
    expect(changeSpy).toHaveBeenCalled();
  });

  it("should update timeSubsecondDecimals and emit change", async () => {
    const slider = Array.from<HTMLInputElement>(
      fixture.nativeElement.querySelectorAll('input[type="range"]'),
    ).find((el) => el.getAttribute("max") === "3");

    expect(slider).toBeTruthy();
    if (slider) {
      slider.value = "1";
      slider.dispatchEvent(new Event("input"));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.settings().timeSubsecondDecimals).toBe(1);
      expect(changeSpy).toHaveBeenCalled();
    }
  });
});
