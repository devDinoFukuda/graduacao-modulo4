import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../amplify/data/resource";
import {
    Button,
    Flex,
    Heading,
    TextField,
    View,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Alert
} from '@aws-amplify/ui-react';

// Helper de Validação de CPF
function isValidCPF(strCPF: string) {
    var Soma;
    var Resto;
    Soma = 0;
    if (strCPF == "00000000000") return false;

    for (let i = 1; i <= 9; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11)) Resto = 0;
    if (Resto != parseInt(strCPF.substring(9, 10))) return false;

    Soma = 0;
    for (let i = 1; i <= 10; i++) Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
    Resto = (Soma * 10) % 11;

    if ((Resto == 10) || (Resto == 11)) Resto = 0;
    if (Resto != parseInt(strCPF.substring(10, 11))) return false;
    return true;
}

import { UserRole } from "../App";
import { NotificationService } from "../services/NotificationService";

export default function BeneficiarioView({ role }: { role: UserRole }) {
    const client = generateClient<Schema>();
    const [beneficiarios, setBeneficiarios] = useState<Array<Schema["Beneficiario"]["type"]>>([]);
    console.log("Role:", role); // Supress unused warning

    // Form States
    const [nome, setNome] = useState("");
    const [documento, setDocumento] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [email, setEmail] = useState("");

    // Date Split States
    const [dia, setDia] = useState("");
    const [mes, setMes] = useState("");
    const [ano, setAno] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Helpers for Date Selectors (Dynamic)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 110 }, (_, i) => currentYear - i);
    const months = [
        { val: "01", label: "Janeiro" }, { val: "02", label: "Fevereiro" }, { val: "03", label: "Março" },
        { val: "04", label: "Abril" }, { val: "05", label: "Maio" }, { val: "06", label: "Junho" },
        { val: "07", label: "Julho" }, { val: "08", label: "Agosto" }, { val: "09", label: "Setembro" },
        { val: "10", label: "Outubro" }, { val: "11", label: "Novembro" }, { val: "12", label: "Dezembro" }
    ];

    // Calcula dias no mês selecionado
    const getDaysInMonth = (m: string, y: string) => {
        if (!m || !y) return 31;
        return new Date(parseInt(y), parseInt(m), 0).getDate();
    };
    const maxDays = getDaysInMonth(mes, ano);
    const days = Array.from({ length: maxDays }, (_, i) => i + 1);

    // Máscara de WhatsApp
    const handleWhatsappChange = (val: string) => {
        // Remove tudo que não é dígito
        let r = val.replace(/\D/g, "");
        // Limita a 11 dígitos (DDD + 9 + 8 números)
        r = r.substring(0, 11);
        // Aplica máscara (XX) 9XXXX-XXXX
        r = r.replace(/^(\d{2})(\d)/g, "($1) $2");
        r = r.replace(/(\d)(\d{4})$/, "$1-$2");
        setWhatsapp(r);
    };

    useEffect(() => {
        const sub = client.models.Beneficiario.observeQuery().subscribe({
            next: (data) => setBeneficiarios([...data.items]),
        });
        return () => sub.unsubscribe();
    }, []);

    async function handleCreate() {
        setError("");
        setSuccess("");

        // 1. Validação de Campos Obrigatórios
        if (!nome || !documento || !dia || !mes || !ano) {
            setError("Preencha Nome, Documento e Data de Nascimento completa.");
            return;
        }

        // 2. Validação de Nome Completo
        if (nome.trim().split(" ").length < 2) {
            setError("Informe o Nome Completo (Mínimo nome e sobrenome).");
            return;
        }

        // 3. Validação de Documento (CPF ou RG Genérico)
        const docClean = documento.replace(/\D/g, "");
        if (docClean.length === 11) {
            // Tenta validar CPF
            if (!isValidCPF(docClean)) {
                setError("CPF Inválido.");
                return;
            }

            // [NOVO] Validação de Unicidade de CPF (Read-Before-Write)
            try {
                const existing = await client.models.Beneficiario.list({
                    filter: { documentoIdentidade: { eq: documento } }
                });
                if (existing.data.length > 0) {
                    setError("CPF já cadastrado para outro beneficiário.");
                    return;
                }
            } catch (errCheck) {
                console.error("Erro ao verificar unicidade:", errCheck);
                // Opcional: Bloquear ou permitir com aviso? Bloqueando por segurança.
                setError("Erro de conexão ao validar unicidade. Tente novamente.");
                return;
            }

        } else if (docClean.length < 5) {
            setError("Documento de Identidade muito curto.");
            return;
        }

        // 4. Validação e Formato WhatsApp
        if (whatsapp) {
            const whatsClean = whatsapp.replace(/\D/g, "");
            if (whatsClean.length < 11 || whatsClean[2] !== '9') {
                setError("WhatsApp inválido. Deve ter DDD e começar com 9. Ex: (11) 91234-5678");
                return;
            }
        }

        // 5. Validação de Email
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setError("E-mail inválido.");
                return;
            }
        }

        // Construct Date YYYY-MM-DD
        const dayPadded = dia.toString().padStart(2, '0');
        const validDate = `${ano}-${mes}-${dayPadded}`;

        try {
            await client.models.Beneficiario.create({
                nomeCompleto: nome,
                documentoIdentidade: documento,
                whatsapp: whatsapp,
                email: email,
                dataNascimento: validDate,
                dataCadastramento: new Date().toISOString(),
            });
            setSuccess("Beneficiário cadastrado com sucesso!");

            // AUTOMATION TRIGGER
            NotificationService.sendWelcomeEmail({
                nome: nome,
                email: email,
                whatsapp: whatsapp
            });

            // Reset
            setNome(""); setDocumento(""); setWhatsapp(""); setEmail("");
            setDia(""); setMes(""); setAno("");
        } catch (e: any) {
            setError("Erro ao salvar: " + e.message);
        }
    }

    return (
        <View padding="1rem">
            <Heading level={2}>Gestão de Beneficiários</Heading>

            {error && <Alert variation="error" isDismissible={true}>{error}</Alert>}
            {success && <Alert variation="success" isDismissible={true}>{success}</Alert>}

            <Flex direction="column" gap="1rem" marginTop="1rem" padding="1rem" backgroundColor="var(--amplify-colors-neutral-10)">
                <Heading level={4}>Novo Beneficiário</Heading>

                <TextField label="Nome Completo *" value={nome} onChange={(e) => setNome(e.target.value)} />
                <TextField label="Documento de Identidade (CPF ou RG) *" value={documento} onChange={(e) => setDocumento(e.target.value)} />

                <Flex gap="1rem" direction={{ base: 'column', small: 'row' }}>
                    <TextField
                        label="WhatsApp"
                        placeholder="(XX) 9XXXX-XXXX"
                        value={whatsapp}
                        onChange={(e) => handleWhatsappChange(e.target.value)}
                        grow={1}
                    />
                    <TextField label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} grow={1} />
                </Flex>

                <Heading level={6}>Data de Nascimento *</Heading>
                <Flex gap="0.5rem">
                    <select
                        style={{ padding: '0.5rem', flex: 1 }}
                        value={dia}
                        onChange={(e) => setDia(e.target.value)}
                    >
                        <option value="">Dia</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <select
                        style={{ padding: '0.5rem', flex: 2 }}
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                    >
                        <option value="">Mês</option>
                        {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                    </select>

                    <select
                        style={{ padding: '0.5rem', flex: 1 }}
                        value={ano}
                        onChange={(e) => setAno(e.target.value)}
                    >
                        <option value="">Ano</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </Flex>

                <Button onClick={handleCreate} variation="primary" marginTop="1rem">Salvar Beneficiário</Button>
            </Flex>

            <Heading level={3} marginTop="2rem">Lista de Beneficiários</Heading>
            <View overflow="auto">
                <Table highlightOnHover={true}>
                    <TableHead>
                        <TableRow>
                            <TableCell as="th">Nome</TableCell>
                            <TableCell as="th">Documento</TableCell>
                            <TableCell as="th">WhatsApp</TableCell>
                            <TableCell as="th">Nascimento</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {beneficiarios.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell>{b.nomeCompleto}</TableCell>
                                <TableCell>{b.documentoIdentidade}</TableCell>
                                <TableCell>{b.whatsapp || '-'}</TableCell>
                                <TableCell>{b.dataNascimento ? new Date(b.dataNascimento).toLocaleDateString() : '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </View>
        </View>
    );
}
