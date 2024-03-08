import moment from 'moment'

import {
    ActionCode,
    DocStatus,
    DocumentInstance,
    DocumentType,
    DocumentTypeCamelCase,
    Icon,
    IconAtmActionType,
    Localization,
    Logger,
    TableBlockOrg,
    UserTokenData,
} from '@diia-inhouse/types'
import { utils } from '@diia-inhouse/utils'

import { TaxpayerCard, TaxpayerCardInDocument } from '@src/documents/taxpayerCard/interfaces/services/taxpayer'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'

import { DocumentDataMapper } from '@interfaces/dataMappers'
import { RnokppErrorCode } from '@interfaces/providers/drfo'
import { DocumentTicker, DocumentTickerCode, DocumentTickerPlaceholder } from '@interfaces/services/documentAttributes'

export default class TaxPayerCardDataMapper implements DocumentDataMapper {
    private readonly rnokppErrorCodeToDocStatus: Record<RnokppErrorCode, DocStatus> = {
        [RnokppErrorCode.Ok]: DocStatus.Ok,
        [RnokppErrorCode.Closed]: DocStatus.NotConfirmed,
        [RnokppErrorCode.InvalidData]: DocStatus.NotConfirmed,
        [RnokppErrorCode.NotConfirmed]: DocStatus.NotConfirmed,
        [RnokppErrorCode.NotMatched]: DocStatus.NotConfirmed,
        [RnokppErrorCode.NotMatchedAndClosed]: DocStatus.NotConfirmed,
    }

    private readonly statusDescriptionByDocStatus: Record<Localization, Partial<Record<DocStatus, string>>> = {
        [Localization.UA]: {
            [DocStatus.Ok]: 'Пройшов перевірку Державною податковою службою {date}',
            [DocStatus.Confirming]: 'Перевіряється Державною податковою службою',
            [DocStatus.NotConfirmed]: 'Не пройшов перевірку Державною податковою службою',
        },
        [Localization.ENG]: {
            [DocStatus.Ok]: 'Verified by State Tax Service on {date}',
            [DocStatus.Confirming]: 'Verifiсation by State Tax Service is in progress',
            [DocStatus.NotConfirmed]: 'Verifiсation by State Tax Service failed',
        },
    }

    private readonly docName: string = 'Картка платника податків'

    private readonly docNameWithSeparator = 'Картка платника\nподатків'

    constructor(
        private readonly logger: Logger,

        private readonly designSystemDataMapper: DesignSystemDataMapper,

        private readonly documentAttributesService: DocumentAttributesService,
    ) {}

    documentTypes: DocumentType[] = [DocumentType.TaxpayerCard]

    toEntity(user: UserTokenData, error?: RnokppErrorCode): TaxpayerCard {
        const { itn, birthDay, fName, lName, mName, identifier } = user
        const docStatus: DocStatus = error ? this.rnokppErrorCodeToDocStatus[error] || DocStatus.NotConfirmed : DocStatus.Confirming

        const taxpayerCard: TaxpayerCard = {
            docStatus,
            isVisible: true,
            id: identifier,
            docNumber: itn,
            lastNameUA: lName,
            firstNameUA: fName,
            middleNameUA: mName,
            birthday: birthDay,
            creationDate: moment().format('DD.MM.YYYY'),
            tickerOptions: this.getTickerV1(docStatus),
        }

        return taxpayerCard
    }

    toEntityInDocument(docStatus: DocStatus, number: string, creationDate: string, localization: Localization): TaxpayerCardInDocument {
        const statusDescription = this.getStatusDescription(docStatus, creationDate, localization)
        const value = docStatus === DocStatus.Ok ? number : 'ХХХХХХХХХХ'

        return {
            name: localization === Localization.UA ? 'РНОКПП (ІПН)' : 'Individual Tax Number:',
            value,
            status: docStatus,
            statusDescription,
        }
    }

    toVerifyDesignBlock(docStatus: DocStatus, itn: string, createdAt: string): TableBlockOrg {
        const itnToShow = docStatus === DocStatus.Ok ? itn : 'ХХХХХХХХХХ'

        return {
            items: [
                {
                    tableItemHorizontalMlc: this.designSystemDataMapper.getTableItemHorizontalWithCopyAction(
                        itnToShow,
                        'РНОКПП (ІПН):',
                        'Individual Tax Number',
                    ),
                },
                {
                    tableItemVerticalMlc: {
                        value: this.getStatusDescription(docStatus, createdAt, Localization.UA),
                        secondaryValue: this.getStatusDescription(docStatus, createdAt, Localization.ENG),
                        valueIcons: [],
                        valueImages: [],
                    },
                },
            ],
        }
    }

