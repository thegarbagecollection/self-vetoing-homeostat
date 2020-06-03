class Coordinator {
  /**
   * 
   * @param {Array.<ISystem>} systems 
   */
  constructor(systems) {
    this.systems = systems
  }
  timeStep() {
    this.systems.forEach(system => system.prepareTransition())
    this.systems.forEach(system => system.transition())
  }

  restoreDefaultStartState() {
    this.systems.forEach(system => system.toDefaultStartState())
  }
}