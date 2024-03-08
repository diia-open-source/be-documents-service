import { merge } from 'lodash'
import { PartialDeep } from 'type-fest'

import photo from '@tests/mocks/stubs/photo'

import { PassportGenderEN, PassportType, RegistryPassportDTO } from '@interfaces/dto'

export function getPassport(data: PartialDeep<RegistryPassportDTO> = {}): RegistryPassportDTO {
    return merge<RegistryPassportDTO, typeof data>(
        {
            unzr: '20000213-01467',
            rnokpp: '3656801869',
            gender: PassportGenderEN.F,
            date_birth: '2000-02-13',
            registration: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69 20071969;8000000000',
            documents: [
                {
                    type: PassportType.P,
                    number: 'FC449752',
                    date_issue: '2016-05-12',
                    date_expiry: '2026-05-12',
                    dep_issue: '1455',
                    last_name: 'ДІЯ',
                    last_name_en: 'DIIA',
                    first_name: 'НАДІЯ',
                    first_name_en: 'NADIIA',
                    middle_name: '',
                    middle_name_en: '',
                    birth_place: 'ДОНЕЦЬКА ОБЛ./UKR',
                    photo,
                    signature: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                },
                {
                    type: PassportType.ID,
                    number: '000031886',
                    date_issue: '2016-03-09',
                    date_expiry: '2026-03-09',
                    dep_issue: '1455',
                    last_name: 'ДІЯ',
                    last_name_en: 'DIIA',
                    first_name: 'НАДІЯ',
                    first_name_en: 'NADIIA',
                    middle_name: 'ВОЛОДИМИРІВНА',
                    middle_name_en: 'VOLODYMYRIVNA',
                    birth_place: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА/M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
                    photo,
                    signature: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
                },
            ],
        },
        data,
    )
}
