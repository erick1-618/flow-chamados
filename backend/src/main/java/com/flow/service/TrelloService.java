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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
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

    @Value("${app.frontend-url:https://flow.erickborba.dev.br}")
    private String frontendUrl;

    @Value("${trello.lists.criado:list_id_criado}")
    private String listCriadoId;

    @Value("${trello.lists.em-andamento:list_id_em_andamento}")
    private String listEmAndamentoId;

    @Value("${trello.lists.aguardando-acao:list_id_aguardando_acao}")
    private String listAguardandoAcaoId;

    @Value("${trello.lists.finalizado:list_id_finalizado}")
    private String listFinalizadoId;

    @Value("${trello.lists.excluido:6ab952308e7442f8e2e36533}")
    private String listExcluidoId;

    private final RestTemplate restTemplate = new RestTemplate();

    public TrelloCardResult createCard(
            String protocolo,
            String titulo,
            String solicitanteNome,
            String solicitanteEmail,
            String descricao
    ) {
        return createCard(protocolo, titulo, solicitanteNome, solicitanteEmail, descricao, null, null, null);
    }

    public TrelloCardResult createCard(
            String protocolo,
            String titulo,
            String solicitanteNome,
            String solicitanteEmail,
            String descricao,
            String tag
    ) {
        return createCard(protocolo, titulo, solicitanteNome, solicitanteEmail, descricao, tag, null, null);
    }

    public TrelloCardResult createCard(
            String protocolo,
            String titulo,
            String solicitanteNome,
            String solicitanteEmail,
            String descricao,
            String tag,
            String complexidade,
            LocalDate dataCard
    ) {
        String cardName = String.format("[%s] - %s", protocolo, titulo);

        String tagLine = (tag != null && !tag.isBlank()) ? String.format("- **Classe / Tag:** %s\n", tag.trim()) : "";
        String compLine = (complexidade != null && !complexidade.isBlank()) ? String.format("- **Complexidade:** %s\n", complexidade.trim()) : "";
        String dataLine = (dataCard != null) ? String.format("- **Data do Chamado:** %s\n", dataCard.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))) : "";

        String baseFrontend = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.replaceAll("/+$", "") : "https://flow.erickborba.dev.br";
        String adminUrl = String.format("%s/?tab=admin&ticket=%s", baseFrontend, protocolo);


        String cardDesc = String.format(
                "### Chamado %s\n\n" +
                "- **Solicitante:** %s\n" +
                "- **E-mail:** %s\n" +
                "- **Protocolo:** `%s`\n" +
                "%s" +
                "%s" +
                "%s" +
                "- **Criado em:** %s\n\n" +
                "---\n\n" +
                "#### Descrição do Problema:\n%s\n\n" +
                "---\n\n" +
                "💬 **[Clique para Atender Chamado no Painel Admin e Conversar com Cliente](%s)**\n",
                protocolo,
                solicitanteNome,
                solicitanteEmail,
                protocolo,
                tagLine,
                compLine,
                dataLine,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                descricao,
                adminUrl
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

            if (dataCard != null) {
                try {
                    String dueIso = dataCard.atTime(18, 0).atZone(ZoneId.of("America/Sao_Paulo")).toInstant().toString();
                    body.add("due", dueIso);
                } catch (Exception ex) {
                    log.warn("Falha ao formatar data do card para ISO: {}", ex.getMessage());
                }
            }

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map bodyMap = response.getBody();
                String cardId = (String) bodyMap.get("id");
                String shortUrl = (String) bodyMap.get("shortUrl");
                String cardUrl = shortUrl != null ? shortUrl : ("https://trello.com/c/" + cardId);

                // 1. Etiqueta de Assunto/Tag
                if (tag != null && !tag.isBlank()) {
                    attachTagLabelToCard(cardId, tag.trim(), getLabelColorForTag(tag));
                }

                // 2. Etiqueta de Complexidade (verde = baixo, amarelo = médio, vermelho = moderado)
                if (complexidade != null && !complexidade.isBlank()) {
                    attachTagLabelToCard(cardId, complexidade.trim(), getComplexityColor(complexidade));
                }

                // 3. Anexo direto para o painel admin
                attachAdminUrlToCard(cardId, adminUrl);

                return new TrelloCardResult(cardId, listCriadoId, cardUrl);
            }
        } catch (Exception ex) {
            log.error("Erro ao criar card no Trello: {}", ex.getMessage());
        }

        String fallbackId = "trello_card_" + protocolo;
        return new TrelloCardResult(fallbackId, listCriadoId, "https://trello.com/c/" + fallbackId);
    }

    private void attachTagLabelToCard(String cardId, String labelName, String color) {
        if (!isConfigured() || cardId == null || cardId.startsWith("mock_")) return;
        try {
            String url = String.format("%s/cards/%s/labels?key=%s&token=%s", TRELLO_API_BASE, cardId, apiKey, token);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("name", labelName);
            body.add("color", color);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, Map.class);
            log.info("Label [{}] ({}) vinculada ao card {}", labelName, color, cardId);
        } catch (Exception ex) {
            log.warn("Não foi possível anexar etiqueta [{}] ({}) no Trello: {}", labelName, color, ex.getMessage());
        }
    }

    private void attachAdminUrlToCard(String cardId, String adminUrl) {
        if (!isConfigured() || cardId == null || cardId.startsWith("mock_")) return;
        try {
            String url = String.format("%s/cards/%s/attachments?key=%s&token=%s", TRELLO_API_BASE, cardId, apiKey, token);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("url", adminUrl);
            body.add("name", "Atender Chamado no Painel Admin");

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, Map.class);
            log.info("Link de atendimento admin anexado ao card {}", cardId);
        } catch (Exception ex) {
            log.warn("Não foi possível anexar link do Admin ao card {}: {}", cardId, ex.getMessage());
        }
    }

    private String getComplexityColor(String complexidade) {
        if (complexidade == null) return "green";
        switch (complexidade.trim().toLowerCase()) {
            case "baixa":
            case "baixo":
                return "green";
            case "média":
            case "media":
            case "médio":
            case "medio":
                return "yellow";
            case "alta":
            case "alto":
            case "moderado":
                return "red";
            default:
                return "yellow";
        }
    }

    private String getLabelColorForTag(String tag) {
        if (tag == null) return "blue";
        String normalized = java.text.Normalizer.normalize(tag.trim().toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        switch (normalized) {
            case "academico":
                return "purple";
            case "pessoal":
                return "green";
            case "comunidade":
                return "orange";
            case "suporte-ti":
            case "suporte ti":
                return "blue";
            default:
                return "sky";
        }
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

    public String getListExcluidoId() {
        return listExcluidoId;
    }

    public boolean isExcluidoList(String listId) {
        return listId != null && listId.equals(listExcluidoId);
    }

    public void moveCardToList(String cardId, String targetListId) {
        if (!isConfigured() || cardId == null || cardId.startsWith("mock_") || targetListId == null) return;
        try {
            String url = String.format("%s/cards/%s?key=%s&token=%s&idList=%s", TRELLO_API_BASE, cardId, apiKey, token, targetListId);
            restTemplate.put(url, null);
            log.info("Card {} movido com sucesso para a lista {}", cardId, targetListId);
        } catch (Exception ex) {
            log.warn("Falha ao mover card {} para lista {}: {}", cardId, targetListId, ex.getMessage());
        }
    }

    private boolean isConfigured() {
        return enabled && apiKey != null && !apiKey.equals("mock_key") && token != null && !token.equals("mock_token");
    }
}
