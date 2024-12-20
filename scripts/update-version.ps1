param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('major', 'minor', 'patch')]
    [string]$VersionType
)

# Read package.json
$packageJson = Get-Content -Path "./package.json" -Raw | ConvertFrom-Json

# Parse current version
$version = $packageJson.version
$versionParts = $version -split '\.'
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Update version based on type
switch ($VersionType) {
    'major' {
        $major++
        $minor = 0
        $patch = 0
    }
    'minor' {
        $minor++
        $patch = 0
    }
    'patch' {
        $patch++
    }
}

# Create new version string
$newVersion = "$major.$minor.$patch"

# Update package.json
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 100 | Set-Content -Path "./package.json"

# Output the new version
Write-Host "Version updated to $newVersion"

# Create git tag
git tag -a "v$newVersion" -m "Version $newVersion"
git push origin "v$newVersion"
