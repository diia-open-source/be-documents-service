import { orderBy } from 'lodash'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { DocumentDataMapper } from '@interfaces/dataMappers'
import { ManualDocumentListItem, ManualDocumentListItemWithOrder } from '@interfaces/services/manualDocumentsList'

export default class ManualDocumentsListDataMapper {
    private readonly manualDocumentsList: ManualDocumentListItemWithOrder[] = []

    constructor(private readonly documentDataMappers: PluginDepsCollection<DocumentDataMapper>) {
        this.loadPluginDeps(this.documentDataMappers.items)
        this.documentDataMappers.on('newItems', (instances) => this.loadPluginDeps(instances))
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

    private loadPluginDeps(instances: DocumentDataMapper[]): void {
        instances.forEach((instance) => {
            const { manualDocumentsList = [] } = instance

            this.manualDocumentsList.push(...manualDocumentsList)
        })
    }
}
