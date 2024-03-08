import { PassportGenderEN } from '@diia-inhouse/types'

import { PassportByInnDocumentType } from '@src/generated'

import { photo } from '@providers/testData/photo'

import { RegistryPassportDTO, RegistryPassportInstance, RegistryPassportsByInn } from '@interfaces/dto'

export const passportEisSuccessResponse: RegistryPassportDTO = <RegistryPassportDTO>{
    unzr: '19910824-00026',
    rnokpp: '0000000017',
    gender: 'F',
    date_birth: '2000-02-13',
    registration: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69 20071969;UA80000000000093317;8000000000',
    documents: <RegistryPassportInstance[]>[
        {
            type: 'P',
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
            type: 'ID',
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
}

export const passportDmsSuccessResponse: RegistryPassportsByInn = {
    last_name: 'ДІЯ',
    first_name: 'НАДІЯ',
    middle_name: 'ВОЛОДИМИРІВНА',
    unzr: '19910824-00026',
    rnokpp: '0000000017',
    gender: PassportGenderEN.F,
    date_birth: '2000-02-13',
    birth_place: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА/M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
    birth_country: 'УКРАЇНА',
    birth_country_id: 'UKR',
    registration: {
        registration_inf: true,
        postbox: '84110',
        address_grom_katottg: 'UA80000000000093317',
        address_koatuu: '',
        address_katottg: 'UA80000000000093317',
        region: '',
        district: '',
        settlement_name: 'КИЇВ',
        settlement_type: 'М.',
        city_district: 'ШЕВЧЕНКІВСЬКИЙ РАЙОН',
        settlement_district_katottg: 'UA80000000001078669',
        street_name: 'АРМСТРОНГА',
        street_type: 'ВУЛ.',
        building_number: '11',
        building_part: '',
        apartment: '69',
        registration_date: '20.07.1969',
        cancelregistration_date: '',
    },
    documents: {
        documents: true,
        type: PassportByInnDocumentType.id,
        documentSerial: '',
        number: '000031886',
        date_issue: '12.05.2016',
        date_expiry: '12.05.2026',
        dep_issue: '1455',
    },
}
