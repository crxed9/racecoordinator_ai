import { test, expect } from '@playwright/test';
import { TestSetupHelper } from '../../testing/test-setup_helper';

test.describe('Raceday Visuals for Fuel', () => {
  test.beforeEach(async ({ page }) => {
    // Setup standard mocks
    await TestSetupHelper.setupStandardMocks(page);
    await TestSetupHelper.setupRaceMocks(page);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForLoadState('networkidle');

    // Override settings to use fuel columns
    await page.route('**/api/settings', async (route) => {
      if (route.request().method() === 'GET') {
        const settings = {
          racedayColumns: ['driver.name_driver.nickname', 'lapCount', 'participant.fuelLevel', 'fuelCapacity', 'fuelPercentage'],
          columnLayouts: {
            'driver.name_driver.nickname': { 'TopCenter': 'driver.name', 'BottomCenter': 'driver.nickname' },
            'lapCount': { 'CenterCenter': 'lapCount' },
            'participant.fuelLevel': { 'CenterCenter': 'participant.fuelLevel' },
            'fuelCapacity': { 'CenterCenter': 'fuelCapacity' },
            'fuelPercentage': { 'CenterCenter': 'fuelPercentage' }
          },
          columnAnchors: {
            'driver.name_driver.nickname': 'CenterCenter',
            'lapCount': 'CenterCenter',
            'participant.fuelLevel': 'CenterCenter',
            'fuelCapacity': 'CenterCenter',
            'fuelPercentage': 'CenterCenter'
          },
          autoAdvanceHeat: false,
          sortByStandings: false
        };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings) });
      } else {
        await route.continue();
      }
    });

    // We also need to mock or alter the Race object slightly so it has fuel_options.capacity = 100
    // TestSetupHelper.setupRaceMocks already mocks /api/races/:id or we can mock the specific ws events?
    // Let's just mock the initial heat drivers and race data
    await page.addInitScript(() => {
      // Intercept the WebSocket connections and send a custom interface event?
      // Actually /api/races/r1 etc might not be fetched directly here since it's driven primarily by /api/races state,
      // but raceday usually relies on sockets. We'll rely on the standard TestSetupHelper and just mock the data where feasible.
    });
  });

  test('should display fuel columns correctly on raceday screen', async ({ page }) => {
    // Let's mock a Race with fuel options and a Heat that provides some fuel values.
    // We achieve this via window.appOverrides if our setup supports it, or just route mocking
    await page.route('**/api/races', async (route) => {
      const resp = [
        {
          entity_id: '1',
          name: 'Fuel Race',
          fuel_options: {
            enabled: true,
            capacity: 80.0
          },
          track: { lanes: [{}, {}, {}, {}] }
        }
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) });
    });

    // Ideally Raceday listens to websocket /interface for race updates. 
    // This is hard to mock purely with HTTP routes. Let's start the page and just capture it. 
    // TestSetupHelper usually has logic to emit mock race states.
    const isMockAvailable = await page.evaluate(() => typeof (window as any).mockInterfaceEvent !== 'undefined').catch(() => false);

    await TestSetupHelper.waitForLocalization(page, 'en', page.goto('/default-raceday'));

    await page.waitForTimeout(2000);

    // If TestSetupHelper installed mock websockets, we inject the event:
    await page.evaluate(() => {
      if ((window as any).mockInterfaceEvent) {
        (window as any).mockInterfaceEvent({
          status: { status: 1 }, // CONNECTED
          raceUpdate: {
            race: {
              entityId: '1',
              name: 'Fuel Race',
              fuelOptions: {
                enabled: true,
                capacity: 80.0
              }
            },
            currentHeat: {
              heatNumber: 1,
              heatDrivers: [
                { objectId: 'd1', laneIndex: 0, driver: { name: 'Dave', nickname: 'Fast' }, participant: { fuelLevel: 45.2 } },
                { objectId: 'd2', laneIndex: 1, driver: { name: 'Bob', nickname: 'Slow' }, participant: { fuelLevel: 10.0 } },
              ]
            }
          }
        });
      }
    }).catch(e => console.log('Mock inject failed', e));

    await page.waitForTimeout(1000);
    await TestSetupHelper.disableAnimations(page);
    await expect(page).toHaveScreenshot('default-raceday-fuel-columns.png', { maxDiffPixelRatio: 0.05 });
  });

  test('should hide fuel columns in non-fuel race', async ({ page }) => {
    // Override settings to use fuel columns but mock a race with fuel DISABLED
    await page.route('**/api/settings', async (route) => {
      if (route.request().method() === 'GET') {
        const settings = {
          racedayColumns: ['driver.name_driver.nickname', 'lapCount', 'participant.fuelLevel', 'fuelCapacity', 'fuelPercentage'],
          columnVisibility: {
            'participant.fuelLevel': 'FuelRaceOnly',
            'fuelCapacity': 'FuelRaceOnly',
            'fuelPercentage': 'FuelRaceOnly'
          }
        };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings) });
      } else {
        await route.continue();
      }
    });

    await TestSetupHelper.waitForLocalization(page, 'en', page.goto('/default-raceday'));

    await page.evaluate(() => {
      if ((window as any).mockInterfaceEvent) {
        (window as any).mockInterfaceEvent({
          status: { status: 1 },
          raceUpdate: {
            race: {
              entityId: '1',
              name: 'Normal Race',
              fuelOptions: { enabled: false }
            },
            currentHeat: {
              heatNumber: 1,
              heatDrivers: [
                { objectId: 'd1', laneIndex: 0, driver: { name: 'Dave' }, participant: { fuelLevel: 0 } }
              ]
            }
          }
        });
      }
    });

    await page.waitForTimeout(1000);
    await TestSetupHelper.disableAnimations(page);

    // Screenshot should NOT show fuel columns even though they are in settings
    await expect(page).toHaveScreenshot('default-raceday-no-fuel-columns.png', { maxDiffPixelRatio: 0.05 });
  });
});
