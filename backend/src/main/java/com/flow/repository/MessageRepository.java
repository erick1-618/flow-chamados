package com.flow.repository;

import com.flow.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByTicketIdOrderByCreatedAtAsc(Long ticketId);

    boolean existsByTicketIdAndConteudoAndCreatedAtAfter(Long ticketId, String conteudo, LocalDateTime after);
}
