import { orderBy } from 'lodash'

import { OnRegistrationsFinished } from '@diia-inhouse/types'

import { DocumentDataMapper } from '@interfaces/dataMappers'
import { ManualDocumentListItem, ManualDocumentListItemWithOrder } from '@interfaces/services/manualDocumentsList'

export default class ManualDocumentsListDataMapper implements OnRegistrationsFinished {
    private readonly manualDocumentsList: ManualDocumentListItemWithOrder[] = []

    constructor(private readonly documentDataMappers: DocumentDataMapper<object, string>[]) {}

    onRegistrationsFinished(): void {
        for (const instance of this.documentDataMappers) {
            const { manualDocumentsList = [] } = instance

            this.manualDocumentsList.push(...manualDocumentsList)
        }
    }

    getActiveManualDocumentsList(): ManualDocumentListItemWithOrder[] {
        return orderBy(
            this.manualDocumentsList.filter((manualDocument) => manualDocument.isActive),
            'order',
        )
    }

    toListItemWithoutMeta(manualDocument: ManualDocumentListItemWithOrder): ManualDocumentListItem {
        const { hiddenIfAnyOfDocumentsOwned, order, ...document } = manualDocument

        return document
    }
}
