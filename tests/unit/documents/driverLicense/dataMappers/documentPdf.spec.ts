import { randomUUID } from 'node:crypto'

import TestKit from '@diia-inhouse/test'

import DriverLicensePdfDataMapper from '@src/documents/driverLicense/dataMappers/documentPdf'
import { DocumentType, DriverLicense } from '@src/documents/driverLicense/interfaces/services'

describe(`Data Mapper ${DriverLicensePdfDataMapper.name}`, () => {
    const testKit = new TestKit()

    const dataMapper = new DriverLicensePdfDataMapper()
    const { user } = testKit.session.getUserSession()

    describe(`method ${dataMapper.toSharingPdf.name}`, () => {
        const { identifier: requester } = user
        const requestDateTime = new Date().toISOString()
        const requestIdentifier = randomUUID()

        it(`should successfully compose and return sharing render data for ${DocumentType.DriverLicense}`, () => {
            const validDriverLicense = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense)
            const expectedResult = {
                documentTitle: 'Driver License',
                blocks: [
                    {
                        logoBlock: {
                            header: 'Driving Licence',
                            title: 'Посвідчення водія',
                            subtitle: 'Ukraine • Україна',
                        },
                        marginBottom: 16,
                    },
                    {
                        hasSeparator: true,
                        marginBottom: 24,
                    },
                    {
                        identityBlock: {
                            lastName: 'Lastnameen',
                            firstName: 'Firstnameen',
                            fullName: [validDriverLicense.lastNameUA, validDriverLicense.firstNameUA, validDriverLicense.middleNameUA].join(
                                ' ',
                            ),
                            documentNumber: validDriverLicense.docNumber,
                            photo: validDriverLicense.photo,
                        },
                        marginBottom: 0,
                    },
                    {
                        hasSeparator: true,
                        marginBottom: 16,
                    },
                    {
                        textBlock: [
                            `The digital document copy requested on ${requestDateTime}`,
                            `Request initiator: ${requester}`,
                            `Request ID: ${requestIdentifier}`,
                        ],
                    },
                    {
                        tableBlock: [
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.lastName.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.lastName.name,
                                    secondaryText: validDriverLicense.ua?.lastName.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.lastName.value,
                                    secondaryText: validDriverLicense.ua?.lastName.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.firstName.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.firstName.name,
                                    secondaryText: validDriverLicense.ua?.firstName.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.firstName.value,
                                    secondaryText: validDriverLicense.ua?.firstName.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.birth.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.birth.name,
                                    secondaryText: validDriverLicense.ua?.birth.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.birth.value.split('\n')[0],
                                    secondaryText: validDriverLicense.ua?.birth.value.split('\n')[1],
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.issueDate.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.issueDate.name,
                                    secondaryText: validDriverLicense.ua?.issueDate.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.issueDate.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.expiryDate.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.expiryDate.name,
                                    secondaryText: validDriverLicense.ua?.expiryDate.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.expiryDate.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.department.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.department.name,
                                    secondaryText: validDriverLicense.ua?.department.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.department.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.identifier.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.identifier.name,
                                    secondaryText: validDriverLicense.ua?.identifier.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.identifier.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.documentNumber.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.documentNumber.name,
                                    secondaryText: validDriverLicense.ua?.documentNumber.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.documentNumber.value,
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.category.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.category.name,
                                    secondaryText: validDriverLicense.ua?.category.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.category.value.split('\n'),
                                },
                            ],
                            [
                                'threeColumns',
                                {
                                    primaryText: validDriverLicense.eng?.categoryOpeningDate.code,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.categoryOpeningDate.name,
                                    secondaryText: validDriverLicense.ua?.categoryOpeningDate.name,
                                },
                                {
                                    primaryText: validDriverLicense.eng?.categoryOpeningDate.value.split('\n'),
                                },
                            ],
                        ],
                    },
                ],
            }
            const result = dataMapper.toSharingPdf(validDriverLicense, requester, requestDateTime, requestIdentifier)

            expect(result).toEqual(expectedResult)
        })
    })
})
