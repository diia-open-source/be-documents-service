import moment from 'moment'

import { InternalServerError } from '@diia-inhouse/errors'

import { PassportRegistration, PassportRegistrationInfo } from '@src/generated'

import RegistrationAddressDataMapper from '@dataMappers/registrationAddressDataMapper'

import { RegistryPassportsByInn, RegistryPassportsByInnRegistration } from '@interfaces/dto'
import { PassportByInnRegistration, PassportByInnRegistrationInfo, PassportInfo } from '@interfaces/providers/dms'

export default class PassportByInnDataMapper {
    private readonly dateFormat: string = 'DD.MM.YYYY'

    constructor(private readonly registrationAddressDataMapper: RegistrationAddressDataMapper) {}

    toEntity(passports: RegistryPassportsByInn): PassportInfo | undefined {
        const {
            last_name: lastNameUA,
            first_name: firstNameUA,
            middle_name: middleNameUA,
            unzr: recordNumber,
            gender: genderEN,
            date_birth: birthday,
            birth_country: birthCountry,
            birth_place: birthPlaceUA,
            documents,
        } = passports

        if (!documents.documents) {
            return
        }

        const { type, documentSerial, number, date_issue: issueDate, date_expiry: expirationDate, dep_issue: department } = documents

        return {
            lastNameUA,
            firstNameUA,
            middleNameUA,
            recordNumber,
            genderEN,
            birthday,
            birthCountry,
            birthPlaceUA,
            type,
            docSerial: documentSerial,
            docNumber: number,
            issueDate,
            expirationDate,
            department,
        }
    }

    toRegistrationV1(passports: RegistryPassportsByInn): PassportByInnRegistrationInfo {
        const { registration } = passports

        const address: PassportByInnRegistration = {
            ...registration,
            regionName: this.removeAddressType(registration.region, ['M.', 'ОБЛАСТЬ']),
            districtName: this.removeAddressType(registration.district, ['РАЙОН']),
            cityDistrictName: this.removeAddressType(registration.city_district, ['РАЙОН']),
        }

        if (registration.cancelregistration_date) {
            return {
                address,
                deregistrationDate: moment(registration.cancelregistration_date, this.dateFormat).toDate(),
            }
        }

        if (!registration.registration_date) {
            return { address }
        }

        return {
            address,
            registrationDate: moment(registration.registration_date, this.dateFormat).toDate(),
            fullName: this.registrationAddressDataMapper.getAddressFullName(this.toPassportRegistration(registration)),
        }
    }

    toRegistration(passports: RegistryPassportsByInn): PassportRegistrationInfo {
        const { registration } = passports

        const address = this.toPassportRegistration(registration)

        return this.registrationAddressDataMapper.toRegistrationInfo(address, this.dateFormat)
    }

    toPassportRegistration(registration: RegistryPassportsByInnRegistration): PassportRegistration {
        const {
            postbox,
            region,
            address_koatuu: addressKoatuu,
            address_katottg: addressKatottg,
            address_grom_katottg: addressGromKatottg,
            district: regionDistrict,
            city_district: cityDistrict,
            settlement_name: settlementName,
            settlement_type: settlementType,
            settlement_district_katottg: cityDistrictKatottg,
            street_name: streetName,
            street_type: streetType,
            building_number: buildingNumber,
            building_part: buildingPart,
            apartment,
            registration_date: registrationDate,
            cancelregistration_date: cancelregistrationDate,
        } = registration

        return {
            country: 'УКРАЇНА',
            postbox,
            addressKoatuu,
            addressKatottg,
            addressGromKatottg,
            region,
            regionName: this.removeAddressType(region, ['M.', 'ОБЛАСТЬ']),
            regionDistrict,
            regionDistrictName: this.removeAddressType(regionDistrict, ['РАЙОН']),
            cityDistrict,
            cityDistrictName: this.removeAddressType(cityDistrict, ['РАЙОН']),
            cityDistrictKatottg,
            settlementName,
            settlementType,
            streetName,
            streetType,
            buildingNumber,
            buildingPart,
            apartment,
            registrationDate: registrationDate,
            cancelregistrationDate: cancelregistrationDate,
        }
    }

    toPassportByInnRegistrationFromPassportRegistration(registration: PassportRegistrationInfo): PassportByInnRegistrationInfo {
        const { address, registrationDate, deregistrationDate, fullName } = registration

        if (!address) {
            throw new InternalServerError('address must be provided')
        }

        const {
            postbox,
            addressKoatuu,
            addressKatottg,
            addressGromKatottg,
            region,
            regionName,
            regionDistrict,
            regionDistrictName,
            cityDistrict,
            cityDistrictName,
            cityDistrictKatottg,
            settlementName,
            settlementType,
            streetName,
            streetType,
            buildingNumber,
            buildingPart,
            apartment,
            registrationDate: addressRegistrationDate,
            cancelregistrationDate: addressCancelregistrationDate,
        } = address

        return {
            address: {
                registration_inf: !!fullName,
                postbox,
                address_koatuu: addressKoatuu,
                address_katottg: addressKatottg,
                address_grom_katottg: addressGromKatottg,
                region,
                regionName,
                district: regionDistrict,
                districtName: regionDistrictName,
                city_district: cityDistrict,
                cityDistrictName,
                settlement_district_katottg: cityDistrictKatottg,
                settlement_name: settlementName,
                settlement_type: settlementType,
                street_name: streetName,
                street_type: streetType,
                building_number: buildingNumber,
                building_part: buildingPart,
                apartment,
                registration_date: addressRegistrationDate || '',
                cancelregistration_date: addressCancelregistrationDate || '',
            },
            registrationDate,
            deregistrationDate,
            fullName,
        }
    }

    private removeAddressType(name: string | undefined, searchStrings: string[] = []): string | undefined {
        if (name === undefined) {
            return
        }

        return searchStrings.reduce((result, searchString) => result.replace(searchString, ''), name).trim()
    }
}
