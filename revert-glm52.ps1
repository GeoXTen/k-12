# Revert GLM-5.2 back to DashScope after3 days
$projectConfig = "C:\Users\purpl\OneDrive\Documents\Github\idk\opencode.json"
$globalConfig = "C:\Users\purpl\.config\opencode\opencode.json"

# Restore project model defaults
$cfg = Get-Content $projectConfig -Raw | ConvertFrom-Json
$cfg.model = "dashscope/qwen3.7-max"
$cfg.small_model = "dashscope/qwen3.6-flash"
$cfg | ConvertTo-Json -Depth 10 | Set-Content $projectConfig -Encoding UTF8

Write-Host "Reverted to DashScope models."

# Remove scheduled task
Unregister-ScheduledTask -TaskName "RevertGLM52" -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed scheduled task."

# Delete this script
Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force
Write-Host "Self-destructed. Done."
