package com.flow.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.flow.service.TicketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks/trello")
public class TrelloWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TrelloWebhookController.class);
    private final TicketService ticketService;

    public TrelloWebhookController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @RequestMapping(method = {RequestMethod.HEAD, RequestMethod.GET})
    public ResponseEntity<Void> verifyWebhook() {
        log.info("Handshake do Trello Webhook (HEAD/GET) recebido com sucesso.");
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<String> handleWebhook(@RequestBody(required = false) JsonNode payload) {
        if (payload == null || !payload.has("action")) {
            return ResponseEntity.ok("Ignorado: Payload sem action");
        }

        try {
            JsonNode action = payload.path("action");
            JsonNode data = action.path("data");

            boolean isListChange = false;
            String listAfterId = null;

            if (data.has("listAfter") && data.path("listAfter").has("id")) {
                listAfterId = data.path("listAfter").path("id").asText();
                isListChange = true;
            } else if (data.has("card") && data.path("card").has("idList")) {
                listAfterId = data.path("card").path("idList").asText();
                isListChange = true;
            }

            if (isListChange && listAfterId != null) {
                String cardId = data.path("card").path("id").asText(null);
                String cardName = data.path("card").path("name").asText(null);

                boolean updated = ticketService.syncStatusFromTrello(cardId, cardName, listAfterId);
                return ResponseEntity.ok(updated ? "Status atualizado com sucesso" : "Processado sem alteracao");
            }

            return ResponseEntity.ok("Acao ignorada: nao e transicao de lista");
        } catch (Exception ex) {
            log.error("Erro ao processar webhook do Trello: {}", ex.getMessage(), ex);
            return ResponseEntity.ok("Erro capturado");
        }
    }
}
