import playwright from "playwright-chromium";
import dotenv from "dotenv";
import invariant from "tiny-invariant";

dotenv.config();

// make sure all env variables are set
invariant(process.env.GEO_LATITUDE, "secret GEO_LATITUDE is required");
invariant(process.env.GEO_LONGITUDE, "secret GEO_LONGITUDE is required");
invariant(process.env.ACCOUNT_EMAIL, "secret ACCOUNT_EMAIL is required");
invariant(process.env.ACCOUNT_PASSWORD, "secret ACCOUNT_PASSWORD is required");

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
await Promise.all([page.click("#new-signin-button"), page.waitForNavigation()]);

const dashboardNav = page.getByText("Dashboard");
// check if dashboard nav is exist
if ((await dashboardNav.innerText()) === "Dashboard") {
  console.log("Successfully Logged in...");
}

await Promise.all([
  page.click('[href="/live-attendance"]'),
  page.waitForNavigation(),
]);

console.log("Already inside Live Attendance Page...");

//-- debug live attendance page
// main = await page.waitForSelector('main')
// console.log('-- Main Content \n', await main.innerText())

const currentTime = await page.waitForSelector(".current-time");
const checkIn = await page.waitForSelector(".col:nth-child(1) > .btn");
const checkOut = await page.waitForSelector(".col:nth-child(2) > .btn");

console.log("Current Time: ", await currentTime.innerText());
console.log("Found: ", await checkIn.innerText());
console.log("Found: ", await checkOut.innerText());

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
