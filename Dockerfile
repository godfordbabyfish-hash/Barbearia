# Dockerfile wrapper para Evolution API
# Permite que migrations rodem automaticamente

FROM atendai/evolution-api:v2.1.1

WORKDIR /evolution

# Configurar variáveis de ambiente para garantir que escute em 0.0.0.0:8080
ENV SERVER_PORT=8080
ENV SERVER_URL=https://evolution-api-barbearia.fly.dev
ENV PORT=8080

# Usa o entrypoint padrão da Evolution API que roda migrations automaticamente
# Não sobrescrevemos mais - deixamos a Evolution API gerenciar suas próprias migrations
