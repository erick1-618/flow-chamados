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

            String directTrackingUrl = String.format(
                    "%s/?tab=acompanhar&protocolo=%s&email=%s",
                    baseFrontend,
                    URLEncoder.encode(ticket.getProtocolo(), StandardCharsets.UTF_8),
                    URLEncoder.encode(ticket.getSolicitanteEmail().trim().toLowerCase(), StandardCharsets.UTF_8)
            );

            String statusTitle;
            String statusBadgeColor;
            String subject;
            String mensagemHtml;
            String mensagemTxt;

            if (newStatus == TicketStatus.AGUARDANDO_ACAO) {
                statusTitle = "Aguardando ação";
                statusBadgeColor = "#f59e0b"; // âmbar / amarelo de atenção
                subject = String.format("[Flow Chamados] Ação necessária no chamado [%s] - %s", ticket.getProtocolo(), ticket.getTitulo());
                mensagemHtml = "Seu chamado <strong>[" + escapeHtml(ticket.getProtocolo()) + "] " + escapeHtml(ticket.getTitulo()) +
                        "</strong> foi atualizado para <strong>Aguardando ação</strong>.<br><br>" +
                        "Nossa equipe necessita de informações adicionais ou de uma confirmação sua para continuar o atendimento.";
                mensagemTxt = "Seu chamado [" + ticket.getProtocolo() + "] " + ticket.getTitulo() +
                        " foi atualizado para o status: Aguardando ação.\n\n" +
                        "Nossa equipe necessita de informações adicionais ou de uma confirmação sua para continuar o atendimento.";
            } else {
                statusTitle = "Finalizado";
                statusBadgeColor = "#10b981"; // verde de sucesso
                subject = String.format("[Flow Chamados] Chamado concluído [%s] - %s", ticket.getProtocolo(), ticket.getTitulo());
                mensagemHtml = "Seu chamado <strong>[" + escapeHtml(ticket.getProtocolo()) + "] " + escapeHtml(ticket.getTitulo()) +
                        "</strong> foi concluído com sucesso e marcado como <strong>Finalizado</strong>.<br><br>" +
                        "Agradecemos o contato. Caso queira consultar o histórico do chamado, acesse o link abaixo.";
                mensagemTxt = "Seu chamado [" + ticket.getProtocolo() + "] " + ticket.getTitulo() +
                        " foi concluído com sucesso e marcado como Finalizado.\n\n" +
                        "Agradecemos o contato. Caso queira consultar o histórico do chamado, acesse o link abaixo.";
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

    private String buildHtmlTemplate(
            String solicitanteNome,
            String statusTitle,
            String statusBadgeColor,
            String mensagemHtml,
            String directTrackingUrl
    ) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"pt-BR\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "  <title>Flow Chamados</title>\n" +
                "</head>\n" +
                "<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;\">\n" +
                "  <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);\">\n" +
                "    <tr>\n" +
                "      <td style=\"padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;\">\n" +
                "        <span style=\"font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;\">FLOW <span style=\"color: #2563eb;\">CHAMADOS</span></span>\n" +
                "      </td>\n" +
                "    </tr>\n" +
                "    <tr>\n" +
                "      <td style=\"padding: 32px;\">\n" +
                "        <div style=\"margin-bottom: 20px;\">\n" +
                "          <span style=\"display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: " + statusBadgeColor + ";\">\n" +
                "            " + escapeHtml(statusTitle) + "\n" +
                "          </span>\n" +
                "        </div>\n" +
                "        <p style=\"margin: 0 0 16px; font-size: 15px; line-height: 1.5;\">Olá, <strong>" + escapeHtml(solicitanteNome) + "</strong>,</p>\n" +
                "        <div style=\"margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;\">\n" +
                "          " + mensagemHtml + "\n" +
                "        </div>\n" +
                "        <div style=\"text-align: center; margin: 28px 0;\">\n" +
                "          <a href=\"" + directTrackingUrl + "\" style=\"display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.2px;\">\n" +
                "            Acessar Meu Chamado Diretamente\n" +
                "          </a>\n" +
                "        </div>\n" +
                "        <p style=\"margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;\">\n" +
                "          Ou acesse diretamente através do link:<br>\n" +
                "          <a href=\"" + directTrackingUrl + "\" style=\"color: #2563eb; word-break: break-all; font-size: 12px;\">" + directTrackingUrl + "</a>\n" +
                "        </p>\n" +
                "      </td>\n" +
                "    </tr>\n" +
                "    <tr>\n" +
                "      <td style=\"padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.5;\">\n" +
                "        <p style=\"margin: 0 0 6px; font-weight: 600; color: #dc2626;\">\n" +
                "          ⚠️ Atenção: Não responda a este e-mail.\n" +
                "        </p>\n" +
                "        <p style=\"margin: 0;\">\n" +
                "          Este é um e-mail automático do sistema Flow Chamados. Mensagens enviadas para este endereço são descartadas. Para responder ou interagir no chamado, utilize o link de acesso direto acima.\n" +
                "        </p>\n" +
                "      </td>\n" +
                "    </tr>\n" +
                "  </table>\n" +
                "</body>\n" +
                "</html>";
    }

    private String buildTextTemplate(
            String solicitanteNome,
            String mensagemTxt,
            String directTrackingUrl
    ) {
        return "Olá, " + solicitanteNome + ",\n\n" +
                mensagemTxt + "\n\n" +
                "Acesse seu chamado diretamente sem precisar preencher dados no link abaixo:\n" +
                directTrackingUrl + "\n\n" +
                "--------------------------------------------------\n" +
                "ATENÇÃO: NÃO RESPONDA A ESTE E-MAIL.\n" +
                "Este é um e-mail automático do sistema Flow Chamados. Mensagens enviadas para este endereço são descartadas.\n" +
                "Para interagir no chamado, utilize o link acima.\n" +
                "--------------------------------------------------\n";
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
