# Debugging Guide for Next.js API Routes

## Current Issue
Breakpoints are not binding in VS Code debugger for Next.js 15 API routes.

## What We've Tried
1. ✅ Added `sourceMap: true` to tsconfig.json
2. ✅ Created `dev:debug` script without NODE_NO_WARNINGS
3. ✅ Updated launch.json with node-terminal type (recommended by Next.js)
4. ❌ Tried webpack devtool override (Next.js rejected it)

## Testing Steps

### Step 1: Test if Debugger Attachment Works
1. Stop all running servers
2. Delete `.next` folder: `Remove-Item -Recurse -Force .next`
3. Open Debug panel (Ctrl+Shift+D)
4. Select "Next.js: debug server-side"
5. Press F5
6. Wait for "Ready in X.Xs"
7. Open browser: http://localhost:3000/api/test-debug
8. **Expected**: Execution should pause at the `debugger;` statement

### Step 2: Test Breakpoints
If Step 1 works (debugger statement pauses):
1. Remove the `debugger;` statement
2. Set a regular breakpoint on the same line
3. Refresh the browser
4. **Expected**: Breakpoint should hit

If Step 1 doesn't work (debugger statement doesn't pause):
- The issue is with debugger attachment, not source maps
- Check if multiple Node processes are running
- Check Windows Defender or antivirus blocking debugger

### Step 3: Alternative - Use Logging
If debugging still doesn't work, use the comprehensive logging:
```typescript
logger.info("Debug point", { variable1, variable2 });
```

View logs at: http://localhost:3000/logs

## Known Issues with Next.js 15 Debugging

### Issue 1: Multiple Node Processes
Next.js 15 spawns multiple Node processes. The debugger might attach to the wrong one.

**Solution**: Use `node-terminal` type in launch.json (already configured)

### Issue 2: Source Map Resolution
Next.js compiles TypeScript on-demand, making source maps tricky.

**Solution**: The `debugger;` statement always works regardless of source maps

### Issue 3: Windows Auto-Attach
VS Code's auto-attach might interfere with explicit debug configurations.

**Solution**: 
1. Press Ctrl+Shift+P
2. Type "Debug: Toggle Auto Attach"
3. Set to "Disabled"

## Verification Checklist

Run through this checklist:

- [ ] `.next` folder deleted
- [ ] No other Node processes running (check Task Manager)
- [ ] VS Code Auto Attach is disabled
- [ ] Using "Next.js: debug server-side" configuration
- [ ] Server shows "Debugger attached" in terminal
- [ ] Test endpoint works: http://localhost:3000/api/test-debug
- [ ] `debugger;` statement pauses execution

## If Nothing Works

Use the extensive logging I added to propset_ex route:
- Line 22-24: Full request body
- Line 29-33: Parsed data with replacements
- Line 62-65: Current externals preview
- Line 74-77: Each replacement being processed
- Line 99-103: Final results

Access logs at: http://localhost:3000/logs

## Next Steps

1. Try the test endpoint first
2. Report back what happens with the `debugger;` statement
3. We'll adjust strategy based on results
