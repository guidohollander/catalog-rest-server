# Debugging Setup - Complete Summary

## What We've Done

I've set up a comprehensive debugging solution for your Next.js 15 API routes. Here's everything that's been configured:

### ✅ Configuration Files Updated

1. **`.vscode/launch.json`**
   - "Next.js: debug server-side" - Launch configuration
   - "Next.js: attach" - Attach to running server
   - Proper source map resolution
   - Configured for Next.js multi-process architecture

2. **`tsconfig.json`**
   - Added `"sourceMap": true` for TypeScript source maps

3. **`package.json`**
   - Added `dev:debug` script without NODE_NO_WARNINGS

### ✅ Documentation Created

1. **`DEBUGGING_SOLUTION.md`** - Complete troubleshooting guide
2. **`DEBUGGING_QUICK_REFERENCE.md`** - Quick reference card
3. **`DEBUG_GUIDE.md`** - Detailed debugging instructions
4. **`test-breakpoints.ps1`** - Automated testing script
5. **`test-debugging.ps1`** - Diagnostic script

### ✅ Test Endpoint Created

- **`/api/test-debug`** - Simple endpoint to verify debugging works

## The Root Cause

**Next.js 15 compiles API routes on-demand**, not at startup. This means:

1. When server starts → No API routes exist yet
2. First request → Route compiles + source maps generated
3. Set breakpoints → Debugger maps to compiled code
4. Second request → Breakpoints hit!

**This is why breakpoints appear "unbound" initially!**

## How to Use

### Method 1: Automated Testing (Recommended)

```powershell
# 1. Start debugger (F5 in Debug panel)
# 2. Run test script
.\test-breakpoints.ps1

# The script will:
# - Check if server is running
# - Check if debugger is attached
# - Compile the route (first request)
# - Prompt you to set breakpoints
# - Make second request to hit breakpoints
```

### Method 2: Manual Steps

```powershell
# 1. Start debugger
Ctrl+Shift+D → "Next.js: debug server-side" → F5

# 2. Compile route (first request)
Invoke-WebRequest http://localhost:3000/api/test-debug

# 3. Set breakpoints in VS Code

# 4. Make second request
Invoke-WebRequest http://localhost:3000/api/test-debug

# Breakpoints should hit!
```

### Method 3: Use debugger; Statement

If breakpoints still don't work, use the `debugger;` statement:

```typescript
export async function POST(request: NextRequest) {
  debugger; // Execution WILL pause here
  const body = await request.json();
  // ...
}
```

This **always works**, regardless of source map configuration.

## For Your propset_ex Route

The route already has comprehensive logging that shows everything you need:

```typescript
// Shows complete request from Be Informed
logger.info("SVN Propset Extended Request - Full Body", {
  fullBody: JSON.stringify(body, null, 2)
});

// Shows parsed replacements array
logger.info("SVN Propset Extended Request - Parsed Data", {
  key, url, replacementsCount, replacements
});

// Shows each replacement being processed
logger.info("Processing replacement", {
  from: replacement_from,
  to: replacement_to
});
```

**View logs at:** http://localhost:3000/logs

This might be more efficient than using breakpoints for debugging the Be Informed integration!

## Quick Troubleshooting

### Breakpoints show as "Unbound"?
→ Make a request to compile the route first, then set breakpoints

### Debugger not attaching?
→ Check: `Get-NetTCPConnection -LocalPort 9229 -State Listen`

### Breakpoints never hit?
→ Try "Next.js: attach" configuration instead

### Still not working?
→ Use `debugger;` statement or logging

## Files Reference

| File | Purpose |
|------|---------|
| `DEBUGGING_QUICK_REFERENCE.md` | Quick start guide (read this first!) |
| `DEBUGGING_SOLUTION.md` | Complete troubleshooting guide |
| `test-breakpoints.ps1` | Automated breakpoint testing |
| `test-debugging.ps1` | System diagnostics |
| `DEBUG_GUIDE.md` | Detailed debugging instructions |
| `.vscode/launch.json` | VS Code debugger configuration |

## Next Steps

1. **Start the debugger** (F5 in Debug panel)
2. **Run the test script**: `.\test-breakpoints.ps1`
3. **Follow the prompts** to verify breakpoints work
4. **If issues persist**, check `DEBUGGING_SOLUTION.md`

## Key Takeaway

**The most important thing to understand:**

Next.js API routes are compiled on first request. You must:
1. ✅ Start debugger
2. ✅ Request route (compiles it)
3. ✅ Set breakpoints
4. ✅ Request route again (breakpoints hit)

**Or just use `debugger;` statement or logging!**

## Alternative: Use Logging

For the propset_ex route, logging might be more practical:
- No need to pause execution
- See all requests in real-time
- Filter and search logs
- Export logs for analysis

Access: http://localhost:3000/logs

## Support

If you still have issues after trying everything:
1. Run: `.\test-debugging.ps1` and share output
2. Share screenshot of breakpoint status
3. Share VS Code version and Node version
4. Check if `debugger;` statement works

---

**Remember:** The `debugger;` statement and logging are often more practical than breakpoints for API route debugging!
