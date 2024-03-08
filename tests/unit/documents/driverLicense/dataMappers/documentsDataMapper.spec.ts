const compareVersionsMock = {
    compare: jest.fn(),
}

jest.mock('compare-versions', () => ({ compare: compareVersionsMock.compare }))

import { IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, LicenseType, OwnerType, UserDocumentSubtype } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'
import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import PluginDepsCollectionMock from '@mocks/stubs/documentDepsCollection'

import { AppConfig } from '@interfaces/config'
import { UserProfileDocument } from '@interfaces/services/user'

describe('DocumentsDataMapper', () => {
    const testKit = new TestKit()

    const appUtils = mockInstance(Utils)
    const identifier = mockInstance(IdentifierService)
    const logger = mockInstance(DiiaLogger)
    const documentAttributesServiceMock = mockInstance(DocumentAttributesService)
    const designSystemDataMapper = mockInstance(DesignSystemDataMapper)
    const config = <AppConfig & PluginConfig>{
        [DocumentType.DriverLicense]: {
            returnExpired: true,
        },
    }
    const driverLicenseDataMapper = new DriverLicenseDataMapper(
        appUtils,
        config,
        logger,
        designSystemDataMapper,
        documentAttributesServiceMock,
    )

    const documentsDataMapper = new DocumentsDataMapper(
        appUtils,
        identifier,
        documentAttributesServiceMock,
        new PluginDepsCollectionMock([driverLicenseDataMapper]),
    )

    describe(`method: ${documentsDataMapper.toUserProfileDocument.name}`, () => {
        it('should return user profile document for driver license', () => {
            const document = testKit.docs.getDriverLicense({ type: LicenseType.permanent })

            const documentIdentifier = '123'
            const ownerType = OwnerType.owner
            const expirationDate = new Date('2025-01-01')
            const issueDate = new Date('2021-01-01')

            jest.spyOn(appUtils, 'getDocumentSubType').mockReturnValueOnce(undefined)
            jest.spyOn(appUtils, 'getDocumentOwnerType').mockReturnValueOnce(ownerType)
            jest.spyOn(appUtils, 'getDocumentExpirationDate').mockReturnValueOnce(expirationDate)
            jest.spyOn(appUtils, 'getDocumentIssueDate').mockReturnValueOnce(issueDate)
            jest.spyOn(identifier, 'createIdentifier').mockReturnValueOnce(documentIdentifier)

            const result = documentsDataMapper.toUserProfileDocument(DocumentType.DriverLicense, document)

            expect(result).toEqual<UserProfileDocument>({
                documentSubType: UserDocumentSubtype.Permanent,
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
