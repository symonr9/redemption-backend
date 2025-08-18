
var filter = require('leo-profanity');

module.exports.checkForProfanity = function(text) {
    return text && filter.check(text);
}

module.exports.cleanForProfanity = function(text) {
    const cleanText = filter.clean(text);
    return cleanText ? cleanText.trim() : "";
}

module.exports.hasValidTextLength = function(text, min, max) {
    return text && text.length > min && text.length < max;
}

module.exports.getTomorrow = function() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
}

module.exports.isWithinNext24Hours = function(date) {
    const now = new Date();
    const future24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return date && date > now && date <= future24Hours;
}

module.exports.isWithinPast24Hours = function(date) {
    if (!date) {
        return false;
    }
    const now = new Date();
    const past24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return date && date <= now && date >= past24Hours;
}

module.exports.formatDateTime = function(date) {
    if (!date) {
        return '';
    }

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayOfWeek = daysOfWeek[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';

    hour = hour % 12;
    hour = hour ? hour : 12; // The hour '0' should be '12'

    return `${dayOfWeek}, ${month} ${day}, ${year} at ${hour}:${minute} ${ampm}`;
}

module.exports.getRandomString = function(strings) {
  if (!Array.isArray(strings) || strings.length === 0) 
    return '';

  const randomIndex = Math.floor(Math.random() * strings.length);
  return strings[randomIndex];
}
