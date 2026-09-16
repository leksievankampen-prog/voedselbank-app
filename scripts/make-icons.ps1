# Genereert de app-iconen in de huisstijl (oranje #FF7212 met wit hartsymbool).
# Draaien vanuit de projectmap:  powershell -ExecutionPolicy Bypass -File scripts\make-icons.ps1
# Heb je officiële artwork van de Voedselbank? Overschrijf de bestanden in assets/ gerust.

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$brand = [System.Drawing.ColorTranslator]::FromHtml('#FF7212')

function New-HeartPath([single]$size) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    # Hart in genormaliseerde coördinaten, geschaald naar $size.
    $s = { param($x, $y) New-Object System.Drawing.PointF(($x * $size), ($y * $size)) }
    $p.AddBezier((& $s 0.50 0.88), (& $s 0.12 0.60), (& $s 0.06 0.34), (& $s 0.24 0.21))
    $p.AddBezier((& $s 0.24 0.21), (& $s 0.37 0.12), (& $s 0.47 0.18), (& $s 0.50 0.28))
    $p.AddBezier((& $s 0.50 0.28), (& $s 0.53 0.18), (& $s 0.63 0.12), (& $s 0.76 0.21))
    $p.AddBezier((& $s 0.76 0.21), (& $s 0.94 0.34), (& $s 0.88 0.60), (& $s 0.50 0.88))
    $p.CloseFigure()
    return $p
}

function New-Icon {
    param(
        [string]$Path,
        [int]$Size,
        [string]$Background,   # 'brand', 'white' of 'none'
        [string]$Heart,        # 'white' of 'brand'
        [single]$Inset = 0.62
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    switch ($Background) {
        'brand' { $g.Clear($brand) }
        'white' { $g.Clear([System.Drawing.Color]::White) }
        default { $g.Clear([System.Drawing.Color]::Transparent) }
    }

    $heartSize = [single]($Size * $Inset)
    $offset = [single](($Size - $heartSize) / 2)
    $shape = New-HeartPath $heartSize

    $matrix = New-Object System.Drawing.Drawing2D.Matrix
    $matrix.Translate($offset, $offset)
    $shape.Transform($matrix)

    $color = if ($Heart -eq 'brand') { $brand } else { [System.Drawing.Color]::White }
    $brush = New-Object System.Drawing.SolidBrush($color)
    $g.FillPath($brush, $shape)

    $full = Join-Path $root $Path
    $dir = Split-Path -Parent $full
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $bmp.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)

    $brush.Dispose(); $matrix.Dispose(); $shape.Dispose(); $g.Dispose(); $bmp.Dispose()
    Write-Output "  $Path  ($Size x $Size)"
}

Write-Output 'Iconen genereren:'
New-Icon -Path 'assets\icon.png'              -Size 1024 -Background brand -Heart white
New-Icon -Path 'assets\adaptive-icon.png'     -Size 1024 -Background none  -Heart white -Inset 0.44
New-Icon -Path 'assets\splash.png'            -Size 512  -Background none  -Heart white -Inset 0.80
New-Icon -Path 'assets\favicon.png'           -Size 64   -Background brand -Heart white
New-Icon -Path 'assets\notification-icon.png' -Size 96   -Background none  -Heart white -Inset 0.80
New-Icon -Path 'public\icon-192.png'          -Size 192  -Background brand -Heart white
New-Icon -Path 'public\icon-512.png'          -Size 512  -Background brand -Heart white
New-Icon -Path 'public\badge-72.png'          -Size 72   -Background none  -Heart white -Inset 0.86
Write-Output 'Klaar.'
