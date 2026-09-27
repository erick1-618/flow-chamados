package com.flow.repository;

import com.flow.model.Ticket;
import com.flow.model.TicketStatus;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    @Override
    @EntityGraph(attributePaths = {"messages"})
    List<Ticket> findAll(Specification<Ticket> spec, Sort sort);

    Optional<Ticket> findByProtocolo(String protocolo);

    @EntityGraph(attributePaths = {"messages"})
    Optional<Ticket> findByProtocoloAndSolicitanteEmailIgnoreCase(String protocolo, String email);

    @EntityGraph(attributePaths = {"messages"})
    @Query("SELECT t FROM Ticket t WHERE t.id = :id")
    Optional<Ticket> findByIdWithMessages(@Param("id") Long id);

    Optional<Ticket> findByTrelloCardId(String trelloCardId);

    List<Ticket> findByStatus(TicketStatus status);

    @Query(value = "SELECT COALESCE(MAX(id), 0) FROM tickets", nativeQuery = true)
    Long getMaxId();
}
