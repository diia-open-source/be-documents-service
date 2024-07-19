import moment from 'moment'

import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { AppUser, HttpStatusCode } from '@diia-inhouse/types'

import { DocumentType } from '@src/documents/taxpayerCard/interfaces/services'

import GetDocumentsToProcessAction from '@actions/v1/getDocumentsToProcess'

import DocumentsService from '@services/documents'

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
            DocumentType.TaxpayerCard,
            ({ birthDay, identifier, itn }: AppUser): Document[] => [<Document>(<unknown>testKit.docs.generateDocument(
                    DocumentType.TaxpayerCard,
                    {
                        birthday: birthDay,
                        creationDate: moment().format('DD.MM.YYYY'),
                        docNumber: itn,
                        id: identifier,
                    },
                ))],
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
})
