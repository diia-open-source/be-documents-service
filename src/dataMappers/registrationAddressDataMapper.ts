import moment from 'moment'

import { Logger } from '@diia-inhouse/types'

import { PassportRegistration, PassportRegistrationInfo } from '@src/generated'

import Utils from '@utils/index'

import { AppConfig } from '@interfaces/config'
import { RegistrationAddress } from '@interfaces/providers/usdr'

export default class RegistrationAddressDataMapper {
    private noRegistrationDateString = '01011900'

    constructor(
        private readonly appUtils: Utils,

        private readonly config: AppConfig,
        private readonly logger: Logger,
    ) {}

    toEntity(address: string | PassportRegistrationInfo): RegistrationAddress | undefined {
        if (!address) {
            return
        }

        return typeof address === 'string' ? this.parseString(address) : this.fromRegistrationInfo(address)
    }

    toRegistrationInfo(address: PassportRegistration, dateFormat: string): PassportRegistrationInfo {
        const { registrationDate, cancelregistrationDate } = address

        if (cancelregistrationDate) {
            return {
                address,
                deregistrationDate: moment(cancelregistrationDate, dateFormat).toDate(),
            }
        }

        if (!registrationDate) {
            return { address }
        }

        return {
            address,
            registrationDate: moment(registrationDate, dateFormat).toDate(),
            fullName: this.getAddressFullName(address),
        }
    }

    getAddressFullName(address: PassportRegistration): string {
        const {
            country,
            region,
            regionDistrict,
            settlementName,
            settlementType,
            streetName,
            streetType,
            buildingNumber,
            buildingPart,
            apartment,
        } = address

        const addressItems: (string | undefined)[] = [
            country,
            region,
            regionDistrict,
            settlementType,
            settlementName,
            streetType,
            streetName,
            buildingNumber && `БУД. ${buildingNumber}`,
            buildingPart,
            apartment && `КВ. ${apartment}`,
        ]

        return addressItems.filter(Boolean).join(' ')
    }

    private fromRegistrationInfo(passportRegistrationInfo: PassportRegistrationInfo): RegistrationAddress | undefined {
        const { registrationDate, fullName, address } = passportRegistrationInfo

        if (!registrationDate || !fullName) {
            return { registrationAddress: 'МІСЦЕ РЕЄСТРАЦІЇ ВІДСУТНЄ' }
        }

        const result = {
            registrationAddress: fullName,
            registrationDate: moment(registrationDate).format(this.config.app.dateFormat),
        }

        if (!address) {
            return result
        }

        const { addressKoatuu, addressGromKatottg } = address

        return {
            ...result,
            koatuu: addressKoatuu,
            communityCode: addressGromKatottg,
        }
    }

    private parseString(address: string): RegistrationAddress {
        const [addressWithoutCommunity, koatuuOrCommunityCode]: string[] = address.split(';')
        const koatuu = this.getKoatuu(koatuuOrCommunityCode)
        const communityCode = this.getCommunityCode(koatuuOrCommunityCode)

        const registrationParts = addressWithoutCommunity.trim().split(' ')
        const lastPart = registrationParts[registrationParts.length - 1].trim()
        let registrationAddress
        let registrationDate: string | undefined
        if (/^\d{8}$/.test(lastPart)) {
            registrationDate =
                lastPart === this.noRegistrationDateString ? undefined : this.appUtils.convertDate(lastPart, { fromFormat: 'DDMMYYYY' })
            registrationAddress = registrationParts.slice(0, registrationParts.length - 1).join(' ')
        } else {
            registrationAddress = registrationParts.join(' ')
        }

        if (!registrationDate) {
            this.logger.info("Couldn't get registration date from address string", address)

            return { registrationAddress, koatuu, communityCode }
        }

        return { registrationAddress, registrationDate, koatuu, communityCode }
    }

    private getKoatuu(koatuuOrCommunityCode: string): string | undefined {
        return /^\d{10}$/.test(koatuuOrCommunityCode) ? koatuuOrCommunityCode : undefined
    }

    private getCommunityCode(koatuuOrCommunityCode: string): string | undefined {
        return /^UA\d{17}$/.test(koatuuOrCommunityCode) ? koatuuOrCommunityCode : undefined
    }
}
