-- Script de inicialização do banco de dados PostgreSQL
-- Você pode executar este script via psql, DBeaver, pgAdmin ou terminal.

-- 1. Criação do Banco de Dados (caso ainda não exista)
-- CREATE DATABASE flow_db;

-- Conectar ao flow_db antes de rodar os comandos abaixo:
-- \c flow_db;

-- 2. Tabela de Chamados (O Spring Data JPA com ddl-auto: update também cria automaticamente se preferir)
CREATE TABLE IF NOT EXISTS tickets (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    solicitante VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inserção de dados de exemplo para teste inicial
INSERT INTO tickets (titulo, descricao, status, prioridade, solicitante, criado_em, atualizado_em)
VALUES 
('Erro 500 no módulo de login', 'Usuários relatam timeout ao tentar autenticar via OAuth.', 'ABERTO', 'ALTA', 'Carlos Silva', NOW(), NOW()),
('Atualizar dependências de segurança', 'Vulnerabilidade identificada no pacote de logging.', 'EM_ANDAMENTO', 'MEDIA', 'Ana Souza', NOW(), NOW()),
('Configuração do ambiente de homologação', 'Provisionar banco de dados PostgreSQL dedicado para testes.', 'RESOLVIDO', 'BAIXA', 'Erick Dev', NOW(), NOW())
ON CONFLICT DO NOTHING;
