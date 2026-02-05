const cron = require('node-cron');
const db = require('../db');

function initScheduler() {
  // Run every minute
  cron.schedule('* * * * *', () => {
    const scheduleEnabled = db.prepare("SELECT value FROM settings WHERE key = 'schedule_enabled'").get().value === 'true';
    
    if (scheduleEnabled) {
      const start = db.prepare("SELECT value FROM settings WHERE key = 'schedule_start'").get().value;
      const end = db.prepare("SELECT value FROM settings WHERE key = 'schedule_end'").get().value;
      
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
      
      let shouldBeOn = false;
      if (start <= end) {
        shouldBeOn = currentTime >= start && currentTime < end;
      } else {
        // Crosses midnight (e.g. 23:00 to 07:00)
        shouldBeOn = currentTime >= start || currentTime < end;
      }
      
      const currentStatus = db.prepare("SELECT value FROM settings WHERE key = 'bot_enabled'").get().value === 'true';
      
      if (shouldBeOn !== currentStatus) {
        db.prepare("UPDATE settings SET value = ? WHERE key = 'bot_enabled'").run(shouldBeOn.toString());
        console.log(`Scheduler: Auto-switched bot to ${shouldBeOn ? 'ON' : 'OFF'}`);
      }
    }
  });
  console.log('Scheduler initialized.');
}

module.exports = { initScheduler };
