package com.flow.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets", indexes = {
    @Index(name = "idx_ticket_protocolo", columnList = "protocolo", unique = true),
    @Index(name = "idx_ticket_trello_card_id", columnList = "trello_card_id")
})
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String protocolo;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String descricao;

    @Column(name = "solicitante_nome", nullable = false, length = 100)
    private String solicitanteNome;

    @Column(name = "solicitante_email", nullable = false, length = 150)
    private String solicitanteEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TicketStatus status = TicketStatus.CRIADO;

    @Column(name = "trello_card_id", length = 100)
    private String trelloCardId;

    @Column(name = "trello_list_id", length = 100)
    private String trelloListId;

    @Column(name = "trello_card_url", length = 255)
    private String trelloCardUrl;

    @Column(name = "tag", length = 60)
    private String tag;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    @JsonManagedReference
    private List<Message> messages = new ArrayList<>();

    public Ticket() {
    }

    public Ticket(String protocolo, String titulo, String descricao, String solicitanteNome, String solicitanteEmail) {
        this(protocolo, titulo, descricao, solicitanteNome, solicitanteEmail, null);
    }

    public Ticket(String protocolo, String titulo, String descricao, String solicitanteNome, String solicitanteEmail, String tag) {
        this.protocolo = protocolo;
        this.titulo = titulo;
        this.descricao = descricao;
        this.solicitanteNome = solicitanteNome;
        this.solicitanteEmail = solicitanteEmail;
        this.tag = tag;
        this.status = TicketStatus.CRIADO;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = TicketStatus.CRIADO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addMessage(Message message) {
        messages.add(message);
        message.setTicket(this);
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

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public List<Message> getMessages() {
        return messages;
    }

    public void setMessages(List<Message> messages) {
        this.messages = messages;
    }
}
