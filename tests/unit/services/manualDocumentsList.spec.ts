import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import ManualDocumentsListService from '@services/manualDocumentsList'
import UserService from '@services/user'

import ManualDocumentsListDataMapper from '@dataMappers/manualDocumentsListDataMapper'

import PluginDepsCollectionMock, { getDocumentService } from '@mocks/stubs/documentDepsCollection'

describe('ManualDocumentsListService', () => {
    const testKit = new TestKit()
    const loggerMock = mockInstance(DiiaLogger)
    const userServiceMock = mockInstance(UserService)
    const manualDocumentsListDataMapperMock = mockInstance(ManualDocumentsListDataMapper)
    const pluginCollection = new PluginDepsCollectionMock([getDocumentService()])
    const manualDocumentsListService = new ManualDocumentsListService(
        loggerMock,
        userServiceMock,
        pluginCollection,
        manualDocumentsListDataMapperMock,
    )

    const validManualDocumentListItems = [
        {
            code: 'code-1',
            name: 'name-1',
            isActive: true,
            order: 13,
        },
        {
            code: 'code-2',
            name: 'name-2',
            isActive: true,
            order: 14,
        },
    ]
    const { user } = testKit.session.getUserSession()

    describe('method getList', () => {
        it('should successfully fetch list of manual documents', async () => {
            jest.spyOn(manualDocumentsListDataMapperMock, 'getActiveManualDocumentsList').mockReturnValueOnce(validManualDocumentListItems)
            jest.spyOn(userServiceMock, 'hasDocuments').mockResolvedValueOnce({ missingDocumnets: [], hasDocuments: true })
            jest.spyOn(manualDocumentsListDataMapperMock, 'toListItemWithoutMeta').mockImplementation((manualDocument) => {
                const { hiddenIfAnyOfDocumentsOwned, ...document } = manualDocument

                return document
            })

            const result = await manualDocumentsListService.getList(user)

            expect(result).toEqual({
                contextMenuOrg: {
                    listItemGroupOrg: {
                        items: [
                            {
                                state: 'enabled',
                                label: 'name-1',
                                action: {
                                    type: 'addDocument',
                                    subtype: 'code-1',
                                },
                            },
                            {
                                state: 'enabled',
                                label: 'name-2',
                                action: {
                                    type: 'addDocument',
                                    subtype: 'code-2',
                                },
                            },
                        ],
                    },
                    btnWhiteLargeAtm: {
                        state: 'enabled',
                        label: 'Закрити',
                        action: {
                            type: 'close',
                        },
                    },
                },
            })

            expect(manualDocumentsListDataMapperMock.getActiveManualDocumentsList).toHaveBeenCalledWith()
        })
    })
})
