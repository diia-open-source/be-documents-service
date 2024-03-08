import { ObjectId } from 'bson'

export interface Codifier {
    name: string
    categoryId: ObjectId
    level: string
    parentLevel?: string
    firstLevel: string
    secondLevel?: string
    thirdLevel?: string
    fourthLevel?: string
    extraLevel?: string
    koatuu: string[]
}
