# Debugging Solution for Next.js 15 API Routes

## The Problem
Breakpoints in VS Code are not binding to Next.js 15 API routes. This is because:
1. Next.js uses `eval-source-map` for development (not regular source maps)
2. API routes are compiled on-demand (not at startup)
3. VS Code's debugger needs special configuration to work with Next.js's multi-process architecture

## The Solution

### Step 1: Clean Everything
```powershell
# Kill all Node processes
taskkill /F /IM node.exe

# Delete .next folder
Remove-Item -Recurse -Force .next

# Delete node_modules/.cache if it exists
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
```

### Step 2: Start the Dev Server with Debugging
1. Open VS Code
2. Open Debug panel (Ctrl+Shift+D)
3. Select **"Next.js: debug server-side"**
4. Press F5
5. Wait for "Ready in X.Xs" message

### Step 3: Trigger Route Compilation
**IMPORTANT**: API routes are compiled on first request. You must:
1. Make a request to the route FIRST (this compiles it)
2. THEN set your breakpoints
3. Make another request (breakpoints should hit)

Example:
```powershell
# First request - compiles the route
Invoke-WebRequest http://localhost:3000/api/test-debug

# Now set your breakpoints in the route file

# Second request - should hit breakpoints
Invoke-WebRequest http://localhost:3000/api/test-debug
```

### Step 4: Alternative - Use Attach Configuration
If the above doesn't work:
1. Start dev server normally: `npm run dev:debug`
2. Wait for it to be ready
3. In Debug panel, select **"Next.js: attach"**
4. Press F5
5. Follow Step 3 above

## Why This Works

### eval-source-map
Next.js uses `eval-source-map` which embeds source maps inline with the code. This is fast but requires the debugger to:
1. Wait for code to be compiled
2. Parse the embedded source maps
3. Map back to original TypeScript files

### On-Demand Compilation
Next.js compiles API routes when they're first accessed. The debugger can't bind to code that doesn't exist yet!

**Timeline**:
- Server starts → No API routes compiled
- First request → Route compiles, source maps generated
- Breakpoints set → Debugger maps to compiled code
- Second request → Breakpoints hit!

## Troubleshooting

### Breakpoints Still Not Hitting?

#### Option 1: Use `debugger;` Statement
Add this line where you want to break:
```typescript
debugger; // Execution will pause here
```

This ALWAYS works, regardless of source map configuration.

#### Option 2: Check Auto-Attach
1. Press Ctrl+Shift+P
2. Type: "Debug: Toggle Auto Attach"
3. Select: **"Disabled"**
4. Restart VS Code

#### Option 3: Verify Debugger is Attached
Check terminal output for:
```
Debugger attached.
```

If you don't see this, the debugger isn't connecting.

#### Option 4: Check Port 9229
```powershell
Get-NetTCPConnection -LocalPort 9229 -State Listen -ErrorAction SilentlyContinue
```

If nothing is returned, the debug port isn't open.

### Common Issues

**Issue**: "Unbound breakpoint" message
**Solution**: Make a request to compile the route first, then set breakpoints

**Issue**: Breakpoints work in some files but not others
**Solution**: Each route must be compiled before breakpoints work. Request each route once.

**Issue**: Debugger attaches but breakpoints never hit
**Solution**: Use the "attach" configuration instead of "launch"

**Issue**: Multiple "Debugger attached" messages
**Solution**: This is normal - Next.js spawns multiple processes

## Testing Your Setup

### Test 1: Simple Endpoint
```powershell
# Terminal 1: Start debugger (F5)
# Wait for ready message

# Terminal 2: Test endpoint
Invoke-WebRequest http://localhost:3000/api/test-debug
```

Expected: Route compiles, returns JSON

### Test 2: Debugger Statement
1. Add `debugger;` to `/api/test-debug/route.ts` line 4
2. Make request: `Invoke-WebRequest http://localhost:3000/api/test-debug`
3. Expected: Execution pauses, VS Code shows debug controls

### Test 3: Regular Breakpoint
1. Remove `debugger;` statement
2. Make request once to compile: `Invoke-WebRequest http://localhost:3000/api/test-debug`
3. Set breakpoint on line 4
4. Make request again: `Invoke-WebRequest http://localhost:3000/api/test-debug`
5. Expected: Breakpoint hits

## Best Practices

### For Development
1. **Use `debugger;` statements** for critical debug points
2. **Use logging** for routine debugging (see logs at `/logs`)
3. **Compile routes first** before setting breakpoints
4. **Keep debugger attached** - don't restart unless necessary

### For propset_ex Route
The route has comprehensive logging:
```typescript
// Line 20-24: Full request body
logger.info("SVN Propset Extended Request - Full Body", {
  fullBody: JSON.stringify(body, null, 2)
});
```

View logs at: http://localhost:3000/logs

This shows you exactly what Be Informed is sending without needing breakpoints!

## Configuration Files

### .vscode/launch.json
Two configurations:
1. **"Next.js: debug server-side"** - Launches dev server with debugging
2. **"Next.js: attach"** - Attaches to already-running server

### package.json
```json
"dev:debug": "cross-env NEXT_PUBLIC_APP_VERSION=$npm_package_version next dev"
```
No NODE_NO_WARNINGS to allow debugging

### tsconfig.json
```json
"sourceMap": true
```
Enables TypeScript source maps

## Summary

**The Key Insight**: Next.js API routes are compiled on-demand. You must:
1. ✅ Start debugger
2. ✅ Request route (compiles it)
3. ✅ Set breakpoints
4. ✅ Request route again (breakpoints hit)

**Alternative**: Use `debugger;` statements or comprehensive logging instead of breakpoints.
