import { merge } from 'lodash'
import { PartialDeep } from 'type-fest'

import { PassportByInnDocumentType, PassportRegistrationInfo } from '@src/generated'

import photo from '@tests/mocks/stubs/photo'

import { PassportGenderEN, PassportType } from '@interfaces/dto'
import { PassportByInn, PassportInfo } from '@interfaces/providers/dms'
import { InternalPassportInstance } from '@interfaces/providers/eis'
import { DocumentWithCover } from '@interfaces/services/documents'

export const idCard: InternalPassportInstance = {
    docStatus: 200,
    docNumber: '000031886',
    number: '000031886',
    id: '20000213-01467-2016-03-09',
    lastNameUA: 'Дія',
    firstNameUA: 'Надія',
    middleNameUA: 'Володимирівна',
    lastNameEN: 'Diia',
    firstNameEN: 'Nadiia',
    fullNameHash:
        'c06d8847c06805ecd8ce76d02a2c1fe5dd5ae23d9d53ef89832fee3fb0ef6903761a994722701ae72870292f146812d5d4b9802c91abec7beca90771ad6e6f8d',
    genderUA: 'Ж',
    genderEN: 'F',
    nationalityUA: 'Україна',
    nationalityEN: 'Ukraine',
    photo,
    birthday: '13.02.2000',
    sign: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2MQmjHnIAAEDgIIZO6vHgAAAABJRU5ErkJggg==',
    birthPlaceUA: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА',
    birthPlaceEN: 'M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
    issueDate: '09.03.2016',
    expirationDate: '09.03.2026',
    recordNumber: '20000213-01467',
    type: PassportType.ID,
    documentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 20.07.1969',
    currentRegistrationPlaceUA: 'УКРАЇНА М. КИЇВ ВУЛ. АРМСТРОНГА БУД. 11 КВ. 69.\nДата реєстрації: 20.07.1969',
    department: '1455',
    taxpayerCard: {
        status: 1014,
        number: expect.any(String),
        creationDate: expect.any(String),
    },
}

export const idCardWithCover: DocumentWithCover = {
    id: idCard.id,
    docStatus: idCard.docStatus,
    document: idCard,
}

export const getPassportWithRegistration = (): PassportByInn => {
    return {
        passport: {
            lastNameUA: 'lastNameUA',
            firstNameUA: 'firstNameUA',
            recordNumber: 'recordNumber',
            genderEN: PassportGenderEN.F,
            birthday: 'birthday',
            birthCountry: 'birthCountry',
            birthPlaceUA: 'birthPlaceUA',
            type: PassportByInnDocumentType.id,
            docNumber: 'docNumber',
            issueDate: 'issueDate',
            department: 'department',
        },
        registration: {
            address: {
                registrationDate: 'registrationDate',
                cancelregistrationDate: 'cancelregistrationDate',
            },
        },
        registrationV1: {
            address: {
                registration_inf: true,
            },
        },
    }
}

export function getPassportInfo(data: PartialDeep<PassportInfo> = {}): PassportInfo {
    return merge(
        {
            lastNameUA: 'ДІЯ',
            firstNameUA: 'НАДІЯ',
            recordNumber: '000031886',
            genderEN: PassportGenderEN.F,
            birthday: '2000-02-13',
            birthCountry: 'УКРАЇНА',
            birthPlaceUA: 'М. СЛОВ`ЯНСЬК ДОНЕЦЬКА ОБЛАСТЬ УКРАЇНА/M.  SLOVIANSK DONETSKA OBLAST UKRAINA/UKR',
            type: PassportByInnDocumentType.id,
            docNumber: '000031886',
            issueDate: '2016-03-09',
            department: '1455',
        },
        data,
    )
}

export function getPassportRegistrationInfo(data: PartialDeep<PassportRegistrationInfo> = {}): PassportRegistrationInfo {
    return merge(
        {
            address: {
                registrationDate: '22.11.2010',
                cancelregistrationDate: '22.11.2030',
            },
        },
        data,
    )
}
