import { expect, Page, test } from "@playwright/test";
import { DefaultRacedaySetupHarnessE2e } from "@app/components/raceday-setup/testing/default-raceday-setup.harness.e2e";
import { TestSetupHelper } from "@app/testing/test-setup_helper";

import { RacingRosterDialogHarnessE2e } from "./testing/racing-roster-dialog.harness.e2e";

const LARGE_ROSTER_DRIVERS = [
  { entity_id: "d1", name: "Alice", nickname: "The Rocket" },
  { entity_id: "d2", name: "Bob", nickname: "Drift King" },
  { entity_id: "d3", name: "Charlie", nickname: "Speedy" },
  { entity_id: "d4", name: "Dave", nickname: "Apex Hunter" },
  { entity_id: "d5", name: "Emma", nickname: "Lightning" },
  { entity_id: "d6", name: "Frank", nickname: "The Flash" },
  { entity_id: "d7", name: "Grace", nickname: "Turbo" },
  { entity_id: "d8", name: "Hank", nickname: "Hammer" },
  { entity_id: "d9", name: "Ivy", nickname: "Precision" },
  { entity_id: "d10", name: "Jack", nickname: "Nitro" },
  { entity_id: "d11", name: "Kate", nickname: "Shadow" },
  { entity_id: "d12", name: "Leo", nickname: "Vortex" },
  { entity_id: "d13", name: "Mia", nickname: "Phantom" },
  { entity_id: "d14", name: "Noah", nickname: "Blaze" },
  { entity_id: "d15", name: "Olivia", nickname: "Hyper" },
  { entity_id: "d16", name: "Pete", nickname: "Ghost" },
  { entity_id: "d17", name: "Quinn", nickname: "Cyclone" },
  { entity_id: "d18", name: "Rachel", nickname: "Racer X" },
  { entity_id: "d19", name: "Sam", nickname: "Stealth" },
  { entity_id: "d20", name: "Tom", nickname: "Thunder" },
  { entity_id: "d21", name: "Uma", nickname: "Vector" },
  { entity_id: "d22", name: "Victor", nickname: "Velocity" },
  { entity_id: "d23", name: "Wendy", nickname: "Wildcat" },
  { entity_id: "d24", name: "Zack", nickname: "Zero" },
  { entity_id: "dt1", name: "Team Pilot A", nickname: "Alpha" },
  { entity_id: "dt2", name: "Team Pilot B", nickname: "Beta" },
];

const LARGE_ROSTER_TEAMS = [
  {
    entity_id: "t1",
    name: "Team Redline",
    avatarUrl: "",
    driverIds: ["dt1", "dt2"],
  },
];

test.describe("Racing Roster Dialog Visuals", () => {
  test.beforeEach(async ({ page }) => {
    await TestSetupHelper.setupStandardMocks(page);

    await TestSetupHelper.setupLocalStorage(page, {
      recentRaceIds: ["r1", "r2"],
      selectedDriverIds: ["d1", "d2"],
      racedaySetupWalkthroughSeen: true,
      language: "en",
    });

    await page.setViewportSize({ width: 1600, height: 900 });

    await TestSetupHelper.waitForLocalization(page, "en", page.goto("/"));

    await expect(page.locator(".setup-container")).toBeVisible({
      timeout: 15000,
    });

    const splashScreen = page.locator(".splash-screen");
    if ((await splashScreen.count()) > 0) {
      await expect(splashScreen).not.toBeVisible({ timeout: 10000 });
    }

    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]).catch((err) => {
      console.warn("Racing roster dialog test: font ready wait failed:", err);
    });

    await TestSetupHelper.disableAnimations(page);
    await expect(page.getByText("Alice")).toBeVisible();
    await page.waitForTimeout(100);
  });

  async function openRosterDialog(
    page: Page,
  ): Promise<RacingRosterDialogHarnessE2e> {
    const container = page.locator(".setup-container");
    const setupHarness = new DefaultRacedaySetupHarnessE2e(container);
    await setupHarness.clickOpenRoster();

    const dialogHost = page.locator("app-racing-roster-dialog");
    const rosterHarness = new RacingRosterDialogHarnessE2e(dialogHost);

    await expect(async () => {
      expect(await rosterHarness.isVisible()).toBe(true);
    }).toPass();

    await page.waitForTimeout(200);
    return rosterHarness;
  }

  test("should display racing roster dialog with selected drivers", async ({
    page,
  }) => {
    await openRosterDialog(page);

    await expect(page).toHaveScreenshot("racing-roster-dialog-drivers.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
      timeout: 10000,
    });
  });

  test("should display empty racing roster dialog when no drivers selected", async ({
    page,
  }) => {
    const container = page.locator(".setup-container");
    const setupHarness = new DefaultRacedaySetupHarnessE2e(container);
    await setupHarness.clickRemoveAll();

    await openRosterDialog(page);

    await expect(page).toHaveScreenshot("racing-roster-dialog-empty.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
      timeout: 10000,
    });
  });

  test("should display racing roster dialog with all drivers added", async ({
    page,
  }) => {
    await page.route("**/api/drivers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(LARGE_ROSTER_DRIVERS),
      });
    });

    await page.route("**/api/teams", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(LARGE_ROSTER_TEAMS),
      });
    });

    const selectedIds = [
      "t_t1",
      ...LARGE_ROSTER_DRIVERS.filter((d) => !d.entity_id.startsWith("dt")).map(
        (d) => `d_${d.entity_id}`,
      ),
    ];

    await TestSetupHelper.setupLocalStorage(page, {
      recentRaceIds: ["r1", "r2"],
      selectedDriverIds: selectedIds,
      racedaySetupWalkthroughSeen: true,
      language: "en",
    });

    await TestSetupHelper.waitForLocalization(page, "en", page.goto("/"));

    await expect(page.locator(".setup-container")).toBeVisible({
      timeout: 15000,
    });

    await TestSetupHelper.disableAnimations(page);
    await expect(page.getByText("Team Redline")).toBeVisible();
    await page.waitForTimeout(100);

    await openRosterDialog(page);

    await expect(page).toHaveScreenshot(
      "racing-roster-dialog-all-drivers.png",
      {
        maxDiffPixelRatio: 0.05,
        animations: "disabled",
        timeout: 10000,
      },
    );
  });
});
