import { expect, test } from "@playwright/test";
import { TestSetupHelper } from "@app/testing/test-setup_helper";

const MOCK_HEAT_LIST_RACE_DATA = {
  race: {
    race: {
      model: { entityId: "r1" },
      name: "Championship Race",
      track: {
        model: { entityId: "t1" },
        name: "Speedway Track",
        lanes: [
          {
            objectId: "l1",
            length: 10,
            background_color: "#dc2626",
            foreground_color: "#ffffff",
          },
          {
            objectId: "l2",
            length: 10,
            background_color: "#f8fafc",
            foreground_color: "#0f172a",
          },
          {
            objectId: "l3",
            length: 10,
            background_color: "#2563eb",
            foreground_color: "#ffffff",
          },
          {
            objectId: "l4",
            length: 10,
            background_color: "#eab308",
            foreground_color: "#000000",
          },
        ],
      },
    },
    drivers: [
      {
        objectId: "rp1",
        driver: {
          model: { entityId: "d1" },
          name: "Mario",
          nickname: "Jumpman",
        },
      },
      {
        objectId: "rp2",
        driver: {
          model: { entityId: "d2" },
          name: "Luigi",
          nickname: "Green Mario",
        },
      },
      {
        objectId: "rp3",
        driver: {
          model: { entityId: "d3" },
          name: "Bowser",
          nickname: "King Koopa",
        },
      },
      {
        objectId: "rp4",
        driver: {
          model: { entityId: "d4" },
          name: "Peach",
          nickname: "Princess",
        },
      },
      {
        objectId: "rp5",
        driver: {
          model: { entityId: "d5" },
          name: "Yoshi",
          nickname: "Green Dino",
        },
      },
      {
        objectId: "rp6",
        driver: {
          model: { entityId: "d6" },
          name: "Donkey Kong",
          nickname: "DK",
        },
      },
    ],
    currentHeat: {
      objectId: "h2",
      heatNumber: 2,
    },
    heats: [
      {
        objectId: "h1",
        heatNumber: 1,
        heatDrivers: [
          {
            objectId: "hd1_1",
            laneIndex: 0,
            driver: { model: { entityId: "d1" }, nickname: "Jumpman" },
          },
          {
            objectId: "hd1_2",
            laneIndex: 1,
            driver: { model: { entityId: "d2" }, nickname: "Green Mario" },
          },
          {
            objectId: "hd1_3",
            laneIndex: 2,
            driver: { model: { entityId: "d3" }, nickname: "King Koopa" },
          },
          {
            objectId: "hd1_4",
            laneIndex: 3,
            driver: { model: { entityId: "d4" }, nickname: "Princess" },
          },
        ],
      },
      {
        objectId: "h2",
        heatNumber: 2,
        heatDrivers: [
          {
            objectId: "hd2_1",
            laneIndex: 0,
            driver: { model: { entityId: "d5" }, nickname: "Green Dino" },
          },
          {
            objectId: "hd2_2",
            laneIndex: 1,
            driver: { model: { entityId: "d6" }, nickname: "DK" },
          },
          {
            objectId: "hd2_3",
            laneIndex: 2,
            driver: { model: { entityId: "d1" }, nickname: "Jumpman" },
          },
          {
            objectId: "hd2_4",
            laneIndex: 3,
            driver: { model: { entityId: "d2" }, nickname: "Green Mario" },
          },
        ],
      },
      {
        objectId: "h3",
        heatNumber: 3,
        heatDrivers: [
          {
            objectId: "hd3_1",
            laneIndex: 0,
            driver: { model: { entityId: "d3" }, nickname: "King Koopa" },
          },
          {
            objectId: "hd3_2",
            laneIndex: 1,
            driver: { model: { entityId: "d4" }, nickname: "Princess" },
          },
          {
            objectId: "hd3_3",
            laneIndex: 2,
            driver: { model: { entityId: "d5" }, nickname: "Green Dino" },
          },
          {
            objectId: "hd3_4",
            laneIndex: 3,
            driver: { model: { entityId: "d6" }, nickname: "DK" },
          },
        ],
      },
      {
        objectId: "h4",
        heatNumber: 4,
        heatDrivers: [
          {
            objectId: "hd4_1",
            laneIndex: 0,
            driver: { model: { entityId: "d2" }, nickname: "Green Mario" },
          },
          {
            objectId: "hd4_2",
            laneIndex: 1,
            driver: { model: { entityId: "d3" }, nickname: "King Koopa" },
          },
          {
            objectId: "hd4_3",
            laneIndex: 2,
            driver: { model: { entityId: "d4" }, nickname: "Princess" },
          },
          {
            objectId: "hd4_4",
            laneIndex: 3,
            driver: { model: { entityId: "d5" }, nickname: "Green Dino" },
          },
        ],
      },
    ],
  },
};

