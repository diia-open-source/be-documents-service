const compareVersionsMock = {
    compare: jest.fn(),
}

jest.mock('compare-versions', () => ({ compare: compareVersionsMock.compare }))

import { randomUUID } from 'crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, DocumentType, OwnerType } from '@diia-inhouse/types'

import DocumentAttributesService from '@services/documentAttributes'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import PluginDepsCollectionMock, { getDocumentDataMapper } from '@mocks/stubs/documentDepsCollection'

import { DocumentCover } from '@interfaces/services/documentAttributes'
import { Document } from '@interfaces/services/documents'
import { UserProfileDocument } from '@interfaces/services/user'

describe('DocumentsDataMapper', () => {
    const testKit = new TestKit()

    const appUtils = mockInstance(Utils)
    const identifier = mockInstance(IdentifierService)
    const documentAttributesServiceMock = mockInstance(DocumentAttributesService)

    const documentsDataMapper = new DocumentsDataMapper(
        appUtils,
        identifier,
        documentAttributesServiceMock,
        new PluginDepsCollectionMock([getDocumentDataMapper()]),
    )

    describe('method: `toDocumentsWithCover`', () => {
        it('should successfully return documents list with appended cover', () => {
            const documentType = DocumentType.InternalPassport
            const documents = [
                { id: randomUUID(), docStatus: DocStatus.NotFound },
                { id: randomUUID(), docStatus: DocStatus.Ok },
            ]

            jest.spyOn(documentAttributesServiceMock, 'getCover').mockReturnValueOnce(<DocumentCover>{})

            expect(documentsDataMapper.toDocumentsWithCover(<Document[]>documents, documentType)).toEqual([
                {
                    ...documents[0],
                    cover: undefined,
                },
                {
                    ...documents[1],
                    document: documents[1],
                    cover: {},
                },
            ])

            expect(documentAttributesServiceMock.getCover).toHaveBeenCalledWith(documentType, documents[1].docStatus)
        })
    })

    describe(`method: ${documentsDataMapper.toUserProfileDocument.name}`, () => {
        it('should return user profile document', () => {
            const document = testKit.docs.getInternalPassport()

            const documentSubType = 'subtype'
            const documentIdentifier = '123'
            const ownerType = OwnerType.owner
            const expirationDate = new Date('2025-01-01')
            const issueDate = new Date('2021-01-01')

            jest.spyOn(appUtils, 'getDocumentSubType').mockReturnValueOnce(documentSubType)
            jest.spyOn(appUtils, 'getDocumentOwnerType').mockReturnValueOnce(ownerType)
            jest.spyOn(appUtils, 'getDocumentExpirationDate').mockReturnValueOnce(expirationDate)
            jest.spyOn(appUtils, 'getDocumentIssueDate').mockReturnValueOnce(issueDate)
            jest.spyOn(identifier, 'createIdentifier').mockReturnValueOnce(documentIdentifier)

            const result = documentsDataMapper.toUserProfileDocument(DocumentType.InternalPassport, document)

            expect(result).toEqual<UserProfileDocument>({
                documentSubType,
                documentIdentifier,
                ownerType,
                docId: document.id,
                docStatus: document.docStatus,
                expirationDate,
                issueDate,
                fullNameHash: document.fullNameHash,
            })
        })
    })
})
