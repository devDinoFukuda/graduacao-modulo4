import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Flex, Heading, Text, Button, Tabs, View, Badge } from '@aws-amplify/ui-react';
import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import EventoView from "./components/EventoView";
import BeneficiarioView from "./components/BeneficiarioView";
import InscricaoView from "./components/InscricaoView";
import DashboardView from "./components/DashboardView";
import GestaoUsuariosView from "./components/GestaoUsuariosView";

// RBAC Types
export type UserRole = "Gerenciador" | "Administrador" | "Operador";

function AppContent() {
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const [currentRole, setCurrentRole] = useState<UserRole>("Operador"); // Default safe fallback
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkGroups() {
            try {
                const session = await fetchAuthSession();
                const groups = session.tokens?.accessToken.payload['cognito:groups'] as string[] || [];

                if (groups.includes('Gerenciador')) {
                    setCurrentRole('Gerenciador');
                } else if (groups.includes('Administrador')) {
                    setCurrentRole('Administrador');
                } else if (groups.includes('Operador')) {
                    setCurrentRole('Operador');
                } else {
                    // Fallback or No Access
                    setCurrentRole('Operador'); // MVP Default
                }
            } catch (e) {
                console.error("Erro ao ler grupos:", e);
            } finally {
                setLoading(false);
            }
        }
        checkGroups();
    }, [user]);

    if (loading) return <View>Carregando perfil...</View>;

    return (
        <main>
            <Flex as="header" justifyContent="space-between" padding="1rem" backgroundColor="var(--amplify-colors-brand-primary-80)" alignItems="center" wrap="wrap" gap="1rem">
                <View>
                    <Heading level={3} color="white">ONG Vida Plena</Heading>
                    <Flex gap="0.5rem" alignItems="center">
                        <Text color="var(--amplify-colors-neutral-20)" fontSize="small">
                            {user?.signInDetails?.loginId || user?.username}
                        </Text>
                        <Badge>{currentRole}</Badge>
                    </Flex>
                </View>

                <Button onClick={signOut} size="small" variation="primary" colorTheme="overlay">Sair</Button>
            </Flex>

            {/* RBAC ROUTING */}
            {currentRole === 'Gerenciador' ? (
                <GestaoUsuariosView />
            ) : (
                <View>
                    {/* Only Admin and Operator see the operational tabs */}
                    <Tabs
                        justifyContent="center"
                        defaultValue="dashboard"
                        items={[
                            { label: 'Dashboard', value: 'dashboard', content: <DashboardView /> },
                            {
                                label: 'Eventos',
                                value: 'eventos',
                                content: <EventoView role={currentRole} />
                            },
                            {
                                label: 'Beneficiários',
                                value: 'beneficiarios',
                                content: <BeneficiarioView role={currentRole} />
                            },
                            { label: 'Inscrições', value: 'inscricoes', content: <InscricaoView /> },
                        ]}
                    />
                </View>
            )}
        </main>
    );
}

function App() {
    return (
        <Authenticator hideSignUp={true}>
            <AppContent />
        </Authenticator>
    );
}

export default App;
