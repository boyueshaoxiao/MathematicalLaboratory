$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
$outDir = 'd:\github\geometry-space-lab-unfold-v2\_shots'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$cases = @(
  @{ n = 'cube-crossA-p1';  u = '?view=unfold&type=cube&pattern=crossA&p=1' },
  @{ n = 'cube-crossB-p1';  u = '?view=unfold&type=cube&pattern=crossB&p=1' },
  @{ n = 'cube-crossB-p05'; u = '?view=unfold&type=cube&pattern=crossB&p=0.5' },
  @{ n = 'cube-crossB-p0';  u = '?view=unfold&type=cube&pattern=crossB&p=0' },
  @{ n = 'cube-strip-p1';   u = '?view=unfold&type=cube&pattern=strip&p=1' },
  @{ n = 'cube-crossA-p03'; u = '?view=unfold&type=cube&pattern=crossA&p=0.35' },
  @{ n = 'cuboid-A-p1';     u = '?view=unfold&type=cuboid&pattern=cuboidA&p=1' },
  @{ n = 'cuboid-B-p1';     u = '?view=unfold&type=cuboid&pattern=cuboidB&p=1' },
  @{ n = 'prism-triA-p1';   u = '?view=unfold&type=triangularPrism&pattern=triA&p=1' },
  @{ n = 'prism-triA-p0';   u = '?view=unfold&type=triangularPrism&pattern=triA&p=0' },
  @{ n = 'prism-triB-p1';   u = '?view=unfold&type=triangularPrism&pattern=triB&p=1' },
  @{ n = 'pyramid-A-p1';    u = '?view=unfold&type=squarePyramid&pattern=pyramidA&p=1' },
  @{ n = 'pyramid-A-p0';    u = '?view=unfold&type=squarePyramid&pattern=pyramidA&p=0' },
  @{ n = 'pyramid-B-p1';    u = '?view=unfold&type=squarePyramid&pattern=pyramidB&p=1' },
  @{ n = 'cylinder-A-p1';   u = '?view=unfold&type=cylinder&pattern=cylinderA&p=1' },
  @{ n = 'cylinder-A-p05';  u = '?view=unfold&type=cylinder&pattern=cylinderA&p=0.5' },
  @{ n = 'cylinder-A-p0';   u = '?view=unfold&type=cylinder&pattern=cylinderA&p=0' },
  @{ n = 'cylinder-B-p1';   u = '?view=unfold&type=cylinder&pattern=cylinderB&p=1' },
  @{ n = 'cone-A-p1';       u = '?view=unfold&type=cone&pattern=coneA&p=1' },
  @{ n = 'cone-A-p05';      u = '?view=unfold&type=cone&pattern=coneA&p=0.5' },
  @{ n = 'cone-A-p0';       u = '?view=unfold&type=cone&pattern=coneA&p=0' },
  @{ n = 'cone-B-p1';       u = '?view=unfold&type=cone&pattern=coneB&p=1' },
  @{ n = 'tetra-A-p1';      u = '?view=unfold&type=triangularPyramid&pattern=tetraA&p=1' },
  @{ n = 'tetra-A-p05';     u = '?view=unfold&type=triangularPyramid&pattern=tetraA&p=0.5' },
  @{ n = 'tetra-A-p0';      u = '?view=unfold&type=triangularPyramid&pattern=tetraA&p=0' },
  @{ n = 'tetra-B-p1';      u = '?view=unfold&type=triangularPyramid&pattern=tetraB&p=1' },
  @{ n = 'tetra-B-p0';      u = '?view=unfold&type=triangularPyramid&pattern=tetraB&p=0' }
)

foreach ($c in $cases) {
  $file = Join-Path $outDir ($c.n + '.png')
  $url = 'http://localhost:5174/' + $c.u
  Write-Host ("capture " + $c.n)
  & $chrome --headless=new --disable-gpu --enable-unsafe-swiftshader `
    --screenshot=$file --window-size=1500,940 --hide-scrollbars `
    --virtual-time-budget=4000 $url 2>$null | Out-Null
  Start-Sleep -Milliseconds 300
}
Write-Host 'done'
