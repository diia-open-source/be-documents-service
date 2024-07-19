import { AppUser, ListItemGroupOrg, ListItemMlc, WithAppVersions } from '@diia-inhouse/types'

export interface ManualDocumentListItem extends WithAppVersions {
    code: string
    name: string
    isActive: boolean
    hiddenIfAnyOfDocumentsOwned?: string[]
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

export type ShowInManualListStrategy = (user: AppUser, code: string) => Promise<boolean>
