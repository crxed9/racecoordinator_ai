import { CustomUI } from "@app/models/custom-ui";
import { Theme } from "@app/models/theme";

export function openSuccessModal(
  comp: any,
  params?: { title?: string; message?: string; params?: any },
  collapseThemeId: string | null = null,
): void {
  comp.themeToCollapseAfterSuccess = collapseThemeId;
  comp.successModalTitle = params?.title || "";
  comp.successModalMessage = params?.message || "";
  comp.successModalParams = params?.params || {};
  comp.showSuccessModal = true;
}

export function acknowledgeSuccessModal(comp: any): void {
  comp.showSuccessModal = false;
  comp.successModalTitle = "";
  comp.successModalMessage = "";
  comp.successModalParams = {};
  comp.themeToCollapseAfterSuccess = null;
  comp.editingState.themes.forEach((t: Theme) => {
    comp.sectionsExpanded[`theme_${t.entity_id}`] = false;
  });
  comp.saveExpanderState();
  comp.cdr.markForCheck();
}

export function openDeleteThemeModal(comp: any, theme: Theme): void {
  comp.themeToDelete = theme;
  comp.deleteThemeParams = { name: theme.name };
  comp.showDeleteConfirm = true;
  comp.cdr.markForCheck();
}

export function cancelDeleteThemeModal(comp: any): void {
  comp.showDeleteConfirm = false;
  comp.themeToDelete = null;
  comp.deleteThemeParams = {};
}

export function openDeleteCustomUiModal(comp: any, ui: CustomUI): void {
  comp.uiToDelete = ui;
  comp.deleteUiParams = { name: ui.name };
  comp.showDeleteUiConfirm = true;
  comp.cdr.markForCheck();
}

export function cancelDeleteCustomUiModal(comp: any): void {
  comp.showDeleteUiConfirm = false;
  comp.uiToDelete = null;
  comp.cdr.markForCheck();
}
