# =====================================================================
# ETAPA 1: Build da aplicação Java (Spring Boot)
# =====================================================================
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /build

# 1. Cache inteligente das dependências do Maven
COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn

# Baixa dependências offline para acelerar builds subsequentes
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B

# 2. Copia o código-fonte e compila o .jar final
COPY src ./src
RUN ./mvnw clean package -DskipTests

# =====================================================================
# ETAPA 2: Imagem final leve de execução (JRE Slim)
# =====================================================================
FROM eclipse-temurin:17-jre-alpine AS runner

WORKDIR /app

# Cria usuário não-root para segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia apenas o .jar gerado na etapa anterior
COPY --from=builder /build/target/flow-backend-*.jar app.jar

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
