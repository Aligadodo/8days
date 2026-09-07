# Generated atlas ingestion only: remove the saturated magenta matte returned by imagegen.
# Keeps all coloured rock pixels and their original RGB; deterministic and repeatable.
param([string]$Source, [string]$Output)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class StoneAtlasAlpha {
  public static void Convert(string input, string output) {
    using (var source = new Bitmap(input))
    using (var target = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
      for (var y = 0; y < source.Height; y++) for (var x = 0; x < source.Width; x++) {
        var p = source.GetPixel(x, y);
        var isMagenta = p.R > 80 && p.B > 80 && p.G < 95 && p.R > p.G * 2.3 && p.B > p.G * 2.3;
        target.SetPixel(x, y, Color.FromArgb(isMagenta ? 0 : 255, p.R, p.G, p.B));
      }
      target.Save(output, ImageFormat.Png);
    }
  }
}
'@
[StoneAtlasAlpha]::Convert($Source, $Output)
