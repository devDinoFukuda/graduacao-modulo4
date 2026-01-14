
import { useState, useEffect, useMemo } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../amplify/data/resource";
import {
    Button,
    Flex,
    Heading,
    TextField,
    SelectField,
    View,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Alert,
    Badge,
    Text,
    Divider,
    TextAreaField,
    Card
} from '@aws-amplify/ui-react';
import { StorageManager, StorageImage } from '@aws-amplify/ui-react-storage';
import { getUrl } from 'aws-amplify/storage';
import '@aws-amplify/ui-react-storage/styles.css';

// --- VALIDAÇÕES (CPF/CNPJ) ---
function isValidCPF(cpf: string) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf == '') return false;
    if (cpf.length != 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11) rev = 0;
    if (rev != parseInt(cpf.charAt(10))) return false;
    return true;
}

function isValidCNPJ(cnpj: string) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj == '') return false;
    if (cnpj.length != 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != parseInt(digitos.charAt(0))) return false;
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != parseInt(digitos.charAt(1))) return false;
    return true;
}

import { UserRole } from "../App";
import { NotificationService } from "../services/NotificationService";

export default function EventoView({ role }: { role: UserRole }) {
    const client = generateClient<Schema>();
    const [eventos, setEventos] = useState<Array<Schema["Evento"]["type"]>>([]);
    const [mode, setMode] = useState<"list" | "create" | "edit">("list");
    const [editingId, setEditingId] = useState<string | null>(null);

    // Navigation for EDIT Mode only
    // Added "participantes"
    const [activeSection, setActiveSection] = useState<"dados" | "fontes" | "despesas" | "participantes" | "fotos" | "encerrar">("dados");

    // --- State for Forms ---
    const [nome, setNome] = useState("");
    const [tipo, setTipo] = useState("");
    const [dataEvento, setDataEvento] = useState("");
    const [hrInicio, setHrInicio] = useState("");
    const [hrFim, setHrFim] = useState("");
    const [status, setStatus] = useState("Ativo");



    // Closing Inputs
    // REMOVED qtdParticipantes manual input
    const [resumoFechamento, setResumoFechamento] = useState("");

    // NEW STATES: Funding Sources (Create Mode accumulator)
    interface TempFonte {
        origem: "Doacao" | "Caixa";
        valor: number;
        doadorNome?: string;
        doadorDocumento?: string;
        formaPagamento?: string;
        justificativaUso?: string;
    }
    const [tempFontes, setTempFontes] = useState<TempFonte[]>([]);

    // NEW STATES: Related Data (Edit Mode)
    const [fotos, setFotos] = useState<Array<Schema["FotoEvento"]["type"]>>([]);
    const [gastos, setGastos] = useState<Array<Schema["GastoEvento"]["type"]>>([]);
    const [fontesDB, setFontesDB] = useState<Array<Schema["FonteRecurso"]["type"]>>([]);

    // NEW STATES: Participantes
    const [participantes, setParticipantes] = useState<Array<Schema["Beneficiario"]["type"]>>([]);
    const [allBeneficiarios, setAllBeneficiarios] = useState<Array<Schema["Beneficiario"]["type"]>>([]);

    // Derived state for selection (Real-time filter)
    const availableBeneficiarios = useMemo(() => {
        const subscribedIds = participantes.map(p => p.id);
        return allBeneficiarios.filter(b => !subscribedIds.includes(b.id));
    }, [allBeneficiarios, participantes]);

    const [selectedBeneficiarioId, setSelectedBeneficiarioId] = useState("");

    // Inputs for Actions
    const [newFotoUrl, setNewFotoUrl] = useState("");

    // Expense Inputs
    const [gastoDesc, setGastoDesc] = useState("");
    const [gastoValDisplay, setGastoValDisplay] = useState("R$ 0,00");
    const [gastoVal, setGastoVal] = useState(0);
    const [gastoFornNome, setGastoFornNome] = useState("");
    const [gastoFornDoc, setGastoFornDoc] = useState("");
    const [gastoLink, setGastoLink] = useState("");

    // Funding Input
    const [fonteOrigem, setFonteOrigem] = useState<"Doacao" | "Caixa">("Doacao");
    const [fonteValorDisplay, setFonteValorDisplay] = useState("R$ 0,00");
    const [fonteValor, setFonteValor] = useState(0);
    const [fonteNome, setFonteNome] = useState("");
    const [fonteDoc, setFonteDoc] = useState("");
    const [fontePagto, setFontePagto] = useState("PIX");
    const [fonteJustif, setFonteJustif] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // PERMISSIONS MATRIX
    const canManageLifecycle = role === 'Administrador'; // Cancel, Close
    const canManageDetails = role === 'Operador'; // Add $$$, Participants, Photos
    const canSuspend = role === 'Administrador' || role === 'Operador';

    // --- Helpers ---
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const parseMoney = (val: string) => {
        const only = val.replace(/\D/g, "");
        if (!only) return { v: 0, d: "R$ 0,00" };
        const f = parseInt(only) / 100;
        return { v: f, d: f.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) };
    }

    const listTimes: string[] = [];
    for (let h = 6; h <= 22; h++) {
        for (let m = 0; m < 60; m += 15) listTimes.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }

    // --- Loading ---
    useEffect(() => { loadEventos(); loadBeneficiariosGlobal(); }, []);
    async function loadEventos() {
        client.models.Evento.observeQuery().subscribe({ next: (d) => setEventos([...d.items]) });
    }
    // New Global Subscription
    async function loadBeneficiariosGlobal() {
        client.models.Beneficiario.observeQuery().subscribe({ next: (d) => setAllBeneficiarios([...d.items]) });
    }

    async function updateEventBalance(evtId: string) {
        const fList = await client.models.FonteRecurso.list({ filter: { eventoId: { eq: evtId } } });
        const v = fList.data.reduce((acc, i) => acc + i.valor, 0);

        const gList = await client.models.GastoEvento.list({ filter: { eventoId: { eq: evtId } } });
        const g = gList.data.reduce((acc, i) => acc + i.valorGasto, 0);

        const novoSaldo = v - g;
        await client.models.Evento.update({ id: evtId, verbaDisponivel: v, saldoAtual: novoSaldo });
    }

    async function loadRelated(id: string) {
        try {
            const f = await client.models.FotoEvento.list({ filter: { eventoId: { eq: id } } }); setFotos(f.data);
            const g = await client.models.GastoEvento.list({ filter: { eventoId: { eq: id } } }); setGastos(g.data);
            const src = await client.models.FonteRecurso.list({ filter: { eventoId: { eq: id } } }); setFontesDB(src.data);

            // Load Participants
            const inscricoes = await client.models.InscricaoEvento.list({ filter: { eventoId: { eq: id } } });
            const partList: Array<Schema["Beneficiario"]["type"]> = [];
            for (const insc of inscricoes.data) {
                const ben = await insc.beneficiario();
                if (ben.data) partList.push(ben.data);
            }
            setParticipantes(partList);

            setParticipantes(partList);
            // Available Beneficiarios is now calculated via useMemo

            // Auto-Repair/Sync Balance
            updateEventBalance(id);

        } catch (e) { console.warn(e); }
    }

    // --- Logic: Add Source ---
    async function getGlobalBalance() {
        // Fetch all events to calculate total NGO balance (Limit increased for safety)
        const allEvts = await client.models.Evento.list({ limit: 1000 });
        return allEvts.data.reduce((acc, e) => acc + (e.saldoAtual || 0), 0);
    }

    // --- Logic: Add Source ---
    async function handleAddFonte(isDirectDb: boolean) {
        if (fonteValor <= 0) { alert("Valor deve ser maior que zero."); return; }

        // New Validation: Global Fund Check
        if (fonteOrigem === "Caixa") {
            if (!fonteJustif || fonteJustif.length < 100) { alert("Justificativa min 100 chars."); return; }

            const currentGlobal = await getGlobalBalance();
            if (fonteValor > currentGlobal) {
                alert(`ERRO: Saldo em Caixa insuficiente!\n\nDisponível: ${formatCurrency(currentGlobal)}\nSolicitado: ${formatCurrency(fonteValor)}`);
                return;
            }
        } else {
            if (!fonteNome || !fonteDoc) { alert("Nome e Documento obrigatórios."); return; }
            if (!isValidCPF(fonteDoc) && !isValidCNPJ(fonteDoc)) { alert("CPF ou CNPJ inválido."); return; }
        }

        const newFonte: TempFonte = {
            origem: fonteOrigem,
            valor: fonteValor,
            doadorNome: fonteOrigem === "Doacao" ? fonteNome : undefined,
            doadorDocumento: fonteOrigem === "Doacao" ? fonteDoc : undefined,
            formaPagamento: fonteOrigem === "Doacao" ? fontePagto : undefined,
            justificativaUso: fonteOrigem === "Caixa" ? fonteJustif : undefined
        };

        if (isDirectDb && editingId) {
            try {
                await client.models.FonteRecurso.create({ eventoId: editingId, ...newFonte });
                alert("Recurso adicionado!");
                // Recalc Balance and Update
                await updateEventBalance(editingId);
                loadRelated(editingId);
                setFonteValor(0); setFonteValorDisplay("R$ 0,00"); setFonteNome(""); setFonteDoc(""); setFonteJustif("");
            } catch (e: any) { console.error(e); alert("Erro ao salvar: " + e.message); }
        } else {
            setTempFontes([...tempFontes, newFonte]);
            setFonteValor(0); setFonteValorDisplay("R$ 0,00"); setFonteNome(""); setFonteDoc(""); setFonteJustif("");
        }
    }

    // --- Logic: Add Participant ---
    async function handleAddParticipante() {
        if (!editingId || !selectedBeneficiarioId) return;
        try {
            await client.models.InscricaoEvento.create({
                eventoId: editingId,
                beneficiarioId: selectedBeneficiarioId
            });
            setSuccess("Participante adicionado!");

            // AUTOMATION TRIGGER (Fetch details first)
            const benDetails = availableBeneficiarios.find(b => b.id === selectedBeneficiarioId);
            const evtDetails = eventos.find(e => e.id === editingId);

            if (benDetails && evtDetails) {
                NotificationService.sendEventConfirmation({
                    nomeBeneficiario: benDetails.nomeCompleto,
                    emailBeneficiario: benDetails.email || "",
                    nomeEvento: evtDetails.nomeEvento,
                    data: new Date(evtDetails.dataInicio).toLocaleDateString(),
                    horaInicio: evtDetails.horarioInicio,
                    horaFim: evtDetails.horarioFim
                });
            }

            setSelectedBeneficiarioId("");
            loadRelated(editingId); // Refresh list
        } catch (e: any) {
            setError("Erro ao adicionar participante: " + e.message);
        }
    }

    // --- Logic: Add Expense ---
    async function handleAddExpense() {
        if (!editingId) return;
        if (!gastoDesc || gastoDesc.length < 10) { alert("Descrição min 10 chars."); return; }
        if (!gastoFornNome || !gastoFornDoc) { alert("Fornecedor incompleto."); return; }
        if (!isValidCPF(gastoFornDoc) && !isValidCNPJ(gastoFornDoc)) { alert("Doc Fornecedor inválido."); return; }
        if (!gastoLink || gastoLink.length < 5) { alert("Link do comprovante é obrigatório."); return; }

        try {
            await client.models.GastoEvento.create({
                eventoId: editingId, descricaoGasto: gastoDesc, valorGasto: gastoVal,
                fornecedorNome: gastoFornNome, fornecedorDocumento: gastoFornDoc, s3LinkComprovante: gastoLink
            });
            alert("Despesa lançada!");
            await updateEventBalance(editingId);
            loadRelated(editingId);
            setGastoDesc(""); setGastoVal(0); setGastoValDisplay("R$ 0,00"); setGastoFornNome(""); setGastoFornDoc(""); setGastoLink("");
        } catch (e: any) { alert("Erro: " + e.message); }
    }

    // --- Create Event ---
    const createTotalVerba = useMemo(() => tempFontes.reduce((acc, f) => acc + f.valor, 0), [tempFontes]);
    const isCreateValid = useMemo(() => {
        if (!nome || nome.trim().length < 10) return false;
        if (!tipo) return false;
        if (!dataEvento || dataEvento < minDate) return false;
        if (!hrInicio || !hrFim) return false;
        if (hrFim <= hrInicio) return false;
        if (createTotalVerba < 100) return false;
        return true;
    }, [nome, tipo, dataEvento, hrInicio, hrFim, createTotalVerba]);

    async function handleCreate() {
        if (!isCreateValid) return;

        // Validate 'Caixa' usage in Creation
        const caixaUsage = tempFontes.filter(f => f.origem === 'Caixa').reduce((a, b) => a + b.valor, 0);
        if (caixaUsage > 0) {
            const currentGlobal = await getGlobalBalance();
            if (caixaUsage > currentGlobal) {
                alert(`ERRO: Saldo em Caixa insuficiente para cobrir R$ ${caixaUsage}!\nDisponível: ${formatCurrency(currentGlobal)}`);
                return;
            }
        }

        try {
            const evt = await client.models.Evento.create({
                nomeEvento: nome, tipoEvento: tipo,
                verbaDisponivel: createTotalVerba, saldoAtual: createTotalVerba,
                statusEvento: "Ativo",
                dataInicio: dataEvento, horarioInicio: hrInicio + ":00",
                dataFim: dataEvento, horarioFim: hrFim + ":00"
            });

            if (evt.data?.id) {
                for (const f of tempFontes) {
                    await client.models.FonteRecurso.create({ eventoId: evt.data.id, origem: f.origem, ...f as any });
                }
                await client.models.AuditLog.create({ usuario: "User", tipoAcao: "CriarEvento", dataHora: new Date().toISOString() });
                setSuccess("Evento Criado!"); setMode("list"); resetForm();
            }
        } catch (e: any) { setError(e.message); }
    }

    // --- Generic Actions ---
    function resetForm() {
        setNome(""); setTipo(""); setDataEvento(""); setHrInicio(""); setHrFim(""); setStatus("Ativo");
        setResumoFechamento("");
        setTempFontes([]); setEditingId(null); setError(""); setSuccess("");
        setActiveSection("dados");
    }
    function goToEdit(e: any) {
        setEditingId(e.id);
        setNome(e.nomeEvento); setTipo(e.tipoEvento); setDataEvento(e.dataInicio);
        setHrInicio(e.horarioInicio.substring(0, 5)); setHrFim(e.horarioFim.substring(0, 5)); setStatus(e.statusEvento);
        loadRelated(e.id);
        setMode("edit");
        setActiveSection("dados");
    }

    // --- Status Actions ---
    async function handleSuspend() {
        if (!editingId) return;
        const just = window.prompt("Justificativa (Min 60 chars):");
        if (!just || just.length < 60) { alert("Justificativa curta."); return; }
        await client.models.Evento.update({ id: editingId, statusEvento: "Suspenso", justificativaCancelamento: "SUSPENSO: " + just });
        await client.models.AuditLog.create({ usuario: "Admin", tipoAcao: "Suspender", justificativa: just, dataHora: new Date().toISOString() });
        setStatus("Suspenso"); setSuccess("Suspenso.");
    }
    async function handleActivate() {
        if (!editingId) return;
        await client.models.Evento.update({ id: editingId, statusEvento: "Ativo" });
        await client.models.AuditLog.create({ usuario: "Admin", tipoAcao: "Reativar", dataHora: new Date().toISOString() });
        setStatus("Ativo"); setSuccess("Evento Reativado (Ativo).");
    }
    async function handleCancel() {
        if (!editingId || !canManageLifecycle) { alert("Apenas Administradores podem cancelar."); return; }
        const just = window.prompt("Justificativa (Min 100 chars):");
        if (!just || just.length < 100) { alert("Justificativa curta."); return; }
        await client.models.Evento.update({ id: editingId, statusEvento: "Cancelado", justificativaCancelamento: just });
        await client.models.AuditLog.create({ usuario: "Admin", tipoAcao: "Cancelar", justificativa: just, dataHora: new Date().toISOString() });
        setStatus("Cancelado"); setSuccess("Cancelado.");
    }

    async function handleCloseEvent() {
        if (!editingId || !canManageLifecycle) return;
        if (participantes.length < 5) { alert("Mínimo 5 participantes para encerrar."); return; }
        if (fotos.length < 2) { alert("Mínimo 2 fotos."); return; }
        if (resumoFechamento.length < 100) { alert("Resumo deve ter min 100 chars."); return; }

        try {
            await client.models.Evento.update({
                id: editingId,
                statusEvento: "Encerrado",
                publicoAlcancado: participantes.length, // Automated from list
                resumoFechamento: resumoFechamento
            });
            await client.models.AuditLog.create({ usuario: "Admin", tipoAcao: "EncerrarEvento", dataHora: new Date().toISOString() });
            setStatus("Encerrado"); setSuccess("Evento Encerrado com Sucesso!");
        } catch (e: any) { setError(e.message); }
    }


    // --- Dashboard Calc (Edit Mode) ---
    const totalReceita = mode === 'create'
        ? createTotalVerba
        : (eventos.find(e => e.id === editingId)?.verbaDisponivel || 0);
    const totalDespesa = gastos.reduce((acc, g) => acc + g.valorGasto, 0);
    const saldo = totalReceita - totalDespesa;
    let saldoColor = "var(--amplify-colors-yellow-40)"; // 0
    if (saldo > 0) saldoColor = "var(--amplify-colors-green-40)";
    if (saldo < 0) saldoColor = "var(--amplify-colors-red-40)";

    // --- Sub-Component: Funding Form ---
    const renderFundingForm = (isDb: boolean) => (
        <Card variation="outlined" backgroundColor="var(--amplify-colors-neutral-10)">
            <Heading level={6}>Adicionar Fonte de Recurso</Heading>
            <Flex wrap="wrap" gap="1rem" marginTop="0.5rem">
                <SelectField label="Origem" value={fonteOrigem} onChange={e => setFonteOrigem(e.target.value as any)}>
                    <option value="Doacao">Doação</option>
                    <option value="Caixa">Caixa da ONG</option>
                </SelectField>
                <TextField label="Valor" value={fonteValorDisplay} onChange={e => {
                    const { v, d } = parseMoney(e.target.value); setFonteValor(v); setFonteValorDisplay(d);
                }} />
            </Flex>
            {fonteOrigem === "Doacao" ? (
                <Flex wrap="wrap" gap="1rem" marginTop="0.5rem">
                    <TextField label="Nome Doador" value={fonteNome} onChange={e => setFonteNome(e.target.value)} grow={1} />
                    <TextField label="CPF/CNPJ Doador" value={fonteDoc} onChange={e => setFonteDoc(e.target.value)} />
                    <SelectField label="Pagamento" value={fontePagto} onChange={e => setFontePagto(e.target.value)}>
                        <option value="PIX">PIX</option>
                        <option value="Transferencia">Transferência</option>
                        <option value="Debito">Cartão Débito</option>
                        <option value="Dinheiro">Dinheiro</option>
                    </SelectField>
                </Flex>
            ) : (
                <TextAreaField label="Justificativa (Min 100 chars)" value={fonteJustif} onChange={e => setFonteJustif(e.target.value)} marginTop="0.5rem" />
            )}
            <Button size="small" marginTop="1rem" onClick={() => handleAddFonte(isDb)} isDisabled={status === 'Encerrado' || !canManageDetails}>+ Adicionar Recurso</Button>
        </Card>
    );

    return (
        <View padding="1rem">
            {/* HEADER TITLE DINÁMICO */}
            <Heading level={2} marginBottom="1rem">
                {mode === 'list' ? 'Gestão de Eventos' :
                    mode === 'create' ? 'Novo Evento' :
                        `Gestão do Evento ${nome}`}
            </Heading>

            {mode === 'list' && (
                <View>
                    <Button onClick={() => { resetForm(); setMode('create') }}>+ Novo Evento</Button>
                    <View overflow="auto">
                        <Table highlightOnHover={true} marginTop="1rem" minWidth="600px">
                            <TableHead><TableRow><TableCell as="th">Nome</TableCell><TableCell as="th">Data</TableCell><TableCell as="th">Status</TableCell><TableCell as="th">Saldo</TableCell><TableCell as="th">Ação</TableCell></TableRow></TableHead>
                            <TableBody>
                                {eventos.map(e => {
                                    // Status Color
                                    let stColor = 'green';
                                    if (e.statusEvento === 'Ativo') stColor = 'success';
                                    if (e.statusEvento === 'Suspenso') stColor = 'warning';
                                    if (e.statusEvento === 'Cancelado') stColor = 'error';
                                    if (e.statusEvento === 'Encerrado') stColor = 'info';

                                    // Balance Color
                                    const s = e.saldoAtual || 0;
                                    let bColor = 'yellow';
                                    if (s > 0) bColor = 'success';
                                    if (s < 0) bColor = 'error';

                                    return (
                                        <TableRow key={e.id}>
                                            <TableCell>{e.nomeEvento}</TableCell>
                                            <TableCell>{new Date(e.dataInicio).toLocaleDateString()}</TableCell>
                                            <TableCell><Badge variation={stColor as any}>{e.statusEvento}</Badge></TableCell>
                                            <TableCell><Badge variation={bColor as any}>{formatCurrency(s)}</Badge></TableCell>
                                            <TableCell><Button size="small" onClick={() => goToEdit(e)}>Gerenciar</Button></TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </View>
                </View>
            )}

            {/* CREATE MODE */}
            {mode === 'create' && (
                <Flex direction="column" gap="1rem">
                    <Button variation="link" onClick={() => setMode('list')}>&larr; Cancelar</Button>
                    <Card variation="elevated">
                        <Heading level={4}>Novo Evento</Heading>
                        <Flex direction="column" gap="1rem" marginTop="1rem">
                            <TextField label="Nome *" value={nome} onChange={e => setNome(e.target.value)} />
                            <SelectField label="Tipo *" value={tipo} onChange={e => setTipo(e.target.value)}>
                                <option value="">Selecione...</option>
                                <option value="Campanha de Saude">Campanha de Saúde</option>
                                <option value="Comunidade">Cuidados na Comunidade</option>
                                <option value="Diversao">Diversão na Comunidade</option>
                                <option value="Natal">Natal Solidário</option>
                            </SelectField>
                            <TextField label="Data *" type="date" min={minDate} value={dataEvento} onChange={e => setDataEvento(e.target.value)} />
                            <Flex>
                                <SelectField label="Início" value={hrInicio} onChange={e => setHrInicio(e.target.value)} grow={1}>{listTimes.map(t => <option key={t} value={t}>{t}</option>)}</SelectField>
                                <SelectField label="Fim" value={hrFim} onChange={e => setHrFim(e.target.value)} grow={1}>{listTimes.map(t => <option key={t} value={t}>{t}</option>)}</SelectField>
                            </Flex>

                            <Divider orientation="horizontal" />
                            <Heading level={5}>Fontes de Recurso (Mínimo R$ 100,00)</Heading>
                            {renderFundingForm(false)}

                            <View padding="1rem" backgroundColor="var(--amplify-colors-neutral-10)">
                                <Heading level={6}>Fontes Adicionadas:</Heading>
                                <ul>{tempFontes.map((f, i) => <li key={i}>{f.origem} - {formatCurrency(f.valor)}</li>)}</ul>
                                <Flex alignItems="center" marginTop="1rem" gap="1rem">
                                    <Text fontWeight="bold">Total Verba:</Text>
                                    <Text color={createTotalVerba < 100 ? "red" : "green"} fontWeight="bold" fontSize="large">{formatCurrency(createTotalVerba)}</Text>
                                    {createTotalVerba < 100 && <Badge variation="error">Mínimo R$ 100,00</Badge>}
                                </Flex>
                            </View>

                            <Button variation="primary" onClick={handleCreate} isDisabled={!isCreateValid} size="large">Criar Evento</Button>
                        </Flex>
                    </Card>
                </Flex>
            )}

            {/* EDIT MODE */}
            {mode === 'edit' && (
                <Flex direction="column" gap="1rem">
                    <Button variation="link" onClick={() => setMode('list')}>&larr; Voltar</Button>

                    <Card variation="elevated">
                        <Heading level={4}>Controle Financeiro</Heading>
                        <Flex gap="2rem" marginTop="1rem">
                            <View><Text fontSize="small">Receita</Text><Text color="green" fontWeight="bold" fontSize="large">{formatCurrency(totalReceita)}</Text></View>
                            <View><Text fontSize="small">Despesas</Text><Text color="red" fontWeight="bold" fontSize="large">{formatCurrency(totalDespesa)}</Text></View>
                            <View><Text fontSize="small">Saldo</Text><Badge backgroundColor={saldoColor} size="large">{formatCurrency(saldo)}</Badge></View>
                        </Flex>
                    </Card>

                    {error && <Alert variation="error">{error}</Alert>}
                    {success && <Alert variation="success">{success}</Alert>}

                    <Flex gap="1rem" style={{ borderBottom: "1px solid #ccc" }} wrap="wrap">
                        <Button variation={activeSection === 'dados' ? 'primary' : 'link'} onClick={() => setActiveSection('dados')}>Dados Gerais</Button>
                        <Button variation={activeSection === 'fontes' ? 'primary' : 'link'} onClick={() => setActiveSection('fontes')}>Fontes</Button>
                        <Button variation={activeSection === 'despesas' ? 'primary' : 'link'} onClick={() => setActiveSection('despesas')}>Despesas</Button>
                        <Button variation={activeSection === 'participantes' ? 'primary' : 'link'} onClick={() => setActiveSection('participantes')}>Participantes</Button>
                        <Button variation={activeSection === 'fotos' ? 'primary' : 'link'} onClick={() => setActiveSection('fotos')}>Fotos</Button>
                        <Button variation={activeSection === 'encerrar' ? 'primary' : 'link'} onClick={() => setActiveSection('encerrar')} style={{ color: 'darkblue' }}>Encerrar Evento</Button>
                    </Flex>

                    {/* DADOS */}
                    {activeSection === 'dados' && (
                        <Flex direction="column" gap="1rem" padding="1rem">
                            <Card variation="outlined" style={{ borderColor: 'orange' }}>
                                <Heading level={5} color="red">Zona de Risco</Heading>
                                <Flex gap="1rem" marginTop="0.5rem">
                                    {status === 'Ativo' && <Button variation="warning" size="small" onClick={handleSuspend} isDisabled={!canSuspend}>Suspender</Button>}
                                    {status === 'Suspenso' && <Button variation="primary" size="small" onClick={handleActivate} isDisabled={!canSuspend}>Ativar (Reabrir)</Button>}
                                    <Button variation="destructive" size="small" onClick={handleCancel} isDisabled={status === 'Cancelado' || status === 'Encerrado' || !canManageLifecycle}>Cancelar (Admin)</Button>
                                </Flex>
                            </Card>
                            <TextField label="Nome (Imutável)" value={nome} isReadOnly={true} />
                            <SelectField label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} isDisabled={status === 'Encerrado'}>
                                <option value="Campanha de Saude">Campanha de Saúde</option>
                                <option value="Comunidade">Cuidados na Comunidade</option>
                                <option value="Diversao">Diversão na Comunidade</option>
                                <option value="Natal">Natal Solidário</option>
                            </SelectField>
                            <TextField label="Data" type="date" value={dataEvento} onChange={e => setDataEvento(e.target.value)} />
                            <Flex>
                                <SelectField label="Início" value={hrInicio} onChange={e => setHrInicio(e.target.value)} grow={1}>{listTimes.map(t => <option key={t} value={t}>{t}</option>)}</SelectField>
                                <SelectField label="Fim" value={hrFim} onChange={e => setHrFim(e.target.value)} grow={1}>{listTimes.map(t => <option key={t} value={t}>{t}</option>)}</SelectField>
                            </Flex>
                            <Button onClick={async () => {
                                try { await client.models.Evento.update({ id: editingId!, tipoEvento: tipo, dataInicio: dataEvento, horarioInicio: hrInicio + ':00', horarioFim: hrFim + ':00' }); setSuccess("Salvo"); } catch (e: any) { setError(e.message) }
                            }} isDisabled={status === 'Encerrado'}>Salvar Alterações</Button>
                        </Flex>
                    )}

                    {/* FONTES */}
                    {activeSection === 'fontes' && (
                        <Flex direction="column" gap="1rem" padding="1rem">
                            {renderFundingForm(true)}
                            <View overflow="auto">
                                <Table minWidth="500px">
                                    <TableHead><TableRow><TableCell>Origem</TableCell><TableCell>Doador</TableCell><TableCell>Valor</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {fontesDB.map((f, i) => <TableRow key={i}><TableCell>{f.origem}</TableCell><TableCell>{f.doadorNome || 'Caixa'}</TableCell><TableCell>{formatCurrency(f.valor)}</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                            </View>
                        </Flex>
                    )}

                    {/* DESPESAS */}
                    {activeSection === 'despesas' && (
                        <Flex direction="column" gap="1rem" padding="1rem">
                            <Card variation="outlined">
                                <Heading level={6}>Lançar Despesa</Heading>
                                <Flex wrap="wrap" gap="1rem">
                                    <TextField label="Fornecedor" value={gastoFornNome} onChange={e => setGastoFornNome(e.target.value)} grow={1} />
                                    <TextField label="CNPJ/CPF" value={gastoFornDoc} onChange={e => setGastoFornDoc(e.target.value)} />
                                    <TextField label="Descrição (min 10)" value={gastoDesc} onChange={e => setGastoDesc(e.target.value)} grow={2} />
                                    <TextField label="Valor" value={gastoValDisplay} onChange={e => { const { v, d } = parseMoney(e.target.value); setGastoVal(v); setGastoValDisplay(d) }} />
                                </Flex>
                                <View marginTop="1rem">
                                    <Text fontWeight="bold" fontSize="small">Comprovante (Obrigatório)</Text>
                                    <StorageManager
                                        acceptedFileTypes={['image/*', 'application/pdf']}
                                        path={`eventos/comprovantes/${editingId}/`}
                                        maxFileCount={1}
                                        onUploadSuccess={(event) => setGastoLink(event.key || "")}
                                        isResumable
                                    />
                                    {gastoLink && <Text color="green" fontSize="xs">Arquivo carregado: {gastoLink.split('/').pop()}</Text>}
                                </View>
                                <Button size="small" marginTop="1rem" onClick={handleAddExpense} isDisabled={
                                    status === 'Encerrado' || !gastoDesc || !gastoVal || !gastoFornNome || !gastoFornDoc || !gastoLink || !canManageDetails
                                }>Lançar Despesa</Button>
                            </Card>
                            <View overflow="auto">
                                <Table minWidth="600px">
                                    <TableHead><TableRow><TableCell>Forn.</TableCell><TableCell>Desc</TableCell><TableCell>Valor</TableCell><TableCell>Comprovante</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {gastos.map(g => (
                                            <TableRow key={g.id}>
                                                <TableCell>{g.fornecedorNome}</TableCell>
                                                <TableCell>{g.descricaoGasto}</TableCell>
                                                <TableCell>{formatCurrency(g.valorGasto)}</TableCell>
                                                <TableCell>
                                                    <Button size="small" variation="link" onClick={async () => {
                                                        try {
                                                            const link = await getUrl({ path: g.s3LinkComprovante });
                                                            window.open(link.url.toString(), '_blank');
                                                        } catch (e) { alert("Erro ao abrir arquivo: " + e); }
                                                    }}>Ver Comprovante</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </View>
                        </Flex>
                    )}

                    {/* PARTICIPANTES */}
                    {activeSection === 'participantes' && (
                        <Flex direction="column" gap="1rem" padding="1rem">
                            <Heading level={5}>Participantes do Evento ({participantes.length})</Heading>

                            <Card variation="outlined">
                                <Heading level={6}>Adicionar Participante (Existente)</Heading>
                                <Flex gap="1rem" alignItems="flex-end">
                                    <SelectField label="Selecione Beneficiário" labelHidden onChange={e => setSelectedBeneficiarioId(e.target.value)} grow={1}>
                                        <option value="">Selecione...</option>
                                        {availableBeneficiarios.map(b => <option key={b.id} value={b.id}>{b.nomeCompleto} ({b.documentoIdentidade})</option>)}
                                    </SelectField>
                                    <Button onClick={handleAddParticipante} isDisabled={!selectedBeneficiarioId || status === 'Encerrado' || !canManageDetails}>Adicionar</Button>
                                </Flex>
                            </Card>

                            <View overflow="auto">
                                <Table minWidth="600px">
                                    <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Documento</TableCell><TableCell>Email</TableCell><TableCell>WhatsApp</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {participantes.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.nomeCompleto}</TableCell>
                                                <TableCell>{p.documentoIdentidade}</TableCell>
                                                <TableCell>{p.email}</TableCell>
                                                <TableCell>{p.whatsapp}</TableCell>
                                            </TableRow>
                                        ))}
                                        {participantes.length === 0 && <TableRow><TableCell colSpan={4}>Nenhum participante inscrito.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </View>
                        </Flex>
                    )}

                    {/* FOTOS */}
                    {activeSection === 'fotos' && (
                        <Flex direction="column" gap="1rem" padding="1rem">
                            <Heading level={5}>Galeria de Fotos</Heading>
                            <Flex gap="0.5rem" direction="column">
                                <StorageManager
                                    acceptedFileTypes={['image/*']}
                                    path={`eventos/fotos/${editingId}/`}
                                    maxFileCount={5}
                                    onUploadSuccess={(event) => {
                                        // Auto-add database record on upload success
                                        if (event.key) {
                                            client.models.FotoEvento.create({ eventoId: editingId!, s3LinkFoto: event.key })
                                                .then(() => loadRelated(editingId!))
                                                .catch(e => console.error(e));
                                        }
                                    }}
                                    isResumable
                                />
                                <Text fontSize="small">Uploads são salvos automaticamente na galeria.</Text>
                            </Flex>
                            <Flex wrap="wrap" gap="0.5rem" marginTop="1rem">
                                {fotos.map(f => (
                                    <View key={f.id} width="150px" height="150px" backgroundColor="#ddd" style={{ overflow: 'hidden', position: 'relative' }}>
                                        <StorageImage alt="Foto evento" path={f.s3LinkFoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </View>
                                ))}
                                {fotos.length === 0 && <Text>Nenhuma foto adicionada.</Text>}
                            </Flex>
                        </Flex>
                    )}

                    {/* ENCERRAR EVENTO */}
                    {activeSection === 'encerrar' && (
                        <Flex direction="column" gap="1rem" padding="1rem">
                            <Card variation="outlined" style={{ borderColor: 'darkblue' }}>
                                <Heading level={4} color="darkblue">Encerrar Evento</Heading>
                                <Text>O encerramento é definitivo e requer validação de administrador.</Text>
                                <Divider marginTop="1rem" marginBottom="1rem" />
                                <TextAreaField label="Resumo Descritivo (Min 100 caracteres)" value={resumoFechamento} onChange={e => setResumoFechamento(e.target.value)} rows={5} />
                                <View marginTop="1rem">
                                    <Heading level={6}>Checklist para Encerramento:</Heading>
                                    <Text color={participantes.length >= 5 ? "green" : "red"}>{participantes.length >= 5 ? "✅" : "❌"} Mínimo 5 Participantes ({participantes.length} atual)</Text>
                                    <Text color={fotos.length >= 2 ? "green" : "red"}>{fotos.length >= 2 ? "✅" : "❌"} Mínimo 2 Fotos ({fotos.length} atual)</Text>
                                    <Text color={resumoFechamento.length >= 100 ? "green" : "red"}>{resumoFechamento.length >= 100 ? "✅" : "❌"} Resumo preenchido (min 100 chars)</Text>
                                    <Text color={canManageLifecycle ? "green" : "red"}>{canManageLifecycle ? "✅" : "❌"} Permissão de Administrador</Text>
                                </View>
                                <Button marginTop="1rem" variation="primary" style={{ backgroundColor: 'darkblue' }}
                                    isDisabled={participantes.length < 5 || fotos.length < 2 || resumoFechamento.length < 100 || !canManageLifecycle || status === 'Encerrado'}
                                    onClick={handleCloseEvent}
                                >
                                    {status === 'Encerrado' ? 'Evento Já Encerrado' : 'Encerrar Evento Definitivamente'}
                                </Button>
                            </Card>
                        </Flex>
                    )}
                </Flex>
            )}
        </View>
    );
}
