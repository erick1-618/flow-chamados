package com.flow.service;

public class TrelloCardResult {
    private final String cardId;
    private final String listId;
    private final String cardUrl;

    public TrelloCardResult(String cardId, String listId, String cardUrl) {
        this.cardId = cardId;
        this.listId = listId;
        this.cardUrl = cardUrl;
    }

    public String getCardId() {
        return cardId;
    }

    public String getListId() {
        return listId;
    }

    public String getCardUrl() {
        return cardUrl;
    }
}
