import { Constructor, asClass } from 'awilix'

import { DepsResolver } from '@diia-inhouse/diia-app'

import DocumentsDmsProvider from '@providers/dms/documentsDms'
import DocumentsDmsMockProvider from '@providers/dms/documentsDmsMock'
import DocumentsEisProvider from '@providers/eis/documentsEis'
import DocumentsEisMockProvider from '@providers/eis/documentsEisMock'

import { AppConfig } from '@interfaces/config'
import { DocumentsDmsServiceProvider, DocumentsEisServiceProvider, ProvidersDeps } from '@interfaces/providers'

export function getProvidersDeps(config: AppConfig): DepsResolver<ProvidersDeps> {
    const { eis, dms } = config

    const documentsEisProvider: Constructor<DocumentsEisServiceProvider> = eis.isEnabled ? DocumentsEisProvider : DocumentsEisMockProvider
    const documentsDmsProvider: Constructor<DocumentsDmsServiceProvider> = dms.isEnabled ? DocumentsDmsProvider : DocumentsDmsMockProvider

    return {
        documentsEisProvider: asClass(documentsEisProvider).singleton(),
        documentsDmsProvider: asClass(documentsDmsProvider).singleton(),
    }
}
