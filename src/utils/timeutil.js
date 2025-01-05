export function getFormattedDate(date) {
  const options = { year: 'numeric', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);

  const year = parts.find(p => p.type === 'year').value;
  const day = parts.find(p => p.type === 'day').value;
  const month = parts.find(p => p.type === 'month').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;

  return `${year}-${day}-${month} ${hour}:${minute}`;
}

export function getTimeZoneOffsetInHours(timeZone) {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const localDate = new Date(now.toLocaleString("en-US", { timeZone }));

  const offsetInMinutes = (localDate - utcDate) / (1000 * 60); // Offset in minutes
  return "GMT" +( offsetInMinutes<0 ? "-" :"+") + Math.floor(Math.abs(offsetInMinutes/60)).toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false
  }) + ":" +Math.abs(offsetInMinutes%60).toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false
  })
  // return offsetInMinutes / 60; // Convert to hours
}