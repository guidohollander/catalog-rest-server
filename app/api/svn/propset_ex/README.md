# SVN Propset Extended API Route

## Overview
This API route extends the standard `propset` functionality by accepting an array of replacement operations instead of requiring the complete externals string. This solves the 16K payload limit issue when sending large externals from Be Informed.

## Endpoint
`POST /api/svn/propset_ex`

## Request Format

```json
{
  "req": {
    "key": "Commit message",
    "url": "https://svn.example.com/repo/trunk",
    "replacements": [
      {
        "replacement_from": "string to find and replace",
        "replacement_to": "replacement string"
      },
      {
        "replacement_from": "another string to replace",
        "replacement_to": "another replacement"
      }
    ]
  }
}
```

## How It Works

1. **Retrieves Current Externals**: The route fetches the current `svn:externals` property from the specified URL
2. **Applies Replacements**: Iterates through the `replacements` array and applies each replacement sequentially
3. **Sets New Externals**: Writes the modified externals back to SVN using `svnmucc propsetf`
4. **Returns Results**: Provides detailed information about which replacements were applied

## Response Format

### Success Response (200)
```json
{
  "response": {
    "success": "1",
    "output": "propset_ex successful",
    "replacementsApplied": 2,
    "totalReplacements": 2,
    "details": [
      {
        "from": "string to find and replace",
        "to": "replacement string",
        "found": true
      },
      {
        "from": "another string to replace",
        "to": "another replacement",
        "found": true
      }
    ]
  }
}
```

### Error Response (400/500)
```json
{
  "response": {
    "success": "0",
    "error": "error message"
  }
}
```

## Debugging

The route includes extensive logging to help debug issues:

- **Full request body** is logged on entry
- **Parsed data** including replacements count
- **Current externals** length and preview
- **Each replacement** as it's processed
- **Final results** with counts of applied replacements

To view logs:
- Check the console output when running in development mode
- View log files in the `logs/` directory
- Access the live logs console at `/logs` endpoint

## Debugging Breakpoints

To debug this route with breakpoints:

1. **Stop the current dev server** if running
2. **Open Debug panel** in VS Code (Ctrl+Shift+D)
3. **Select "Next.js: Debug Server"** from the dropdown
4. **Press F5** to start debugging
5. **Set breakpoints** in the route file
6. **Send a request** to the endpoint

The breakpoints should now hit properly. If they still show as "Unbound":
- Make sure the dev server is started through the debugger (F5)
- Wait for the route to be compiled (first request triggers compilation)
- Try the "Attach to Next.js" configuration if the server is already running

## Example Usage from Be Informed

Instead of sending the complete externals string (which can exceed 16K), Be Informed should:

1. Identify which project versions need to be changed
2. Create a replacement entry for each change
3. Send the array of replacements to this endpoint

Example:
```javascript
// Old approach (exceeds 16K limit)
const fullExternals = "... 20KB of externals data ...";

// New approach (much smaller payload)
const replacements = [
  {
    replacement_from: "project1/branches/1.0.0",
    replacement_to: "project1/branches/1.0.1"
  },
  {
    replacement_from: "project2/branches/2.0.0",
    replacement_to: "project2/branches/2.0.1"
  }
];
```

## Testing

Use the test script to verify the endpoint:
```bash
node scripts/test-propset-ex.js
```

Make sure to update the test data with valid SVN URLs and replacement strings before running.
