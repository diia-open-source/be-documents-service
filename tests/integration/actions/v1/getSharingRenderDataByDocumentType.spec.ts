import { randomUUID } from 'node:crypto'

import TestKit from '@diia-inhouse/test'
import { RowType } from '@diia-inhouse/types'

import GetSharingRenderDataByDocumentTypeAction from '@src/actions/v1/getSharingRenderDataByDocumentType'

import { getApp } from '@tests/utils/getApp'

import { InternalPassportInstance } from '@interfaces/providers/eis'
import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Action ${GetSharingRenderDataByDocumentTypeAction.name}`, () => {
    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetSharingRenderDataByDocumentTypeAction

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetSharingRenderDataByDocumentTypeAction)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('method handler', () => {
        it('should successfully return sharing render data by document type', async () => {
            const testKit = new TestKit()
            const session = testKit.session.getUserSession()
            const headers = testKit.session.getHeaders()
            const {
                user: { identifier: requester },
            } = session
            const requestDateTime = new Date().toISOString()
            const requestIdentifier = randomUUID()

            const validInternalPassport = <InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)

            const expectedResult = {
                documentTitle: 'Internal Passport',
                blocks: [
                    { logoBlock: { logoHeader: ['Паспорт громадянина', 'України'], trident: true }, marginBottom: 24 },
                    { hasSeparator: true, marginBottom: 24 },
                    {
                        identityBlock: {
                            lastName: validInternalPassport.lastNameUA,
                            firstName: validInternalPassport.firstNameUA,
                            middleName: validInternalPassport.middleNameUA,
                            fullName: [validInternalPassport.lastNameEN, validInternalPassport.firstNameEN].join(' '),
                            documentNumber: validInternalPassport.docNumber,
                            photo: validInternalPassport.photo,
                        },
                        marginBottom: 16,
                    },
                    { hasSeparator: true, marginBottom: 16 },
                    {
                        textBlock: [
                            `Запит на цифрові копії документів від ${requestDateTime}`,
                            `Ініціатор запиту: ${requester}`,
                            `Ідентифікатор запиту: ${requestIdentifier}`,
                        ],
                        marginBottom: 32,
                    },
                    {
                        tableBlock: [
                            [RowType.TwoColumns, { primaryText: 'Стать:' }, { primaryText: validInternalPassport.genderUA }],
                            [RowType.TwoColumns, { primaryText: 'Дата народження:' }, { primaryText: validInternalPassport.birthday }],
                            [RowType.TwoColumns, { primaryText: 'Громадянство:' }, { primaryText: validInternalPassport.nationalityUA }],
                            [RowType.TwoColumns, { primaryText: 'Орган, що видав:' }, { primaryText: validInternalPassport.department }],
                            [RowType.TwoColumns, { primaryText: 'Дата видачі:' }, { primaryText: validInternalPassport.issueDate }],
                            [RowType.TwoColumns, { primaryText: 'Дійсний до:' }, { primaryText: validInternalPassport.expirationDate }],
                            [
                                RowType.TwoColumns,
                                { primaryText: 'РНОКПП:' },
                                {
                                    primaryText: [
                                        validInternalPassport?.taxpayerCard?.number,
                                        `(Верифіковано у реєстрі Державної податкової служби за запитом від ${validInternalPassport.taxpayerCard?.creationDate})`,
                                    ],
                                },
                            ],
                            [RowType.TwoColumns, { primaryText: 'Запис № (УНЗР):' }, { primaryText: validInternalPassport.recordNumber }],
                            [RowType.TwoColumns, { primaryText: 'Місце народження:' }, { primaryText: validInternalPassport.birthPlaceUA }],
                            [
                                RowType.TwoColumns,
                                { primaryText: 'Місце реєстрації проживання:' },
                                { primaryText: validInternalPassport.currentRegistrationPlaceUA },
                            ],
                            [RowType.TwoColumnsWithSign, { primaryText: 'Підпис:' }, { primaryText: validInternalPassport.sign }],
                        ],
                    },
                ],
            }

            const result = await action.handler({
                headers,
                params: {
                    data: validInternalPassport,
                    documentType: PassportDocumentType.InternalPassport,
                    requestDateTime,
                    requester,
                    requestIdentifier,
                },
            })

            expect(result).toEqual(expectedResult)
        })
    })
})
