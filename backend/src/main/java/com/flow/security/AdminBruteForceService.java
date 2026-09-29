package com.flow.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminBruteForceService {

    private static final Logger log = LoggerFactory.getLogger(AdminBruteForceService.class);

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration ATTEMPT_WINDOW = Duration.ofMinutes(10);
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    // IPs temporariamente bloqueados e o instante até o qual ficam bloqueados
    private final Map<String, Instant> blockedIps = new ConcurrentHashMap<>();

    // Histórico de tentativas falhas por IP
    private final Map<String, Deque<Instant>> failedAttempts = new ConcurrentHashMap<>();

    /**
     * Verifica se o IP está sob bloqueio temporário por força bruta.
     */
    public synchronized void checkIpBlocked(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) return;

        Instant blockedUntil = blockedIps.get(clientIp);
        if (blockedUntil != null) {
            Instant now = Instant.now();
            if (now.isBefore(blockedUntil)) {
                long minutesLeft = Math.max(1, Duration.between(now, blockedUntil).toMinutes() + 1);
                log.warn("Tentativa de acesso ao admin rejeitada: IP {} está bloqueado por mais {} min.", clientIp, minutesLeft);
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Acesso administrativo bloqueado temporariamente. Tente novamente em " + minutesLeft + " minuto(s)."
                );
            } else {
                // Período de bloqueio encerrou
                blockedIps.remove(clientIp);
                failedAttempts.remove(clientIp);
            }
        }
    }

    /**
     * Registra uma tentativa com chave inválida e aplica o bloqueio caso exceda o limite.
     */
    public synchronized void recordFailedAttempt(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chave de acesso de administrador inválida.");
        }

        Instant now = Instant.now();
        Deque<Instant> attempts = failedAttempts.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        pruneExpired(attempts, now, ATTEMPT_WINDOW);
        attempts.addLast(now);

        int currentFailures = attempts.size();

        if (currentFailures >= MAX_FAILED_ATTEMPTS) {
            Instant blockExpiry = now.plus(LOCK_DURATION);
            blockedIps.put(clientIp, blockExpiry);
            failedAttempts.remove(clientIp);

            log.warn("SEGURANÇA: IP {} bloqueado por {} minutos após {} tentativas inválidas consecutivas no painel admin.",
                    clientIp, LOCK_DURATION.toMinutes(), currentFailures);

            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Múltiplas tentativas inválidas detectadas. Tente novamente em" + LOCK_DURATION.toMinutes() + " minutos."
            );
        } else {
            int remaining = MAX_FAILED_ATTEMPTS - currentFailures;
            log.warn("Tentativa inválida de autenticação admin vinda do IP {}. Tentativas restantes: {}", clientIp, remaining);
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chave de acesso administrativo inválida. Tentativas restantes antes do bloqueio: " + remaining
            );
        }
    }

    /**
     * Limpa tentativas falhas após uma autenticação bem-sucedida.
     */
    public synchronized void recordSuccessfulAttempt(String clientIp) {
        if (clientIp != null) {
            failedAttempts.remove(clientIp);
        }
    }

    private void pruneExpired(Deque<Instant> deque, Instant now, Duration maxAge) {
        while (!deque.isEmpty()) {
            Instant oldest = deque.peekFirst();
            if (oldest != null && Duration.between(oldest, now).compareTo(maxAge) > 0) {
                deque.pollFirst();
            } else {
                break;
            }
        }
    }

    /**
     * Limpeza periódica em segundo plano de bloqueios e contadores expirados.
     */
    @Scheduled(fixedRate = 600000) // a cada 10 minutos
    public synchronized void cleanupOldRecords() {
        Instant now = Instant.now();
        blockedIps.entrySet().removeIf(entry -> now.isAfter(entry.getValue()));
        failedAttempts.entrySet().removeIf(entry -> {
            pruneExpired(entry.getValue(), now, ATTEMPT_WINDOW);
            return entry.getValue().isEmpty();
        });
    }
}
