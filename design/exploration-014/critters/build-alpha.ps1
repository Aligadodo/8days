param([string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Bitmap]::new((Join-Path $ProjectRoot 'design/exploration-014/critters/keyed-source.png'))
$target = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$transparentCount = 0
for ($y = 0; $y -lt $source.Height; $y++) {
  for ($x = 0; $x -lt $source.Width; $x++) {
    $pixel = $source.GetPixel($x, $y)
    if ($pixel.R -gt 80 -and $pixel.B -gt 80 -and $pixel.G -lt 100 -and $pixel.R -gt ($pixel.G * 2.3) -and $pixel.B -gt ($pixel.G * 2.3)) {
      $target.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0,0,0,0)); $transparentCount++
    } else { $target.SetPixel($x, $y, $pixel) }
  }
}
if ($transparentCount -lt $source.Width * $source.Height * .4) { throw 'Expected technical magenta field, refused uncertain background removal.' }
$target.Save((Join-Path $ProjectRoot 'public/assets/sprites/critters.png'), [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "RGBA $($target.Width)x$($target.Height); transparent pixels: $transparentCount"
$source.Dispose(); $target.Dispose()
