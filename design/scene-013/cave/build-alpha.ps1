param([string]$ProjectRoot = 'D:\projects\OneMoreDayGame')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
# Deterministic packaging of imagegen-authored chroma-key assets. Never remove
# neutral whites: diary paper, stone highlights and hammer metal must remain.
foreach ($asset in @('wall','hammer','cache','vine')) {
  $inputPath = Join-Path $ProjectRoot "design/scene-013/cave/$asset-source.png"
  $outputPath = Join-Path $ProjectRoot "public/assets/scene-013/cave/$asset-alpha.png"
  $source = [System.Drawing.Bitmap]::new($inputPath)
  $target = [System.Drawing.Bitmap]::new($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $transparentCount = 0
  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      $pixel = $source.GetPixel($x, $y)
      if ($pixel.R -gt 80 -and $pixel.B -gt 80 -and $pixel.G -lt 95 -and $pixel.R -gt ($pixel.G * 2.3) -and $pixel.B -gt ($pixel.G * 2.3)) {
        $target.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(0,0,0,0))
        $transparentCount++
      } else {
        $target.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(255,$pixel.R,$pixel.G,$pixel.B))
      }
    }
  }
  if ($transparentCount -lt ($source.Width * $source.Height * 0.25)) { throw "Chroma-key source failed: $asset" }
  $target.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "$asset : $($source.Width)x$($source.Height), transparent pixels $transparentCount"
  $source.Dispose()
  $target.Dispose()
}
