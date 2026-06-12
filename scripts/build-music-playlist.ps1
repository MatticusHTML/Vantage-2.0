# Build assets/audio album folders + data/music/playlist.json
$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$audioRoot = Join-Path $repo "assets\audio"
$dl = Join-Path $env:USERPROFILE "Desktop\Firefox Downloads"
$playlistPath = Join-Path $repo "data\music\playlist.json"

$newAlbums = @(
    @{ id = "y4";    label = "Year 4";        folder = "Tom Clancy's Rainbow Six - Siege - Year 4 (2020)"; zip = "Tom Clancy's Rainbow Six - Siege - Year 4 (2020).zip" }
    @{ id = "y5";    label = "Year 5";        folder = "Tom Clancy's Rainbow Six - Siege - Year 5 (2021)"; zip = "Tom Clancy's Rainbow Six - Siege - Year 5 (2021).zip" }
    @{ id = "y6";    label = "Year 6";        folder = "Tom Clancy's Rainbow Six - Siege - Year 6 (2022)"; zip = "Tom Clancy's Rainbow Six - Siege - Year 6 (2022).zip" }
    @{ id = "y7";    label = "Year 7";        folder = "Tom Clancy's Rainbow Six - Siege - Year 7 (2022)"; zip = "Tom Clancy's Rainbow Six - Siege - Year 7 (2022).zip" }
    @{ id = "y8";    label = "Year 8";        folder = "Tom Clancy's Rainbow Six - Siege - Year 8 - Original Game Soundtrack (2024)"; zip = "Tom Clancy's Rainbow Six - Siege - Year 8 - Original Game Soundtrack (2024).zip" }
    @{ id = "y9";    label = "Year 9";        folder = "Rainbow Six Siege - Year 9 (Original Music from the Rainbow Six Siege Series) (2025)"; zip = "Rainbow Six Siege - Year 9 (Original Music from the Rainbow Six Siege Series) (2025).zip" }
    @{ id = "siegex"; label = "Siege X";      folder = "Rainbow Six - Siege X (Original Game Soundtrack) (2025)"; zip = "Rainbow Six - Siege X (Original Game Soundtrack) (2025).zip" }
    @{ id = "lofi";   label = "PostMatch Lo-Fi"; folder = "PostMatch Lo-Fi Music (Inspired by the Rainbow Six Siege Game Universe) (2021)"; zip = "PostMatch Lo-Fi Music (Inspired by the Rainbow Six Siege Game Universe) (2021).zip" }
)

$allAlbums = @(
    @{ id = "y1";        label = "Year 1";        folder = "Tom Clancy's Rainbow Six - Siege - Year 1 (2020)" }
    @{ id = "y2";        label = "Year 2";        folder = "Tom Clancy's Rainbow Six - Siege - Year 2 (2020)" }
    @{ id = "y3";        label = "Year 3";        folder = "Tom Clancy's Rainbow Six - Siege - Year 3 (2019)(1)" }
    @{ id = "y4";        label = "Year 4";        folder = "Tom Clancy's Rainbow Six - Siege - Year 4 (2020)" }
    @{ id = "y5";        label = "Year 5";        folder = "Tom Clancy's Rainbow Six - Siege - Year 5 (2021)" }
    @{ id = "y6";        label = "Year 6";        folder = "Tom Clancy's Rainbow Six - Siege - Year 6 (2022)" }
    @{ id = "y7";        label = "Year 7";        folder = "Tom Clancy's Rainbow Six - Siege - Year 7 (2022)" }
    @{ id = "y8";        label = "Year 8";        folder = "Tom Clancy's Rainbow Six - Siege - Year 8 - Original Game Soundtrack (2024)" }
    @{ id = "y9";        label = "Year 9";        folder = "Rainbow Six Siege - Year 9 (Original Music from the Rainbow Six Siege Series) (2025)" }
    @{ id = "siegex";    label = "Siege X";       folder = "Rainbow Six - Siege X (Original Game Soundtrack) (2025)" }
    @{ id = "lofi";      label = "PostMatch Lo-Fi"; folder = "PostMatch Lo-Fi Music (Inspired by the Rainbow Six Siege Game Universe) (2021)" }
    @{ id = "cunderrock"; label = "CunderRock";   folder = "Cunders Picks"; manualOnly = $true }
)

function Get-TrackId([string]$relPath) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($relPath)
    $hash = $md5.ComputeHash($bytes)
    $md5.Dispose()
    return ([BitConverter]::ToString($hash) -replace "-", "").Substring(0, 8).ToLower()
}

function Get-RelFromFolder([string]$folderPath, [string]$folderName, [string]$fullPath) {
    $rel = $fullPath.Substring($folderPath.Length).TrimStart("\", "/")
    return "$folderName/$($rel.Replace('\','/'))"
}

function Normalize-AlbumCover([string]$folderPath) {
    $imagesDir = Join-Path $folderPath "Images"
    $front = Join-Path $imagesDir "00 Front.jpg"
    if (Test-Path $front) { return }
    New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null
    $rootImg = Get-ChildItem $folderPath -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | Select-Object -First 1
    if ($rootImg) {
        Copy-Item $rootImg.FullName $front -Force
        Remove-Item $rootImg.FullName -Force
        return
    }
    $subImg = Get-ChildItem $imagesDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } | Select-Object -First 1
    if ($subImg -and $subImg.Name -ne "00 Front.jpg") {
        Copy-Item $subImg.FullName $front -Force
    }
}

