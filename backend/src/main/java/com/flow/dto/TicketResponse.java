package com.flow.dto;

import com.flow.model.Ticket;
import com.flow.model.TicketStatus;

import org.hibernate.Hibernate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class TicketResponse {
    private Long id;
    private String protocolo;
    private String titulo;
    private String descricao;
    private String solicitanteNome;
    private String solicitanteEmail;
    private TicketStatus status;
    private String trelloCardId;
    private String trelloListId;
    private String trelloCardUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<MessageResponse> messages = new ArrayList<>();

    public TicketResponse() {
    }

    public TicketResponse(Ticket ticket) {
        this.id = ticket.getId();
        this.protocolo = ticket.getProtocolo();
        this.titulo = ticket.getTitulo();
        this.descricao = ticket.getDescricao();
        this.solicitanteNome = ticket.getSolicitanteNome();
        this.solicitanteEmail = ticket.getSolicitanteEmail();
        this.status = ticket.getStatus();
        this.trelloCardId = ticket.getTrelloCardId();
        this.trelloListId = ticket.getTrelloListId();
        this.trelloCardUrl = ticket.getTrelloCardUrl();
        this.createdAt = ticket.getCreatedAt();
        this.updatedAt = ticket.getUpdatedAt();
        if (ticket.getMessages() != null && Hibernate.isInitialized(ticket.getMessages())) {
            this.messages = ticket.getMessages().stream()
                    .map(MessageResponse::new)
                    .collect(Collectors.toList());
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getProtocolo() {
        return protocolo;
    }

    public void setProtocolo(String protocolo) {
        this.protocolo = protocolo;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public String getSolicitanteNome() {
        return solicitanteNome;
    }

    public void setSolicitanteNome(String solicitanteNome) {
        this.solicitanteNome = solicitanteNome;
    }

    public String getSolicitanteEmail() {
        return solicitanteEmail;
    }

    public void setSolicitanteEmail(String solicitanteEmail) {
        this.solicitanteEmail = solicitanteEmail;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public String getTrelloCardId() {
        return trelloCardId;
    }

    public void setTrelloCardId(String trelloCardId) {
        this.trelloCardId = trelloCardId;
    }

    public String getTrelloListId() {
        return trelloListId;
    }

    public void setTrelloListId(String trelloListId) {
        this.trelloListId = trelloListId;
    }

    public String getTrelloCardUrl() {
        return trelloCardUrl;
    }

    public void setTrelloCardUrl(String trelloCardUrl) {
        this.trelloCardUrl = trelloCardUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<MessageResponse> getMessages() {
        return messages;
    }

    public void setMessages(List<MessageResponse> messages) {
        this.messages = messages;
    }
}
