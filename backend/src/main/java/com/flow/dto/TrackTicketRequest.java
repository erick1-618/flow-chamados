package com.flow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class TrackTicketRequest {

    @NotBlank(message = "O protocolo é obrigatório")
    private String protocolo;

    @NotBlank(message = "O e-mail é obrigatório")
    @Email(message = "Informe um e-mail válido")
    private String email;

    public TrackTicketRequest() {
    }

    public TrackTicketRequest(String protocolo, String email) {
        this.protocolo = protocolo;
        this.email = email;
    }

    public String getProtocolo() {
        return protocolo;
    }

    public void setProtocolo(String protocolo) {
        this.protocolo = protocolo;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
