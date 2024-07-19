const compareVersionsMock = {
    compare: jest.fn(),
}

jest.mock('compare-versions', () => ({ compare: compareVersionsMock.compare }))

import { IdentifierService } from '@diia-inhouse/crypto'
import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { OwnerType } from '@diia-inhouse/types'

import DriverLicenseDataMapper from '@src/documents/driverLicense/dataMappers/document'
import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'
import { DocumentType, DriverLicense, LicenseType, UserDocumentSubtype } from '@src/documents/driverLicense/interfaces/services'

import DocumentAttributesService from '@services/documentAttributes'

import DesignSystemDataMapper from '@dataMappers/designSystemDataMapper'
import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'
import { DocumentDataMapper } from '@interfaces/dataMappers'
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

    const documentsDataMapper = new DocumentsDataMapper(appUtils, identifier, documentAttributesServiceMock, [
        <DocumentDataMapper<object, string>>(<unknown>driverLicenseDataMapper),
    ])

    documentsDataMapper.onRegistrationsFinished()

    describe(`method: ${documentsDataMapper.toUserProfileDocument.name}`, () => {
        it('should return user profile document for driver license', () => {
            const document = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense, { type: LicenseType.permanent })

            const documentIdentifier = '123'
            const ownerType = OwnerType.owner
            const expirationDate = new Date('2025-01-01')
            const issueDate = new Date('2021-01-01')

            // eslint-disable-next-line unicorn/no-useless-undefined
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
