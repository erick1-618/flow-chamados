package com.flow.repository;

import com.flow.model.Ticket;
import com.flow.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByProtocolo(String protocolo);

    Optional<Ticket> findByProtocoloAndSolicitanteEmailIgnoreCase(String protocolo, String email);

    Optional<Ticket> findByTrelloCardId(String trelloCardId);

    List<Ticket> findByStatus(TicketStatus status);

    @Query("SELECT t FROM Ticket t WHERE " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:dataInicio IS NULL OR t.createdAt >= :dataInicio) AND " +
           "(:dataFim IS NULL OR t.createdAt <= :dataFim) AND " +
           "(:search IS NULL OR LOWER(t.titulo) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(t.protocolo) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(t.solicitanteNome) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(t.solicitanteEmail) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY t.createdAt DESC")
    List<Ticket> findWithFilters(
            @Param("status") TicketStatus status,
            @Param("dataInicio") LocalDateTime dataInicio,
            @Param("dataFim") LocalDateTime dataFim,
            @Param("search") String search
    );

    @Query(value = "SELECT COALESCE(MAX(id), 0) FROM tickets", nativeQuery = true)
    Long getMaxId();
}