    toDocumentInstance(card: TaxpayerCard): DocumentInstance {
        const { docNumber, lastNameUA, firstNameUA, middleNameUA, birthday, id, docStatus, creationDate } = card
        const fullNameUa = utils.getFullName(lastNameUA, firstNameUA, middleNameUA)
        const fullNameUaWithSeparator = utils.getFullName(lastNameUA, firstNameUA, middleNameUA, '\n')

        const tickerAtm = this.documentAttributesService.getTicker({
            code: DocumentTickerCode.Valid,
            templateParams: {
                [DocumentTickerPlaceholder.UpdatedAt]: this.documentAttributesService.getUpdatedAtValue(),
            },
            documentType: DocumentType.TaxpayerCard,
        })

        return {
            docStatus,
            id,
            docNumber,
            docData: {
                docName: this.docName,
                birthday,
                rnokpp: docNumber,
                fullName: fullNameUa,
            },
            dataForDisplayingInOrderConfigurations: {
                iconRight: { code: ActionCode.drag },
                label: docNumber,
                description: this.getStatusDescription(docStatus, creationDate, Localization.UA),
            },
            frontCard: {
                UA: [
                    {
                        docHeadingOrg: {
                            headingWithSubtitlesMlc: {
                                value: this.docNameWithSeparator,
                                subtitles: [],
                            },
                        },
                    },
                    {
                        subtitleLabelMlc: {
                            label: 'РНОКПП',
                        },
                    },
                    {
                        tableBlockPlaneOrg: {
                            tableSecondaryHeadingMlc: {
                                label: fullNameUaWithSeparator,
                            },
                            items: [
                                {
                                    tableItemVerticalMlc: {
                                        label: 'Дата народження:',
                                        value: birthday,
                                        valueIcons: [],
                                        valueImages: [],
                                    },
                                },
                            ],
                        },
                    },
                    { tickerAtm },
                    {
                        docButtonHeadingOrg: {
                            docNumberCopyMlc: {
                                value: docNumber,
                                icon: {
                                    code: ActionCode.copy,
                                    action: {
                                        type: IconAtmActionType.copy,
                                    },
                                },
                            },
                            iconAtm: {
                                code: Icon.ellipseKebab,
                                accessibilityDescription: DocumentTypeCamelCase.taxpayerCard,
                                action: {
                                    type: IconAtmActionType.ellipseMenu,
                                    subtype: DocumentTypeCamelCase.taxpayerCard,
                                },
                            },
                        },
                    },
                ],
                EN: [],
            },
            content: [],
            fullInfo: [],
        }
    }

    toVerifyDocumentInstance(card: TaxpayerCard): DocumentInstance {
        const { docNumber, lastNameUA, firstNameUA, middleNameUA, birthday, id, docStatus } = card
        const fullNameUa = utils.getFullName(lastNameUA, firstNameUA, middleNameUA)
        const fullNameUaWithSeparator = utils.getFullName(lastNameUA, firstNameUA, middleNameUA, '\n')

        const tickerAtm = this.documentAttributesService.getTicker({
            code: DocumentTickerCode.Valid,
        })

        return {
            docStatus,
            id,
            docNumber,
            docData: {
                docName: this.docName,
                birthday,
                rnokpp: docNumber,
                fullName: fullNameUa,
            },
            frontCard: {
                UA: [
                    {
                        docHeadingOrg: {
                            headingWithSubtitlesMlc: { value: this.docNameWithSeparator, subtitles: [] },
                        },
                    },
                    {
                        subtitleLabelMlc: {
                            label: 'РНОКПП',
                        },
                    },
                    {
                        tableBlockPlaneOrg: {
                            tableSecondaryHeadingMlc: {
                                label: fullNameUaWithSeparator,
                            },
                            items: [
                                {
                                    tableItemVerticalMlc: {
                                        label: 'Дата народження:',
                                        value: birthday,
                                        valueIcons: [],
                                        valueImages: [],
                                    },
                                },
                            ],
                        },
                    },
                    { tickerAtm },
                    {
                        docButtonHeadingOrg: {
                            docNumberCopyMlc: {
                                value: docNumber,
                            },
                        },
                    },
                ],
                EN: [],
            },
            content: [],
            fullInfo: [],
        }
    }

    private getStatusDescription(docStatus: DocStatus, creationDate: string, localization: Localization): string {
        const description = this.statusDescriptionByDocStatus[localization][docStatus]

        if (!description) {
            this.logger.error('Unexpected localization or docStatus', { localization, docStatus })

            return ''
        }

        return docStatus === DocStatus.Ok ? description.replace('{date}', creationDate) : description
    }

    private getTickerV1(docStatus: DocStatus): DocumentTicker | undefined {
        if (docStatus === DocStatus.Ok) {
            return this.documentAttributesService.getTickerV1(DocumentType.TaxpayerCard, DocumentTickerCode.Valid)
        }

        return undefined
    }
}
