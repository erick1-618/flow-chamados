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
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    // Configurações de Anti-Flooding para abertura de chamados
    private static final int MAX_TICKETS_PER_IP = 5;
    private static final Duration WINDOW_DURATION = Duration.ofMinutes(10);
    private static final Duration MIN_INTERVAL_PER_IP = Duration.ofSeconds(5);
    private static final int MAX_TICKETS_PER_EMAIL = 5;

    // Histórico de timestamps por IP e por E-mail
    private final Map<String, Deque<Instant>> ipHistory = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> emailHistory = new ConcurrentHashMap<>();

    /**
     * Valida e consome uma tentativa de criação de chamado.
     * Lança ResponseStatusException com status 429 se exceder os limites.
     */
    public synchronized void checkTicketCreationRateLimit(String clientIp, String email) {
        Instant now = Instant.now();

        // 1. Validação por IP
        if (clientIp != null && !clientIp.isBlank()) {
            Deque<Instant> timestamps = ipHistory.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
            pruneExpired(timestamps, now, WINDOW_DURATION);

            // Cooldown mínimo (evita scripts/loops rápidos)
            if (!timestamps.isEmpty()) {
                Instant lastAttempt = timestamps.peekLast();
                if (lastAttempt != null && Duration.between(lastAttempt, now).compareTo(MIN_INTERVAL_PER_IP) < 0) {
                    log.warn("Flooding detectado: IP {} tentou criar chamado em menos de {}s.", clientIp, MIN_INTERVAL_PER_IP.toSeconds());
                    throw new ResponseStatusException(
                            HttpStatus.TOO_MANY_REQUESTS,
                            "Por favor, aguarde alguns instantes antes de enviar uma nova solicitação."
                    );
                }
            }

            // Limite de volume na janela de tempo
            if (timestamps.size() >= MAX_TICKETS_PER_IP) {
                log.warn("Rate limit excedido: IP {} atingiu limite de {} chamados em {} minutos.", clientIp, MAX_TICKETS_PER_IP, WINDOW_DURATION.toMinutes());
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Muitos chamados foram abertos recentemente a partir deste endereço. Por favor, aguarde " + WINDOW_DURATION.toMinutes() + " minutos antes de tentar novamente."
                );
            }
        }

        // 2. Validação por E-mail
        if (email != null && !email.isBlank()) {
            String normalizedEmail = email.trim().toLowerCase();
            Deque<Instant> timestamps = emailHistory.computeIfAbsent(normalizedEmail, k -> new ArrayDeque<>());
            pruneExpired(timestamps, now, WINDOW_DURATION);

            if (timestamps.size() >= MAX_TICKETS_PER_EMAIL) {
                log.warn("Rate limit excedido: E-mail {} atingiu limite de {} chamados em {} minutos.", normalizedEmail, MAX_TICKETS_PER_EMAIL, WINDOW_DURATION.toMinutes());
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Muitos chamados foram abertos recentemente para este e-mail. Por favor, aguarde alguns minutos antes de tentar novamente."
                );
            }
        }

        // Registra o timestamp atual
        if (clientIp != null && !clientIp.isBlank()) {
            ipHistory.computeIfAbsent(clientIp, k -> new ArrayDeque<>()).addLast(now);
        }
        if (email != null && !email.isBlank()) {
            emailHistory.computeIfAbsent(email.trim().toLowerCase(), k -> new ArrayDeque<>()).addLast(now);
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
     * Limpeza periódica em segundo plano para liberar memória de IPs/e-mails inativos.
     */
    @Scheduled(fixedRate = 600000) // a cada 10 minutos
    public synchronized void cleanupOldRecords() {
        Instant now = Instant.now();
        ipHistory.entrySet().removeIf(entry -> {
            pruneExpired(entry.getValue(), now, WINDOW_DURATION);
            return entry.getValue().isEmpty();
        });
        emailHistory.entrySet().removeIf(entry -> {
            pruneExpired(entry.getValue(), now, WINDOW_DURATION);
            return entry.getValue().isEmpty();
        });
    }
}
