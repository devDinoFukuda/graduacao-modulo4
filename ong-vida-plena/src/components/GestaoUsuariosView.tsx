
import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../amplify/data/resource";
import {
    Button, Flex, Heading, TextField, View, Table, TableHead, TableRow,
    TableCell, TableBody, SelectField, Alert, Badge, Card, Text
} from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

export default function GestaoUsuariosView() {
    const [usuarios, setUsuarios] = useState<Array<Schema["Usuario"]["type"]>>([]);
    const [email, setEmail] = useState("");
    const [nome, setNome] = useState("");
    const [perfil, setPerfil] = useState("Operador");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => { loadHas(); }, []);

    async function loadHas() {
        const sub = client.models.Usuario.observeQuery().subscribe({
            next: (d) => setUsuarios([...d.items])
        });
        return () => sub.unsubscribe();
    }

    async function handleAdd() {
        if (!email || !nome) { setError("Campos obrigatórios."); return; }
        try {
            await client.models.Usuario.create({ email, nome, perfil });
            setSuccess("Usuário adicionado/autorizado.");
            setEmail(""); setNome("");
        } catch (e: any) { setError(e.message); }
    }

    async function handleDelete(id: string) {
        if (window.confirm("Remover acesso deste usuário?")) {
            await client.models.Usuario.delete({ id });
        }
    }

    return (
        <View padding="1rem">
            <Heading level={2}>Gestão de Acesso (Gerenciador)</Heading>
            <Text marginBottom="1rem">Controle de credenciais e perfis de acesso ao sistema.</Text>

            {error && <Alert variation="error" isDismissible>{error}</Alert>}
            {success && <Alert variation="success" isDismissible>{success}</Alert>}

            <Card variation="outlined" marginBottom="2rem" backgroundColor="var(--amplify-colors-neutral-10)">
                <Heading level={5}>Novo Usuário</Heading>
                <Flex alignItems="flex-end" wrap="wrap" marginTop="1rem">
                    <TextField label="E-mail (Login)" value={email} onChange={e => setEmail(e.target.value)} grow={1} />
                    <TextField label="Nome" value={nome} onChange={e => setNome(e.target.value)} grow={1} />
                    <SelectField label="Perfil" value={perfil} onChange={e => setPerfil(e.target.value)}>
                        <option value="Administrador">Administrador</option>
                        <option value="Operador">Operador</option>
                        <option value="Gerenciador">Gerenciador</option>
                    </SelectField>
                    <Button variation="primary" onClick={handleAdd}>Autorizar Acesso</Button>
                </Flex>
            </Card>

            <Table>
                <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Email</TableCell><TableCell>Perfil</TableCell><TableCell>Ação</TableCell></TableRow></TableHead>
                <TableBody>
                    {usuarios.map(u => (
                        <TableRow key={u.id}>
                            <TableCell>{u.nome}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell><Badge variation={u.perfil === 'Gerenciador' ? 'info' : u.perfil === 'Administrador' ? 'warning' : 'success'}>{u.perfil}</Badge></TableCell>
                            <TableCell><Button size="small" variation="destructive" onClick={() => handleDelete(u.id)}>Remover</Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </View>
    );
}