test.describe("Raceday Heat List Visuals", () => {
  test.beforeEach(async ({ page }) => {
    await TestSetupHelper.setupStandardMocks(page);
    await TestSetupHelper.setupRaceWebSocketMocks(page);
    await TestSetupHelper.setupAssetMocks(page);
    await TestSetupHelper.disableAnimations(page);
    await page.setViewportSize({ width: 1600, height: 900 });
  });

  test("should render heat list widget in default scrollable view", async ({
    page,
  }) => {
    await TestSetupHelper.setupSettings(page, {
      racedayLayout: {
        widgets: [
          {
            id: "widget-heat-list-standard",
            widgetType: "heat-list",
            x: 50,
            y: 50,
            width: 500,
            height: 400,
            zIndex: 10,
            scaleMode: "fixed",
            customSettings: {
              showHeader: true,
              autoScrollToCurrent: false,
              highlightCurrentHeat: true,
              scaleToWindow: false,
              heatColumns: "2",
              laneColumns: "auto",
            },
          },
        ],
      },
    });

    await TestSetupHelper.waitForLocalization(
      page,
      "en",
      page.goto("/default-raceday"),
    );

    await page.locator(".dashboard-wrapper").waitFor();
    await TestSetupHelper.mockRaceData(page, MOCK_HEAT_LIST_RACE_DATA);

    const widget = page.locator("app-raceday-heat-list");
    await widget.waitFor({ state: "visible" });

    await expect(widget).toHaveScreenshot("raceday-heat-list-standard.png");
  });

  test("should render heat list widget with scale to window enabled", async ({
    page,
  }) => {
    await TestSetupHelper.setupSettings(page, {
      racedayLayout: {
        widgets: [
          {
            id: "widget-heat-list-scale",
            widgetType: "heat-list",
            x: 50,
            y: 50,
            width: 600,
            height: 400,
            zIndex: 10,
            scaleMode: "fixed",
            customSettings: {
              showHeader: true,
              autoScrollToCurrent: false,
              highlightCurrentHeat: true,
              scaleToWindow: true,
              heatColumns: "auto",
              laneColumns: "auto",
            },
          },
        ],
      },
    });

    await TestSetupHelper.waitForLocalization(
      page,
      "en",
      page.goto("/default-raceday"),
    );

    await page.locator(".dashboard-wrapper").waitFor();
    await TestSetupHelper.mockRaceData(page, MOCK_HEAT_LIST_RACE_DATA);

    const widget = page.locator("app-raceday-heat-list");
    await widget.waitFor({ state: "visible" });

    await expect(widget).toHaveScreenshot(
      "raceday-heat-list-scale-to-window.png",
    );
  });

  test("should render heat list widget empty state", async ({ page }) => {
    await TestSetupHelper.setupSettings(page, {
      racedayLayout: {
        widgets: [
          {
            id: "widget-heat-list-empty",
            widgetType: "heat-list",
            x: 50,
            y: 50,
            width: 400,
            height: 250,
            zIndex: 10,
            scaleMode: "fixed",
            customSettings: {
              showHeader: true,
              scaleToWindow: false,
            },
          },
        ],
      },
    });

    await TestSetupHelper.waitForLocalization(
      page,
      "en",
      page.goto("/default-raceday"),
    );

    await page.locator(".dashboard-wrapper").waitFor();

    const widget = page.locator("app-raceday-heat-list");
    await widget.waitFor({ state: "visible" });

    await expect(widget).toHaveScreenshot("raceday-heat-list-empty.png");
  });
});
