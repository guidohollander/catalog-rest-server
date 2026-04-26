# Test whether Scenario 6 regex matches typical branch deletion paths from svnlook changed
# When TortoiseSVN deletes a branch, svnlook changed outputs:
#   D  branches/99.98.97/          (the folder itself, with trailing slash)
#   D  branches/99.98.97/file.xml  (child files)
# The regex must match the folder line but NOT the child file lines

$regex6 = '^trunk/?$|^branches/\d+\.\d+\.\d+(_\d+\.\d+\.\d+)?/?$|^tags/\d+\.\d+\.\d+(_\d+\.\d+\.\d+)?/?$'
$fileChangesRegex = '/.+/'

$testPaths = @(
    # Branch folder deletions (should match Scenario 6)
    'branches/99.98.97/',
    'branches/99.98.97',
    'branches/3.2.0_23.2.6/',
    'branches/3.2.0_23.2.6',
    'branches/2.4.0/',
    'branches/2.4.0',
    # Tag folder deletions
    'tags/1.0.0/',
    'tags/1.0.0_23.2.6/',
    # Trunk
    'trunk/',
    'trunk',
    # Child files (should NOT match Scenario 6, but WILL match fileChanges)
    'branches/99.98.97/file.xml',
    'branches/99.98.97/subfolder/other.xml',
    'trunk/file.xml',
    # Edge cases
    'branches/test-branch/',        # non-semver - should NOT match
    'branches/my-feature/'          # non-semver - should NOT match
)

Write-Host "Testing Scenario 6 regex against typical svnlook changed paths:" -ForegroundColor Cyan
Write-Host "Regex: $regex6`n"

foreach ($path in $testPaths) {
    $matchesS6 = $path -match $regex6
    $matchesFile = $path -match $fileChangesRegex
    $s6Color = if ($matchesS6) { 'Green' } else { 'Yellow' }
    $note = ''
    if ($path -match 'branches/[^/]+/[^/]+' -or $path -match 'trunk/[^/]+') {
        $note = ' (child file)'
    }
    Write-Host "  [$path]$note" -NoNewline
    Write-Host "  -> Scenario6=$matchesS6  FileChanges=$matchesFile" -ForegroundColor $s6Color
}
