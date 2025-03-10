import { UpdateModelDto } from '../dto'

export interface IModelService {
  updateModelName(data: Pick<UpdateModelDto, 'model_id' | 'model_name'>): Promise<boolean>

  updateUpdateDate(data: Pick<UpdateModelDto, 'model_id'> & Partial<Pick<UpdateModelDto, 'update_date'>>): Promise<boolean>
}
