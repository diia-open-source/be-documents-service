import { UserTokenData } from '@diia-inhouse/types'

import { AssertParams } from '@interfaces/services/documentVerification'

export interface TaxpayerCardAssertParams extends AssertParams {
    user: UserTokenData
}
