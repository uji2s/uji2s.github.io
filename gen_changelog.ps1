# gen_changelog_multibody.ps1

$categories = @{
    "Changed" = @("fix","update","changed","refactor","cleanup")
    "Fixed"   = @("bug","error","fix","correct")
    "Removed" = @("delete","remove")
}

$outFile = "changelog.md"

# Hent log med date, subject og body
$log = git log --pretty=format:"%ad|%s|%B" --date=short

# Del commits på linje med dato
$commits = $log -split "(?<=\n)(?=\d{4}-\d{2}-\d{2}\|)"

$commitGroups = @{}
foreach ($cat in $categories.Keys) { $commitGroups[$cat] = @() }

foreach ($entry in $commits) {
    $parts = $entry -split "\|",3
    if ($parts.Count -lt 2) { continue }

    $date = $parts[0].Trim()
    $subject = $parts[1].Trim()
    $body = ""
    if ($parts.Count -eq 3) { $body = $parts[2].Trim() }

    # Hopp over commits som starter med "update"
    if ($subject.ToLower().StartsWith("update")) { continue }

    # Fjern subject fra body hvis den er gjentatt
    $body = ($body -split "`n" | Where-Object { $_.Trim() -ne "" -and $_.Trim() -ne $subject }) -join "`n"

    # Finn kategori
    $cat = "Changed"
    foreach ($key in $categories.Keys) {
        foreach ($kw in $categories[$key]) {
            if ($subject.ToLower().Contains($kw)) { 
                $cat = $key
                break
            }
        }
    }

    $commitGroups[$cat] += [PSCustomObject]@{
        date    = $date
        subject = $subject
        body    = $body
    }
}

# Bygg changelog som én streng
$content = ""

foreach ($cat in @("Changed","Fixed","Removed")) {
    if ($commitGroups[$cat].Count -eq 0) { continue }

    $content += "### $cat`n"
    $sorted = $commitGroups[$cat] | Sort-Object {[datetime]$_.date} -Descending

    foreach ($c in $sorted) {
        $dt = (Get-Date $c.date -Format "dd-MM-yyyy")
        $content += "- [$dt] $($c.subject)`n"
        if ($c.body -ne "") {
            foreach ($line in $c.body -split "`n") {
                $content += "    $line`n"
            }
        }
    }
    $content += "`n"  # linjeskift mellom kategorier
}

# Skriv changelog med UTF-8 encoding
Set-Content -Path $outFile -Value $content -Encoding UTF8

Write-Host "Changelog generated to $outFile"
