import { mongo } from '@diia-inhouse/db'

export interface Codifier {
    name: string
    categoryId: mongo.ObjectId
    level: string
    parentLevel?: string
    firstLevel: string
    secondLevel?: string
    thirdLevel?: string
    fourthLevel?: string
    extraLevel?: string
    koatuu: string[]
}
