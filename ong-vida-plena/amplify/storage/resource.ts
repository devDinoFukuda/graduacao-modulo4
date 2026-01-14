import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'ongVidaPlenaDrive',
    access: (allow) => ({
        'eventos/fotos/{entity_id}/*': [
            allow.guest.to(['read']),
            allow.groups(['Administrador']).to(['read', 'delete']), // Admin modera fotos
            allow.groups(['Operador']).to(['read', 'write', 'delete']) // Op sobe fotos
        ],
        'eventos/comprovantes/{entity_id}/*': [
            allow.groups(['Administrador']).to(['read']), // Admin AUDITA (Read-Only)
            allow.groups(['Operador']).to(['read', 'write', 'delete']) // Op lança despesas
        ]
    })
});
