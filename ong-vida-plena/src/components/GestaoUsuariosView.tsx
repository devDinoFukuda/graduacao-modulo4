
import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { type Schema } from "../../amplify/data/resource";
import {
    Button, Heading, View, Table, TableHead, TableRow,
    TableCell, TableBody, Alert, Badge, Card, Text
} from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

export default function GestaoUsuariosView() {
    const [usuarios, setUsuarios] = useState<Array<Schema["Usuario"]["type"]>>([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => { loadHas(); }, []);

    async function loadHas() {
        const sub = client.models.Usuario.observeQuery().subscribe({
            next: (d) => setUsuarios([...d.items])
        });
        return () => sub.unsubscribe();
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

            <Card variation="outlined" marginBottom="2rem" style={{ borderLeft: '5px solid orange' }}>
                <Heading level={5}>Gerenciamento de Acesso</Heading>
                <Text marginTop="0.5rem">
                    O <b>auto-cadastro</b> e a criação direta de usuários via aplicativo foram desabilitados por segurança (Política de Acesso Restrito).
                </Text>
                <Text marginTop="0.5rem">
                    Para adicionar novos colaboradores (Gerentes, Admins ou Operadores):
                </Text>
                <View as="ol" marginTop="0.5rem" marginLeft="1rem">
                    <li>Acesse o <b>AWS Console (Cognito)</b>.</li>
                    <li>Crie o usuário enviando o convite por e-mail.</li>
                    <li>Adicione o usuário ao respectivo <b>Grupo</b> de permissão.</li>
                </View>
                <Button variation="link" marginTop="0.5rem" onClick={() => window.open('https://console.aws.amazon.com/cognito/home', '_blank')}>
                    Abrir AWS Cognito &rarr;
                </Button>
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
