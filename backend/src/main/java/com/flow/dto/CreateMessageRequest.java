package com.flow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateMessageRequest {

    private String email;

    @NotBlank(message = "A mensagem não pode estar vazia")
    @Size(min = 1, max = 5000, message = "A mensagem deve ter entre 1 e 5000 caracteres")
    private String conteudo;

    public CreateMessageRequest() {
    }

    public CreateMessageRequest(String email, String conteudo) {
        this.email = email;
        this.conteudo = conteudo;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getConteudo() {
        return conteudo;
    }

    public void setConteudo(String conteudo) {
        this.conteudo = conteudo;
    }
}
