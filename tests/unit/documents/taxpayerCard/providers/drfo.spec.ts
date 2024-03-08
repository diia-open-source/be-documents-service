import DiiaLogger from '@diia-inhouse/diia-logger'
import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentType } from '@diia-inhouse/types'

import TaxpayerCardDataMapper from '@src/documents/taxpayerCard/dataMappers/document'
import { PluginConfig } from '@src/documents/taxpayerCard/interfaces/config'
import DocumentsDrfoProvider from '@src/documents/taxpayerCard/providers/drfo'

import { AppConfig } from '@interfaces/config'

describe('DocumentsDrfoProvider', () => {
    const taxpayerCardDataMapperMocker = mockInstance(TaxpayerCardDataMapper)
    const appConfigMock = <AppConfig & PluginConfig>{
        [DocumentType.TaxpayerCard]: {
            cardExpirationTimeOnSuccessSec: 100,
            cardExpirationTimeOnConfirmingSec: 1000,
            cardExpirationTimeOnNotConfirmedSec: 10000,
        },
        app: {
            dateFormat: 'DD-MM-YYYY',
        },
    }
    const externalMock = mockInstance(ExternalCommunicator)
    const loggerMock = mockInstance(DiiaLogger)

    const documentsDrfoServiceProvider = new DocumentsDrfoProvider(taxpayerCardDataMapperMocker, appConfigMock, externalMock, loggerMock)

    const testKit = new TestKit()
    const { user } = testKit.session.getUserSession()

    const card = testKit.docs.getTaxpayerCard()

    describe('method: `getTaxpayerCard`', () => {
        it.each([
            [DocStatus.Ok, appConfigMock[DocumentType.TaxpayerCard].cardExpirationTimeOnSuccessSec],
            [DocStatus.NotConfirmed, appConfigMock[DocumentType.TaxpayerCard].cardExpirationTimeOnNotConfirmedSec],
            [DocStatus.Confirming, appConfigMock[DocumentType.TaxpayerCard].cardExpirationTimeOnConfirmingSec],
        ])(
            'should return card with expirationTime for docStatus: %s and expirationTime: %i',
            async (docStatus: DocStatus, expirationTime: number) => {
                jest.spyOn(taxpayerCardDataMapperMocker, 'toEntity').mockReturnValueOnce(Object.assign(card, { docStatus }))

                await expect(documentsDrfoServiceProvider.getTaxpayerCard(user)).resolves.toStrictEqual({
                    card,
                    expirationTime: expirationTime,
                })
            },
        )
    })
})
