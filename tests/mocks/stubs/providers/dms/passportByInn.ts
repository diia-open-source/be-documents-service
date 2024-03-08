import { cloneDeep, merge } from 'lodash'
import { PartialDeep } from 'type-fest'

import { HttpStatusCode } from '@diia-inhouse/types'

import { passportDmsSuccessResponse } from '@providers/testData/documentsMockData'

import { RegistryPassportsByInnDTO } from '@interfaces/dto'

export function getPassportByInn(data: PartialDeep<RegistryPassportsByInnDTO> = {}): RegistryPassportsByInnDTO {
    return merge({ success: HttpStatusCode.OK, return: cloneDeep(passportDmsSuccessResponse) }, data)
}
