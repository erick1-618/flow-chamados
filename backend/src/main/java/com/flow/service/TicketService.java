package com.flow.service;

import com.flow.dto.CreateMessageRequest;
import com.flow.dto.CreateTicketRequest;
import com.flow.model.Message;
import com.flow.model.MessageAuthor;
import com.flow.model.Ticket;
import com.flow.model.TicketStatus;
import com.flow.repository.MessageRepository;
import com.flow.repository.TicketRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);
    private static final Pattern PROTOCOL_PATTERN = Pattern.compile("\\[(FLOW-\\d+)\\]");

    private final TicketRepository ticketRepository;
    private final MessageRepository messageRepository;
    private final TrelloService trelloService;
    private final EmailService emailService;

    public TicketService(
            TicketRepository ticketRepository,
            MessageRepository messageRepository,
            TrelloService trelloService,
            EmailService emailService
    ) {
        this.ticketRepository = ticketRepository;
        this.messageRepository = messageRepository;
        this.trelloService = trelloService;
        this.emailService = emailService;
    }

    @Transactional
    public Ticket createTicket(CreateTicketRequest request) {
        String protocolo = generateProtocol();

        Ticket ticket = new Ticket(
                protocolo,
                request.getTitulo().trim(),
                request.getDescricao().trim(),
                request.getNome().trim(),
                request.getEmail().trim().toLowerCase()
        );

        if (request.getTag() != null && !request.getTag().isBlank()) {
            ticket.setTag(request.getTag().trim());
        }

        if (request.getComplexidade() != null && !request.getComplexidade().isBlank()) {
            ticket.setComplexidade(request.getComplexidade().trim());
        }

        if (request.getDataCard() != null) {
            LocalDate todayInBrazil = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
            if (request.getDataCard().isBefore(todayInBrazil)) {
                throw new IllegalArgumentException("A data de entrega não pode ser anterior à data de hoje.");
            }
            ticket.setDataCard(request.getDataCard());
        }

        TrelloCardResult trelloResult = trelloService.createCard(
                protocolo,
                ticket.getTitulo(),
                ticket.getSolicitanteNome(),
                ticket.getSolicitanteEmail(),
                ticket.getDescricao(),
                ticket.getTag(),
                ticket.getComplexidade(),
                ticket.getDataCard()
        );

        ticket.setTrelloCardId(trelloResult.getCardId());
        ticket.setTrelloListId(trelloResult.getListId());
        ticket.setTrelloCardUrl(trelloResult.getCardUrl());

        return ticketRepository.save(ticket);


    }

    @Transactional(readOnly = true)
    public Ticket trackTicket(String protocolo, String email) {
        return ticketRepository.findByProtocoloAndSolicitanteEmailIgnoreCase(protocolo.trim(), email.trim().toLowerCase())
                .orElseThrow(() -> new NoSuchElementException("Chamado não encontrado para o protocolo e e-mail informados."));
    }

    @Transactional
    public Message addClientMessage(String protocolo, CreateMessageRequest request) {
        Ticket ticket = ticketRepository.findByProtocolo(protocolo.trim())
                .orElseThrow(() -> new NoSuchElementException("Chamado não encontrado: " + protocolo));

        if (request.getEmail() != null && !ticket.getSolicitanteEmail().equalsIgnoreCase(request.getEmail().trim())) {
            throw new IllegalArgumentException("E-mail informado não corresponde ao solicitante deste chamado.");
        }

        Message message = new Message(ticket, MessageAuthor.CLIENTE, request.getConteudo().trim());
        Message saved = messageRepository.save(message);

        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        trelloService.addCommentToCard(ticket.getTrelloCardId(), "Cliente (" + ticket.getSolicitanteNome() + ")", request.getConteudo());
        return saved;
    }

    @Transactional
    public Message addAdminMessage(Long ticketId, CreateMessageRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NoSuchElementException("Chamado não encontrado com ID: " + ticketId));

        Message message = new Message(ticket, MessageAuthor.ADMIN, request.getConteudo().trim());
        Message saved = messageRepository.save(message);

        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        trelloService.addCommentToCard(ticket.getTrelloCardId(), "Equipe Flow (Admin)", request.getConteudo());

        return saved;
    }

    @Transactional
    public boolean addMessageFromTrello(String trelloCardId, String cardName, String commentText) {
        if (commentText == null || commentText.isBlank()) return false;

        Optional<Ticket> ticketOpt = ticketRepository.findByTrelloCardId(trelloCardId);
        if (ticketOpt.isEmpty() && cardName != null) {
            Matcher matcher = PROTOCOL_PATTERN.matcher(cardName);
            if (matcher.find()) {
                String parsedProtocol = matcher.group(1);
                ticketOpt = ticketRepository.findByProtocolo(parsedProtocol);
            }
        }

        if (ticketOpt.isEmpty()) {
            return false;
        }

        Ticket ticket = ticketOpt.get();

        // Evita mensagens duplicadas em caso de retentativa de entrega do webhook nos últimos 15s
        LocalDateTime fifteenSecondsAgo = LocalDateTime.now().minusSeconds(15);
        boolean duplicate = messageRepository.existsByTicketIdAndConteudoAndCreatedAtAfter(
                ticket.getId(), commentText.trim(), fifteenSecondsAgo);
        if (duplicate) {
            log.info("Comentário do Trello já registrado recentemente para o chamado [{}] (idempotente)", ticket.getProtocolo());
            return true;
        }

        Message message = new Message(ticket, MessageAuthor.ADMIN, commentText.trim());
        messageRepository.save(message);

        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        log.info("Mensagem importada do Trello com sucesso para o chamado [{}]", ticket.getProtocolo());

        return true;
    }

    @Transactional
    public boolean syncStatusFromTrello(String trelloCardId, String cardName, String listAfterId) {
        if (listAfterId == null) return false;

        Optional<TicketStatus> targetStatusOpt = trelloService.mapListIdToStatus(listAfterId);
        if (targetStatusOpt.isEmpty()) return false;

        TicketStatus targetStatus = targetStatusOpt.get();

        Optional<Ticket> ticketOpt = ticketRepository.findByTrelloCardId(trelloCardId);
        if (ticketOpt.isEmpty() && cardName != null) {
            Matcher matcher = PROTOCOL_PATTERN.matcher(cardName);
            if (matcher.find()) {
                String parsedProtocol = matcher.group(1);
                ticketOpt = ticketRepository.findByProtocolo(parsedProtocol);
            }
        }

        if (ticketOpt.isEmpty()) return false;

        Ticket ticket = ticketOpt.get();
        if (ticket.getStatus() == targetStatus) return true; // Idempotente

        ticket.setStatus(targetStatus);
        ticket.setTrelloListId(listAfterId);
        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        if (targetStatus == TicketStatus.AGUARDANDO_ACAO || targetStatus == TicketStatus.FINALIZADO) {
            emailService.sendStatusUpdateEmail(ticket, targetStatus);
        }

        return true;
    }

    @Transactional(readOnly = true)
    public List<Ticket> listTicketsForAdmin(TicketStatus status, LocalDateTime dataInicio, LocalDateTime dataFim, String search) {
        Specification<Ticket> spec = (root, query, cb) -> {
            if (query != null) {
                query.distinct(true);
            }
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (dataInicio != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dataInicio));
            }
            if (dataFim != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), dataFim));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("titulo")), pattern),
                        cb.like(cb.lower(root.get("protocolo")), pattern),
                        cb.like(cb.lower(root.get("solicitanteNome")), pattern),
                        cb.like(cb.lower(root.get("solicitanteEmail")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return ticketRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional(readOnly = true)
    public Ticket findById(Long id) {
        return ticketRepository.findByIdWithMessages(id)
                .orElseThrow(() -> new NoSuchElementException("Chamado não encontrado com o ID: " + id));
    }

    @Transactional
    public void deleteTicket(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Chamado não encontrado com o ID: " + id));

        // Move o card correspondente no Trello para a coluna 'Excluido'
        if (ticket.getTrelloCardId() != null) {
            trelloService.moveCardToList(ticket.getTrelloCardId(), trelloService.getListExcluidoId());
        }

        ticketRepository.delete(ticket);
        log.info("Chamado [{}] (ID: {}) e mensagens excluídos com sucesso", ticket.getProtocolo(), id);
    }

    @Transactional
    public boolean deleteTicketByCard(String trelloCardId, String cardName) {
        Optional<Ticket> ticketOpt = ticketRepository.findByTrelloCardId(trelloCardId);
        if (ticketOpt.isEmpty() && cardName != null) {
            Matcher matcher = PROTOCOL_PATTERN.matcher(cardName);
            if (matcher.find()) {
                String parsedProtocol = matcher.group(1);
                ticketOpt = ticketRepository.findByProtocolo(parsedProtocol);
            }
        }

        if (ticketOpt.isPresent()) {
            Ticket ticket = ticketOpt.get();
            ticketRepository.delete(ticket);
            log.info("Chamado [{}] excluído do banco via webhook do Trello (movido para coluna Excluido)", ticket.getProtocolo());
            return true;
        }

        return false;
    }

    private synchronized String generateProtocol() {
        Long maxId = ticketRepository.getMaxId();
        long nextNum = (maxId != null ? maxId : 0) + 1042;
        return "FLOW-" + nextNum;
    }
}
