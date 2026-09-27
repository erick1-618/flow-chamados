# =====================================================================
# ETAPA 1: Build da aplicação Java (Spring Boot)
# Compila nativamente na máquina de build sem lentidão de emulação
# =====================================================================
FROM --platform=$BUILDPLATFORM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /build

# Cache das dependências do Maven
COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn

RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B

# Compila o .jar do Spring Boot
COPY src ./src
RUN ./mvnw clean package -DskipTests

# =====================================================================
# ETAPA 2: Imagem final multi-arquitetura (Suporte total ARM64 e AMD64)
# =====================================================================
FROM eclipse-temurin:17-jre-jammy AS runner

WORKDIR /app

# Cria usuário não-root (Ubuntu/Debian)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copia apenas o .jar gerado na etapa anterior
COPY --from=builder /build/target/flow-backend-*.jar app.jar

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
