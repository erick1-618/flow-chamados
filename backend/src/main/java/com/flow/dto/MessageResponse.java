package com.flow.dto;

import com.flow.model.Message;
import com.flow.model.MessageAuthor;

import java.time.LocalDateTime;

public class MessageResponse {
    private Long id;
    private MessageAuthor autor;
    private String conteudo;
    private LocalDateTime createdAt;

    public MessageResponse() {
    }

    public MessageResponse(Message message) {
        this.id = message.getId();
        this.autor = message.getAutor();
        this.conteudo = message.getConteudo();
        this.createdAt = message.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MessageAuthor getAutor() {
        return autor;
    }

    public void setAutor(MessageAuthor autor) {
        this.autor = autor;
    }

    public String getConteudo() {
        return conteudo;
    }

    public void setConteudo(String conteudo) {
        this.conteudo = conteudo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
