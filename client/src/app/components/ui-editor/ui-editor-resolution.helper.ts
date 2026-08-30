import { CustomUI } from "@app/models/custom-ui";
import { LayoutConfig, Settings } from "@app/models/settings";

export interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

export function getDefaultResolutionOptions(): ResolutionOption[] {
  const innerW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const innerH = typeof window !== "undefined" ? window.innerHeight : 1080;

  return [
    {
      label: "UI_EDITOR_RESOLUTION_CURRENT_DISPLAY",
      width: innerW,
      height: innerH,
    },
    { label: "UI_EDITOR_RESOLUTION_DESKTOP_TV", width: 1920, height: 1080 },
    { label: "UI_EDITOR_RESOLUTION_MAC_PC", width: 1920, height: 1200 },
    { label: "UI_EDITOR_RESOLUTION_OLDER_PC", width: 1600, height: 1200 },
    { label: "UI_EDITOR_RESOLUTION_1280_1024", width: 1280, height: 1024 },
    { label: "UI_EDITOR_RESOLUTION_ULTRAWIDE", width: 2560, height: 1080 },
    {
      label: "UI_EDITOR_RESOLUTION_MODERN_PHONES",
      width: 2532,
      height: 1170,
    },
    { label: "UI_EDITOR_RESOLUTION_IPAD_TABLET", width: 1024, height: 768 },
  ];
}

export function getLayoutResolution(layout?: LayoutConfig): string {
  if (layout && layout.baseWidth && layout.baseHeight) {
    return `${layout.baseWidth}x${layout.baseHeight}`;
  }
  return "1920x1080";
}

export function getLayoutResolutionOptions(
  baseOptions: ResolutionOption[],
  layout?: LayoutConfig,
): ResolutionOption[] {
  if (layout && layout.baseWidth && layout.baseHeight) {
    const found = baseOptions.find(
      (o) => o.width === layout.baseWidth && o.height === layout.baseHeight,
    );
    if (!found) {
      const customOpt: ResolutionOption = {
        label: `${layout.baseWidth}x${layout.baseHeight}`,
        width: layout.baseWidth,
        height: layout.baseHeight,
      };
      return [...baseOptions, customOpt];
    }
  }
  return baseOptions;
}

export function scaleLayoutDimensions(
  layout: LayoutConfig,
  newWidth: number,
  newHeight: number,
): void {
  const oldWidth = layout.baseWidth || 1920;
  const oldHeight = layout.baseHeight || 1080;

  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;

  layout.baseWidth = newWidth;
  layout.baseHeight = newHeight;

  if (layout.widgets) {
    layout.widgets.forEach((widget) => {
      widget.x = Math.round(widget.x * scaleX);
      widget.y = Math.round(widget.y * scaleY);
      widget.width = Math.round(widget.width * scaleX);
      widget.height = Math.round(widget.height * scaleY);
    });
  }
}

export function persistLayoutState(
  layout: LayoutConfig,
  ui?: CustomUI,
  editingSettings?: Settings,
): void {
  if (ui) {
    ui.layoutJson = JSON.stringify(layout);
    if (ui.entity_id === "default_ui_layout_rc_ai" && editingSettings) {
      editingSettings.racedayLayout = layout;
    } else if (ui.entity_id === "practice_ui_layout_rc_ai" && editingSettings) {
      editingSettings.practiceRacedayLayout = layout;
    }
  }
}

export function applyLayoutResolutionChange(
  resolutionStr: string,
  layout?: LayoutConfig,
  ui?: CustomUI,
  editingSettings?: Settings,
): void {
  if (!layout) return;
  const [widthStr, heightStr] = resolutionStr.split("x");
  scaleLayoutDimensions(
    layout,
    parseInt(widthStr, 10),
    parseInt(heightStr, 10),
  );
  persistLayoutState(layout, ui, editingSettings);
}

export function applyCustomDimensionChange(
  dimension: "width" | "height",
  newValue: number,
  layout?: LayoutConfig,
  ui?: CustomUI,
  editingSettings?: Settings,
): void {
  if (!layout || isNaN(newValue) || newValue <= 0) return;
  const newWidth = dimension === "width" ? newValue : layout.baseWidth || 1920;
  const newHeight =
    dimension === "height" ? newValue : layout.baseHeight || 1080;
  scaleLayoutDimensions(layout, newWidth, newHeight);
  persistLayoutState(layout, ui, editingSettings);
}

export function calculatePreviewScaleNumber(
  baseWidth: number,
  hasSelectedWidget: boolean,
  windowInnerWidth: number,
): number {
  const inspectorWidth = hasSelectedWidget ? 370 : 0;
  const containerWidth = windowInnerWidth - 60 - inspectorWidth;
  const safeWidth = Math.max(containerWidth, 800);
  return safeWidth / (baseWidth || 1920);
}

export function computeScaledLayout(
  sourceLayout: LayoutConfig,
  targetW: number,
  targetH: number,
): LayoutConfig {
  const layout = JSON.parse(JSON.stringify(sourceLayout)) as LayoutConfig;
  const oldWidth = layout.baseWidth || 1920;
  const oldHeight = layout.baseHeight || 1080;

  const scaleX = targetW / oldWidth;
  const scaleY = targetH / oldHeight;

  layout.baseWidth = targetW;
  layout.baseHeight = targetH;

  if (layout.widgets) {
    layout.widgets.forEach((w: any) => {
      w.x = Math.round(w.x * scaleX);
      w.y = Math.round(w.y * scaleY);
      w.width = Math.round(w.width * scaleX);
      w.height = Math.round(w.height * scaleY);
    });
  }

  return layout;
}
