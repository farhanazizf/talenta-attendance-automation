# talenta-attendance-automation

This is a project to automate the process of check-in and check-out of talenta web.

To use this project, you just need to fork this project and set the environment variables (**secrets**) on github action.
Set the **github secrets** on settings > Secrets and environment variables > Actions.

Environment variables (**SECRETS**) that you need to set:

- `ACCOUNT_EMAIL` : talenta username
- `ACCOUNT_PASSWORD` : talenta password
- `GEO_LATITUDE` : geolocation latitude. Example: -7.7865454
- `GEO_LONGITUDE` : geolocation longitude. Example: 110.3654918

Github action workflow will run every (around) 08:00 (UTC+7) for check-in and (around) 17:30 (UTC+7) for check-out.

Why (around)? Because github workflow doesn't guarantee that your job will running on time.

## How to use (video guidance)

Watch here using your work email: https://drive.google.com/file/d/164s4TqsX4YAyUa4YeznkHeLllHXeuydL/view?usp=share_link
