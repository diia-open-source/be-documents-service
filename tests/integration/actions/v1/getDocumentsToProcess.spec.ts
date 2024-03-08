import moment from 'moment'

import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { AppUser, DocumentType, HttpStatusCode } from '@diia-inhouse/types'

import GetDocumentsToProcessAction from '@actions/v1/getDocumentsToProcess'

import DocumentsService from '@services/documents'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { RnokppErrorCode } from '@interfaces/providers/drfo'
import { Document } from '@interfaces/services/documents'

describe(`Action ${GetDocumentsToProcessAction.name}`, () => {
    process.env.EDDR_IS_ENABLED = 'true'

    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetDocumentsToProcessAction
    let external: ExternalCommunicator
    let documentsService: DocumentsService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetDocumentsToProcessAction)
        external = app.container.resolve('external')
        documentsService = app.container.resolve('documentsService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it.each([
        [
            DocumentType.InternalPassport,
            (): Document[] => [testKit.docs.getInternalPassport({ id: '20000213-01467-2016-03-09' })],
            (): void => {
                jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
            },
        ],
        [
            DocumentType.ForeignPassport,
            ({ itn }: AppUser): Document[] => [
                testKit.docs.getForeignPassport({
                    id: expect.any(String),
                    fullNameHash: expect.any(String),
                    tickerOptions: expect.anything(),
                    ua: expect.anything(),
                    eng: expect.anything(),
                    taxpayerCard: { number: itn, creationDate: moment().format('DD.MM.YYYY') },
                }),
            ],
            (): void => {
                jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
            },
        ],
        [
            <DocumentType>DocumentType.TaxpayerCard,
            ({ birthDay, identifier, itn }: AppUser): Document[] => [<Document>(<unknown>testKit.docs.getTaxpayerCard({
                    birthday: birthDay,
                    creationDate: moment().format('DD.MM.YYYY'),
                    docNumber: itn,
                    id: identifier,
                }))],
            (): void => {
                jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce({ error: RnokppErrorCode.Ok })
            },
        ],
    ])(`should return %s`, async (documentFilter, getExpectedDocuments, setupSpies) => {
        // Arrange
        const { session, headers } = testKit.session.getUserActionArguments()
        const documentTypeResponse = documentsService.documentTypeToDocumentTypeResponse[documentFilter]!

        setupSpies()

        // Act
        const result = await action.handler({
            session,
            headers,
            params: { filter: [documentFilter] },
        })

        // Assert
        expect(result).toEqual({
            [documentTypeResponse]: {
                status: HttpStatusCode.OK,
                data: getExpectedDocuments(session.user),
            },
        })
    })

    it('should return response with bad request status if unknown document type was passed', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()

        // Act
        const result = await action.handler({ session, headers, params: { filter: [<DocumentType>'unknown-doc-type'] } })

        // Assert
        expect(result).toEqual({})
    })
})
