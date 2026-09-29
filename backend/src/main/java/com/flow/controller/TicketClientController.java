package com.flow.controller;

import com.flow.dto.*;
import com.flow.model.Message;
import com.flow.model.Ticket;
import com.flow.service.TicketService;
import com.flow.security.ClientIpResolver;
import com.flow.security.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tickets")
public class TicketClientController {

    private final TicketService ticketService;
    private final RateLimiterService rateLimiterService;

    public TicketClientController(TicketService ticketService, RateLimiterService rateLimiterService) {
        this.ticketService = ticketService;
        this.rateLimiterService = rateLimiterService;
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestBody CreateTicketRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = ClientIpResolver.getClientIp(httpRequest);
        rateLimiterService.checkTicketCreationRateLimit(clientIp, request.getSolicitanteEmail());

        Ticket ticket = ticketService.createTicket(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new TicketResponse(ticket));
    }

    @PostMapping("/track")
    public ResponseEntity<TicketResponse> trackTicket(@Valid @RequestBody TrackTicketRequest request) {
        Ticket ticket = ticketService.trackTicket(request.getProtocolo(), request.getEmail());
        return ResponseEntity.ok(new TicketResponse(ticket));
    }

    @PostMapping("/{protocolo}/messages")
    public ResponseEntity<MessageResponse> addClientMessage(
            @PathVariable String protocolo,
            @Valid @RequestBody CreateMessageRequest request
    ) {
        Message message = ticketService.addClientMessage(protocolo, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(new MessageResponse(message));
    }
}
