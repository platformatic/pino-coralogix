/**
 * Maps Pino log levels to Coralogix severity levels
 * Pino levels: trace=10, debug=20, info=30, warn=40, error=50, fatal=60
 * Coralogix severity: Debug=1, Verbose=2, Info=3, Warn=4, Error=5, Critical=6
 */
const LEVEL_TO_SEVERITY = {
  10: 1, // trace -> debug
  20: 2, // debug -> verbose
  30: 3, // info -> info
  40: 4, // warn -> warn
  50: 5, // error -> error
  60: 6  // fatal -> critical
};

/**
 * Transforms a Pino log object to Coralogix log format
 * @param {Object} pinoLog - The Pino log object
 * @param {Object} config - Transport configuration
 * @returns {Object} Coralogix log object
 */
export function transformLog(pinoLog, config) {
  const coralogixLog = {
    timestamp: pinoLog.time,
    applicationName: config.applicationName,
    subsystemName: config.subsystemName,
    severity: LEVEL_TO_SEVERITY[pinoLog.level] || 3, // Default to Info
    text: formatMessage(pinoLog.msg)
  };

  // Add computerName (prefer config, fallback to hostname from log)
  if (config.computerName) {
    coralogixLog.computerName = config.computerName;
  } else if (pinoLog.hostname) {
    coralogixLog.computerName = pinoLog.hostname;
  }

  // Add optional Coralogix-specific fields if present in the log
  if (pinoLog.category) {
    coralogixLog.category = pinoLog.category;
  }
  if (pinoLog.className) {
    coralogixLog.className = pinoLog.className;
  }
  if (pinoLog.methodName) {
    coralogixLog.methodName = pinoLog.methodName;
  }
  if (pinoLog.threadId) {
    coralogixLog.threadId = pinoLog.threadId;
  }

  return coralogixLog;
}

/**
 * Formats the message field, converting objects to JSON strings
 * @param {*} msg - The message to format
 * @returns {string} Formatted message
 */
function formatMessage(msg) {
  if (msg === undefined || msg === null) {
    return '';
  }
  if (typeof msg === 'string') {
    return msg;
  }
  if (typeof msg === 'object') {
    return JSON.stringify(msg);
  }
  return String(msg);
}
