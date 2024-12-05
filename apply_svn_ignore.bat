@echo off
REM Setting svn:ignore property using the .svnignore file

REM Set svn:ignore for the current directory
svn propset svn:ignore -F ".svnignore" .

REM Recursively set svn:ignore for all subdirectories
for /d /r %%i in (.) do (
    svn propset svn:ignore -F ".svnignore" "%%i"
)

echo svn:ignore properties set for Node.js / Next.js project
pause
