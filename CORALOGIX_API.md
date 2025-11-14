# Coralogix REST API Documentation

This document describes the Coralogix REST API `/singles` endpoint used for log ingestion.

## Endpoint URL

Input your Coralogix domain into the following endpoint URL:

```
https://ingress.<domain>/logs/v1/singles
```

### Available Domains

- `us1.coralogix.com` (US1)
- `us2.coralogix.com` (US2)
- `eu1.coralogix.com` (EU1)
- `eu2.coralogix.com` (EU2)
- `ap1.coralogix.com` (AP1)
- `ap2.coralogix.com` (AP2)
- `ap3.coralogix.com` (AP3)

## Endpoint Details

| Property | Value |
|----------|-------|
| URL | `https://ingress.<domain>/logs/v1/singles` |
| HTTP Method | `POST` |
| Content-Type | `application/json` |
| Authorization | `Bearer <Send-Your-Data API key>` |

## Important Notes

- We **recommend** sending logs in batches to minimize network calls.
- The API is limited to a message size of **2MB** which is approximately 3,000 medium-sized logs.
- If you are using Ajax or similar technology, you may need to send the data with `JSON.stringify()`.

## Request Schema

### POST Body

The request body should be an array of JSON objects with the following properties:

| Property Name | Property Type | Required | Note |
|--------------|---------------|----------|------|
| `timestamp` | number | Yes* | UTC milliseconds since 1970 (supports sub-millisecond via floating point) |
| `applicationName` | string | Yes | Usually used to separate environments |
| `subsystemName` | string | Yes | Usually used to separate components |
| `computerName` | string | No | Computer/host name |
| `severity` | number | No | 1 – Debug, 2 – Verbose, 3 – Info, 4 – Warn, 5 – Error, 6 – Critical |
| `category` | string | No | Category field |
| `className` | string | No | Class field |
| `methodName` | string | No | Method field |
| `threadId` | string | No | Thread ID field |
| `hiResTimestamp` | string | Yes* | UTC nanoseconds since 1970 (supports millisecond, microsecond and nanosecond) |
| `text` | string/json | No | Event log message |

\* Either `timestamp` or `hiResTimestamp` must be present. If neither is provided, Coralogix will inject the UTC time when the request is received.

### Severity Levels

| Level | Value | Description |
|-------|-------|-------------|
| Debug | 1 | Debug messages |
| Verbose | 2 | Verbose/trace messages |
| Info | 3 | Informational messages |
| Warn | 4 | Warning messages |
| Error | 5 | Error messages |
| Critical | 6 | Critical errors |

## Example Request

```bash
curl --location --request POST 'https://ingress.<domain>/logs/v1/singles' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <Send-Your-Data API key>' \
  --data-raw '[{
    "applicationName": "my-application",
    "subsystemName": "api-service",
    "computerName": "server-01",
    "severity": 3,
    "text": "this is a normal text message",
    "category": "cat-1",
    "className": "class-1",
    "methodName": "method-1",
    "threadId": "thread-1",
    "timestamp": 1675148539123.342
  }, {
    "applicationName": "my-application",
    "subsystemName": "api-service",
    "computerName": "server-01",
    "hiResTimestamp": "1675148539789123123",
    "severity": 5,
    "text": "{\"key1\":\"val1\",\"key2\":\"val2\",\"key3\":\"val3\",\"key4\":\"val4\"}",
    "category": "DAL",
    "className": "UserManager",
    "methodName": "RegisterUser",
    "threadId": "a-352"
  }]'
```

## Response Codes

- `200 OK` - Logs successfully ingested
- `400 Bad Request` - Invalid request format or missing required fields
- `401 Unauthorized` - Invalid or missing API key
- `413 Payload Too Large` - Request exceeds 2MB limit
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Authentication

Authentication is done via Bearer token in the Authorization header. You need to use your **Send-Your-Data API key** which can be obtained from your Coralogix dashboard.

```
Authorization: Bearer <your-api-key>
```

## Best Practices

1. **Batch your logs** - Send multiple log entries in a single request to reduce network overhead
2. **Respect the 2MB limit** - Monitor your batch sizes to stay within the limit
3. **Use appropriate severity levels** - Map your application's log levels to Coralogix severity values
4. **Include meaningful metadata** - Use `applicationName` and `subsystemName` to organize your logs
5. **Handle errors gracefully** - Implement retry logic with exponential backoff for transient failures
6. **Use timestamps consistently** - Either use `timestamp` (milliseconds) or `hiResTimestamp` (nanoseconds)

## Support

For additional help:
- Reach out via in-app chat
- Email: support@coralogix.com
- Documentation: https://coralogix.com/docs/

---

**Source**: [Coralogix REST API /singles Documentation](https://coralogix.com/docs/developer-portal/apis/log-ingestion/coralogix-rest-api-singles/)

**Last Updated**: November 14, 2025
