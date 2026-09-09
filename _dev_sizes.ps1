Get-ChildItem 'd:\github\geometry-space-lab-unfold-v2\_shots\*.png' | ForEach-Object { Write-Host ($_.Name + ' ' + $_.Length) }
