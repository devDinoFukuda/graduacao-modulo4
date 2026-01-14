import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== MODELAGEM DE DADOS - ONG VIDA PLENA ==
  Regras:
  - Nomes técnicos sem acentos
  - Validações rigorosas
  - Integridade referencial
*/

const schema = a.schema({
  // 1.1 Entidade: Beneficiario
  Beneficiario: a.model({
    nomeCompleto: a.string().required(),
    documentoIdentidade: a.string().required(), // Validar formato no Frontend
    whatsapp: a.string(),
    email: a.string(),
    dataNascimento: a.date().required(),
    dataCadastramento: a.datetime(), // Gerado via Frontend
    // Relacionamentos
    inscricoes: a.hasMany('InscricaoEvento', 'beneficiarioId'),
  }).authorization(allow => [
    allow.groups(['Administrador', 'Operador']).to(['read', 'create', 'update']),
    // Gerenciador removido: Blind Security Compliance
  ]),

  // 1.2 Entidade: Evento
  Evento: a.model({
    nomeEvento: a.string().required(),
    tipoEvento: a.string().required(), // Enum: "Campanha de Saude", "Campanha de Cuidados na Comunidade", etc.
    verbaDisponivel: a.float(), // Receita Total (Soma das Fontes)
    saldoAtual: a.float(), // Novo: Cache (Receita - Gastos) para performance na lista
    statusEvento: a.string().default("Ativo"), // "Ativo", "Suspenso", "Cancelado", "Encerrado"
    justificativaCancelamento: a.string(),

    // Campos de Encerramento
    publicoAlcancado: a.integer(),
    resumoFechamento: a.string(),

    // Agenda
    dataInicio: a.date().required(),
    horarioInicio: a.time().required(),
    dataFim: a.date().required(),
    horarioFim: a.time().required(),

    // Relacionamentos
    inscricoes: a.hasMany('InscricaoEvento', 'eventoId'),
    evolucoes: a.hasMany('EvolucaoEvento', 'eventoId'),
    gastos: a.hasMany('GastoEvento', 'eventoId'),
    fotos: a.hasMany('FotoEvento', 'eventoId'),
    fontesRecurso: a.hasMany('FonteRecurso', 'eventoId'),
  }).authorization(allow => [
    allow.groups(['Administrador']).to(['read', 'create', 'update']), // Ciclo de vida
    allow.groups(['Operador']).to(['read']), // Operador apenas lê eventos para lançar gastos
    allow.guest().to(['read']), // Publicidade
    allow.authenticated().to(['read']),
  ]),

  // 1.3 Entidade: InscricaoEvento (Join Table M:N)
  InscricaoEvento: a.model({
    beneficiarioId: a.id().required(),
    eventoId: a.id().required(),

    // Relacionamentos
    beneficiario: a.belongsTo('Beneficiario', 'beneficiarioId'),
    evento: a.belongsTo('Evento', 'eventoId'),
  })
    .secondaryIndexes((index) => [
      // Index para permitir listar inscrições por evento ou beneficiário rapidamente
      index("eventoId"),
      index("beneficiarioId")
    ])
    .authorization(allow => [
      allow.groups(['Administrador', 'Operador']).to(['read', 'create', 'update', 'delete']),
    ]),

  // 1.4 Entidade: EvolucaoEvento
  EvolucaoEvento: a.model({
    eventoId: a.id().required(),
    dataEvolucao: a.date().required(),
    descricaoEvolucao: a.string().required(),
    observacoes: a.string(),

    evento: a.belongsTo('Evento', 'eventoId'),
  }).authorization(allow => [
    allow.groups(['Administrador', 'Operador']).to(['read', 'create', 'update']),
  ]),

  // 1.5 Entidade: GastoEvento
  GastoEvento: a.model({
    eventoId: a.id().required(),
    descricaoGasto: a.string().required(),
    valorGasto: a.float().required(),
    // Novos campos
    fornecedorNome: a.string().required(),
    fornecedorDocumento: a.string().required(), // CPF ou CNPJ
    s3LinkComprovante: a.string(), // Key do Storage

    evento: a.belongsTo('Evento', 'eventoId'),
  }).authorization(allow => [
    allow.groups(['Operador']).to(['read', 'create', 'update']), // Apenas Operador lança
    allow.groups(['Administrador']).to(['read']), // Auditoria (Read-Only)
  ]),

  // 1.8 Entidade: FonteRecurso (Novas Doações/Caixa)
  FonteRecurso: a.model({
    eventoId: a.id().required(),
    origem: a.string().required(), // "Doacao", "Caixa"
    valor: a.float().required(),

    // Campos Doacao
    doadorNome: a.string(),
    doadorDocumento: a.string(), // CPF/CNPJ
    formaPagamento: a.string(), // "PIX", "Transferencia", "Debito", "Dinheiro"

    // Campos Caixa
    justificativaUso: a.string(), // Min 100 chars

    evento: a.belongsTo('Evento', 'eventoId'),
  }).authorization(allow => [
    allow.groups(['Operador']).to(['read', 'create', 'update']), // Apenas Operador lança
    allow.groups(['Administrador']).to(['read']), // Auditoria (Read-Only)
  ]),

  // 1.6 Entidade: FotoEvento
  FotoEvento: a.model({
    eventoId: a.id().required(),
    s3LinkFoto: a.string().required(), // Key do Storage

    evento: a.belongsTo('Evento', 'eventoId'),
  }).authorization(allow => [
    allow.groups(['Operador']).to(['read', 'create', 'update', 'delete']), // Operador gerencia fotos
    allow.groups(['Administrador']).to(['read']), // Auditoria
    allow.guest().to(['read']),
    allow.authenticated().to(['read']),
  ]),

  // 1.7 Entidade: AuditLog
  AuditLog: a.model({
    dataHora: a.datetime(), // Gerado via Frontend
    usuario: a.string().required(),
    tipoAcao: a.string().required(), // "CriarEvento", "CancelarEvento", etc.
    justificativa: a.string(),
  }).authorization(allow => [
    allow.groups(['Administrador', 'Operador']).to(['read', 'create']), // Admin/Op cria log
    // Gerenciador não vê logs operacionais, ver logs de sistema seria outra tabela
  ]),

  // 1.8 Entidade: Usuario (Gestão de Acesso - RBAC)
  Usuario: a.model({
    email: a.string().required(), // Chave de identificação
    nome: a.string(),
    perfil: a.string().required(), // Enum: "Gerenciador", "Administrador", "Operador"
  }).authorization(allow => [
    allow.groups(['Gerenciador']).to(['read', 'create', 'update', 'delete']),
    allow.authenticated().to(['read']), // Todos vêem seu perfil
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // Fallback apenas para facilitar dev inicial se necessário
    },
  },
});
