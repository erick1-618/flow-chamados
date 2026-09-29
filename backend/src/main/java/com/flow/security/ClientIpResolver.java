package com.flow.security;

import jakarta.servlet.http.HttpServletRequest;

public class ClientIpResolver {

    private ClientIpResolver() {}

    public static String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return "0.0.0.0";
        }

        // 1. Cloudflare header
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank() && !"unknown".equalsIgnoreCase(cfIp)) {
            return cfIp.trim();
        }

        // 2. Standard X-Forwarded-For (pega o primeiro IP da cadeia de proxies)
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            String[] ips = xForwardedFor.split(",");
            if (ips.length > 0 && !ips[0].isBlank()) {
                String ip = ips[0].trim();
                // Remove porta se houver (ex: 1.2.3.4:5678)
                int colonIdx = ip.indexOf(':');
                if (colonIdx > 0 && !ip.contains("::")) { // não remove dois-pontos se for IPv6
                    ip = ip.substring(0, colonIdx);
                }
                return ip;
            }
        }

        // 3. X-Real-IP (Nginx)
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp.trim();
        }

        // 4. Fallback para remote address direto
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr.trim() : "0.0.0.0";
    }
}
