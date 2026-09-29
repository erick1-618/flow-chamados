package com.flow.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class AdminBruteForceServiceTest {

    private AdminBruteForceService bruteForceService;

    @BeforeEach
    void setUp() {
        bruteForceService = new AdminBruteForceService();
    }

    @Test
    @DisplayName("Deve permitir tentativas iniciais informando tentativas restantes com 401")
    void testFailedAttemptDecrementsRemaining() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                bruteForceService.recordFailedAttempt("10.0.0.1")
        );
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Tentativas restantes antes do bloqueio: 4"));
    }

    @Test
    @DisplayName("Deve bloquear IP por 15 minutos e retornar 429 após 5 falhas")
    void testBlocksIpAfterMaxFailedAttempts() {
        String ip = "10.0.0.2";

        for (int i = 0; i < 4; i++) {
            assertThrows(ResponseStatusException.class, () -> bruteForceService.recordFailedAttempt(ip));
        }

        // 5ª tentativa: bloqueio imediato
        ResponseStatusException ex5 = assertThrows(ResponseStatusException.class, () ->
                bruteForceService.recordFailedAttempt(ip)
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex5.getStatusCode());
        assertTrue(ex5.getReason().contains("bloqueado temporariamente por 15 minutos"));

        // Próxima chamada é rejeitada pelo checkIpBlocked
        ResponseStatusException exBlocked = assertThrows(ResponseStatusException.class, () ->
                bruteForceService.checkIpBlocked(ip)
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exBlocked.getStatusCode());
        assertTrue(exBlocked.getReason().contains("bloqueado temporariamente por suspeita de força bruta"));
    }

    @Test
    @DisplayName("Deve resetar tentativas falhas após sucesso de autenticação")
    void testResetsAttemptsOnSuccess() {
        String ip = "10.0.0.3";
        assertThrows(ResponseStatusException.class, () -> bruteForceService.recordFailedAttempt(ip));
        assertThrows(ResponseStatusException.class, () -> bruteForceService.recordFailedAttempt(ip));

        bruteForceService.recordSuccessfulAttempt(ip);

        // Nova tentativa falha deve contar como primeira (restantes: 4)
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                bruteForceService.recordFailedAttempt(ip)
        );
        assertTrue(ex.getReason().contains("Tentativas restantes antes do bloqueio: 4"));
    }
}
