import { merge } from 'lodash'
import { PartialDeep } from 'type-fest'

import { DriverLicenseDocumentDTO, RegistryDriverLicenseDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'

import { photo } from '@providers/testData/photo'

import { Client, ClientAddress } from '@interfaces/dto'

export const driverLicenseHSCSuccessResponse: RegistryDriverLicenseDTO = {
    driverLicense: [
        {
            id: 52511146,
            clientId: 20997141,
            department: {
                ID: 10698,
                VALUE: '(6303) ВРЕР ДАІ №3 М. ХАРКІВ ГУМВС УКРАЇНИ В ХАРКІВСЬКІЙ ОБЛАСТІ',
            },
            docType: {
                ID: 200,
                VALUE: 'ПОСВІДЧЕННЯ ВОДІЯ УКРАЇНСЬКЕ',
            },
            status: {
                ID: 1,
                VALUE: 'ВИДАНИЙ',
            },
            country: {
                ID: 227,
                VALUE: 'УКРАЇНА',
            },
            categories: [
                {
                    category: 'КАТЕГОРІЯ B',
                    dopen: '2015-04-09',
                },
            ],
            photo,
            ndoc: '578221',
            ddoc: '2015-04-09',
            dend: '2045-04-09',
            sdoc: 'ВХХ',
        },
    ],
    client: {
        inn: 3016906409,
        innChar: '3016906409',
        clientId: 20997134,
        country: {
            ID: '227',
            VALUE: 'УКРАЇНА',
        },
        lastNameUA: 'ДІЯ',
        firstNameUA: 'НАДІЯ',
        middleNameUA: 'ВОЛОДИМИРІВНА',
        lastNameRU: 'lastNameRU',
        firstNameRU: 'firstNameRU',
        middleNameRU: 'middleNameRU',
        lastNameEN: 'lastNameEN',
        firstNameEN: 'firstNameEN',
        middleNameEN: 'middleNameEN',
        birthday: '1997-02-21',
        sex: {
            ID: 'F',
            VALUE: 'ЖІНОЧА',
        },
        person: {
            ID: 'P',
            VALUE: 'ФІЗИЧНА ОСОБА',
        },
    },
    clientAddr: [
        {
            claddrId: 41930602,
            clientId: 20997141,
            addressType: {
                ID: 103,
                VALUE: 'АДРЕСА МІСЦЯ НАРОДЖЕННЯ',
            },
            isReal: 'T',
            addressId: 8865277,
            city: {
                ID: '1023527',
                VALUE: 'ХАРКІВСЬКА',
            },
            cityType: {
                ID: '5',
                VALUE: 'ОБЛАСТЬ',
            },
            region: 'ХАРКІВСЬКА ОБЛ.,УКРАЇНА',
            distr: null,
            distrCity: null,
            streetType: {
                ID: null,
                VALUE: null,
            },
            street: null,
            postalCode: null,
            corps: null,
            isDirty: 'F',
            address: 'ХАРКІВСЬКА ОБЛ.',
            country: {
                ID: 227,
                VALUE: 'УКРАЇНА',
            },
            nhouse: null,
            shouse: null,
            nflat: null,
            sflat: null,
        },
    ],
}

export function getDriverLicense(data: PartialDeep<RegistryDriverLicenseDTO> = {}): RegistryDriverLicenseDTO {
    return merge({}, driverLicenseHSCSuccessResponse, data)
}

export const driverLicenseDocument: DriverLicenseDocumentDTO = {
    id: 1,
    clientId: 2,
    department: { ID: 1, VALUE: 'department' },
    docType: { ID: 1, VALUE: 'docType' },
    status: { ID: 1, VALUE: 'status' },
    country: { ID: 1, VALUE: 'country' },
    categories: [{ category: 'category', dopen: '2015-04-09' }],
    photo: 'photo',
    ddoc: '2015-04-09',
    ndoc: '12312313',
    sdoc: 'SSC',
    dend: '2015-04-09',
}

export const client = <Client>{
    inn: 3329345651,
    innChar: '3329345651',
    clientId: 18254576,
    country: { ID: '227', VALUE: 'УКРАЇНА' },
    lastNameUA: 'lastNameUA',
    firstNameUA: 'firstNameUA',
    middleNameUA: 'middleNameUA',
    lastNameRU: 'lastNameRU',
    firstNameRU: 'firstNameRU',
    middleNameRU: 'middleNameRU',
    lastNameEN: 'lastNameEN',
    firstNameEN: 'firstNameEN',
    middleNameEN: 'middleNameEN',
    birthday: '1994-03-27',
    sex: { ID: 'M', VALUE: 'ЧОЛОВІЧА' },
    person: { ID: 'P', VALUE: 'ФІЗИЧНА ОСОБА' },
}

export const clientAddr = <ClientAddress>{
    claddrId: 33342143,
    clientId: 18223476,
    addressType: { ID: 100, VALUE: 'АДРЕСА МІСЦЯ РЕГІСТРАЦІЇ' },
    isReal: 'T',
    addressId: 173,
    city: { ID: '1023528', VALUE: 'ХАРКІВ' },
    cityType: { ID: '8', VALUE: 'МІСТО' },
    region: 'ХАРКІВСЬКА ОБЛ.,УКРАЇНА',
    distr: null,
    distrCity: null,
    streetType: { ID: null, VALUE: null },
    street: null,
    postalCode: null,
    corps: null,
    isDirty: 'F',
    address: 'ХАРКІВСЬКА ОБЛ., М. ХАРКІВ',
    country: { ID: 227, VALUE: 'УКРАЇНА' },
    nhouse: null,
    shouse: null,
    nflat: null,
    sflat: null,
}
