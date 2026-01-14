import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../amplify/data/resource";
import {
    View, Heading, Flex, Card, Text, Badge, Grid
} from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

// --- CUSTOM SVG CHARTS (No External Deps) ---


// 1. Bar Chart Component
const SimpleBarChart = ({ data }: { data: any[] }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const height = 200;
    const width = 600; // responsive container handled by CSS
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartH = height - margin.top - margin.bottom;
    const chartW = width - margin.left - margin.right;

    // Calc Max Y
    const maxVal = Math.max(...data.map(d => Math.max(d.receita, d.despesa)), 100);
    const scaleY = (val: number) => (val / maxVal) * chartH;
    const barWidth = (chartW / data.length) / 3;

    return (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '500px' }}>
                {/* Axis Lines */}
                <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#ccc" />
                <line x1={margin.left} y1={height - margin.bottom} x2={margin.left} y2={margin.top} stroke="#ccc" />

                {/* Y Axis Labels */}
                {[0, 0.5, 1].map(t => (
                    <text key={t} x={margin.left - 10} y={height - margin.bottom - (maxVal * t / maxVal * chartH)}
                        fontSize="10" textAnchor="end" fill="#666">
                        R$ {(maxVal * t).toLocaleString('pt-BR', { notation: "compact" })}
                    </text>
                ))}

                {/* Bars */}
                {data.map((d, i) => {
                    const x = margin.left + (i * (chartW / data.length)) + 20;
                    const hRec = scaleY(d.receita);
                    const hDesp = scaleY(d.despesa);

                    return (
                        <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                            {/* Receita Bar */}
                            <rect x={x} y={height - margin.bottom - hRec} width={barWidth} height={hRec} fill="var(--amplify-colors-green-60)" rx="2" />
                            {/* Despesa Bar */}
                            <rect x={x + barWidth + 2} y={height - margin.bottom - hDesp} width={barWidth} height={hDesp} fill="var(--amplify-colors-red-60)" rx="2" />

                            {/* Label Truncated */}
                            <text x={x + barWidth} y={height - margin.bottom + 15} fontSize="10" textAnchor="middle" fill="#333">
                                {d.name.substring(0, 6)}...
                            </text>

                            {/* Tooltip Overlay (Simple Text in SVG for robustness) */}
                            {hoverIndex === i && (
                                <g>
                                    <rect x={x - 40} y={height - margin.bottom - Math.max(hRec, hDesp) - 40} width="140" height="35" rx="4" fill="rgba(0,0,0,0.8)" />
                                    <text x={x + 30} y={height - margin.bottom - Math.max(hRec, hDesp) - 25} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">
                                        {d.name}
                                    </text>
                                    <text x={x + 30} y={height - margin.bottom - Math.max(hRec, hDesp) - 12} fill="#bfb" fontSize="9" textAnchor="middle">
                                        Rec: R${d.receita.toLocaleString()} | Desp: R${d.despesa.toLocaleString()}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

// 2. Donut Chart Component
const SimpleDonutChart = ({ data }: { data: { name: string, value: number, color: string }[] }) => {
    const total = data.reduce((acc, d) => acc + d.value, 0);
    const size = 160;
    const center = size / 2;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    return (
        <Flex alignItems="center" gap="1rem" wrap="wrap">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={center} cy={center} r={radius} fill="none" stroke="#eee" strokeWidth="20" />
                {data.map((d, i) => {
                    const dashVal = (d.value / total) * circumference;
                    const dashParams = `${dashVal} ${circumference}`;
                    const currentOffset = offset;
                    offset += dashVal; // Increment for next segment

                    return (
                        <circle key={i} cx={center} cy={center} r={radius} fill="none" stroke={d.color} strokeWidth="20"
                            strokeDasharray={dashParams}
                            strokeDashoffset={-currentOffset} // Negative for clockwise
                            transform={`rotate(-90 ${center} ${center})`}
                        >
                            <title>{d.name}: {d.value}</title>
                        </circle>
                    );
                })}
                <text x={center} y={center} textAnchor="middle" dy="5" fontSize="20" fontWeight="bold">{total}</text>
            </svg>
            <View>
                {data.map((d, i) => (
                    <Flex key={i} alignItems="center" gap="0.5rem" marginBottom="0.2rem">
                        <View width="10px" height="10px" backgroundColor={d.color} borderRadius="50%" />
                        <Text fontSize="small">{d.name} ({d.value})</Text>
                    </Flex>
                ))}
            </View>
        </Flex>
    );
};


export default function DashboardView() {
    const [metrics, setMetrics] = useState({
        totalEventos: 0,
        totalBeneficiarios: 0,
        receitaTotal: 0,
        despesaTotal: 0,
        saldoTotal: 0,

        eventos: [] as Array<Schema["Evento"]["type"]>,
        inscricoes: [] as Array<Schema["InscricaoEvento"]["type"]>
    });
    const [lastUpdate, setLastUpdate] = useState(new Date());

    useEffect(() => {
        // Real-Time Subscriptions
        const subEvents = client.models.Evento.observeQuery().subscribe({
            next: (data) => {
                const evts = data.items;
                const rec = evts.reduce((acc, e) => acc + (e.verbaDisponivel || 0), 0);
                const saldo = evts.reduce((acc, e) => acc + (e.saldoAtual || 0), 0);
                const desp = rec - saldo;

                setMetrics(prev => ({
                    ...prev,
                    totalEventos: evts.length,
                    receitaTotal: rec,
                    despesaTotal: desp,
                    saldoTotal: saldo,
                    eventos: evts
                }));
                setLastUpdate(new Date());
            }
        });

        const subBen = client.models.Beneficiario.observeQuery().subscribe({
            next: (data) => {
                setMetrics(prev => ({ ...prev, totalBeneficiarios: data.items.length }));
                setLastUpdate(new Date());
            }
        });

        const subInsc = client.models.InscricaoEvento.observeQuery().subscribe({
            next: (data) => {
                setMetrics(prev => ({ ...prev, inscricoes: [...data.items] }));
                setLastUpdate(new Date());
            }
        });

        return () => {
            subEvents.unsubscribe();
            subBen.unsubscribe();
            subInsc.unsubscribe();
        };
    }, []);

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Prepare Data for Charts
    const financialData = metrics.eventos.map(e => ({
        name: e.nomeEvento,
        receita: e.verbaDisponivel || 0,
        despesa: (e.verbaDisponivel || 0) - (e.saldoAtual || 0)
    }));

    const statusData = [
        { name: 'Ativo', value: metrics.eventos.filter(e => e.statusEvento === 'Ativo').length, color: 'var(--amplify-colors-green-60)' },
        { name: 'Suspenso', value: metrics.eventos.filter(e => e.statusEvento === 'Suspenso').length, color: 'var(--amplify-colors-yellow-60)' },
        { name: 'Cancelado', value: metrics.eventos.filter(e => e.statusEvento === 'Cancelado').length, color: 'var(--amplify-colors-red-60)' },
        { name: 'Encerrado', value: metrics.eventos.filter(e => e.statusEvento === 'Encerrado').length, color: 'var(--amplify-colors-blue-60)' }
    ].filter(d => d.value > 0);

    return (
        <View padding="1rem">
            <Flex justifyContent="space-between" alignItems="center" marginBottom="1rem">
                <Heading level={2}>Dashboard</Heading>
                <Flex alignItems="center" gap="0.5rem">
                    <View width="10px" height="10px" borderRadius="50%" backgroundColor="lime" boxShadow="0 0 5px lime"></View>
                    <Text fontSize="xs" color="gray">Tempo Real • {lastUpdate.toLocaleTimeString()}</Text>
                </Flex>
            </Flex>

            {/* TOP CARDS */}
            <Grid templateColumns={{ base: "1fr", medium: "1fr 1fr", large: "1fr 1fr 1fr 1fr" }} gap="1rem" marginBottom="2rem">
                <Card variation="elevated">
                    <Text fontSize="small">Receita Total</Text>
                    <Heading level={1} color="green">{formatCurrency(metrics.receitaTotal)}</Heading>
                </Card>
                <Card variation="elevated">
                    <Text fontSize="small">Despesas Totais</Text>
                    <Heading level={1} color="red">{formatCurrency(metrics.despesaTotal)}</Heading>
                </Card>
                <Card variation="elevated" backgroundColor="var(--amplify-colors-neutral-10)">
                    <Text fontSize="small">Saldo Geral</Text>
                    <Heading level={1}>{formatCurrency(metrics.saldoTotal)}</Heading>
                </Card>
                <Card variation="elevated" backgroundColor="var(--amplify-colors-purple-10)">
                    <Text fontSize="small" fontWeight="bold">Total de Beneficiários Cadastrados na ONG</Text>
                    <Heading level={1}>{metrics.totalBeneficiarios}</Heading>
                </Card>
            </Grid>

            {/* CHARTS ROW */}
            <Grid templateColumns={{ base: "1fr", large: "2fr 1fr" }} gap="1rem">
                <Card variation="outlined">
                    <Heading level={5} marginBottom="1rem">Comparativo Financeiro por Evento</Heading>
                    {financialData.length > 0 ? <SimpleBarChart data={financialData} /> : <Text>Sem dados.</Text>}
                </Card>

                <Card variation="outlined">
                    <Heading level={5} marginBottom="1rem">Distribuição de Status</Heading>
                    {metrics.totalEventos > 0 ? <SimpleDonutChart data={statusData} /> : <Text>Sem dados.</Text>}
                </Card>
            </Grid>

            {/* DETAILS TABLE */}
            <Card variation="outlined" marginTop="1rem">
                <Heading level={5} marginBottom="0.5rem">Detalhamento Operacional</Heading>
                <View overflow="auto">
                    <View as="table" width="100%" minWidth="600px">
                        <View as="thead">
                            <View as="tr" backgroundColor="#f5f5f5">
                                <View as="th" padding="0.5rem" textAlign="left">Evento</View>
                                <View as="th" padding="0.5rem" textAlign="left">Status</View>
                                <View as="th" padding="0.5rem" textAlign="left">Participantes</View>
                                <View as="th" padding="0.5rem" textAlign="left">Adesão (%)</View>
                                <View as="th" padding="0.5rem" textAlign="left">Saldo</View>
                            </View>
                        </View>
                        <View as="tbody">
                            {metrics.eventos.map(e => {
                                // Calculate participants dynamically from real-time inscriptions
                                const realTimeParticipants = metrics.inscricoes.filter(i => i.eventoId === e.id).length;

                                const percent = metrics.totalBeneficiarios > 0
                                    ? (realTimeParticipants / metrics.totalBeneficiarios * 100)
                                    : 0;
                                return (
                                    <View as="tr" key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <View as="td" padding="0.5rem">{e.nomeEvento}</View>
                                        <View as="td" padding="0.5rem"><Badge variation={e.statusEvento === 'Ativo' ? 'success' : 'info'}>{e.statusEvento}</Badge></View>
                                        <View as="td" padding="0.5rem">{realTimeParticipants}</View>
                                        <View as="td" padding="0.5rem">
                                            <Badge variation={percent > 50 ? 'success' : percent > 20 ? 'warning' : 'info'}>
                                                {percent.toFixed(1)}%
                                            </Badge>
                                        </View>
                                        <View as="td" padding="0.5rem" color={(e.saldoAtual || 0) >= 0 ? 'green' : 'red'} fontWeight="bold">{formatCurrency(e.saldoAtual || 0)}</View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Card>
        </View>
    );
}
