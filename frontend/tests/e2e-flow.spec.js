import { test, expect } from '@playwright/test';

/**
 * Actdone Automated Verification (Siva's Account)
 * This script verifies the app using your real local credentials.
 */

const APP_URL = 'http://localhost:5174';
const EMAIL = 'sivacr1312@gmail.com';
const PASSWORD = 'Test@1234';

test.describe('Actdone Full Flow', () => {

  test('Full Path: Login -> List -> Task -> Logout', async ({ page }) => {
    // 1. Visit Login
    await page.goto(`${APP_URL}/login`);

    // 2. Perform Login
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Password"]', PASSWORD);
    await page.click('button:has-text("Log in")');

    // 3. Verify Dashboard
    await expect(page).toHaveURL(/.*app/);

    // 4. Create a New List
    await page.click('text=Create new list');
    await page.fill('input[placeholder="Enter name"]', 'Automated Test List');
    await page.click('button:has-text("Done")');
    await expect(page.locator('h3:has-text("Automated Test List")')).toBeVisible();

    // 5. Add a Task
    await page.click('button:has-text("Add a task")');
    await page.fill('textarea[placeholder="Title"]', 'Verify Actdone Features');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Verify Actdone Features').first()).toBeVisible();

    // 6. Test Logout Confirmation
    await page.locator('button', { hasText: /^S$/ }).click(); // Exact match for the initial 'S'
    await page.waitForTimeout(1000); // 🕒 Wait for menu to open
    await page.click('text=Log out');

    // Check if dialog appears
    await expect(page.locator('text=Are you sure you want to log out?')).toBeVisible();

    // Click Yes
    await page.click('button:has-text("Yes")');

    // 7. Verify we are back on Login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('Advanced Features: Subtasks, Focus, Analytics, and Theme', async ({ page }) => {
    const uniqueListName = `Advanced Test ${Date.now()}`;

    // 1. Login
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Password"]', PASSWORD);
    await page.click('button:has-text("Log in")');
    await expect(page).toHaveURL(/.*app/);

    // 2. Create a Task to work with
    await page.click('text=Create new list');
    await page.fill('input[placeholder="Enter name"]', uniqueListName);
    await page.click('button:has-text("Done")');

    // Wait for list to appear in sidebar and click it
    await page.click(`text=${uniqueListName}`);

    await page.click('button:has-text("Add a task")');
    await page.fill('textarea[placeholder="Title"]', 'Master Task');
    await page.click('button:has-text("Save")');

    // 3. Create a Subtask
    const taskRow = page.locator('li', { hasText: 'Master Task' }).first();
    await expect(taskRow).toBeVisible();

    await taskRow.hover();
    await page.getByTestId('task-menu-btn').first().click({ force: true });
    await page.click('text=Add a subtask');
    await page.fill('textarea[placeholder="Subtask title"]', 'Step 1: The Beginning');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Step 1: The Beginning').first()).toBeVisible();

    // 4. Test Analytics
    await page.click('#avatar-btn');
    await page.waitForTimeout(500);
    await page.click('text=View Analytics');
    await expect(page.locator('text=Productivity')).toBeVisible();
    await page.click('button:has-text("Back")');

    // 5. Test Theme Toggle
    await page.click('#avatar-btn');
    await page.waitForTimeout(500);
    const isDark = await page.evaluate(() => document.body.getAttribute('data-theme') === 'dark');
    await page.click(isDark ? 'text=☀ Light' : 'text=☾ Dark');

    const newTheme = await page.evaluate(() => document.body.getAttribute('data-theme'));
    expect(newTheme).toBe(isDark ? 'light' : 'dark');
  });

  test('Search and Shortcuts', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Password"]', PASSWORD);
    await page.click('button:has-text("Log in")');
    await expect(page).toHaveURL(/.*app/);

    await page.waitForTimeout(1000);

    // Test Search Spotlight
    await page.click('#search-btn');
    const searchInput = page.locator('input[placeholder="Search tasks..."]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill('Master Task');
    await page.keyboard.press('Escape');
  });

  test('Validation: Invalid Email Format', async ({ page }) => {
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[placeholder="Email"]', 'invalid-user');
    await page.click('button:has-text("Log in")');
    await expect(page.locator('text=Please enter a valid email address.')).toBeVisible();
  });

  test('History Page Filter and Sync', async ({ page }) => {
    // 1. Login
    await page.goto(`${APP_URL}/login`);
    await page.fill('input[placeholder="Email"]', EMAIL);
    await page.fill('input[placeholder="Password"]', PASSWORD);
    await page.click('button:has-text("Log in")');
    await expect(page).toHaveURL(/.*app/);

    // 2. Navigate to History Page
    await page.click('text=History');
    await expect(page).toHaveURL(/.*history/);

    // 3. Verify columns and date picker dropdown button exists
    await expect(page.locator('h2:has-text("Completed Tasks")')).toBeVisible();
    await expect(page.locator('h2:has-text("Incomplete Tasks")')).toBeVisible();

    // 4. Click Completed Column Date Picker Trigger
    const datePickerBtn = page.locator('button', { hasText: 'Last 365 Days' }).first();
    await expect(datePickerBtn).toBeVisible();
    await datePickerBtn.click();

    // 5. Verify presets are listed
    await expect(page.locator('button:has-text("Yesterday")')).toBeVisible();
    await expect(page.locator('button:has-text("Last 7 Days")')).toBeVisible();
    await expect(page.locator('button:has-text("Select Specific Date")')).toBeVisible();
    await expect(page.locator('button:has-text("Select Date Range")')).toBeVisible();

    // Click "Yesterday" preset
    await page.click('button:has-text("Yesterday")');
    await expect(page.locator('button', { hasText: 'Yesterday' }).first()).toBeVisible();
  });

});
