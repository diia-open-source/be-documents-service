import { GenericData, RowType } from '@diia-inhouse/types'

import { TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services'

export default class TaxpayerCardPdfDataMapper {
    toSharingPdf(document: TaxpayerCard, requester: string, requestDateTime: string, requestIdentifier: string): GenericData {
        const { lastNameUA, firstNameUA, middleNameUA, docNumber, birthday, creationDate } = document

        return {
            documentTitle: 'Taxpayer card',
            blocks: [
                { logoBlock: { logoHeader: ['Реєстраційний номер облікової', 'картки платника податків'] }, marginBottom: 24 },
                { hasSeparator: true, marginBottom: 24 },
                { textBlock: { content: docNumber, fontSize: 38 }, marginBottom: 24 },
                { textBlock: ['Верифіковано у реєстрі Державної податкової служби за запитом ', `від ${creationDate}.`], marginBottom: 24 },
                { hasSeparator: true, marginBottom: 24 },
                { textBlock: { content: [lastNameUA, firstNameUA, middleNameUA], fontSize: 24 }, marginBottom: 24 },
                {
                    tableBlock: [[RowType.TwoColumns, { primaryText: 'Дата народження:' }, { primaryText: birthday }]],
                    marginBottom: 12,
                },
                { hasSeparator: true, marginBottom: 16 },
                {
                    textBlock: [
                        `Запит на цифрові копії документів від ${requestDateTime}`,
                        `Ініціатор запиту: ${requester}`,
                        `Ідентифікатор запиту: ${requestIdentifier}`,
                    ],
                },
            ],
        }
    }
}
