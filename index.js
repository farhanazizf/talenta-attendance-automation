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

const PUBLIC_HOLIDAYS = [
  "23 Jan 2023", // cuti bersama imlek
  "23 Mar 2023", // nyepi
  "23 Mar 2023", // cuti bersama nyepi
  "7 Apr 2023", // wafat isa almasih
  "21 Apr 2023", // idul fitri
  "24 Apr 2023", // idul fitri
  "25 Apr 2023", // idul fitri
  "26 Apr 2023", // idul fitri
  "1 Mei 2023", // hari buruh
  "18 Mei 2023", // kenaikan isa almasih
  "1 Jun 2023", // hari lahir pancasila
  "2 Jun 2023", // cuti bersama waisak
  "29 Jun 2023", // idul adha
  "19 Jul 2023", // tahun baru islam
  "17 Aug 2023", // kemerdekaan indonesia
  "28 Sep 2023", // maulid nabi muhammad
  "25 Dec 2023", // natal
  "26 Dec 2023", // cuti bersama natal
];

const main = async () => {
  const isHeadless =
    (process.env.HEADLESS_BROWSER ?? "true") === "true" ? true : false;

  const TODAY = dayjs().tz("Asia/Jakarta").format("D MMM YYYY");

  if (PUBLIC_HOLIDAYS.includes(TODAY)) {
    console.log("Today is public holiday, skipping check in/out...");
    return;
  }

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

  console.log("Signing in...");
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

  // go to "My Attendance Logs"
  await page.click("text=My Attendance Logs");
  await page.waitForSelector(`h3:text("${myName}")`);
  console.log(
    "Already inside My Attendance Logs to check holiday or day-off..."
  );

  const rowToday = page.locator("tr", { hasText: TODAY }).first();

  const columnCheckDayOff = await rowToday
    .locator("td:nth-child(2)")
    .innerText();

  const columnCheckOnLeave = await rowToday
    .locator("td:nth-child(7)")
    .innerText();

  // N = not dayoff/holiday
  const isTodayHoliday = columnCheckDayOff.trim() !== "N";

  // CT = cuti
  const isTodayOnLeave = columnCheckOnLeave.trim() === "CT";

  const shouldSkipCheckInOut = isTodayHoliday || isTodayOnLeave;

  if (shouldSkipCheckInOut) {
    const consoleText = isTodayOnLeave
      ? "You are on leave (cuti) today, skipping check in/out..."
      : "You are on holiday today, skipping check in/out...";
    console.log(consoleText);

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
