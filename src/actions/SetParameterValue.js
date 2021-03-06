
import { StateAction } from '../StateAction.js'

/** A state machine action that sets parameter values.
 * @extends StateAction
 */
class SetParameterValue extends StateAction {
  /**
   * Create a set parameter value.
   */
  constructor() {
    super()

    this.__interpTimeParam = this.addParameter(
      new ZeaEngine.NumberParameter('InterpTime', 1.0)
    )
    this.__updateFrequencyParam = this.addParameter(
      new ZeaEngine.NumberParameter('UpdateFrequency', 30)
    )

    this.__outParam = this.addOutput(new ZeaEngine.OperatorOutput('Param'))
    this.__outParam.paramSet.connect(() => {
      if (
        !this.__valueParam ||
        this.__outParam.getParam().getDataType() !=
          this.__valueParam.getDataType()
      ) {
        const param = this.__outParam.getParam().clone()
        param.setName('Value')
        if (this.__outParam.getInitialValue)
          param.setValue(this.__outParam.getInitialValue())
        else param.setValue(this.__outParam.getParam().getValue())
        this.__valueParam = this.addParameter(param)
      }
    })
  }

  /**
   * Activate the action.
   */
  activate() {
    if (this.__outParam.isConnected()) {
      const interpTime = this.__interpTimeParam.getValue()
      if (interpTime > 0.0) {
        const updateFrequency = this.__updateFrequencyParam.getValue()
        const paramValueStart = this.__outParam.getValue()
        const paramValueEnd = this.__valueParam.getValue()
        let step = 0
        const steps = Math.round(interpTime / (1.0 / updateFrequency))
        const timerCallback = () => {
          step++
          if (step < steps) {
            const t = step / steps
            const smooth_t = Math.smoothStep(0.0, 1.0, t)
            const newVal = Math.lerp(paramValueStart, paramValueEnd, smooth_t)
            // Note: In this case, we want the parameter to emit a notification
            // and cause the update of the scene. But we also don't want the parameter value to then
            // be considered modified so it is saved to the JSON file. I'm not sure how to address this.
            // We need to check what happens if a parameter emits a 'valueChanged' during cleaning. (maybe it gets ignored)
            this.__outParam.setValue(newVal, ZeaEngine.ValueSetMode.GENERATED_VALUE)
            this.__timeoutId = window.setTimeout(
              timerCallback,
              1000 / updateFrequency
            )
          } else {
            this.__outParam.setValue(
              this.__valueParam.getValue(),
              ZeaEngine.ValueSetMode.GENERATED_VALUE
            )
            this.__timeoutId = undefined
            this.__onDone()
          }
        }
        timerCallback()
      } else {
        this.__outParam.setValue(
          this.__valueParam.getValue(),
          ZeaEngine.ValueSetMode.GENERATED_VALUE
        )
        this.__onDone()
      }
    }
  }

  /**
   * The cancel the action.
   */
  cancel() {
    if (this.__timeoutId) {
      clearTimeout(this.__timeoutId)
      this.__timeoutId = undefined
    }
  }

  // ////////////////////////////////////////
  // Persistence

  /**
   * The toJSON method encodes this type as a json object for persistences.
   * @param {object} context - The context value.
   * @param {number} flags - The flags value.
   * @return {object} - Returns the json object.
   */
  toJSON(context, flags) {
    const j = super.toJSON(context, flags)
    if (this.__valueParam) {
      j.valueParamType = this.__valueParam.constructor.name
    }
    return j
  }

  /**
   * The fromJSON method decodes a json object for this type.
   * @param {object} j - The json object this item must decode.
   * @param {object} context - The context value.
   * @param {number} flags - The flags value.
   */
  fromJSON(j, context, flags) {
    if (j.valueParamType) {
      const param = sgFactory.constructClass(j.valueParamType, 'Value')
      if (param) this.__valueParam = this.addParameter(param)
    }
    super.fromJSON(j, context, flags)
  }
}

ZeaEngine.sgFactory.registerClass('SetParameterValue', SetParameterValue)
export { SetParameterValue }
