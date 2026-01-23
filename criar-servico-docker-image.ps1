# Script para criar serviço Render usando Docker Image oficial
# Esta é a solução mais confiável

Write-Host "Criando servico Render com Docker Image oficial..." -ForegroundColor Cyan
Write-Host ""

Write-Host "IMPORTANTE: Este script cria um NOVO servico." -ForegroundColor Yellow
Write-Host "Se voce ja tem um servico, delete-o primeiro no Render." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Deseja continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Para criar o servico via API, voce precisa:" -ForegroundColor Yellow
Write-Host "1. Service Group ID (ou criar um novo)" -ForegroundColor Gray
Write-Host "2. Render API Key" -ForegroundColor Gray
Write-Host ""

Write-Host "ALTERNATIVA MAIS SIMPLES:" -ForegroundColor Cyan
Write-Host "Crie manualmente no dashboard:" -ForegroundColor White
Write-Host ""
Write-Host "1. Acesse: https://dashboard.render.com" -ForegroundColor Gray
Write-Host "2. Clique em 'New +' -> 'Web Service'" -ForegroundColor Gray
Write-Host "3. Selecione 'Docker' (nao 'Public Git repository')" -ForegroundColor Gray
Write-Host "4. Em 'Docker Image', digite: atendai/evolution-api:latest" -ForegroundColor Gray
Write-Host "5. Clique em 'Apply'" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Configure:" -ForegroundColor Yellow
Write-Host "   - Name: evolution-api" -ForegroundColor Gray
Write-Host "   - Region: Escolha a mais proxima" -ForegroundColor Gray
Write-Host "   - Instance Type: Free" -ForegroundColor Gray
Write-Host "   - Docker Command: DEIXE VAZIO" -ForegroundColor Gray
Write-Host ""
Write-Host "7. Adicione estas variaveis de ambiente:" -ForegroundColor Yellow
Write-Host "   AUTHENTICATION_API_KEY=testdaapi2026" -ForegroundColor Gray
Write-Host "   CORS_ORIGIN=*" -ForegroundColor Gray
Write-Host "   DATABASE_ENABLED=false" -ForegroundColor Gray
Write-Host "   DATABASE_PROVIDER=postgresql" -ForegroundColor Gray
Write-Host "   REDIS_ENABLED=false" -ForegroundColor Gray
Write-Host "   PORT=8080" -ForegroundColor Gray
Write-Host ""
Write-Host "8. Clique em 'Create Web Service'" -ForegroundColor Gray
Write-Host ""
Write-Host "9. Aguarde status ficar 'Live' (3-5 minutos)" -ForegroundColor Gray
Write-Host ""

Write-Host "Veja o guia completo: SOLUCAO_DEFINITIVA_RENDER.md" -ForegroundColor Cyan
Write-Host ""
