/**
 * @abstract
 */
class LearningStrategy {
  constructor() {
    this.system = null
    this.transitionTable = null
  }

  setup(system, transitionTable) {
      this.system = system
      this.transitionTable = transitionTable
  }

  /**
   * @abstract
   */
  transitionReady() { throw "transitionReady() not implemented" }

  /**
   * @abstract
   */
  transitionComplete() { throw "transitionComplete() not implemented" }
}
