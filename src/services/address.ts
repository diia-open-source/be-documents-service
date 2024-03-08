import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion } from '@diia-inhouse/types'

import { Codifier } from '@interfaces/services/address'

export default class AddressService {
    constructor(private readonly moleculer: MoleculerService) {}

    private readonly serviceName = 'Address'

    async findCommunityCodeByKoatuu(koatuu: string): Promise<string> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'findCommunityCodeByKoatuu', actionVersion: ActionVersion.V1 },
            { params: { koatuu } },
        )
    }

    async findCommunityCodeByKodificatorCode(kodificatorCode: string): Promise<string> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'findCommunityCodeByKodificatorCode', actionVersion: ActionVersion.V1 },
            { params: { kodificatorCode } },
        )
    }

    async findCodifierCodeByKoatuu(koatuu: string): Promise<string> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'findCodifierCodeByKoatuu', actionVersion: ActionVersion.V1 },
            { params: { koatuu } },
        )
    }

    async findCodifierByKoatuu(koatuu?: string): Promise<Codifier> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'findCodifierByKoatuu', actionVersion: ActionVersion.V1 },
            { params: { koatuu } },
        )
    }
}
