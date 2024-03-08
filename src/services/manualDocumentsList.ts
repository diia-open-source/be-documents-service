import { SetRequired } from 'type-fest'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { ActionCode, AppUser, ArrowedLinkAction, ButtonState, ListItemMlc, Logger, UserTokenData } from '@diia-inhouse/types'

import UserService from '@services/user'

import ManualDocumentsListDataMapper from '@dataMappers/manualDocumentsListDataMapper'

import { DocumentService } from '@interfaces/services/documents'
import {
    ManualDocumentListItem,
    ManualDocumentListItemWithOrder,
    ManualDocumentsListResponse,
    ManualDocumentsListResponseV1,
    ShowInManualListStrategy,
} from '@interfaces/services/manualDocumentsList'
import { DocumentFilter } from '@interfaces/services/user'

export default class ManualDocumentsListService {
    private readonly showInManualListStrategies: Record<string, ShowInManualListStrategy> = {}

    constructor(
        private readonly logger: Logger,

        private readonly userService: UserService,
        private readonly documentServices: PluginDepsCollection<DocumentService>,

        private readonly manualDocumentsListDataMapper: ManualDocumentsListDataMapper,
    ) {
        this.loadPluginDeps(this.documentServices.items)
        this.documentServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    async getList(user: UserTokenData): Promise<ManualDocumentsListResponse> {
        const documents = this.manualDocumentsListDataMapper.getActiveManualDocumentsList()
        const filteredDocuments = await this.hideUnavailableDocuments(user, documents)

        return {
            contextMenuOrg: {
                listItemGroupOrg: {
                    items: filteredDocuments.map(
                        ({ name, code }): ListItemMlc => ({
                            state: ButtonState.enabled,
                            label: name,
                            action: {
                                type: ArrowedLinkAction.addDocument,
                                subtype: code,
                            },
                        }),
                    ),
                },
                btnWhiteLargeAtm: {
                    state: ButtonState.enabled,
                    label: 'Закрити',
                    action: {
                        type: ActionCode.close,
                    },
                },
            },
        }
    }

    /** @deprecated */
    async getListV1(user: UserTokenData): Promise<ManualDocumentsListResponseV1> {
        const documents = this.manualDocumentsListDataMapper.getActiveManualDocumentsList()
        const filteredDocuments = await this.hideUnavailableDocuments(user, documents)

        return { documents: filteredDocuments }
    }

    private async hideUnavailableDocuments(user: AppUser, documents: ManualDocumentListItemWithOrder[]): Promise<ManualDocumentListItem[]> {
        const { identifier: userIdentifier } = user

        const documentsFilteredDefault: ManualDocumentListItemWithOrder[] = []

        await Promise.all(
            documents.map(async (document) => {
                let showInList = true
                try {
                    const showInManualList = this.showInManualListStrategies[document.code]

                    if (showInManualList) {
                        showInList = await showInManualList(userIdentifier, document.code)
                    }
                } catch (err) {
                    this.logger.error('Failed to check is manual document should be showed', { err })

                    return
                }

                if (showInList) {
                    documentsFilteredDefault.push(document)
                }
            }),
        )

        const hidableDocumentTypes = documentsFilteredDefault.filter(
            (document): document is SetRequired<ManualDocumentListItemWithOrder, 'hiddenIfAnyOfDocumentsOwned'> =>
                Boolean(document.hiddenIfAnyOfDocumentsOwned),
        )

        if (!hidableDocumentTypes.length) {
            return documentsFilteredDefault
        }

        const documentFilters = hidableDocumentTypes.map(({ hiddenIfAnyOfDocumentsOwned }) =>
            hiddenIfAnyOfDocumentsOwned.map<DocumentFilter>((documentType) => ({ documentType })),
        )

        const { missingDocumnets } = await this.userService.hasDocuments(userIdentifier, documentFilters)

        const documentsToHide = hidableDocumentTypes.filter(({ hiddenIfAnyOfDocumentsOwned }) =>
            hiddenIfAnyOfDocumentsOwned.some((documentType) => !missingDocumnets.includes(documentType)),
        )

        const manualDocumentTypesToHide = documentsToHide.map(({ code }) => code)

        this.logger.info('Manual documents to hide', { documentsToHide: manualDocumentTypesToHide })

        return documentsFilteredDefault
            .filter(({ code }) => !manualDocumentTypesToHide.includes(code))
            .map((document) => this.manualDocumentsListDataMapper.toListItemWithoutMeta(document))
    }

    private loadPluginDeps(instances: DocumentService[]): void {
        instances.forEach((service) => {
            const { manualDocumentNames = [], showInManualList } = service

            manualDocumentNames.forEach((manualDocumentName) => {
                Object.assign(
                    this.showInManualListStrategies,
                    showInManualList ? { [manualDocumentName]: showInManualList.bind(service) } : {},
                )
            })
        })
    }
}
