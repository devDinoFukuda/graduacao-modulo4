
// NotificationService.ts
// Serviço centralizado para disparo de automações (E-mail/WhatsApp) via Webhook

// TODO: Suba sua URL do Make/Zapier aqui quando estiver pronta
const WEBHOOK_URL_BENEFICIARIO = "https://hook.us2.make.com/vntv3u8f2bxraa1bdmtmbsxplu6dbgf8";
const WEBHOOK_URL_EVENTO = "https://hook.us2.make.com/vntv3u8f2bxraa1bdmtmbsxplu6dbgf8";

interface BeneficiarioPayload {
    nome: string;
    email: string;
    whatsapp: string;
}

interface EventoPayload {
    nomeBeneficiario: string;
    emailBeneficiario: string;
    nomeEvento: string;
    data: string;
    horaInicio: string;
    horaFim: string;
}

export const NotificationService = {

    async sendWelcomeEmail(payload: BeneficiarioPayload) {
        console.log("🔔 [NotificationService] Iniciando disparo de Boas Vindas...");

        if (!WEBHOOK_URL_BENEFICIARIO) {
            console.warn("⚠️ URL do Webhook não configurada. Simulando envio...");
            console.log("📤 Payload:", payload);
            alert(`[SIMULAÇÃO] E-mail de Boas Vindas enviado para ${payload.email}!`);
            return;
        }

        try {
            // Convert to URLSearchParams to force simple-request (no CORS Preflight)
            const params = new URLSearchParams();
            params.append('type', 'welcome'); // Discriminator for Make Router
            Object.entries(payload).forEach(([k, v]) => params.append(k, v));

            await fetch(WEBHOOK_URL_BENEFICIARIO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            console.log("✅ Webhook disparado com sucesso!");
        } catch (error) {
            console.error("❌ Erro ao disparar Webhook:", error);
        }
    },

    async sendEventConfirmation(payload: EventoPayload) {
        console.log("🔔 [NotificationService] Iniciando disparo de Confirmação de Evento...");

        if (!WEBHOOK_URL_EVENTO) {
            console.warn("⚠️ URL do Webhook não configurada. Simulando envio...");
            console.log("📤 Payload:", payload);
            alert(`[SIMULAÇÃO] Confirmação enviada para ${payload.emailBeneficiario}!\nEvent: ${payload.nomeEvento}\nDia: ${payload.data}`);
            return;
        }

        try {
            // Convert to URLSearchParams to force simple-request (no CORS Preflight)
            const params = new URLSearchParams();
            params.append('type', 'event_confirmation'); // Discriminator for Make Router
            Object.entries(payload).forEach(([k, v]) => params.append(k, v));

            await fetch(WEBHOOK_URL_EVENTO, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            console.log("✅ Webhook disparado com sucesso!");
        } catch (error) {
            console.error("❌ Erro ao disparar Webhook:", error);
        }
    }
};
