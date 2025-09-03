import { ModelServiceFactory } from 'src/modules/models/factories/model-service.factory'
import { EmitEventDependencies } from '../emit-event-dependencies'

/**
 * Decorator to automatically update the update_date field in the database
 * after the execution of a decorated method, provided the method returns a truthy value.
 *
 * This decorator relies on a debounce mechanism to avoid frequent updates
 * for the same model ID within a specified time frame.
 */
export function UpdateDateAfterExecution() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Execute the original method and retrieve its result.
      const result = await originalMethod.apply(this, args)

      if (!result) {
        return result // If the result is falsy, no update is triggered.
      }

      // Extract modelId from the method arguments.
      const modelId = args.find((arg) => arg?.model_id)
      const source = args[1] // Assume the source is the second argument.

      if (!modelId || !source) {
        console.warn('UpdateDateAfterExecution: Missing modelId or source.')
        return result
      }

      // Retrieve the ModelServiceFactory from metadata attached to the instance.
      const modelsServiceFactory: ModelServiceFactory = Reflect.getMetadata(
        'modelsServiceFactory',
        this
      )

      if (!modelsServiceFactory) {
        console.error(
          'UpdateDateAfterExecution: ModelsServiceFactory is not defined in metadata.'
        )
        return result
      }

      // Get the debounce service instance.
      const debounceService = EmitEventDependencies.getDebounceService()
      const key = `update-date-${modelId}` // Unique debounce key for the modelId.

      // Use debounce to avoid multiple rapid updates for the same model ID.
      debounceService.debounce(
        key,
        async () => {
          const modelsService = modelsServiceFactory.getService(source)
          await modelsService.updateUpdateDate(modelId)
        },
        2000 // Debounce delay in milliseconds.
      )

      return result
    }

    return descriptor
  }
}
