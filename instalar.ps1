# Instalador de 1 comando do agente Panorama — versão .exe (não precisa de
# Node.js na máquina). Roda como PowerShell "Administrador".
#
# Uso:
#   irm https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/instalar.ps1 -OutFile instalar.ps1
#   .\instalar.ps1 -Token "TOKEN_GERADO_NO_CADASTRO"
#
# O que faz:
#   1. Baixa o panorama-agent.exe do próprio painel.
#   2. Grava config.json com o token e a URL da API.
#   3. Registra uma Tarefa Agendada do Windows para rodar no boot, em segundo
#      plano, reiniciando sozinha se cair — sem precisar de NSSM nem de
#      nenhuma outra ferramenta extra.

param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$ApiUrl = "https://painel.panoramahc.com.br/api",
    [string]$InstallDir = "C:\Program Files\PanoramaAgent"
)

$ErrorActionPreference = "Stop"

Write-Host "[instalador] Criando pasta $InstallDir ..."
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$exeUrl = "https://painel.panoramahc.com.br/agente-download/panorama-agent.exe"
$exePath = Join-Path $InstallDir "panorama-agent.exe"

Write-Host "[instalador] Baixando o agente de $exeUrl ..."
Invoke-WebRequest -Uri $exeUrl -OutFile $exePath

$config = @{
    apiUrl     = $ApiUrl
    token      = $Token
    intervalMs = 60000
} | ConvertTo-Json

Set-Content -Path (Join-Path $InstallDir "config.json") -Value $config -Encoding UTF8
Write-Host "[instalador] config.json gravado."

Write-Host "[instalador] Testando o agente manualmente por alguns segundos..."
$proc = Start-Process -FilePath $exePath -WorkingDirectory $InstallDir -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8
if ($proc.HasExited) {
    Write-Warning "[instalador] O agente encerrou sozinho — algo deu errado. Rode manualmente para ver o erro:`n  cd '$InstallDir'; .\panorama-agent.exe"
    exit 1
}
Stop-Process -Id $proc.Id -Force
Write-Host "[instalador] Teste OK. Registrando como tarefa agendada (roda no boot, reinicia sozinha)..."

$taskName = "PanoramaAgent"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute $exePath -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Write-Host ""
Write-Host "[instalador] Pronto. Tarefa '$taskName' criada e rodando."
Write-Host "Verifique em: Agendador de Tarefas (taskschd.msc) > Biblioteca do Agendador de Tarefas > $taskName"
