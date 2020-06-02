/**
 * @abstract
 */
class LearningStrategy {
  constructor() {
    /**
     * @type {System}
     */
    this.system = null

    /**
     * @type {TransitionTable}
     */
    this.transitionTable = null

    /**
     * @type {State}
     */
    this.startState = null
  }

  /**
   *
   * @param {System} system
   * @param {TransitionTable} transitionTable
   */
  setup(system, transitionTable) {
    this.system = system
    this.transitionTable = transitionTable
    this.startState = system.state
  }

  transition() {
    // could put other transition-preparation stuff in here
    let t = this.transitionTable.getCompletedTransition()
    this.transitionComplete(t)
  }

  /**
   * @abstract
   * @param {CompletedTransition} transition
   */
  transitionComplete(transition) {
    throw "transitionComplete() not implemented"
  }
}
