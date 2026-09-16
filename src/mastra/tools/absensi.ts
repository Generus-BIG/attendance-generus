import { createAbsensiReaderTools } from './absensi-readers.js'
import { type DataConfig } from './data.js'

export function createAbsensiTools(config: DataConfig) {
  return createAbsensiReaderTools(config)
}
