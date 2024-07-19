import { randomUUID } from 'node:crypto'

import TestKit from '@diia-inhouse/test'
import { RowType } from '@diia-inhouse/types'

import TaxpayerCardPdfDataMapper from '@src/documents/taxpayerCard/dataMappers/documentPdf'
import { DocumentType, TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services'

describe(`Data Mapper ${TaxpayerCardPdfDataMapper.name}`, () => {
    const testKit = new TestKit()

    const dataMapper = new TaxpayerCardPdfDataMapper()
    const { user } = testKit.session.getUserSession()

    describe(`method ${dataMapper.toSharingPdf.name}`, () => {
        const { identifier: requester } = user
        const requestDateTime = new Date().toISOString()
        const requestIdentifier = randomUUID()

        it(`should successfully compose and return sharing render data for ${DocumentType.TaxpayerCard}`, () => {
            const validTaxpayerCard = <TaxpayerCard>testKit.docs.generateDocument(DocumentType.TaxpayerCard)
            const expectedResult = {
                documentTitle: 'Taxpayer card',
                blocks: [
                    { logoBlock: { logoHeader: ['Реєстраційний номер облікової', 'картки платника податків'] }, marginBottom: 24 },
                    { hasSeparator: true, marginBottom: 24 },
                    { textBlock: { content: validTaxpayerCard.docNumber, fontSize: 38 }, marginBottom: 24 },
                    {
                        textBlock: [
                            'Верифіковано у реєстрі Державної податкової служби за запитом ',
                            `від ${validTaxpayerCard.creationDate}.`,
                        ],
                        marginBottom: 24,
                    },
                    { hasSeparator: true, marginBottom: 24 },
                    {
                        textBlock: {
                            content: [validTaxpayerCard.lastNameUA, validTaxpayerCard.firstNameUA, validTaxpayerCard.middleNameUA],
                            fontSize: 24,
                        },
                        marginBottom: 24,
                    },
                    {
                        tableBlock: [
                            [RowType.TwoColumns, { primaryText: 'Дата народження:' }, { primaryText: validTaxpayerCard.birthday }],
                        ],
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
            const result = dataMapper.toSharingPdf(validTaxpayerCard, requester, requestDateTime, requestIdentifier)

            expect(result).toEqual(expectedResult)
        })
    })
})
