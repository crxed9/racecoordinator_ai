import { expect, test } from "@playwright/test";
import { TestSetupHelper } from "@app/testing/test-setup_helper";

test.describe("Raceday Records Visuals", () => {
  test.beforeEach(async ({ page }) => {
    await TestSetupHelper.setupStandardMocks(page);
    await TestSetupHelper.setupRaceWebSocketMocks(page);
    await TestSetupHelper.setupAssetMocks(page);
    await TestSetupHelper.disableAnimations(page);
    await page.setViewportSize({ width: 1600, height: 900 });
  });

  test("should display records panel with scores", async ({ page }) => {
    await TestSetupHelper.waitForLocalization(
      page,
      "en",
      page.goto("/default-raceday"),
    );

    await page.locator(".dashboard-wrapper").waitFor();

    const raceData = {
      race: {
        race: {
          model: { entityId: "r1" },
          name: "Screendiff Race",
          track: {
            model: { entityId: "t1" },
            name: "Test Track",
            lanes: [{ objectId: "l1", length: 10 }],
          },
        },
        drivers: [],
        currentHeat: {
          objectId: "h1",
          heatNumber: 1,
          heatDrivers: [],
        },
        recordData: {
          overall: {
            fastestLap: { holderNickname: "Alice", value: 9.876 },
            highestScore: { holderNickname: "Bob", value: 15.4 },
          },
          current: {
            fastestLap: { holderNickname: "Charlie", value: 10.123 },
            heatFastestLap: { holderNickname: "Dave", value: 11.456 },
          },
        },
      },
    };

    await TestSetupHelper.mockRaceData(page, raceData);

    const records = page.locator("app-raceday-records");
    await expect(records).toBeVisible();

    await expect(records).toHaveScreenshot("raceday-records-initial.png");
  });
});
