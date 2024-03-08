import { DocumentType, ListItemGroupOrg, ListItemMlc } from '@diia-inhouse/types'

export interface ManualDocumentListItem {
    code: string
    name: string
    isActive: boolean
    hiddenIfAnyOfDocumentsOwned?: DocumentType[]
}

export interface ManualDocumentListItemWithOrder extends ManualDocumentListItem {
    order: number
}

/** @deprecated */
export interface ManualDocumentsListResponseV1 {
    documents: ManualDocumentListItem[]
}

export interface ManualDocumentsListResponse {
    contextMenuOrg: {
        listItemGroupOrg: ListItemGroupOrg
        btnWhiteLargeAtm: ListItemMlc
    }
}

export type ShowInManualListStrategy = (id: string, code: string) => Promise<boolean>
