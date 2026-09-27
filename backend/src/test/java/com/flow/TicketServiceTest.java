package com.flow;

import com.flow.dto.CreateMessageRequest;
import com.flow.dto.CreateTicketRequest;
import com.flow.model.Message;
import com.flow.model.MessageAuthor;
import com.flow.model.Ticket;
import com.flow.model.TicketStatus;
import com.flow.repository.MessageRepository;
import com.flow.repository.TicketRepository;
import com.flow.service.TicketService;
import com.flow.service.TrelloCardResult;
import com.flow.service.TrelloService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private TrelloService trelloService;

    private TicketService ticketService;

    @BeforeEach
    void setUp() {
        ticketService = new TicketService(ticketRepository, messageRepository, trelloService);
    }

    @Test
    @DisplayName("Deve criar chamado com protocolo legível e sincronizar com o Trello")
    void testCreateTicket() {
        when(ticketRepository.getMaxId()).thenReturn(10L);
        when(trelloService.createCard(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new TrelloCardResult("card123", "listCriado", "https://trello.com/c/card123"));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        CreateTicketRequest request = new CreateTicketRequest(
                "Carlos Silva",
                "carlos@email.com",
                "Problema no login",
                "Não consigo acessar a plataforma com SSO"
        );

        Ticket created = ticketService.createTicket(request);

        assertNotNull(created);
        assertEquals("FLOW-1052", created.getProtocolo());
        assertEquals("Problema no login", created.getTitulo());
        assertEquals(TicketStatus.CRIADO, created.getStatus());
        assertEquals("card123", created.getTrelloCardId());

        verify(ticketRepository).save(any(Ticket.class));
    }

    @Test
    @DisplayName("Deve sincronizar status via Webhook do Trello com idempotência")
    void testSyncStatusFromTrello() {
        Ticket existingTicket = new Ticket("FLOW-1042", "Teste", "Desc", "Nome", "email@teste.com");
        existingTicket.setStatus(TicketStatus.CRIADO);
        existingTicket.setTrelloCardId("trello_card_999");

        when(trelloService.mapListIdToStatus("list_em_andamento")).thenReturn(Optional.of(TicketStatus.EM_ANDAMENTO));
        when(ticketRepository.findByTrelloCardId("trello_card_999")).thenReturn(Optional.of(existingTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        boolean updated = ticketService.syncStatusFromTrello("trello_card_999", "[FLOW-1042] - Teste", "list_em_andamento");
        assertTrue(updated);
        assertEquals(TicketStatus.EM_ANDAMENTO, existingTicket.getStatus());
    }

    @Test
    @DisplayName("Deve adicionar mensagem do cliente e notificar o Trello com comentário")
    void testAddClientMessage() {
        Ticket ticket = new Ticket("FLOW-1042", "Teste", "Desc", "Nome", "cliente@empresa.com");
        ticket.setTrelloCardId("card_xyz");

        when(ticketRepository.findByProtocolo("FLOW-1042")).thenReturn(Optional.of(ticket));
        when(messageRepository.save(any(Message.class))).thenAnswer(i -> i.getArgument(0));

        CreateMessageRequest request = new CreateMessageRequest("cliente@empresa.com", "Anexei os logs");
        Message msg = ticketService.addClientMessage("FLOW-1042", request);

        assertNotNull(msg);
        assertEquals(MessageAuthor.CLIENTE, msg.getAutor());
        assertEquals("Anexei os logs", msg.getConteudo());
    }
}
