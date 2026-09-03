import {
  handleResetDefaultDirectory,
  handleResetWidgetDirectory,
  handleSelectDirectory,
  handleSelectWidgetDirectory,
  handleUpdateSampleWidgets,
} from "./ui-editor-directory.helper";

describe("ui-editor-directory.helper", () => {
  let comp: any;

  beforeEach(() => {
    comp = {
      fileSystem: {
        selectCustomFolder: jasmine
          .createSpy("selectCustomFolder")
          .and.resolveTo(true),
        getCustomDirectoryHandle: jasmine
          .createSpy("getCustomDirectoryHandle")
          .and.resolveTo({ name: "new_dir" }),
        clearCustomFolder: jasmine
          .createSpy("clearCustomFolder")
          .and.resolveTo(),
        selectCustomWidgetFolder: jasmine
          .createSpy("selectCustomWidgetFolder")
          .and.resolveTo(true),
        getCustomWidgetDirectoryHandle: jasmine
          .createSpy("getCustomWidgetDirectoryHandle")
          .and.resolveTo({ name: "new_widget_dir" }),
        clearCustomWidgetFolder: jasmine
          .createSpy("clearCustomWidgetFolder")
          .and.resolveTo(),
      },
      customDirectoryName: "old_dir",
      customWidgetDirectoryName: "old_widget_dir",
      customWidgetService: {
        reloadCustomWidgets: jasmine
          .createSpy("reloadCustomWidgets")
          .and.resolveTo(),
        exportStarterWidgets: jasmine
          .createSpy("exportStarterWidgets")
          .and.resolveTo({
            success: true,
            count: 5,
            directory: "widgets_dir",
          }),
      },
      openSuccessModal: jasmine.createSpy("openSuccessModal"),
      logger: { error: jasmine.createSpy("error") },
      cdr: { markForCheck: jasmine.createSpy("markForCheck") },
    };
  });

  it("should select directory and update customDirectoryName", async () => {
    await handleSelectDirectory(comp);
    expect(comp.fileSystem.selectCustomFolder).toHaveBeenCalled();
    expect(comp.customDirectoryName).toBe("new_dir");
    expect(comp.cdr.markForCheck).toHaveBeenCalled();
  });

  it("should reset default directory", async () => {
    await handleResetDefaultDirectory(comp);
    expect(comp.fileSystem.clearCustomFolder).toHaveBeenCalled();
    expect(comp.customDirectoryName).toBeNull();
    expect(comp.cdr.markForCheck).toHaveBeenCalled();
  });

  it("should select widget directory and reload custom widgets", async () => {
    await handleSelectWidgetDirectory(comp);
    expect(comp.fileSystem.selectCustomWidgetFolder).toHaveBeenCalled();
    expect(comp.customWidgetDirectoryName).toBe("new_widget_dir");
    expect(comp.customWidgetService.reloadCustomWidgets).toHaveBeenCalled();
    expect(comp.cdr.markForCheck).toHaveBeenCalled();
  });

  it("should reset widget default directory and reload custom widgets", async () => {
    await handleResetWidgetDirectory(comp);
    expect(comp.fileSystem.clearCustomWidgetFolder).toHaveBeenCalled();
    expect(comp.customWidgetDirectoryName).toBeNull();
    expect(comp.customWidgetService.reloadCustomWidgets).toHaveBeenCalled();
    expect(comp.cdr.markForCheck).toHaveBeenCalled();
  });

  it("should update sample widgets and open success modal", async () => {
    await handleUpdateSampleWidgets(comp);
    expect(comp.customWidgetService.exportStarterWidgets).toHaveBeenCalled();
    expect(comp.openSuccessModal).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: "UE_UPDATE_SAMPLE_WIDGETS_SUCCESS_TITLE",
        params: { count: 5, directory: "widgets_dir" },
      }),
    );
    expect(comp.cdr.markForCheck).toHaveBeenCalled();
  });

  it("should log error if exportStarterWidgets fails", async () => {
    const err = new Error("failed");
    comp.customWidgetService.exportStarterWidgets.and.rejectWith(err);
    await handleUpdateSampleWidgets(comp);
    expect(comp.logger.error).toHaveBeenCalledWith(
      "Failed to update sample widgets",
      err,
    );
  });
});
