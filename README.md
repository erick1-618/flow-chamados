# Flow Chamados

O **Flow Chamados** é um sistema corporativo para abertura, gestão e acompanhamento de chamados de suporte técnico e solicitações internas, com sincronização bidirecional em tempo real com o **Trello** e persistência em banco de dados **PostgreSQL**.

---

## O que a aplicação faz

### 1. Abertura Simplificada de Chamados (Usuário / Solicitante)
- Permite que qualquer usuário abra uma solicitação informando **Nome**, **E-mail**, **Assunto**, **Descrição detalhada**, **Classe do Chamado** (`academico`, `pessoal`, `comunidade`, `suporte-ti`), **Complexidade** (`Baixa`, `Média`, `Alta`) e **Data de Entrega**.
- Gera automaticamente um código de **Protocolo exclusivo** (ex: `FLOW-1045`) para identificação e consulta.
- Cria imediatamente o cartão correspondente no **Trello** na coluna inicial (`Criado`), com as etiquetas de classe e complexidade (com cores associadas), prazo definido e link direto para atendimento.

### 2. Acompanhamento e Chat em Tempo Real
- O solicitante pode acompanhar a evolução do chamado utilizando apenas o número do **Protocolo** e seu **E-mail**.
- Exibe o progresso em um pipeline de status: `Criado` ➔ `Em Andamento` ➔ `Aguardando Ação` ➔ `Finalizado`.
- Possibilita a troca de mensagens na thread do chamado entre o cliente e a equipe técnica.

### 3. Painel Administrativo de Gestão
- Acesso seguro da equipe técnica via chave de segurança (`X-Admin-Key`).
- Visão unificada de chamados com filtros rápidos por status e busca textual.
- Resumo de métricas da fila de atendimento.
- Thread de mensagens para responder ao solicitante diretamente pelo painel (mensagens são espelhadas como comentários no cartão do Trello).
- Abertura de chamados manuais pela equipe.
- Exclusão de chamados com remoção em cascata e sincronização automática com a coluna `Excluído` do Trello.

### 4. Integração Bidirecional com Trello via Webhooks
- Ao mover um cartão no Trello entre as colunas, o status no banco de dados e na interface do usuário é atualizado instantaneamente.
- Comentários adicionados no cartão do Trello por atendentes são espelhados na thread do chamado no sistema.
- Se um cartão for movido para a coluna `Excluído` no Trello, o chamado e suas mensagens são excluídos do sistema.
- Cada cartão no Trello possui um link direto que leva o atendente diretamente para a conversa com o cliente no painel administrativo.

### 5. Envio de emails
- Além de atualizar status de atividade de um chamado, a ação de mover dispara emails para o usuário em movimentaçõs importantes, no caso "Aguardando ação" e "Finalizado"
