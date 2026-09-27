package com.flow.service;

import com.flow.model.TicketStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

@Service
public class TrelloService {

    private static final Logger log = LoggerFactory.getLogger(TrelloService.class);
    private static final String TRELLO_API_BASE = "https://api.trello.com/1";

    @Value("${trello.enabled:true}")
    private boolean enabled;

    @Value("${trello.api-key:mock_key}")
    private String apiKey;

    @Value("${trello.token:mock_token}")
    private String token;

    @Value("${trello.board-id:mock_board_id}")
    private String boardId;

    @Value("${trello.webhook-callback-url:http://localhost:8080/api/webhooks/trello}")
    private String webhookCallbackUrl;

    @Value("${trello.lists.criado:list_id_criado}")
    private String listCriadoId;

    @Value("${trello.lists.em-andamento:list_id_em_andamento}")
    private String listEmAndamentoId;

    @Value("${trello.lists.aguardando-acao:list_id_aguardando_acao}")
    private String listAguardandoAcaoId;

    @Value("${trello.lists.finalizado:list_id_finalizado}")
    private String listFinalizadoId;

    private final RestTemplate restTemplate = new RestTemplate();

    public TrelloCardResult createCard(
            String protocolo,
            String titulo,
            String solicitanteNome,
            String solicitanteEmail,
            String descricao
    ) {
        String cardName = String.format("[%s] - %s", protocolo, titulo);
        String cardDesc = String.format(
                "### Chamado %s\n\n" +
                "- **Solicitante:** %s\n" +
                "- **E-mail:** %s\n" +
                "- **Protocolo:** `%s`\n" +
                "- **Criado em:** %s\n\n" +
                "---\n\n" +
                "#### Descrição do Problema:\n%s\n",
                protocolo,
                solicitanteNome,
                solicitanteEmail,
                protocolo,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                descricao
        );

        if (!isConfigured()) {
            log.warn("Trello API não configurada. Modo mock ativado para [{}]", protocolo);
            String mockCardId = "mock_trello_" + protocolo.toLowerCase().replace("-", "_");
            return new TrelloCardResult(mockCardId, listCriadoId, "https://trello.com/c/" + mockCardId);
        }

        try {
            String url = String.format("%s/cards?key=%s&token=%s", TRELLO_API_BASE, apiKey, token);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("idList", listCriadoId);
            body.add("name", cardName);
            body.add("desc", cardDesc);
            body.add("pos", "top");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map bodyMap = response.getBody();
                String cardId = (String) bodyMap.get("id");
                String shortUrl = (String) bodyMap.get("shortUrl");
                String cardUrl = shortUrl != null ? shortUrl : ("https://trello.com/c/" + cardId);
                return new TrelloCardResult(cardId, listCriadoId, cardUrl);
            }
        } catch (Exception ex) {
            log.error("Erro ao criar card no Trello: {}", ex.getMessage());
        }

        String fallbackId = "trello_card_" + protocolo;
        return new TrelloCardResult(fallbackId, listCriadoId, "https://trello.com/c/" + fallbackId);
    }

    public boolean setupWebhook() {
        if (!isConfigured()) return false;
        try {
            String url = String.format("%s/webhooks/?key=%s&token=%s", TRELLO_API_BASE, apiKey, token);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("callbackURL", webhookCallbackUrl);
            body.add("idModel", boardId);
            body.add("description", "Flow Chamados Sync Webhook");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception ex) {
            log.error("Erro ao configurar webhook no Trello: {}", ex.getMessage());
            return false;
        }
    }

    public void addCommentToCard(String cardId, String autor, String texto) {
        if (!isConfigured() || cardId == null || cardId.startsWith("mock_")) return;
        try {
            String url = String.format("%s/cards/%s/actions/comments?key=%s&token=%s", TRELLO_API_BASE, cardId, apiKey, token);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("text", String.format("**[%s via Flow]:** %s", autor, texto));

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, Map.class);
        } catch (Exception ex) {
            log.warn("Falha ao sincronizar comentário para o card {}: {}", cardId, ex.getMessage());
        }
    }

    public Optional<TicketStatus> mapListIdToStatus(String listId) {
        if (listId == null) return Optional.empty();
        if (listId.equals(listCriadoId)) return Optional.of(TicketStatus.CRIADO);
        if (listId.equals(listEmAndamentoId)) return Optional.of(TicketStatus.EM_ANDAMENTO);
        if (listId.equals(listAguardandoAcaoId)) return Optional.of(TicketStatus.AGUARDANDO_ACAO);
        if (listId.equals(listFinalizadoId)) return Optional.of(TicketStatus.FINALIZADO);
        return Optional.empty();
    }

    private boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.equals("mock_key") && token != null && !token.equals("mock_token");
    }
}
