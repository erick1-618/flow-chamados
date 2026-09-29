package com.flow.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterServiceTest {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new RateLimiterService();
    }

    @Test
    @DisplayName("Deve permitir primeira criação de chamado normalmente")
    void testAllowsFirstTicket() {
        assertDoesNotThrow(() -> rateLimiterService.checkTicketCreationRateLimit("192.168.1.10", "usuario@teste.com"));
    }

    @Test
    @DisplayName("Deve bloquear por cooldown chamadas em sequência rápida do mesmo IP")
    void testBlocksFastConsecutiveTicketsFromSameIp() {
        rateLimiterService.checkTicketCreationRateLimit("192.168.1.10", "usuario1@teste.com");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                rateLimiterService.checkTicketCreationRateLimit("192.168.1.10", "usuario2@teste.com")
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertTrue(ex.getReason().contains("aguarde alguns instantes"));
    }
}
