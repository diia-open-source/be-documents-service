import { AppUserActionArguments } from '@diia-inhouse/types'

import { IdentityDocument } from '@interfaces/services/documents'

export type CustomActionArguments = AppUserActionArguments

export interface ActionResult {
    identityDocument?: IdentityDocument
}
