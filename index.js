import playwright from "playwright-chromium";
import dotenv from "dotenv";
import invariant from "tiny-invariant";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();

// make sure all env variables are set
invariant(process.env.GEO_LATITUDE, "secret GEO_LATITUDE is required");
invariant(process.env.GEO_LONGITUDE, "secret GEO_LONGITUDE is required");
invariant(process.env.ACCOUNT_EMAIL, "secret ACCOUNT_EMAIL is required");
invariant(process.env.ACCOUNT_PASSWORD, "secret ACCOUNT_PASSWORD is required");

const main = async () => {
  const isHeadless =
    (process.env.HEADLESS_BROWSER ?? "true") === "true" ? true : false;

  const browser = await playwright["chromium"].launch({
    headless: isHeadless,
  });

  const context = await browser.newContext({
    viewport: { width: 1080, height: 560 },
    geolocation: {
      latitude: Number(process.env.GEO_LATITUDE),
      longitude: Number(process.env.GEO_LONGITUDE),
    },
    permissions: ["geolocation"],
  });

  const page = await context.newPage();

  console.log("Opening login page...");
  await page.goto(
    "https://account.mekari.com/users/sign_in?client_id=TAL-73645&return_to=L2F1dGg_Y2xpZW50X2lkPVRBTC03MzY0NSZyZXNwb25zZV90eXBlPWNvZGUmc2NvcGU9c3NvOnByb2ZpbGU%3D"
  );

  await page.setViewportSize({ width: 1080, height: 560 });

  console.log("Filling in account email & password...");
  await page.click("#user_email");
  await page.fill("#user_email", process.env.ACCOUNT_EMAIL);

  await page.press("#user_email", "Tab");
  await page.fill("#user_password", process.env.ACCOUNT_PASSWORD);

  console.log("Click on signin...");
  await Promise.all([
    page.click("#new-signin-button"),
    page.waitForNavigation(),
  ]);

  const dashboardNav = page.getByText("Dashboard");
  // check if dashboard nav is exist
  if ((await dashboardNav.innerText()) === "Dashboard") {
    console.log("Successfully Logged in...");
  }

  const myName = (await page.locator("#navbar-name").textContent()).trim();
  const whoIsOffToday = await page
    .locator(".tl-card-small", { hasText: `Who's Off` })
    .innerText();

  const isOffToday = whoIsOffToday.includes(myName);

  if (isOffToday) {
    console.log("You are off today, skipping check in/out...");
    await browser.close();
    return;
  }

  const today = dayjs().tz("Asia/Jakarta").format("D MMM YYYY");

  // go to "My Attendance Logs"
  await page.click("text=My Attendance Logs");
  await page.waitForSelector(`h3:text("${myName}")`);
  console.log(
    "Already inside My Attendance Logs to check holiday or day-off..."
  );

  const rowToday = page.locator("tr", { hasText: today });
  const columnCheckDayOff = await rowToday
    .locator("td:nth-child(2)")
    .innerText();

  // N = not dayoff/holiday
  const columnCheckDayOffTrimmed = columnCheckDayOff.trim();
  const isTodayHoliday = columnCheckDayOffTrimmed !== "N";

  if (isTodayHoliday) {
    console.log(
      `Today is ${columnCheckDayOffTrimmed}, skipping check in/out...`
    );
    await browser.close();
    return;
  }

  await Promise.all([
    page.goto("https://hr.talenta.co/live-attendance"),
    page.waitForNavigation(),
  ]);

  console.log("Already inside Live Attendance Page...");

  const currentTime = await page.waitForSelector(".current-time");
  const checkIn = await page.waitForSelector(".col:nth-child(1) > .btn");
  const checkOut = await page.waitForSelector(".col:nth-child(2) > .btn");

  console.log("Current Time: ", await currentTime.innerText());
  console.log("Found: ", await checkIn.innerText());
  console.log("Found: ", await checkOut.innerText());

  if (process.env.SKIP_CHECK_IN_OUT === "true") {
    console.log("Skipping Check In/Out...");
    await browser.close();
    return;
  }

  if (process.env.CHECK_TYPE === "CHECK_IN") {
    console.log("Checking In...");
    await page.click(".col:nth-child(1) > .btn");
  } else if (process.env.CHECK_TYPE === "CHECK_OUT") {
    console.log("Checking Out...");
    await page.click(".col:nth-child(2) > .btn");
  }

  if (process.env.CHECK_TYPE === "CHECK_IN") {
    const toast = page.getByText("Successfully Clock In");
    if ((await toast.innerText()) === "Successfully Clock In") {
      console.log("Successfully Clock In");
    }
  } else if (process.env.CHECK_TYPE === "CHECK_OUT") {
    const toast = page.getByText("Successfully Clock Out");
    if ((await toast.innerText()) === "Successfully Clock Out") {
      console.log("Successfully Clock Out");
    }
  }

  await browser.close();
};

main();
