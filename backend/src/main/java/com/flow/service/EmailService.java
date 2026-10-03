package com.flow.service;

import com.flow.model.Ticket;
import com.flow.model.TicketStatus;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:Flow Chamados <nao-responda@erickborba.dev.br>}")
    private String mailFrom;

    @Value("${app.frontend-url:https://flow.erickborba.dev.br}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendStatusUpdateEmail(Ticket ticket, TicketStatus newStatus) {
        if (ticket == null || ticket.getSolicitanteEmail() == null || ticket.getSolicitanteEmail().isBlank()) {
            log.warn("Envio de e-mail ignorado: Chamado sem e-mail de solicitante.");
            return;
        }

        if (newStatus != TicketStatus.AGUARDANDO_ACAO && newStatus != TicketStatus.FINALIZADO) {
            return;
        }

        if (mailPassword == null || mailPassword.isBlank() || mailPassword.startsWith("re_suaChave")) {
            log.info("Envio de e-mail ignorado: MAIL_PASSWORD não configurada no ambiente.");
            return;
        }

        try {
            String baseFrontend = (frontendUrl != null && !frontendUrl.isBlank())
                    ? frontendUrl.replaceAll("/+$", "")
                    : "https://flow.erickborba.dev.br";

            String directTrackingUrl = new StringBuilder(128)
                    .append(baseFrontend)
                    .append("/?tab=acompanhar&protocolo=")
                    .append(URLEncoder.encode(ticket.getProtocolo(), StandardCharsets.UTF_8))
                    .append("&email=")
                    .append(URLEncoder.encode(ticket.getSolicitanteEmail().trim().toLowerCase(), StandardCharsets.UTF_8))
                    .toString();

            String statusTitle;
            String statusBadgeColor;
            String subject;
            String mensagemHtml;
            String mensagemTxt;

            if (newStatus == TicketStatus.AGUARDANDO_ACAO) {
                statusTitle = "Aguardando ação";
                statusBadgeColor = "#f59e0b"; // âmbar / amarelo de atenção
                subject = String.format("[Flow Chamados] Aguardando ação no chamado [%s]", ticket.getProtocolo());

                mensagemHtml = new StringBuilder(256)
                        .append("Seu chamado <strong>[").append(escapeHtml(ticket.getProtocolo()))
                        .append("] ").append(escapeHtml(ticket.getTitulo()))
                        .append("</strong> foi atualizado para <strong>Aguardando ação</strong>.<br><br>")
                        .append("Nossa equipe necessita de informações adicionais ou de uma confirmação sua para continuar o atendimento.")
                        .toString();

                mensagemTxt = new StringBuilder(256)
                        .append("Seu chamado [").append(ticket.getProtocolo())
                        .append("] ").append(ticket.getTitulo())
                        .append(" foi atualizado para o status: Aguardando ação.\n\n")
                        .append("Nossa equipe necessita de informações adicionais ou de uma confirmação sua para continuar o atendimento.")
                        .toString();
            } else {
                statusTitle = "Finalizado";
                statusBadgeColor = "#10b981"; // verde de sucesso
                subject = String.format("[Flow Chamados] Chamado concluído [%s]", ticket.getProtocolo());

                mensagemHtml = new StringBuilder(256)
                        .append("Seu chamado <strong>[").append(escapeHtml(ticket.getProtocolo()))
                        .append("] ").append(escapeHtml(ticket.getTitulo()))
                        .append("</strong> foi concluído com sucesso e marcado como <strong>Finalizado</strong>.<br><br>")
                        .append("Agradecemos o contato. Caso queira consultar o histórico do chamado, acesse o link abaixo.")
                        .toString();

                mensagemTxt = new StringBuilder(256)
                        .append("Seu chamado [").append(ticket.getProtocolo())
                        .append("] ").append(ticket.getTitulo())
                        .append(" foi concluído com sucesso e marcado como Finalizado.\n\n")
                        .append("Agradecemos o contato. Caso queira consultar o histórico do chamado, acesse o link abaixo.")
                        .toString();
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(mailFrom));
            helper.setTo(ticket.getSolicitanteEmail().trim());
            helper.setSubject(subject);

            String htmlBody = buildHtmlTemplate(
                    ticket.getSolicitanteNome(),
                    statusTitle,
                    statusBadgeColor,
                    mensagemHtml,
                    directTrackingUrl
            );

            String textBody = buildTextTemplate(
                    ticket.getSolicitanteNome(),
                    mensagemTxt,
                    directTrackingUrl
            );

            helper.setText(textBody, htmlBody);

            mailSender.send(message);
            log.info("E-mail de status [{}] enviado com sucesso para [{}] (Protocolo: {})",
                    newStatus, ticket.getSolicitanteEmail(), ticket.getProtocolo());

        } catch (Exception ex) {
            log.error("Erro ao enviar e-mail de notificação para [{}]: {}",
                    ticket.getSolicitanteEmail(), ex.getMessage(), ex);
        }
    }

    @Async
    public void sendNewMessageNotificationEmail(Ticket ticket, String messageContent) {
        if (ticket == null || ticket.getSolicitanteEmail() == null || ticket.getSolicitanteEmail().isBlank()) {
            return;
        }

        if (mailPassword == null || mailPassword.isBlank() || mailPassword.startsWith("re_suaChave")) {
            log.info("Envio de e-mail de nova resposta ignorado: MAIL_PASSWORD não configurada.");
            return;
        }

        try {
            String baseFrontend = (frontendUrl != null && !frontendUrl.isBlank())
                    ? frontendUrl.replaceAll("/+$", "")
                    : "https://flow.erickborba.dev.br";

            String directTrackingUrl = new StringBuilder(128)
                    .append(baseFrontend)
                    .append("/?tab=acompanhar&protocolo=")
                    .append(URLEncoder.encode(ticket.getProtocolo(), StandardCharsets.UTF_8))
                    .append("&email=")
                    .append(URLEncoder.encode(ticket.getSolicitanteEmail().trim().toLowerCase(), StandardCharsets.UTF_8))
                    .toString();

            String statusTitle = "Nova Resposta";
            String statusBadgeColor = "#2563eb"; // Azul Flow
            String subject = String.format("[Flow Chamados] Nova resposta no chamado [%s]", ticket.getProtocolo());

            String mensagemHtml = new StringBuilder(512)
                    .append("Você recebeu uma nova mensagem da nossa equipe referente ao chamado <strong>[")
                    .append(escapeHtml(ticket.getProtocolo()))
                    .append("] ")
                    .append(escapeHtml(ticket.getTitulo()))
                    .append("</strong>:<br><br>")
                    .append("<div style=\"background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; color: #1e293b; font-size: 14px; line-height: 1.5;\">")
                    .append(escapeHtml(messageContent))
                    .append("</div><br>")
                    .append("Para responder ou acompanhar todo o histórico, utilize o botão abaixo.")
                    .toString();

            String mensagemTxt = new StringBuilder(512)
                    .append("Você recebeu uma nova mensagem da nossa equipe referente ao chamado [")
                    .append(ticket.getProtocolo())
                    .append("] ")
                    .append(ticket.getTitulo())
                    .append(":\n\n\"")
                    .append(messageContent)
                    .append("\"\n\nAcesse o link abaixo para responder e acompanhar o histórico:\n")
                    .toString();

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(mailFrom));
            helper.setTo(ticket.getSolicitanteEmail().trim());
            helper.setSubject(subject);

            String htmlBody = buildHtmlTemplate(
                    ticket.getSolicitanteNome(),
                    statusTitle,
                    statusBadgeColor,
                    mensagemHtml,
                    directTrackingUrl
            );

            String textBody = buildTextTemplate(
                    ticket.getSolicitanteNome(),
                    mensagemTxt,
                    directTrackingUrl
            );

            helper.setText(textBody, htmlBody);
            mailSender.send(message);

            log.info("E-mail de nova resposta enviado com sucesso para [{}] (Protocolo: {})",
                    ticket.getSolicitanteEmail(), ticket.getProtocolo());

        } catch (Exception ex) {
            log.error("Erro ao enviar e-mail de nova resposta para [{}]: {}",
                    ticket.getSolicitanteEmail(), ex.getMessage(), ex);
        }
    }

    private String buildHtmlTemplate(
            String solicitanteNome,
            String statusTitle,
            String statusBadgeColor,
            String mensagemHtml,
            String directTrackingUrl
    ) {
        StringBuilder sb = new StringBuilder(2048);
        sb.append("<!DOCTYPE html>\n")
          .append("<html lang=\"pt-BR\">\n")
          .append("<head>\n")
          .append("  <meta charset=\"UTF-8\">\n")
          .append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
          .append("  <title>Flow Chamados</title>\n")
          .append("</head>\n")
          .append("<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;\">\n")
          .append("  <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);\">\n")
          .append("    <tr>\n")
          .append("      <td style=\"padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;\">\n")
          .append("        <span style=\"font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;\">FLOW <span style=\"color: #2563eb;\">CHAMADOS</span></span>\n")
          .append("      </td>\n")
          .append("    </tr>\n")
          .append("    <tr>\n")
          .append("      <td style=\"padding: 32px;\">\n")
          .append("        <div style=\"margin-bottom: 20px;\">\n")
          .append("          <span style=\"display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ")
          .append(statusBadgeColor)
          .append(";\">\n")
          .append("            ")
          .append(escapeHtml(statusTitle))
          .append("\n          </span>\n")
          .append("        </div>\n")
          .append("        <p style=\"margin: 0 0 16px; font-size: 15px; line-height: 1.5;\">Olá, <strong>")
          .append(escapeHtml(solicitanteNome))
          .append("</strong>,</p>\n")
          .append("        <div style=\"margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;\">\n")
          .append("          ")
          .append(mensagemHtml)
          .append("\n        </div>\n")
          .append("        <div style=\"text-align: center; margin: 28px 0;\">\n")
          .append("          <a href=\"")
          .append(directTrackingUrl)
          .append("\" style=\"display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.2px;\">\n")
          .append("            Acessar Meu Chamado\n")
          .append("          </a>\n")
          .append("        </div>\n")
          .append("      </td>\n")
          .append("    </tr>\n")
          .append("    <tr>\n")
          .append("      <td style=\"padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5;\">\n")
          .append("        <p style=\"margin: 0 0 6px; font-weight: 600; color: #dc2626;\">\n")
          .append("          ⚠️ Atenção: Não responda a este e-mail.\n")
          .append("        </p>\n")
          .append("        <p style=\"margin: 0;\">\n")
          .append("          Este é um e-mail automático do sistema Flow Chamados. Mensagens enviadas para este endereço são descartadas. Para responder ou interagir no chamado, utilize o link de acesso direto acima.\n")
          .append("        </p>\n")
          .append("      </td>\n")
          .append("    </tr>\n")
          .append("  </table>\n")
          .append("</body>\n")
          .append("</html>");

        return sb.toString();
    }

    private String buildTextTemplate(
            String solicitanteNome,
            String mensagemTxt,
            String directTrackingUrl
    ) {
        StringBuilder sb = new StringBuilder(512);
        sb.append("Olá, ").append(solicitanteNome).append(",\n\n")
          .append(mensagemTxt).append("\n\n")
          .append("Acesse seu chamado diretamente sem precisar preencher dados no link abaixo:\n")
          .append(directTrackingUrl).append("\n\n")
          .append("--------------------------------------------------\n")
          .append("ATENÇÃO: NÃO RESPONDA A ESTE E-MAIL.\n")
          .append("Este é um e-mail automático do sistema Flow Chamados. Mensagens enviadas para este endereço são descartadas.\n")
          .append("Para interagir no chamado, utilize o link acima.\n")
          .append("--------------------------------------------------\n");

        return sb.toString();
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
