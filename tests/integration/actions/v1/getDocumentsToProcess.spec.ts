import moment from 'moment'

import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { AppUser, HttpStatusCode } from '@diia-inhouse/types'

import GetDocumentsToProcessAction from '@actions/v1/getDocumentsToProcess'

import DocumentsService from '@services/documents'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ForeignPassportInstance, InternalPassportInstance } from '@interfaces/providers/eis'
import { Document } from '@interfaces/services/documents'
import { PassportDocumentType } from '@interfaces/services/passport'

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
            PassportDocumentType.InternalPassport,
            (): Document[] => [
                <InternalPassportInstance>(
                    testKit.docs.generateDocument(PassportDocumentType.InternalPassport, { id: '20000213-01467-2016-03-09' })
                ),
            ],
            (): void => {
                jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
            },
        ],
        [
            PassportDocumentType.ForeignPassport,
            ({ itn }: AppUser): Document[] => [<ForeignPassportInstance>testKit.docs.generateDocument(
                    PassportDocumentType.ForeignPassport,
                    {
                        id: expect.any(String),
                        fullNameHash: expect.any(String),
                        tickerOptions: expect.anything(),
                        ua: expect.anything(),
                        eng: expect.anything(),
                        taxpayerCard: { number: itn, creationDate: moment().format('DD.MM.YYYY') },
                    },
                )],
            (): void => {
                jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
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
        const result = await action.handler({ session, headers, params: { filter: ['unknown-doc-type'] } })

        // Assert
        expect(result).toEqual({})
    })
})