function Get-CoverRel([string]$folderPath, [string]$folderName) {
    Normalize-AlbumCover $folderPath
    $front = Join-Path $folderPath "Images\00 Front.jpg"
    if (Test-Path $front) { return Get-RelFromFolder $folderPath $folderName $front }
    $candidates = @("cover.jpg", "coverart.jpg") | ForEach-Object { Join-Path $folderPath $_ }
    foreach ($c in $candidates) {
        if (Test-Path $c) { return Get-RelFromFolder $folderPath $folderName $c }
    }
    return $null
}

function Parse-Title([string]$fileName) {
    if ($fileName -match '^\d+\.\s*(.+)\.mp3$') { return $Matches[1].Trim() }
    return [System.IO.Path]::GetFileNameWithoutExtension($fileName)
}

# Clean loose files dumped at audio root by bulk extract
Get-ChildItem $audioRoot -File | Where-Object {
    $_.Extension -in @(".mp3", ".jpg", ".jpeg", ".png") -and $_.Name -ne "DOKKAEBI_HACKING.mp3"
} | Remove-Item -Force
if (Test-Path (Join-Path $audioRoot "khinsider.info.txt")) { Remove-Item (Join-Path $audioRoot "khinsider.info.txt") -Force }
if (Test-Path (Join-Path $audioRoot "Images")) { Remove-Item (Join-Path $audioRoot "Images") -Recurse -Force }

# Extract + normalize new albums
foreach ($a in $newAlbums) {
    $dest = Join-Path $audioRoot $a.folder
    $zipPath = Join-Path $dl $a.zip
    if (-not (Test-Path $zipPath)) { Write-Warning "Missing zip: $zipPath"; continue }
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $dest -Force

    Get-ChildItem $dest -File -Filter "khinsider*" -ErrorAction SilentlyContinue | Remove-Item -Force
    Normalize-AlbumCover $dest
    Write-Host "OK $($a.label): $((Get-ChildItem $dest -Filter '*.mp3').Count) tracks"
}

# CunderRock cover
$cunderCover = Join-Path $audioRoot "Cunders Picks\Cunders Album Cover.png"
if (-not (Test-Path $cunderCover)) { Write-Warning "CunderRock cover missing" }

$tracks = @()
$albumsOut = @()

foreach ($a in $allAlbums) {
    $folderPath = Join-Path $audioRoot $a.folder
    if (-not (Test-Path $folderPath)) { Write-Warning "Missing folder: $($a.folder)"; continue }
    if ($a.id -ne "cunderrock") { Normalize-AlbumCover $folderPath }

    $coverRel = if ($a.id -eq "cunderrock") { "Cunders Picks/Cunders Album Cover.png" } else { Get-CoverRel $folderPath $a.folder }
    $mp3s = Get-ChildItem $folderPath -Filter "*.mp3" -File | Sort-Object Name

    $albumEntry = @{
        id    = $a.id
        label = $a.label
        count = $mp3s.Count
    }
    if ($coverRel) { $albumEntry.cover = $coverRel.Replace("\", "/") }
    if ($a.manualOnly) { $albumEntry.manualOnly = $true }
    $albumsOut += $albumEntry

    foreach ($f in $mp3s) {
        $relFile = ($a.folder + "\" + $f.Name).Replace("\", "/")
        $tracks += @{
            id         = Get-TrackId $relFile
            album      = $a.id
            albumLabel = $a.label
            title      = Parse-Title $f.Name
            file       = $relFile
            cover      = $(if ($coverRel) { $coverRel.Replace("\", "/") } else { $null })
        }
    }
}

# Preserve stable CunderRock ids from prior playlist
$cunderIds = @{
    "Cunders Picks/Dope Band - Die MF Die.mp3" = "cunder-die-mf"
    "Cunders Picks/Let The Bodies Hit The Floor.mp3" = "cunder-bodies"
    "Cunders Picks/Mega Man X OST - T17 Storm Eagle (Sky Stage).mp3" = "cunder-storm-eagle"
}
foreach ($t in $tracks) {
    if ($cunderIds.ContainsKey($t.file)) { $t.id = $cunderIds[$t.file] }
}

$playlist = @{
    updated      = (Get-Date -Format "MMM d, yyyy") + " · evening PT"
    defaultTrack = "3aa63d76"
    albums       = $albumsOut
    tracks       = $tracks
}

$json = $playlist | ConvertTo-Json -Depth 6
# PowerShell emits \u0027 for apostrophes — decode for readability
$json = [Regex]::Replace($json, '\\u([0-9A-Fa-f]{4})', { [char][int]('0x' + $args[0].Groups[1].Value) })
$json | Set-Content $playlistPath -Encoding UTF8

Write-Host "playlist.json: $($albumsOut.Count) albums, $($tracks.Count) tracks"
