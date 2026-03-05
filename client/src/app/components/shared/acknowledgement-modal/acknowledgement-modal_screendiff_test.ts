import { test, expect } from '@playwright/test';
import { TestSetupHelper } from '../../../testing/test-setup_helper';
import { com } from '../../../proto/message';
import InterfaceStatus = com.antigravity.InterfaceStatus;

test.describe('Acknowledgement Modal Visuals', () => {
  test.beforeEach(async ({ page }) => {
    // Disable mock heartbeat to control interface status manually
    // Scale watchdog timeouts down to 500ms so tests don't hit global timeouts
    await page.addInitScript(() => {
      // @ts-ignore
      window.disableMockHeartbeat = true;
      (window as any).WATCHDOG_TIMEOUT = 500;
    });
    await TestSetupHelper.setupStandardMocks(page);
    await TestSetupHelper.setupRaceMocks(page);
    await TestSetupHelper.setupAssetMocks(page);
  });

  test('should display NO_DATA modal', async ({ page }) => {
    await TestSetupHelper.waitForLocalization(page, 'en', page.goto('/raceday'));
    await TestSetupHelper.waitForText(page, 'RACE COORDINATOR');

    // Construct the message in Node
    const interfaceEvent = com.antigravity.InterfaceEvent.create({
      status: {
        status: InterfaceStatus.NO_DATA
      }
    });
    const buffer = com.antigravity.InterfaceEvent.encode(interfaceEvent).finish();
    const dataArray = Array.from(buffer);

    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', {
          data: new Uint8Array(data).buffer
        });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, dataArray);

    // Wait exactly as production does: 500ms timeouts + 200ms buffer
    await page.waitForTimeout(700);

    const modal = page.locator('app-acknowledgement-modal .modal-content');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('No Data Received');

    await expect(modal).toHaveScreenshot('ack-modal-no-data.png');
  });

  test('should display DISCONNECTED modal after timeout', async ({ page }) => {
    await TestSetupHelper.waitForLocalization(page, 'en', page.goto('/raceday'));
    await TestSetupHelper.waitForText(page, 'RACE COORDINATOR');

    // Priming CONNECTED pulse to reset ngOnInit timers
    const connectedPulse = com.antigravity.InterfaceEvent.create({
      status: { status: InterfaceStatus.CONNECTED }
    });
    const connectedPulseBuffer = com.antigravity.InterfaceEvent.encode(connectedPulse).finish();
    const connectedPulseArray = Array.from(connectedPulseBuffer);

    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', {
          data: new Uint8Array(data).buffer
        });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, connectedPulseArray);

    // Simulate DISCONNECTED
    const interfaceEvent = com.antigravity.InterfaceEvent.create({
      status: {
        status: InterfaceStatus.DISCONNECTED
      }
    });
    const buffer = com.antigravity.InterfaceEvent.encode(interfaceEvent).finish();
    const dataArray = Array.from(buffer);

    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', {
          data: new Uint8Array(data).buffer
        });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, dataArray);

    const modal = page.locator('app-acknowledgement-modal .modal-content');

    // Wait remaining duration to surpass 500ms total
    await page.waitForTimeout(300);

    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Interface Disconnected');

    // PUSH WATCHDOG OUT: Resend DISCONNECTED to guarantee the `noStatusWatchdog`
    // doesn't expire and change the text to "No Status" WHILE Playwright evaluates the DOM!
    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', {
          data: new Uint8Array(data).buffer
        });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, dataArray);

    await expect(modal).toHaveScreenshot('ack-modal-disconnected.png');
  });

  test('should display CONNECTED modal on recovery', async ({ page }) => {
    await TestSetupHelper.waitForLocalization(page, 'en', page.goto('/raceday'));
    await TestSetupHelper.waitForText(page, 'RACE COORDINATOR');

    // Priming CONNECTED pulse
    const connectedPulse = com.antigravity.InterfaceEvent.create({
      status: { status: InterfaceStatus.CONNECTED }
    });
    const connectedPulseBuffer = com.antigravity.InterfaceEvent.encode(connectedPulse).finish();
    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', { data: new Uint8Array(data).buffer });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, Array.from(connectedPulseBuffer));

    // 1. Simulate DISCONNECTED and wait for modal
    const disconnectedEvent = com.antigravity.InterfaceEvent.create({
      status: { status: InterfaceStatus.DISCONNECTED }
    });
    const disconnectedBuffer = com.antigravity.InterfaceEvent.encode(disconnectedEvent).finish();

    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', { data: new Uint8Array(data).buffer });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, Array.from(disconnectedBuffer));

    // Wait past the first 500ms timeout
    await page.waitForTimeout(700);

    // Test the duplicate event resilience
    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', { data: new Uint8Array(data).buffer });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, Array.from(disconnectedBuffer));

    // Quick stability buffer
    await page.waitForTimeout(300);

    const modal = page.locator('app-acknowledgement-modal .modal-content');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Interface Disconnected');

    // 2. Simulate CONNECTED (recovery)
    const connectedEvent = com.antigravity.InterfaceEvent.create({
      status: { status: InterfaceStatus.CONNECTED }
    });
    const connectedBuffer = com.antigravity.InterfaceEvent.encode(connectedEvent).finish();

    await page.evaluate((data) => {
      // @ts-ignore
      const sockets = (window.allMockSockets || []).filter(s => s.url && s.url.includes('interface-data'));
      sockets.forEach((socket: any) => {
        const event = new MessageEvent('message', { data: new Uint8Array(data).buffer });
        socket.dispatchEvent(event);
        if (socket.onmessage) socket.onmessage(event);
      });
    }, Array.from(connectedBuffer));

    // Ensure CONNECTED modal is instantly visible
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText('Interface Connected');

    await expect(modal).toHaveScreenshot('ack-modal-recovered.png');
  });
});
