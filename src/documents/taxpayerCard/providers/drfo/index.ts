import moment from 'moment'

import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import { DocStatus, DocumentType, Logger, UserTokenData } from '@diia-inhouse/types'

import TaxpayerCardDataMapper from '@src/documents/taxpayerCard/dataMappers/document'
import { PluginConfig } from '@src/documents/taxpayerCard/interfaces/config'
import { DocumentsDrfoServiceProvider } from '@src/documents/taxpayerCard/interfaces/providers'
import { GetTaxpayerCardResponse, TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services/taxpayer'

import { AppConfig } from '@interfaces/config'
import { RnokppPayload, RnokppResponse } from '@interfaces/providers/drfo'

export default class DocumentsDrfoProvider implements DocumentsDrfoServiceProvider {
    constructor(
        private readonly taxpayerCardDataMapper: TaxpayerCardDataMapper,

        private readonly config: AppConfig & PluginConfig,
        private readonly external: ExternalCommunicator,
        private readonly logger: Logger,
    ) {
        this.logger.info('Enabled Drfo provider')
    }

    private readonly expirationTimeOnSuccessSec: number = this.config[DocumentType.TaxpayerCard].cardExpirationTimeOnSuccessSec

    private readonly expirationTimeOnConfirmingSec: number = this.config[DocumentType.TaxpayerCard].cardExpirationTimeOnConfirmingSec

    private readonly expirationTimeOnNotConfirmedSec: number = this.config[DocumentType.TaxpayerCard].cardExpirationTimeOnNotConfirmedSec

    async getTaxpayerCard(user: UserTokenData): Promise<GetTaxpayerCardResponse> {
        const { itn, fName, lName, mName, birthDay } = user

        const payload: RnokppPayload = {
            rnokpp: itn,
            given_name: fName,
            family_name: lName,
            patronymic_name: mName,
            date_birth: moment(birthDay, this.config.app.dateFormat).format('YYYY.MM.DD'),
        }

        let card: TaxpayerCard

        try {
            const { error }: RnokppResponse = await this.external.receiveDirect(ExternalEvent.RepoDocumentRnokpp, payload)

            card = this.taxpayerCardDataMapper.toEntity(user, error)
        } catch (err) {
            this.logger.error('Failed to receive taxpayer card', { err })
            card = this.taxpayerCardDataMapper.toEntity(user)
        }

        const expirationTime: number = this.getExpirationTime(card)

        return { card, expirationTime }
    }

    private getExpirationTime(card: TaxpayerCard): number {
        let expirationTime: number
        switch (card.docStatus) {
            case DocStatus.Ok:
                expirationTime = this.expirationTimeOnSuccessSec
                break
            case DocStatus.NotConfirmed:
                expirationTime = this.expirationTimeOnNotConfirmedSec
                break
            case DocStatus.Confirming:
            default:
                expirationTime = this.expirationTimeOnConfirmingSec
        }

        return expirationTime
    }
}
