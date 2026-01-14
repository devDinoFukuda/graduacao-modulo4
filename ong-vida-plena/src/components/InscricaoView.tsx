import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../amplify/data/resource";
import {
    Button,
    Flex,
    Heading,
    SelectField,
    View,
    Alert,
    Loader
} from '@aws-amplify/ui-react';

import { NotificationService } from "../services/NotificationService";

// const client = generateClient<Schema>();

export default function InscricaoView() {
    const client = generateClient<Schema>();
    const [beneficiarios, setBeneficiarios] = useState<Array<Schema["Beneficiario"]["type"]>>([]);
    const [eventos, setEventos] = useState<Array<Schema["Evento"]["type"]>>([]);

    const [selectedBen, setSelectedBen] = useState("");
    const [selectedEvt, setSelectedEvt] = useState("");

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: "error" | "success", text: string } | null>(null);

    useEffect(() => {
        const subBen = client.models.Beneficiario.observeQuery().subscribe({ next: (d) => setBeneficiarios([...d.items]) });
        const subEvt = client.models.Evento.observeQuery().subscribe({ next: (d) => setEventos([...d.items.filter(e => e.statusEvento === "Ativo")]) });
        return () => { subBen.unsubscribe(); subEvt.unsubscribe(); };
    }, []);

    async function handleInscricao() {
        setMsg(null);
        if (!selectedBen || !selectedEvt) {
            setMsg({ type: "error", text: "Selecione Beneficiário e Evento." });
            return;
        }
        setLoading(true);

        try {
            // Validação de Duplicidade
            // Amplify Gen 2 não tem Unique Constraint composto nativo simples no create, então checamos antes.
            // O index secundário ajuda na performance dessa busca.
            const existing = await client.models.InscricaoEvento.list({
                filter: {
                    and: [
                        { beneficiarioId: { eq: selectedBen } },
                        { eventoId: { eq: selectedEvt } }
                    ]
                }
            });

            if (existing.data.length > 0) {
                setMsg({ type: "error", text: "Este beneficiário JÁ ESTÁ inscrito neste evento." });
                setLoading(false);
                return;
            }

            await client.models.InscricaoEvento.create({
                beneficiarioId: selectedBen,
                eventoId: selectedEvt
            });

            await client.models.AuditLog.create({
                usuario: "UsuarioAtual",
                tipoAcao: "InscreverBeneficiario",
                justificativa: `Inscrição ben ${selectedBen} evt ${selectedEvt}`,
                dataHora: new Date().toISOString()
            });

            // AUTOMATION TRIGGER
            const evtDetails = eventos.find(e => e.id === selectedEvt);
            const benDetails = beneficiarios.find(b => b.id === selectedBen);

            if (evtDetails && benDetails) {
                NotificationService.sendEventConfirmation({
                    nomeBeneficiario: benDetails.nomeCompleto,
                    emailBeneficiario: benDetails.email || "",
                    nomeEvento: evtDetails.nomeEvento,
                    data: new Date(evtDetails.dataInicio).toLocaleDateString(),
                    horaInicio: evtDetails.horarioInicio,
                    horaFim: evtDetails.horarioFim
                });
            }

            setMsg({ type: "success", text: "Inscrição realizada com sucesso!" });
        } catch (e: any) {
            setMsg({ type: "error", text: "Erro: " + e.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <View padding="1rem">
            <Heading level={2}>Inscrição em Eventos</Heading>

            {msg && <Alert variation={msg.type}>{msg.text}</Alert>}

            <Flex gap="1rem" direction="column" marginTop="2rem" maxWidth="600px">
                <SelectField
                    label="Selecione o Evento (Apenas Ativos)"
                    placeholder="Selecione..."
                    value={selectedEvt}
                    onChange={(e) => setSelectedEvt(e.target.value)}
                >
                    {eventos.map(ev => (
                        <option key={ev.id} value={ev.id}>
                            {ev.nomeEvento} ({new Date(ev.dataInicio).toLocaleDateString()})
                        </option>
                    ))}
                </SelectField>

                <SelectField
                    label="Selecione o Beneficiário"
                    placeholder="Selecione..."
                    value={selectedBen}
                    onChange={(e) => setSelectedBen(e.target.value)}
                >
                    {beneficiarios.map(b => (
                        <option key={b.id} value={b.id}>
                            {b.nomeCompleto} - {b.documentoIdentidade}
                        </option>
                    ))}
                </SelectField>

                <Button
                    variation="primary"
                    onClick={handleInscricao}
                    isDisabled={loading}
                >
                    {loading ? <Loader /> : "Realizar Inscrição"}
                </Button>
            </Flex>
        </View>
    );
}
