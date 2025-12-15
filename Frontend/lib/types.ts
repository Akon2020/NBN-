export interface RentalProperty {
  id: string
  type: "apartment" | "house"
  address: {
    neighborhood: string
    avenue: string
  }
  floor: number
  bedrooms: number
  livingRooms: number
  bathrooms: number
  kitchens: number
  price: number
  guarantee: {
    value: number
    unit: "months" | "years" | "days"
  }
  phones: string[]
  images: string[]
  details: string
  gpsLocation?: {
    latitude: number
    longitude: number
  }
  score?: number
  createdAt: Date
  updatedAt: Date
}

export interface SaleProperty {
  id: string
  type: "durable" | "semi-durable" | "flat-land" | "slope-land"
  address: {
    neighborhood: string
    avenue: string
    fullAddress: string
  }
  floors: number
  bedrooms: number
  livingRooms: number
  bathrooms: number
  kitchens: number
  price: number
  margin: number
  phones: string[]
  images: string[]
  details: string
  gpsLocation?: {
    latitude: number
    longitude: number
  }
  score?: number
  createdAt: Date
  updatedAt: Date
}
