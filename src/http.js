import { request } from 'undici';

/**
 * Builds the Coralogix API endpoint URL
 * @param {string} domain - The Coralogix domain (us1, us2, eu1, eu2, ap1, ap2, ap3)
 * @returns {string} The full API endpoint URL
 */
function buildEndpointUrl(domain) {
  return `https://ingress.${domain}.coralogix.com/logs/v1/singles`;
}

/**
 * Custom error class for HTTP errors
 */
class HttpError extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Sends logs to Coralogix via HTTP POST
 * @param {Array} logs - Array of Coralogix log objects
 * @param {Object} config - Configuration object with domain, apiKey, timeout
 * @returns {Promise<Object>} Response object with success status
 * @throws {HttpError} If the request fails
 */
export async function sendLogs(logs, config) {
  const url = buildEndpointUrl(config.domain);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`
  };

  const body = JSON.stringify(logs);

  try {
    const response = await request(url, {
      method: 'POST',
      headers,
      body,
      headersTimeout: config.timeout,
      bodyTimeout: config.timeout
    });

    // Read the response body
    const responseBody = await response.body.text();

    // Check if the response is successful
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { success: true, statusCode: response.statusCode };
    }

    // Handle error responses
    throw new HttpError(
      `HTTP ${response.statusCode}: ${responseBody}`,
      response.statusCode,
      responseBody
    );
  } catch (error) {
    // Re-throw HttpError as-is
    if (error instanceof HttpError) {
      throw error;
    }

    // Wrap other errors
    throw new Error(`Failed to send logs: ${error.message}`);
  }
}
