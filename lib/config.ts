export const config = {
  attendancePin: process.env.ATTENDANCE_PIN ?? "",
  timerStart: (process.env.TIMER_START === "attendance" ? "attendance" : "login") as "login" | "attendance",
  showStation: process.env.SHOW_STATION !== "false",
  wrongCooldownSec: Number(process.env.WRONG_ANSWER_COOLDOWN ?? 5) || 0,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
};

export const STATIONS = ["A", "B", "C"] as const;
