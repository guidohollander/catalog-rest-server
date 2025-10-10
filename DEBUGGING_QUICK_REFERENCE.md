# Debugging Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Start Debugger
```
Ctrl+Shift+D → Select "Next.js: debug server-side" → F5
```

### 2. Compile Route (First Request)
```powershell
Invoke-WebRequest http://localhost:3000/api/test-debug
```

### 3. Set Breakpoints & Request Again
- Set breakpoints in VS Code
- Make another request
- Breakpoints should hit!

---

## 🔧 Automated Testing

Run the test script:
```powershell
.\test-breakpoints.ps1
```

Or test specific route:
```powershell
.\test-breakpoints.ps1 -Route "/api/svn/propset_ex"
```

---

## ⚡ Quick Fixes

### Breakpoints Not Hitting?

**Option 1: Use `debugger;` Statement**
```typescript
export async function POST(request: NextRequest) {
  debugger; // ← Add this line
  const body = await request.json();
  // ...
}
```

**Option 2: Disable Auto-Attach**
```
Ctrl+Shift+P → "Debug: Toggle Auto Attach" → "Disabled"
```

**Option 3: Try Attach Mode**
```
1. Start: npm run dev:debug
2. Debug panel → "Next.js: attach" → F5
3. Request route to compile
4. Set breakpoints
5. Request again
```

**Option 4: Clean Restart**
```powershell
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next
# Then F5 in Debug panel
```

---

## 📋 Checklist

Before reporting breakpoint issues, verify:

- [ ] Debugger started with F5 (not just `npm run dev`)
- [ ] "Debugger attached" message in terminal
- [ ] Made first request to compile route
- [ ] Set breakpoints AFTER route compiled
- [ ] Breakpoints show as red dots (not gray circles)
- [ ] Made second request to trigger breakpoints
- [ ] Auto-Attach is disabled in VS Code

---

## 🎯 For propset_ex Route

### Use Logging Instead
The route has comprehensive logging that shows everything:

```typescript
// Line 20-24: Full request body from Be Informed
logger.info("SVN Propset Extended Request - Full Body", {
  fullBody: JSON.stringify(body, null, 2)
});

// Line 27-32: Parsed data
logger.info("SVN Propset Extended Request - Parsed Data", {
  key, url, replacementsCount, replacements
});

// Line 62-65: Current externals
logger.info("Current externals retrieved", {
  length, preview
});

// Line 74-77: Each replacement
logger.info("Processing replacement", {
  from, to
});

// Line 99-103: Final results
logger.info("All replacements processed", {
  totalReplacements, appliedCount
});
```

**View logs:** http://localhost:3000/logs

---

## 🔍 Diagnostic Commands

### Check if server is running
```powershell
Invoke-WebRequest http://localhost:3000/api/health
```

### Check if debugger is attached
```powershell
Get-NetTCPConnection -LocalPort 9229 -State Listen
```

### Check Node processes
```powershell
Get-Process -Name node | Select-Object Id, StartTime
```

### Kill all Node processes
```powershell
taskkill /F /IM node.exe
```

---

## 📚 Full Documentation

- **Complete Guide:** `DEBUGGING_SOLUTION.md`
- **Test Script:** `test-breakpoints.ps1`
- **Debug Guide:** `DEBUG_GUIDE.md`

---

## 💡 Key Insight

**Next.js compiles API routes on-demand!**

Timeline:
1. Server starts → No routes compiled
2. First request → Route compiles + source maps generated
3. Set breakpoints → Debugger maps to compiled code
4. Second request → Breakpoints hit! ✅

**That's why you need TWO requests!**

---

## ⚠️ Common Mistakes

❌ Setting breakpoints before route is compiled
✅ Request route first, THEN set breakpoints

❌ Using `npm run dev` without debugger
✅ Use F5 in Debug panel

❌ Expecting breakpoints to work immediately
✅ Wait for route to compile on first request

❌ Not checking "Debugger attached" message
✅ Verify debugger is connected

---

## 🆘 Still Not Working?

1. **Use `debugger;` statement** - Always works
2. **Use logging** - View at `/logs`
3. **Check DEBUGGING_SOLUTION.md** - Full troubleshooting
4. **Run test script** - `.\test-breakpoints.ps1`

---

## 📞 Support

If nothing works, provide this info:
- VS Code version
- Node version: `node --version`
- Next.js version: Check `package.json`
- Output of: `.\test-debugging.ps1`
- Screenshot of breakpoint status
