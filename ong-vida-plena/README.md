# Sistema de Gestão Inteligente - ONG Vida Plena
![Status](https://img.shields.io/badge/Status-Concluído-success) ![Amplify](https://img.shields.io/badge/Built_with-AWS_Amplify_Gen_2-orange) ![React](https://img.shields.io/badge/Frontend-React_18-blue) ![License](https://img.shields.io/badge/License-MIT-green)

> Uma solução de gestão financeira e operacional baseada em nuvem, desenhada sob medidades para profissionalizar a atuação da ONG Vida Plena com custo operacional ajustado.

## 🎯 Objetivo e Proposta de Valor
Este projeto foi desenvolvido para substituir controles descentralizados (planilhas) por um sistema **unificado, auditável e seguro** na nuvem AWS.
Ele permite que a ONG gerencie:
*   **Eventos e Orçamento:** Controle rígido de Receitas (Doações) vs Despesas (com upload de notas fiscais).
*   **Beneficiários:** Cadastro único com validação de CPF e histórico de atendimentos.
*   **Agenda:** Cronogramas de ações sociais.

---

## 🏗️ Arquitetura Low-Code Robusta (AWS Amplify Gen 2)

Este projeto adota uma abordagem híbrida **"High-Productivity Low-Code"**:

### O que isso significa na prática?
1.  **Backend Zero-Config:** Toda a infraestrutura (Banco de Dados, API, Autenticação) é gerada automaticamente a partir de um arquivo de modelo (`resource.ts`). Não houve necessidade de configurar servidores (Serverless).
2.  **Interface Acelerada:** Utiliza a biblioteca `@aws-amplify/ui-react` que fornece componentes prontos (Login, Upload, Tabelas), reduzindo o tempo de desenvolvimento de Frontend em ~80%.
3.  **Segurança Enterprise:** O sistema utiliza o mesmo motor de identidade (Amazon Cognito) usado por bancos e grandes empresas, oferecendo proteção contra ataques de força bruta e MFA nativamente.

> **Destaque Técnico:** Embora seja Low-Code, o sistema mantém a robustez do código TypeScript, permitindo validações complexas

---

## 💰 Eficiência de Custos (Budget-Friendly)

A arquitetura foi minuciosamente desenhada para se encaixar no orçamento restrito de uma ONG, maximizando o uso dos **Níveis Gratuitos (Free Tiers)** da AWS.

| Serviço             | Função          | Custo (Estimado)      | Detalhe                                            |
| :------------------ | :-------------- | :-------------------- | :------------------------------------------------- |
| **Amazon Cognito**  | Login/Usuários  | **Grátis**            | Até 50.000 usuários ativos/mês (vitalício).        |
| **DynamoDB**        | Banco de Dados  | **Grátis**            | Até 25GB de armazenamento (vitalício).             |
| **Amplify Hosting** | Hospedagem Site | **Grátis** (12 meses) | Após: ~$0.01/minuto de build (custo sob demanda).  |
| **Amazon S3**       | Arquivos/Fotos  | **Baixo Custo**       | Paga-se centavos apenas pelo que usar (~$0.02/GB). |

**Resultado:** A ONG opera com tecnologia de ponta pagando apenas uma fração do que custaria um software SaaS tradicional.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
*   Node.js 18+
*   Conta AWS ativa (para deploy)

### Instalação e Execução Local
```bash
# 1. Clone o repositório
git clone [url-do-repo]

# 2. Instale as dependências
npm install

# 3. Inicie o Sandbox (Ambiente de Nuvem Pessoal)
# Isso criará automaticamente seu backend na AWS em minutos
npx ampx sandbox

# 4. Em outro terminal, rode o frontend
npm run dev
```

### Deploy para Produção
O projeto está configurado para CI/CD (Integração Contínua). Basta conectar este repositório ao **AWS Amplify Console**:
1.  Acesse o AWS Console -> AWS Amplify.
2.  Clique em "Create New App".
3.  Selecione GitHub e este repositório.
4.  O Amplify detectará tudo automaticamente. Clique em "Save and Deploy".

---