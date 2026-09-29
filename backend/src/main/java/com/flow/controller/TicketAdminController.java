package com.flow.controller;

import com.flow.dto.CreateMessageRequest;
import com.flow.dto.CreateTicketRequest;
import com.flow.dto.MessageResponse;
import com.flow.dto.TicketResponse;
import com.flow.model.Message;
import com.flow.model.Ticket;
import com.flow.model.TicketStatus;
import com.flow.service.TicketService;
import com.flow.service.TrelloService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.flow.security.AdminBruteForceService;
import com.flow.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/tickets")
public class TicketAdminController {

    private final TicketService ticketService;
    private final TrelloService trelloService;
    private final AdminBruteForceService adminBruteForceService;
    private final HttpServletRequest request;

    @Value("${app.admin-api-key:flow-admin-secret-2026}")
    private String expectedAdminKey;

    public TicketAdminController(
            TicketService ticketService,
            TrelloService trelloService,
            AdminBruteForceService adminBruteForceService,
            HttpServletRequest request
    ) {
        this.ticketService = ticketService;
        this.trelloService = trelloService;
        this.adminBruteForceService = adminBruteForceService;
        this.request = request;
    }

    private void checkAdminAuth(String providedKey) {
        String clientIp = ClientIpResolver.getClientIp(request);
        adminBruteForceService.checkIpBlocked(clientIp);

        if (providedKey == null || !providedKey.equals(expectedAdminKey)) {
            adminBruteForceService.recordFailedAttempt(clientIp);
        } else {
            adminBruteForceService.recordSuccessfulAttempt(clientIp);
        }
    }

    @GetMapping
    public ResponseEntity<List<TicketResponse>> listTickets(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dataFim,
            @RequestParam(required = false) String search
    ) {
        checkAdminAuth(adminKey);
        List<Ticket> tickets = ticketService.listTicketsForAdmin(status, dataInicio, dataFim, search);
        List<TicketResponse> response = tickets.stream().map(TicketResponse::new).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable Long id
    ) {
        checkAdminAuth(adminKey);
        Ticket ticket = ticketService.findById(id);
        return ResponseEntity.ok(new TicketResponse(ticket));
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicketManually(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @Valid @RequestBody CreateTicketRequest request
    ) {
        checkAdminAuth(adminKey);
        Ticket ticket = ticketService.createTicket(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new TicketResponse(ticket));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageResponse> addAdminMessage(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable Long id,
            @Valid @RequestBody CreateMessageRequest request
    ) {
        checkAdminAuth(adminKey);
        Message message = ticketService.addAdminMessage(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new MessageResponse(message));
    }

    @PostMapping("/setup-trello-webhook")
    public ResponseEntity<Map<String, Object>> setupTrelloWebhook(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey
    ) {
        checkAdminAuth(adminKey);
        boolean success = trelloService.setupWebhook();
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "Webhook registrado com sucesso no Trello!" : "Falha ao registrar webhook. Verifique credenciais."
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteTicket(
            @RequestHeader(value = "X-Admin-Key", required = false) String adminKey,
            @PathVariable Long id
    ) {
        checkAdminAuth(adminKey);
        ticketService.deleteTicket(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Chamado e mensagens associadas excluídos com sucesso."
        ));
    }
}
