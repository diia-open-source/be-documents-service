import { asClass } from 'awilix'

import { NameAndRegistrationPair } from '@diia-inhouse/diia-app'

import DocumentsDrfoProvider from './drfo'

import { ProvidersDeps } from '@src/documents/taxpayerCard/interfaces/providers'

export function getProvidersDeps(): NameAndRegistrationPair<ProvidersDeps> {
    return {
        documentsDrfoProvider: asClass(DocumentsDrfoProvider).singleton(),
    }
}
