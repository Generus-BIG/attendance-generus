import { createAbsensiReaderTools } from './absensi-readers'
import { type DataConfig } from './data'

export function createAbsensiTools(config: DataConfig) {
  return createAbsensiReaderTools(config)
}
