import { DocumentType } from '@diia-inhouse/types'

import ManualDocumentsListDataMapper from '@dataMappers/manualDocumentsListDataMapper'

import PluginDepsCollectionMock, { getDocumentDataMapper } from '@mocks/stubs/documentDepsCollection'

describe('ManualDocumentsListDataMapper', () => {
    const manualDocumentsList = [
        {
            code: 'code-1',
            name: 'name-1',
            isActive: true,
            order: 1,
        },
        {
            code: 'code-2',
            name: 'name-2',
            isActive: true,
            order: 2,
        },
    ]
    const dataMapper = new ManualDocumentsListDataMapper(new PluginDepsCollectionMock([getDocumentDataMapper({ manualDocumentsList })]))

    describe('method getActiveManualDocumentsList', () => {
        it('should return manual documents list which are active', () => {
            const result = dataMapper.getActiveManualDocumentsList()

            expect(result).toEqual(expect.arrayContaining(manualDocumentsList))
        })
    })

    describe('method toListItemWithoutMeta', () => {
        it('should successfully convert manual document to list item without meta data', () => {
            const manualDocument = {
                code: 'document-code',
                isActive: true,
                name: 'name',
                order: 100,
                hiddenIfAnyOfDocumentsOwned: [<DocumentType>'document-type'],
            }
            const { hiddenIfAnyOfDocumentsOwned, order, ...documentWithoutMeta } = manualDocument

            const result = dataMapper.toListItemWithoutMeta(manualDocument)

            expect(result).toEqual(documentWithoutMeta)
        })
    })
})
