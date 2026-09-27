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
        return createCard(protocolo, titulo, solicitanteNome, solicitanteEmail, descricao, null);
    }

    public TrelloCardResult createCard(
            String protocolo,
            String titulo,
            String solicitanteNome,
            String solicitanteEmail,
            String descricao,
            String tag
    ) {
        String cardName = String.format("[%s] - %s", protocolo, titulo);
        String tagDisplay = (tag != null && !tag.isBlank()) ? tag.trim() : "Geral";
        String cardDesc = String.format(
                "### Chamado %s\n\n" +
                "- **Solicitante:** %s\n" +
                "- **E-mail:** %s\n" +
                "- **Protocolo:** `%s`\n" +
                "- **Categoria / Tag:** `%s`\n" +
                "- **Criado em:** %s\n\n" +
                "---\n\n" +
                "#### Descrição do Problema:\n%s\n",
                protocolo,
                solicitanteNome,
                solicitanteEmail,
                protocolo,
                tagDisplay,
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

                // Aplica a label/tag correspondente no card do Trello
                if (tag != null && !tag.isBlank()) {
                    addLabelToCard(cardId, tag);
                }

                return new TrelloCardResult(cardId, listCriadoId, cardUrl);
            }
        } catch (Exception ex) {
            log.error("Erro ao criar card no Trello: {}", ex.getMessage());
        }

        String fallbackId = "trello_card_" + protocolo;
        return new TrelloCardResult(fallbackId, listCriadoId, "https://trello.com/c/" + fallbackId);
    }

    public void addLabelToCard(String cardId, String tag) {
        if (!isConfigured() || cardId == null || cardId.startsWith("mock_") || tag == null || tag.isBlank()) return;
        try {
            String color = mapTagToTrelloColor(tag);
            String url = String.format("%s/cards/%s/labels?key=%s&token=%s&name=%s&color=%s",
                    TRELLO_API_BASE, cardId, apiKey, token,
                    java.net.URLEncoder.encode(tag.trim(), java.nio.charset.StandardCharsets.UTF_8),
                    color);
            restTemplate.postForEntity(url, null, Map.class);
            log.info("Label '{}' (cor: {}) vinculada com sucesso ao card {}", tag, color, cardId);
        } catch (Exception ex) {
            log.warn("Falha ao adicionar label '{}' ao card {}: {}", tag, cardId, ex.getMessage());
        }
    }

    private String mapTagToTrelloColor(String tag) {
        if (tag == null) return "blue";
        String lower = tag.toLowerCase();
        if (lower.contains("ti") || lower.contains("sistema") || lower.contains("software")) return "blue";
        if (lower.contains("financeiro") || lower.contains("fiscal") || lower.contains("faturamento")) return "green";
        if (lower.contains("rh") || lower.contains("pessoal") || lower.contains("recursos humanos")) return "purple";
        if (lower.contains("opera") || lower.contains("logística") || lower.contains("logistica")) return "orange";
        if (lower.contains("infra") || lower.contains("rede") || lower.contains("hardware") || lower.contains("crítico")) return "red";
        if (lower.contains("dúvida") || lower.contains("duvida") || lower.contains("geral")) return "yellow";
        return "blue";
    }

    public boolean setupWebhook() {
        if (!isConfigured()) return false;
        try {
            String resolvedModelId = boardId;
            if (boardId != null && boardId.length() < 24) {
                try {
                    String boardUrl = String.format("%s/boards/%s?key=%s&token=%s&fields=id", TRELLO_API_BASE, boardId, apiKey, token);
                    Map<String, Object> boardInfo = restTemplate.getForObject(boardUrl, Map.class);
                    if (boardInfo != null && boardInfo.containsKey("id")) {
                        resolvedModelId = (String) boardInfo.get("id");
                    }
                } catch (Exception e) {
                    log.warn("Nao foi possivel resolver idModel a partir do boardId {}, usando valor direto: {}", boardId, e.getMessage());
                }
            }

            String url = String.format("%s/webhooks/?key=%s&token=%s", TRELLO_API_BASE, apiKey, token);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = Map.of(
                    "callbackURL", webhookCallbackUrl,
                    "idModel", resolvedModelId,
                    "description", "Flow Chamados Sync Webhook"
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
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
