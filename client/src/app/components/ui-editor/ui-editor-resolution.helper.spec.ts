import { CustomUI } from "@app/models/custom-ui";
import { LayoutConfig, Settings } from "@app/models/settings";

import {
  applyCustomDimensionChange,
  applyLayoutResolutionChange,
  calculatePreviewScaleNumber,
  computeScaledLayout,
  getDefaultResolutionOptions,
  getLayoutResolution,
  getLayoutResolutionOptions,
  scaleLayoutDimensions,
} from "./ui-editor-resolution.helper";

describe("ui-editor-resolution.helper", () => {
  it("should return default resolution options", () => {
    const options = getDefaultResolutionOptions();
    expect(options.length).toBeGreaterThan(5);
    expect(
      options.some((o) => o.label === "UI_EDITOR_RESOLUTION_DESKTOP_TV"),
    ).toBeTrue();
  });

  it("should return formatted layout resolution", () => {
    expect(getLayoutResolution(undefined)).toBe("1920x1080");
    const layout: LayoutConfig = {
      baseWidth: 1280,
      baseHeight: 720,
      widgets: [],
    };
    expect(getLayoutResolution(layout)).toBe("1280x720");
  });

  it("should append custom resolution option if not in defaults", () => {
    const baseOptions = getDefaultResolutionOptions();
    const customLayout: LayoutConfig = {
      baseWidth: 1366,
      baseHeight: 768,
      widgets: [],
    };
    const result = getLayoutResolutionOptions(baseOptions, customLayout);
    expect(result.some((o) => o.width === 1366 && o.height === 768)).toBeTrue();
  });

  it("should scale layout dimensions and widgets proportionally", () => {
    const layout: LayoutConfig = {
      baseWidth: 1000,
      baseHeight: 500,
      widgets: [
        {
          id: "w1",
          widgetType: "lane-view",
          x: 100,
          y: 50,
          width: 200,
          height: 100,
          zIndex: 1,
        },
      ],
    };

    scaleLayoutDimensions(layout, 2000, 1000);
    expect(layout.baseWidth).toBe(2000);
    expect(layout.baseHeight).toBe(1000);
    expect(layout.widgets[0].x).toBe(200);
    expect(layout.widgets[0].y).toBe(100);
    expect(layout.widgets[0].width).toBe(400);
    expect(layout.widgets[0].height).toBe(200);
  });

  it("should calculate preview scale number correctly", () => {
    const scaleNoInspector = calculatePreviewScaleNumber(1920, false, 1920);
    const scaleWithInspector = calculatePreviewScaleNumber(1920, true, 1920);
    expect(scaleNoInspector).toBeGreaterThan(scaleWithInspector);
  });

  it("should compute scaled layout copy", () => {
    const orig: LayoutConfig = {
      baseWidth: 1000,
      baseHeight: 500,
      widgets: [
        {
          id: "w1",
          widgetType: "lane-view",
          x: 10,
          y: 10,
          width: 100,
          height: 50,
          zIndex: 1,
        },
      ],
    };
    const scaled = computeScaledLayout(orig, 2000, 1000);
    expect(scaled.baseWidth).toBe(2000);
    expect(orig.baseWidth).toBe(1000);
  });

  it("should apply resolution change and update custom UI", () => {
    const ui: CustomUI = {
      _id: "default_ui_layout_rc_ai",
      entity_id: "default_ui_layout_rc_ai",
      name: "Default UI",
      is_default: true,
      layoutJson: "{}",
    };
    const layout: LayoutConfig = {
      baseWidth: 1000,
      baseHeight: 500,
      widgets: [],
    };
    const settings = new Settings();

    applyLayoutResolutionChange("1920x1080", layout, ui, settings);
    expect(layout.baseWidth).toBe(1920);
    expect(layout.baseHeight).toBe(1080);
    expect(settings.racedayLayout?.baseWidth).toBe(1920);
    expect(JSON.parse(ui.layoutJson || "{}").baseWidth).toBe(1920);
  });

  it("should apply custom dimension change", () => {
    const ui: CustomUI = {
      _id: "practice_ui_layout_rc_ai",
      entity_id: "practice_ui_layout_rc_ai",
      name: "Practice UI",
      is_default: true,
      layoutJson: "{}",
    };
    const layout: LayoutConfig = {
      baseWidth: 1000,
      baseHeight: 500,
      widgets: [],
    };
    const settings = new Settings();

    applyCustomDimensionChange("width", 1600, layout, ui, settings);
    expect(layout.baseWidth).toBe(1600);
    expect(settings.practiceRacedayLayout?.baseWidth).toBe(1600);
  });
});
