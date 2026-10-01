package com.flow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public class CreateTicketRequest {

    @NotBlank(message = "O nome é obrigatório")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
    private String nome;

    @NotBlank(message = "O e-mail é obrigatório")
    @Email(message = "Informe um e-mail válido")
    private String email;

    @NotBlank(message = "O título é obrigatório")
    @Size(min = 3, max = 150, message = "O título deve ter entre 3 e 150 caracteres")
    private String titulo;

    @NotBlank(message = "A descrição é obrigatória")
    @Size(min = 10, message = "A descrição deve ter pelo menos 10 caracteres")
    private String descricao;

    @Size(max = 50, message = "A tag deve ter no máximo 50 caracteres")
    private String tag;

    @Size(max = 30, message = "A complexidade deve ter no máximo 30 caracteres")
    private String complexidade;

    @FutureOrPresent(message = "A data de entrega não pode ser anterior à data de hoje")
    private LocalDate dataCard;

    public CreateTicketRequest() {
    }

    public CreateTicketRequest(String nome, String email, String titulo, String descricao) {
        this.nome = nome;
        this.email = email;
        this.titulo = titulo;
        this.descricao = descricao;
    }

    public CreateTicketRequest(String nome, String email, String titulo, String descricao, String tag) {
        this.nome = nome;
        this.email = email;
        this.titulo = titulo;
        this.descricao = descricao;
        this.tag = tag;
    }


    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getComplexidade() {
        return complexidade;
    }

    public void setComplexidade(String complexidade) {
        this.complexidade = complexidade;
    }

    public LocalDate getDataCard() {
        return dataCard;
    }

    public void setDataCard(LocalDate dataCard) {
        this.dataCard = dataCard;
    }

    public String getSolicitanteEmail() {
        return email;
    }

    public String getSolicitanteNome() {
        return nome;
    }
}


