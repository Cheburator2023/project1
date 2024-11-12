import { UpdateModelNameDto, UpdateModelDescDto } from '../dto'

export interface IModelService {
  updateModelName(data: UpdateModelNameDto): Promise<void>
  updateModelDesc(data: UpdateModelDescDto): Promise<void>
}
