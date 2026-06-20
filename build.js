const fs = require("fs");
const fetch = require("node-fetch");

// ======================
// CONFIG
// ======================
const ICAL_URL = "https://p130-caldav.icloud.com/published/2/ODk5NjQ1MDk4OTk2NDUwOR-JP6zFGVk1H6zHu1TkiHoFVeqJwFbHYV-D8HQD0QWfV4XZqUiA0LNYA5bv4rM9i9CicWpQpX7TgqZjoa7CjZc";

const LAT = 51.76;
const LON = -0.45;

// ======================
// HELPERS
// ======================
function pad(n) {
  return n < 10 ? "0" + n : n;
}

function formatDate(d) {
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate())
  );
}

// ======================
// WEATHER
// ======================
async function getWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`;

  const res = await fetch(url);
  return await res.json();
}

// ======================
// CALENDAR
// ======================
async function getCalendar() {
  const res = await fetch(ICAL_URL);
  return await res.text();
}

function parseICS(data) {
  const lines = data.split("\n");
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = {};
    }

    if (current) {
      if (line.startsWith("SUMMARY:")) {
        current.title = line.replace("SUMMARY:", "").trim();
      }

      if (line.startsWith("DTSTART")) {
        current.start = line.split(":")[1].trim();
      }
    }

    if (line.startsWith("END:VEVENT") && current) {
      events.push(current);
      current = null;
    }
  }

  return events;
}

// ======================
// HTML BUILDER
// ======================
function buildHTML(events, weather) {
  const w = weather.current_weather;

  const today = formatDate(new Date());

  const todayEvents = events.filter(
    (e) => e.start && e.start.startsWith(today)
  );

  let eventHTML = "";

  if (todayEvents.length === 0) {
    eventHTML = `<div class="event">No events today</div>`;
  } else {
    for (const e of todayEvents) {
      eventHTML += `<div class="event">${e.title || "Untitled event"}</div>`;
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="600">
<title>Family Calendar</title>

<style>
body {
  font-family: Arial, sans-serif;
  background: #fff;
  color: #000;
  margin: 0;
  padding: 14px;
  font-size: 22px;
}

h1 {
  font-size: 34px;
  margin-bottom: 10px;
}

h2 {
  font-size: 26px;
  border-bottom: 1px solid #000;
  padding-bottom: 4px;
}

.weather {
  background: #eee;
  padding: 12px;
  margin-bottom: 12px;
  font-size: 20px;
}

.event {
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
}
</style>

</head>

<body>

<h1>Family Calendar</h1>

<div class="weather">
🌤 ${w.temperature}°C | Wind ${w.windspeed} km/h
</div>

<h2>Today</h2>

${eventHTML}

</body>
</html>
`;
}

// ======================
// MAIN BUILD
// ======================
async function run() {
  try {
    const [weather, cal] = await Promise.all([
      getWeather(),
      getCalendar(),
    ]);

    const events = parseICS(cal);

    console.log("Events found:", events.length);
    console.log(events.slice(0, 5)); 
    
    const html = buildHTML(events, weather);

    fs.writeFileSync("index.html", html);

    console.log("✔ Build complete: index.html generated");
  } catch (err) {
    console.error("Build failed:", err);
  }
}

run();
