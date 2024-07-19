import { UserActionArguments } from '@diia-inhouse/types'

export type CustomActionArguments = UserActionArguments

export interface TaxPayerDTO {
    fName: string
    lName: string
    mName: string
    itn: string
    birthDay: string
}
